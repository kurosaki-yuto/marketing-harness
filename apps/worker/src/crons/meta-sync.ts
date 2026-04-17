import { MetaAdsClient } from "@marketing-harness/ads-sdk";
import type { Env } from "../index";

export async function syncMetaAds(env: Env): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  const { results: companies } = await env.DB.prepare(
    "SELECT id, account_id, meta_ad_account_id FROM companies WHERE meta_ad_account_id IS NOT NULL AND meta_ad_account_id != ''"
  ).all<{ id: string; account_id: string; meta_ad_account_id: string }>();

  if (companies.length === 0) return;

  for (const company of companies) {
    const client = new MetaAdsClient(env.META_ACCESS_TOKEN, company.meta_ad_account_id);

    try {
      // campaigns upsert
      const campaigns = await client.getCampaigns();
      for (const campaign of campaigns) {
        await env.DB.prepare(
          `INSERT INTO campaigns (id, account_id, company_id, name, status, objective, daily_budget)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id, account_id) DO UPDATE SET
             name = excluded.name,
             status = excluded.status,
             objective = excluded.objective,
             daily_budget = excluded.daily_budget,
             updated_at = datetime('now')`
        )
          .bind(
            campaign.id,
            company.account_id,
            company.id,
            campaign.name,
            campaign.status,
            campaign.objective ?? null,
            campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null
          )
          .run();
      }

      // daily insights upsert
      const insights = await client.getDailyInsights("campaign", dateStr, dateStr);
      for (const insight of insights) {
        const conversions = client.extractConversions(insight);
        const impressions = Number(insight.impressions) || 0;
        const clicks = Number(insight.clicks) || 0;
        const spend = Number(insight.spend) || 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
        const cpc = clicks > 0 ? spend / clicks : null;
        const cpa = conversions > 0 ? spend / conversions : null;

        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO ad_metrics
             (id, account_id, company_id, campaign_id, date, impressions, clicks, spend, conversions, ctr, cpc, cpa)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             impressions = excluded.impressions,
             clicks = excluded.clicks,
             spend = excluded.spend,
             conversions = excluded.conversions,
             ctr = excluded.ctr,
             cpc = excluded.cpc,
             cpa = excluded.cpa`
        )
          .bind(
            id,
            company.account_id,
            company.id,
            insight.campaign_id ?? "",
            insight.date_start,
            impressions,
            clicks,
            spend,
            conversions,
            ctr,
            cpc,
            cpa
          )
          .run();
      }

      console.log(`Meta sync done: company=${company.id} date=${dateStr} campaigns=${campaigns.length} insights=${insights.length}`);
    } catch (err) {
      console.error(`Meta sync failed for company=${company.id}:`, err);
    }
  }
}
