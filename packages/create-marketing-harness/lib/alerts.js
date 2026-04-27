import { workerGet } from "./worker-client.js";

const CPA_ROAS_THRESHOLD = 0.20;
const BUDGET_THRESHOLD = 0.80;
const CV_THRESHOLD = 0.20;

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function deltaPct(prev, curr) {
  if (!prev || prev === 0) return null;
  return (curr - prev) / prev;
}

function fmtPct(p) {
  const sign = p >= 0 ? "+" : "";
  return `${sign}${Math.round(p * 100)}%`;
}

function fmtYen(n) {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export async function collectAlerts(cfg) {
  const alerts = [];

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBefore = new Date(today);
  dayBefore.setDate(today.getDate() - 2);

  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(yesterday);
  const dayBeforeStr = toDateStr(dayBefore);

  const companyId = cfg?.companies?.[0]?.id ?? null;

  const [campaigns, metricsRaw, postsRaw, utageRaw] = await Promise.all([
    workerGet(cfg, "/api/campaigns", companyId ? { companyId } : {}),
    workerGet(cfg, "/api/metrics", {
      ...(companyId ? { companyId } : {}),
      from: dayBeforeStr,
      to: todayStr,
    }),
    workerGet(cfg, "/api/social/posts", { status: "published" }),
    workerGet(cfg, "/api/integrations/utage/subscribers", { limit: "1" }),
  ]);

  const campaignMap = {};
  for (const c of campaigns ?? []) campaignMap[c.id] = c;

  const metrics = Array.isArray(metricsRaw) ? metricsRaw : (metricsRaw?.results ?? []);

  // --- CPA/ROAS 急変 ---
  try {
    const byId = {};
    for (const m of metrics) {
      if (!byId[m.campaign_id]) byId[m.campaign_id] = {};
      byId[m.campaign_id][m.date] = m;
    }
    for (const [cid, byDate] of Object.entries(byId)) {
      const curr = byDate[yesterdayStr] ?? byDate[todayStr];
      const prev = byDate[dayBeforeStr] ?? byDate[yesterdayStr];
      if (!curr || !prev || curr === prev) continue;
      if (!curr.spend || curr.spend === 0) continue;

      const campaign = campaignMap[cid];
      const label = campaign?.name ?? cid;
      const platform = (campaign?.platform ?? "").charAt(0).toUpperCase() + (campaign?.platform ?? "").slice(1);
      const cat = platform || "広告";

      if (curr.cpa && prev.cpa) {
        const dp = deltaPct(prev.cpa, curr.cpa);
        if (dp !== null && Math.abs(dp) >= CPA_ROAS_THRESHOLD) {
          alerts.push({
            icon: "⚠",
            category: cat,
            text: `「${label}」 CPA${fmtYen(prev.cpa)} → ${fmtYen(curr.cpa)} (${fmtPct(dp)})`,
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
  } catch { /* ignore */ }

  // --- 予算消化 ---
  try {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const elapsed = Math.max(1, Math.round((today - monthStart) / 86400000));

    for (const c of campaigns ?? []) {
      if (!c.daily_budget || c.daily_budget === 0) continue;
      const monthlyBudget = c.daily_budget * 30;
      const campaignMetrics = metrics.filter((m) => m.campaign_id === c.id);
      const spent = campaignMetrics.reduce((sum, m) => sum + (m.spend ?? 0), 0);
      const ratio = spent / monthlyBudget;
      if (ratio >= BUDGET_THRESHOLD) {
        const remaining = Math.round(monthlyBudget - spent);
        const remainDays = 30 - elapsed;
        const cat = (c.platform ?? "広告").charAt(0).toUpperCase() + (c.platform ?? "広告").slice(1);
        alerts.push({
          icon: "⚠",
          category: cat,
          text: `「${c.name}」 月間予算消化 ${Math.round(ratio * 100)}%  残り ${remainDays} 日 (残${fmtYen(remaining)})`,
        });
      }
    }
  } catch { /* ignore */ }

  // --- CV 数・CVR 変化 ---
  try {
    let cvToday = 0, cvYesterday = 0, clicksToday = 0, clicksYesterday = 0;
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
      if (dp !== null && Math.abs(dp) >= CV_THRESHOLD) {
        alerts.push({
          icon: dp < 0 ? "⚠" : "ℹ",
          category: "CV",
          text: `コンバージョン数 ${cvYesterday}件 → ${cvToday}件 (${fmtPct(dp)})`,
        });
      }
    }
    if (clicksYesterday > 0 && cvYesterday > 0) {
      const cvrPrev = cvYesterday / clicksYesterday;
      const cvrCurr = clicksToday > 0 ? cvToday / clicksToday : 0;
      const dp = deltaPct(cvrPrev, cvrCurr);
      if (dp !== null && Math.abs(dp) >= CV_THRESHOLD) {
        alerts.push({
          icon: dp < 0 ? "⚠" : "ℹ",
          category: "CV",
          text: `CVR ${(cvrPrev * 100).toFixed(1)}% → ${(cvrCurr * 100).toFixed(1)}% (${fmtPct(dp)})`,
        });
      }
    }
  } catch { /* ignore */ }

  // --- SNS 投稿件数 ---
  try {
    const posts = Array.isArray(postsRaw) ? postsRaw : (postsRaw?.results ?? []);
    const todayPosts = posts.filter((p) => (p.published_at ?? "").startsWith(todayStr)).length;
    const yesterdayPosts = posts.filter((p) => (p.published_at ?? "").startsWith(yesterdayStr)).length;
    const diff = todayPosts - yesterdayPosts;
    if (yesterdayPosts > 0 || todayPosts > 0) {
      alerts.push({
        icon: "ℹ",
        category: "SNS",
        text: diff >= 0
          ? `投稿 ${todayPosts}件 (前日比 +${diff}件)`
          : `投稿 ${todayPosts}件 (前日比 ${diff}件)`,
      });
    }
  } catch { /* ignore */ }

  // --- UTAGE 登録者数 ---
  try {
    if (utageRaw && !utageRaw.error) {
      const count = utageRaw.total ?? utageRaw.count ?? null;
      if (count != null) {
        alerts.push({
          icon: "ℹ",
          category: "UTAGE",
          text: `登録者 ${count.toLocaleString("ja-JP")}人`,
        });
      }
    }
  } catch { /* ignore */ }

  return alerts;
}
