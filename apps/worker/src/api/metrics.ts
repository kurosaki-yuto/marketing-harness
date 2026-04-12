import { Hono } from "hono";
import type { Env } from "../index";

export const metricsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

metricsRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const companyId = c.req.query("companyId");
  const campaignId = c.req.query("campaignId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  let query = "SELECT * FROM ad_metrics WHERE account_id = ?";
  const params: unknown[] = [accountId];

  if (companyId) { query += " AND company_id = ?"; params.push(companyId); }
  if (campaignId) { query += " AND campaign_id = ?"; params.push(campaignId); }
  if (from) { query += " AND date >= ?"; params.push(from); }
  if (to) { query += " AND date <= ?"; params.push(to); }
  query += " ORDER BY date DESC LIMIT 90";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

metricsRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    company_id: string;
    campaign_id: string;
    adset_id?: string;
    ad_id?: string;
    date: string;
    impressions?: number;
    clicks?: number;
    spend?: number;
    conversions?: number;
    revenue?: number;
  }>();

  const id = crypto.randomUUID();
  const ctr = body.impressions && body.clicks ? (body.clicks / body.impressions) * 100 : null;
  const cpc = body.clicks && body.spend ? body.spend / body.clicks : null;
  const cpa = body.conversions && body.spend ? body.spend / body.conversions : null;
  const roas = body.spend && body.revenue ? (body.revenue / body.spend) * 100 : null;

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO ad_metrics
     (id, account_id, company_id, campaign_id, adset_id, ad_id, date,
      impressions, clicks, spend, conversions, revenue, ctr, cpc, cpa, roas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id, accountId, body.company_id, body.campaign_id,
      body.adset_id ?? null, body.ad_id ?? null, body.date,
      body.impressions ?? 0, body.clicks ?? 0, body.spend ?? 0,
      body.conversions ?? 0, body.revenue ?? 0,
      ctr, cpc, cpa, roas
    )
    .run();
  return c.json({ id }, 201);
});
