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

// コミュニティ登録（public）- メールアドレスだけで community キーを自動発行
app.post("/register", async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({ email: undefined }));
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return c.json({ error: "valid email is required" }, 400);
  }

  // 既存の active community キーがあれば再利用
  const existing = await c.env.DB.prepare(
    "SELECT key FROM licenses WHERE email = ? AND plan = 'community' AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ).bind(email).first<{ key: string }>();

  if (existing) {
    return c.json({ key: existing.key, email, plan: "community", created: false });
  }

  const key = `mh_${crypto.randomUUID().replace(/-/g, "")}`;
  await c.env.DB.prepare(
    "INSERT INTO licenses (key, email, plan, expires_at, note) VALUES (?, ?, 'community', NULL, 'self-registered')"
  ).bind(key, email).run();

  return c.json({ key, email, plan: "community", created: true }, 201);
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

// テレメトリ受信（public、license_key で認証）
app.post("/telemetry/events", async (c) => {
  const body = await c.req.json<{
    license_key?: string;
    event_type?: string;
    payload?: unknown;
    occurred_at?: string;
  }>();

  if (!body.license_key || !body.event_type) {
    return c.json({ error: "license_key and event_type are required" }, 400);
  }

  const license = await c.env.DB.prepare(
    "SELECT status FROM licenses WHERE key = ?"
  ).bind(body.license_key).first<{ status: string }>();

  if (!license || license.status !== "active") {
    return c.json({ error: "invalid license" }, 403);
  }

  await c.env.DB.prepare(
    "INSERT INTO telemetry_events (license_key, event_type, payload, occurred_at) VALUES (?, ?, ?, ?)"
  ).bind(
    body.license_key,
    body.event_type,
    JSON.stringify(body.payload ?? {}),
    body.occurred_at ?? new Date().toISOString()
  ).run();

  return c.json({ ok: true });
});

// テレメトリ一覧（admin）
app.get("/admin/telemetry/events", adminMiddleware, async (c) => {
  const limit = Number(c.req.query("limit") ?? 100);
  const event_type = c.req.query("event_type");
  let query = "SELECT * FROM telemetry_events";
  const params: unknown[] = [];
  if (event_type) { query += " WHERE event_type = ?"; params.push(event_type); }
  query += " ORDER BY received_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ events: results });
});

// テレメトリ集計（admin）
app.get("/admin/telemetry/aggregate", adminMiddleware, async (c) => {
  const days = Number(c.req.query("days") ?? 30);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { results: byType } = await c.env.DB.prepare(
    "SELECT event_type, COUNT(*) as count, COUNT(DISTINCT license_key) as users FROM telemetry_events WHERE received_at >= ? GROUP BY event_type ORDER BY count DESC"
  ).bind(since).all();

  const { results: byDay } = await c.env.DB.prepare(
    "SELECT substr(received_at, 1, 10) as date, COUNT(*) as count FROM telemetry_events WHERE received_at >= ? GROUP BY date ORDER BY date DESC LIMIT 30"
  ).bind(since).all();

  const { results: topUsers } = await c.env.DB.prepare(
    "SELECT license_key, COUNT(*) as events, COUNT(DISTINCT event_type) as event_types FROM telemetry_events WHERE received_at >= ? GROUP BY license_key ORDER BY events DESC LIMIT 20"
  ).bind(since).all();

  return c.json({ days, by_type: byType, by_day: byDay, top_users: topUsers });
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
