import { Hono } from "hono";
import type { Env } from "../../index";

export const googleAdsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

async function getAccessToken(env: Env): Promise<string | null> {
  if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET || !env.GOOGLE_ADS_REFRESH_TOKEN) {
    return null;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

googleAdsRouter.get("/status", async (c) => {
  if (!c.env.GOOGLE_ADS_DEVELOPER_TOKEN || !c.env.GOOGLE_ADS_CUSTOMER_ID) {
    return c.json({ configured: false, error: "Integration not configured" }, 503);
  }
  const accessToken = await getAccessToken(c.env);
  if (!accessToken) return c.json({ configured: true, healthy: false, error: "OAuth token refresh failed" }, 200);

  try {
    const customerId = c.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");
    const res = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": c.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        },
      }
    );
    if (!res.ok) return c.json({ configured: true, healthy: false, status: res.status }, 200);
    return c.json({ configured: true, healthy: true });
  } catch {
    return c.json({ configured: true, healthy: false, error: "Connection failed" }, 200);
  }
});

googleAdsRouter.post("/sync", async (c) => {
  if (!c.env.GOOGLE_ADS_DEVELOPER_TOKEN || !c.env.GOOGLE_ADS_CUSTOMER_ID) {
    return c.json({ error: "Integration not configured" }, 503);
  }
  const accountId = c.get("accountId");
  const { companyId } = await c.req.json<{ companyId: string }>();
  if (!companyId) return c.json({ error: "companyId is required" }, 400);

  const accessToken = await getAccessToken(c.env);
  if (!accessToken) return c.json({ error: "OAuth token refresh failed" }, 401);

  const customerId = c.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");
  const query = `
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id
    LIMIT 100
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": c.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: `Google Ads API error ${res.status}: ${text}` }, 400);
  }

  const data = await res.json() as { results?: { campaign: { id: string; name: string; status: string }; campaignBudget: { amountMicros: string } }[] };
  const results = data.results ?? [];

  let synced = 0;
  for (const row of results) {
    const { campaign, campaignBudget } = row;
    const dailyBudget = campaignBudget?.amountMicros ? Number(campaignBudget.amountMicros) / 1_000_000 : null;
    await c.env.DB.prepare(
      `INSERT INTO campaigns (id, account_id, company_id, name, status, objective, daily_budget)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id, account_id) DO UPDATE SET
         name = excluded.name,
         status = excluded.status,
         daily_budget = excluded.daily_budget,
         updated_at = datetime('now')`
    )
      .bind(`gads_${campaign.id}`, accountId, companyId, campaign.name, campaign.status, "GOOGLE_ADS", dailyBudget)
      .run();
    synced++;
  }

  return c.json({ synced });
});
