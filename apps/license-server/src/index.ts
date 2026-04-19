import { Hono } from "hono";
import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN: string;
  COMMUNITY_JOIN_URL: string;
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

type Integrations = {
  meta?: { accessToken?: string; adAccountId?: string };
  line?: { channelAccessToken?: string; channelSecret?: string };
  utage?: { apiKey?: string };
  googleAds?: {
    developerToken?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    customerId?: string;
  };
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
    await c.env.DB.prepare(
      "UPDATE licenses SET status = 'expired' WHERE key = ?"
    ).bind(license_key).run();
    result = "expired";
    response = { valid: false, reason: "expired" };
  } else {
    result = "valid";
    response = { valid: true, plan: license.plan, expires_at: license.expires_at };
  }

  await c.env.DB.prepare(
    "INSERT INTO license_checks (license_key, instance_id, result) VALUES (?, ?, ?)"
  ).bind(license_key, instance_id ?? null, result).run();

  return c.json(response);
});

// コミュニティ参加確認 + integrations 返却（public）
// 登録済みメール → license_key + integrations を返す
// 未登録メール → 403 + community_join_url
app.post("/register", async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({ email: undefined }));
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return c.json({ error: "valid email is required" }, 400);
  }

  const license = await c.env.DB.prepare(
    "SELECT * FROM licenses WHERE email = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ).bind(email).first<License>();

  if (!license) {
    return c.json({
      error: "not_in_community",
      community_join_url: c.env.COMMUNITY_JOIN_URL,
    }, 403);
  }

  const integ = await c.env.DB.prepare(
    "SELECT * FROM license_integrations WHERE license_key = ?"
  ).bind(license.key).first<Record<string, string | null>>();

  const integrations: Integrations = {};
  if (integ) {
    if (integ.meta_access_token || integ.meta_ad_account_id) {
      integrations.meta = {
        accessToken: integ.meta_access_token ?? undefined,
        adAccountId: integ.meta_ad_account_id ?? undefined,
      };
    }
    if (integ.line_channel_access_token || integ.line_channel_secret) {
      integrations.line = {
        channelAccessToken: integ.line_channel_access_token ?? undefined,
        channelSecret: integ.line_channel_secret ?? undefined,
      };
    }
    if (integ.utage_api_key) {
      integrations.utage = { apiKey: integ.utage_api_key };
    }
    if (integ.google_ads_developer_token || integ.google_ads_refresh_token) {
      integrations.googleAds = {
        developerToken: integ.google_ads_developer_token ?? undefined,
        clientId: integ.google_ads_client_id ?? undefined,
        clientSecret: integ.google_ads_client_secret ?? undefined,
        refreshToken: integ.google_ads_refresh_token ?? undefined,
        customerId: integ.google_ads_customer_id ?? undefined,
      };
    }
  }

  return c.json({
    key: license.key,
    email: license.email,
    plan: license.plan,
    integrations,
  });
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

// integrations 取得（admin）
app.get("/admin/licenses/:key/integrations", adminMiddleware, async (c) => {
  const key = c.req.param("key");
  const row = await c.env.DB.prepare(
    "SELECT * FROM license_integrations WHERE license_key = ?"
  ).bind(key).first<Record<string, string | null>>();
  return c.json({ integrations: row ?? null });
});

// integrations 登録・更新（admin）
app.put("/admin/licenses/:key/integrations", adminMiddleware, async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json<{
    meta_access_token?: string;
    meta_ad_account_id?: string;
    line_channel_access_token?: string;
    line_channel_secret?: string;
    utage_api_key?: string;
    google_ads_developer_token?: string;
    google_ads_client_id?: string;
    google_ads_client_secret?: string;
    google_ads_refresh_token?: string;
    google_ads_customer_id?: string;
  }>();

  const license = await c.env.DB.prepare("SELECT key FROM licenses WHERE key = ?")
    .bind(key).first<{ key: string }>();
  if (!license) return c.json({ error: "license not found" }, 404);

  await c.env.DB.prepare(`
    INSERT INTO license_integrations (
      license_key, meta_access_token, meta_ad_account_id,
      line_channel_access_token, line_channel_secret, utage_api_key,
      google_ads_developer_token, google_ads_client_id, google_ads_client_secret,
      google_ads_refresh_token, google_ads_customer_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(license_key) DO UPDATE SET
      meta_access_token = excluded.meta_access_token,
      meta_ad_account_id = excluded.meta_ad_account_id,
      line_channel_access_token = excluded.line_channel_access_token,
      line_channel_secret = excluded.line_channel_secret,
      utage_api_key = excluded.utage_api_key,
      google_ads_developer_token = excluded.google_ads_developer_token,
      google_ads_client_id = excluded.google_ads_client_id,
      google_ads_client_secret = excluded.google_ads_client_secret,
      google_ads_refresh_token = excluded.google_ads_refresh_token,
      google_ads_customer_id = excluded.google_ads_customer_id,
      updated_at = datetime('now')
  `).bind(
    key,
    body.meta_access_token ?? null,
    body.meta_ad_account_id ?? null,
    body.line_channel_access_token ?? null,
    body.line_channel_secret ?? null,
    body.utage_api_key ?? null,
    body.google_ads_developer_token ?? null,
    body.google_ads_client_id ?? null,
    body.google_ads_client_secret ?? null,
    body.google_ads_refresh_token ?? null,
    body.google_ads_customer_id ?? null,
  ).run();

  return c.json({ ok: true });
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

export default app;
