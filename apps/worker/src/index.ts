import { Hono } from "hono";
import { cors } from "hono/cors";
import { accountsRouter } from "./api/accounts";
import { companiesRouter } from "./api/companies";
import { knowledgeRouter } from "./api/knowledge";
import { metricsRouter } from "./api/metrics";
import { kpiRouter } from "./api/kpi";
import { reportsRouter } from "./api/reports";
import { changeHistoryRouter } from "./api/change-history";
import { campaignsRouter } from "./api/campaigns";
import { socialAccountsRouter } from "./api/social/accounts";
import { socialPostsRouter } from "./api/social/posts";
import { authMiddleware } from "./middleware/auth";
import { licenseMiddleware } from "./middleware/license";
import { handleCron } from "./crons";

export type Env = {
  DB: D1Database;
  META_ACCESS_TOKEN: string;
  META_AD_ACCOUNT_ID: string;
  API_KEY: string;
  LICENSE_KEY: string;
  LICENSE_SERVER_URL: string;
  ALERT_WEBHOOK_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// アカウント作成（ライセンスキー検証が通った場合のみ）
app.post("/api/accounts/signup", async (c) => {
  const { name, license_key } = await c.req.json<{ name: string; license_key?: string }>();
  if (!name?.trim()) return c.json({ error: "name is required" }, 400);

  const key = license_key ?? c.env.LICENSE_KEY;
  if (!key) return c.json({ error: "license_key is required" }, 400);

  // license-server で検証
  const instanceId = crypto.randomUUID();
  let verifyResult: { valid: boolean; plan?: string; expires_at?: string | null; reason?: string };
  try {
    const res = await fetch(`${c.env.LICENSE_SERVER_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key, instance_id: instanceId }),
    });
    verifyResult = await res.json();
  } catch {
    return c.json({ error: "License server unreachable" }, 503);
  }

  if (!verifyResult.valid) {
    return c.json({ error: "Invalid or revoked license", reason: verifyResult.reason }, 403);
  }

  const id = crypto.randomUUID();
  const apiKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    `INSERT INTO accounts (id, name, api_key, license_key, license_plan, license_expires_at, license_last_verified_at, instance_id)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`
  )
    .bind(id, name.trim(), apiKey, key, verifyResult.plan ?? "community", verifyResult.expires_at ?? null, instanceId)
    .run();

  return c.json({ id, api_key: apiKey }, 201);
});

// 認証 + ライセンス検証
app.use("/api/*", authMiddleware);
app.use("/api/*", licenseMiddleware);

app.route("/api/accounts", accountsRouter);
app.route("/api/companies", companiesRouter);
app.route("/api/knowledge", knowledgeRouter);
app.route("/api/metrics", metricsRouter);
app.route("/api/kpi", kpiRouter);
app.route("/api/reports", reportsRouter);
app.route("/api/change-history", changeHistoryRouter);
app.route("/api/campaigns", campaignsRouter);
app.route("/api/social/accounts", socialAccountsRouter);
app.route("/api/social/posts", socialPostsRouter);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(event, env));
  },
};
