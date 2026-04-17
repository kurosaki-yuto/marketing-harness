import { Hono } from "hono";
import { cors } from "hono/cors";
import { accountsRouter } from "./api/accounts";
import { companiesRouter } from "./api/companies";
import { knowledgeRouter } from "./api/knowledge";
import { chatRouter } from "./api/chat";
import { metricsRouter } from "./api/metrics";
import { kpiRouter } from "./api/kpi";
import { reportsRouter } from "./api/reports";
import { changeHistoryRouter } from "./api/change-history";
import { campaignsRouter } from "./api/campaigns";
import { socialAccountsRouter } from "./api/social/accounts";
import { socialPostsRouter } from "./api/social/posts";
import { authMiddleware } from "./middleware/auth";
import { handleCron } from "./crons";

export type Env = {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  META_ACCESS_TOKEN: string;
  META_AD_ACCOUNT_ID: string;
  API_KEY: string;
  ALERT_WEBHOOK_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// アカウント作成は認証不要
app.post("/api/accounts/signup", async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) return c.json({ error: "name is required" }, 400);
  const id = crypto.randomUUID();
  const apiKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    "INSERT INTO accounts (id, name, api_key) VALUES (?, ?, ?)"
  )
    .bind(id, name.trim(), apiKey)
    .run();
  return c.json({ id, api_key: apiKey }, 201);
});

// 認証が必要なルート
app.use("/api/*", authMiddleware);

app.route("/api/accounts", accountsRouter);
app.route("/api/companies", companiesRouter);
app.route("/api/knowledge", knowledgeRouter);
app.route("/api/chat", chatRouter);
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
