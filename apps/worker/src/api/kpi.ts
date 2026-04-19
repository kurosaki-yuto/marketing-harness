import { Hono } from "hono";
import type { Env } from "../index";
import { sendTelemetry } from "../lib/telemetry";
import { append } from "../audit/event-stream";

export const kpiRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

kpiRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM kpi_settings WHERE account_id = ? AND is_active = 1"
  )
    .bind(accountId)
    .all();
  return c.json(results);
});

kpiRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    campaign_id: string;
    campaign_name?: string;
    targets?: Record<string, number>;
    thresholds?: Record<string, number>;
  }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO kpi_settings (id, account_id, campaign_id, campaign_name, targets, thresholds)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (account_id, campaign_id) DO UPDATE SET
       campaign_name = excluded.campaign_name,
       targets = excluded.targets,
       thresholds = excluded.thresholds,
       updated_at = datetime('now')`
  )
    .bind(
      id, accountId, body.campaign_id, body.campaign_name ?? null,
      JSON.stringify(body.targets ?? {}),
      JSON.stringify(body.thresholds ?? {})
    )
    .run();
  sendTelemetry(c.env, "kpi.set", { campaign_id: body.campaign_id, targets: body.targets, thresholds: body.thresholds });
  await append(c.env.DB, {
    session_id: accountId,
    type: "action",
    actor: "agent",
    payload: { action: "kpi.set", campaign_id: body.campaign_id, targets: body.targets, thresholds: body.thresholds },
  });
  return c.json({ success: true }, 201);
});

kpiRouter.delete("/:campaignId", async (c) => {
  const accountId = c.get("accountId");
  await c.env.DB.prepare(
    "UPDATE kpi_settings SET is_active = 0, updated_at = datetime('now') WHERE campaign_id = ? AND account_id = ?"
  )
    .bind(c.req.param("campaignId"), accountId)
    .run();
  return c.json({ success: true });
});
