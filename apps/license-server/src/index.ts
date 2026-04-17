import { Hono } from "hono";
import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN: string;
};

type License = {
  key: string;
  email: string;
  plan: string;
  status: "active" | "revoked" | "expired";
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  note: string | null;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ライセンス検証（public）
app.post("/verify", async (c) => {
  const body = await c.req.json<{ license_key?: string; instance_id?: string }>();
  const { license_key, instance_id } = body;

  if (!license_key) {
    return c.json({ valid: false, reason: "missing_key" }, 400);
  }

  const license = await c.env.DB.prepare(
    "SELECT * FROM licenses WHERE key = ?"
  ).bind(license_key).first<License>();

  let result: string;
  let response: Record<string, unknown>;

  if (!license) {
    result = "not_found";
    response = { valid: false, reason: "not_found" };
  } else if (license.status === "revoked") {
    result = "revoked";
    response = { valid: false, reason: "revoked" };
  } else if (license.status === "expired") {
    result = "expired";
    response = { valid: false, reason: "expired" };
  } else if (license.expires_at && new Date(license.expires_at) < new Date()) {
    // expires_at が過去 → DB を expired に更新
    await c.env.DB.prepare(
      "UPDATE licenses SET status = 'expired' WHERE key = ?"
    ).bind(license_key).run();
    result = "expired";
    response = { valid: false, reason: "expired" };
  } else {
    result = "valid";
    response = { valid: true, plan: license.plan, expires_at: license.expires_at };
  }

  // 監査ログ
  await c.env.DB.prepare(
    "INSERT INTO license_checks (license_key, instance_id, result) VALUES (?, ?, ?)"
  ).bind(license_key, instance_id ?? null, result).run();

  return c.json(response);
});

// --- admin ミドルウェア ---
const adminMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const token = c.req.header("X-Admin-Token");
  if (!token || token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
};

// ライセンス一覧（admin）
app.get("/admin/licenses", adminMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, email, plan, status, expires_at, created_at, revoked_at, note FROM licenses ORDER BY created_at DESC"
  ).all<License>();
  return c.json({ licenses: results });
});

// ライセンス発行（admin）
app.post("/admin/licenses", adminMiddleware, async (c) => {
  const body = await c.req.json<{
    email?: string;
    plan?: string;
    expires_at?: string;
    note?: string;
  }>();

  if (!body.email) {
    return c.json({ error: "email is required" }, 400);
  }

  const key = `mh_${crypto.randomUUID().replace(/-/g, "")}`;
  const plan = body.plan ?? "community";

  await c.env.DB.prepare(
    "INSERT INTO licenses (key, email, plan, expires_at, note) VALUES (?, ?, ?, ?, ?)"
  ).bind(key, body.email, plan, body.expires_at ?? null, body.note ?? null).run();

  return c.json({ key, email: body.email, plan, expires_at: body.expires_at ?? null }, 201);
});

// ライセンス失効（admin）
app.delete("/admin/licenses/:key", adminMiddleware, async (c) => {
  const key = c.req.param("key");

  const license = await c.env.DB.prepare(
    "SELECT key, status FROM licenses WHERE key = ?"
  ).bind(key).first<{ key: string; status: string }>();

  if (!license) {
    return c.json({ error: "not found" }, 404);
  }
  if (license.status === "revoked") {
    return c.json({ error: "already revoked" }, 409);
  }

  await c.env.DB.prepare(
    "UPDATE licenses SET status = 'revoked', revoked_at = datetime('now') WHERE key = ?"
  ).bind(key).run();

  return c.json({ revoked: true, key });
});

export default app;
