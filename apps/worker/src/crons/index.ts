import type { Env } from "../index";

export async function handleCron(event: ScheduledEvent, env: Env): Promise<void> {
  console.log(`Cron triggered: ${event.cron} at ${new Date().toISOString()}`);

  // KPI監視（毎5分）
  await checkKpiAlerts(env);
}

async function checkKpiAlerts(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { results: kpiList } = await env.DB.prepare(
    "SELECT k.*, a.id as account_id FROM kpi_settings k JOIN accounts a ON k.account_id = a.id WHERE k.is_active = 1"
  ).all<{
    account_id: string;
    campaign_id: string;
    campaign_name: string;
    targets: string;
    thresholds: string;
  }>();

  for (const kpi of kpiList) {
    const metrics = await env.DB.prepare(
      "SELECT * FROM ad_metrics WHERE account_id = ? AND campaign_id = ? AND date = ?"
    )
      .bind(kpi.account_id, kpi.campaign_id, today)
      .first<{ cpa: number; ctr: number; spend: number }>();

    if (!metrics) continue;

    const thresholds = JSON.parse(kpi.thresholds || "{}") as Record<string, number>;

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = metrics[metric as keyof typeof metrics] as number;
      if (value && value > threshold) {
        console.log(
          `KPI alert: ${kpi.campaign_name} ${metric} ${value} > threshold ${threshold}`
        );
        // TODO: webhook通知 or メール通知
      }
    }
  }
}
