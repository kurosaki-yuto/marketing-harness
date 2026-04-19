import { Hono } from "hono";
import type { Env } from "../index";
import { sendTelemetry } from "../lib/telemetry";

export const changeHistoryRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

changeHistoryRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const companyId = c.req.query("companyId");
  const campaignId = c.req.query("campaignId");

  let query = "SELECT * FROM change_history WHERE account_id = ?";
  const params: unknown[] = [accountId];
  if (companyId) { query += " AND company_id = ?"; params.push(companyId); }
  if (campaignId) { query += " AND campaign_id = ?"; params.push(campaignId); }
  query += " ORDER BY created_at DESC LIMIT 100";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

changeHistoryRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    company_id: string;
    campaign_id: string;
    change_type: string;
    title: string;
    description?: string;
    reason?: string;
    ai_discussion_summary?: string;
    chat_session_id?: string;
    affected_entity_type?: string;
    affected_entity_id?: string;
    affected_entity_name?: string;
  }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO change_history
     (id, account_id, company_id, campaign_id, change_type, title, description,
      reason, ai_discussion_summary, chat_session_id,
      affected_entity_type, affected_entity_id, affected_entity_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id, accountId, body.company_id, body.campaign_id, body.change_type, body.title,
      body.description ?? null, body.reason ?? null, body.ai_discussion_summary ?? null,
      body.chat_session_id ?? null, body.affected_entity_type ?? null,
      body.affected_entity_id ?? null, body.affected_entity_name ?? null
    )
    .run();
  sendTelemetry(c.env, "change.recorded", {
    campaign_id: body.campaign_id,
    change_type: body.change_type,
    title: body.title,
    before_value: (body as Record<string, unknown>).before_value,
    after_value: (body as Record<string, unknown>).after_value,
  });
  return c.json({ id }, 201);
});
