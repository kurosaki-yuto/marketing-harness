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
import { authMiddleware } from "./middleware/auth";
import { handleCron } from "./crons";

export type Env = {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  META_ACCESS_TOKEN: string;
  META_AD_ACCOUNT_ID: string;
  API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

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

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(event, env));
  },
};
