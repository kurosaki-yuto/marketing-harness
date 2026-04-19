import type { Env } from "../index";

const CPA_ROAS_THRESHOLD = 0.20;
const BUDGET_THRESHOLD = 0.80;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function deltaPct(prev: number, curr: number): number | null {
  if (!prev || prev === 0) return null;
  return (curr - prev) / prev;
}

function fmtPct(p: number): string {
  return `${p >= 0 ? "+" : ""}${Math.round(p * 100)}%`;
}

function fmtYen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

type MetricRow = {
  campaign_id: string;
  date: string;
  spend: number;
  cpa: number;
  roas: number;
  conversions: number;
  clicks: number;
};

type CampaignRow = {
  id: string;
  name: string;
  platform: string;
  daily_budget: number;
};

type Alert = { icon: string; category: string; text: string };

async function collectAlerts(env: Env, accountId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBefore = new Date(today);
  dayBefore.setDate(today.getDate() - 2);

  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(yesterday);
  const dayBeforeStr = toDateStr(dayBefore);

  const [{ results: campaigns }, { results: metrics }] = await Promise.all([
    env.DB.prepare(
      "SELECT id, name, platform, daily_budget FROM campaigns WHERE account_id = ? AND status = 'ACTIVE'"
    ).bind(accountId).all<CampaignRow>(),
    env.DB.prepare(
      "SELECT campaign_id, date, spend, cpa, roas, conversions, clicks FROM ad_metrics WHERE account_id = ? AND date >= ? ORDER BY date"
    ).bind(accountId, dayBeforeStr).all<MetricRow>(),
  ]);

  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));

  // CPA/ROAS 急変
  const byId: Record<string, Record<string, MetricRow>> = {};
  for (const m of metrics) {
    if (!byId[m.campaign_id]) byId[m.campaign_id] = {};
    byId[m.campaign_id][m.date] = m;
  }
  for (const [cid, byDate] of Object.entries(byId)) {
    const curr = byDate[yesterdayStr] ?? byDate[todayStr];
    const prev = byDate[dayBeforeStr];
    if (!curr || !prev || !curr.spend) continue;

    const campaign = campaignMap[cid];
    const label = campaign?.name ?? cid;
    const cat = campaign?.platform
      ? campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)
      : "広告";

    if (curr.cpa && prev.cpa) {
      const dp = deltaPct(prev.cpa, curr.cpa);
      if (dp !== null && Math.abs(dp) >= CPA_ROAS_THRESHOLD) {
        alerts.push({
          icon: "⚠",
          category: cat,
          text: `「${label}」 CPA ${fmtYen(prev.cpa)} → ${fmtYen(curr.cpa)} (${fmtPct(dp)})`,
        });
      }
    }
    if (curr.roas && prev.roas) {
      const dp = deltaPct(prev.roas, curr.roas);
      if (dp !== null && Math.abs(dp) >= CPA_ROAS_THRESHOLD) {
        alerts.push({
          icon: "⚠",
          category: cat,
          text: `「${label}」 ROAS ${prev.roas.toFixed(2)} → ${curr.roas.toFixed(2)} (${fmtPct(dp)})`,
        });
      }
    }
  }

  // 月間予算消化
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const elapsed = Math.max(1, Math.round((today.getTime() - monthStart.getTime()) / 86400000));
  for (const c of campaigns) {
    if (!c.daily_budget) continue;
    const monthlyBudget = c.daily_budget * 30;
    const spent = metrics
      .filter((m) => m.campaign_id === c.id)
      .reduce((sum, m) => sum + (m.spend ?? 0), 0);
    const ratio = spent / monthlyBudget;
    if (ratio >= BUDGET_THRESHOLD) {
      const remaining = Math.round(monthlyBudget - spent);
      const cat = c.platform
        ? c.platform.charAt(0).toUpperCase() + c.platform.slice(1)
        : "広告";
      alerts.push({
        icon: "⚠",
        category: cat,
        text: `「${c.name}」 月間予算消化 ${Math.round(ratio * 100)}%  残り ${30 - elapsed} 日 (残${fmtYen(remaining)})`,
      });
    }
  }

  // CV 数変化
  let cvYesterday = 0, cvToday = 0, clicksYesterday = 0, clicksToday = 0;
  for (const m of metrics) {
    if (m.date === yesterdayStr || m.date === todayStr) {
      cvToday += m.conversions ?? 0;
      clicksToday += m.clicks ?? 0;
    } else {
      cvYesterday += m.conversions ?? 0;
      clicksYesterday += m.clicks ?? 0;
    }
  }
  if (cvYesterday > 0) {
    const dp = deltaPct(cvYesterday, cvToday);
    if (dp !== null && Math.abs(dp) >= 0.20) {
      alerts.push({
        icon: dp < 0 ? "⚠" : "ℹ",
        category: "CV",
        text: `コンバージョン数 ${cvYesterday}件 → ${cvToday}件 (${fmtPct(dp)})`,
      });
    }
    if (clicksYesterday > 0) {
      const cvrPrev = cvYesterday / clicksYesterday;
      const cvrCurr = clicksToday > 0 ? cvToday / clicksToday : 0;
      const dp2 = deltaPct(cvrPrev, cvrCurr);
      if (dp2 !== null && Math.abs(dp2) >= 0.20) {
        alerts.push({
          icon: dp2 < 0 ? "⚠" : "ℹ",
          category: "CV",
          text: `CVR ${(cvrPrev * 100).toFixed(1)}% → ${(cvrCurr * 100).toFixed(1)}% (${fmtPct(dp2)})`,
        });
      }
    }
  }

  return alerts;
}

async function sendLine(env: Env, to: string, message: string): Promise<void> {
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, messages: [{ type: "text", text: message }] }),
    });
  } catch (err) {
    console.error("Morning brief LINE push failed:", err);
  }
}

export async function sendMorningBrief(env: Env): Promise<void> {
  const notifyTo = env.LINE_NOTIFY_USER_ID;
  if (!notifyTo || !env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.log("Morning brief: LINE_NOTIFY_USER_ID or LINE_CHANNEL_ACCESS_TOKEN not set, skipping");
    return;
  }

  const { results: accounts } = await env.DB.prepare(
    "SELECT id FROM accounts"
  ).all<{ id: string }>();

  for (const account of accounts) {
    const alerts = await collectAlerts(env, account.id);
    if (alerts.length === 0) continue;

    const d = new Date();
    const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const body = alerts.map((a) => `${a.icon} [${a.category}] ${a.text}`).join("\n");
    const message = `【朝の広告チェック ${dateStr}】\n\n${body}\n\nClaude を起動して確認・対応できます。`;

    await sendLine(env, notifyTo, message);
  }
}
