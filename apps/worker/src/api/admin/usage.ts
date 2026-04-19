import { Hono } from "hono";
import type { Env } from "../../index";

export const adminUsageRouter = new Hono<{ Bindings: Env }>();

type CommandStat = { date: string; actor: string; action: string; count: number };
type FailedEvent = { session_id: string; action: string; error: string; ts: string };

adminUsageRouter.get("/", async (c) => {
  const days = Number(c.req.query("days") ?? 30);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const [commandStats, failedEvents, healthStats] = await Promise.all([
    // コマンド別・日別実行回数
    c.env.DB.prepare(
      `SELECT date(ts) AS date, actor, json_extract(payload_json, '$.action') AS action, COUNT(*) AS count
       FROM events
       WHERE type = 'action' AND date(ts) >= ?
       GROUP BY date(ts), actor, action
       ORDER BY date(ts) DESC, count DESC
       LIMIT 200`
    )
      .bind(sinceStr)
      .all<CommandStat>(),

    // 失敗イベント直近 20 件
    c.env.DB.prepare(
      `SELECT session_id, json_extract(payload_json, '$.action') AS action,
              json_extract(payload_json, '$.error') AS error, ts
       FROM events
       WHERE type = 'observation' AND actor = 'cron'
         AND json_extract(payload_json, '$.action') LIKE '%.failed'
       ORDER BY ts DESC LIMIT 20`
    )
      .all<FailedEvent>(),

    // connector healthcheck 成功率（connector イベントから集計）
    c.env.DB.prepare(
      `SELECT json_extract(payload_json, '$.connector') AS connector,
              SUM(CASE WHEN json_extract(payload_json, '$.success') = 1 THEN 1 ELSE 0 END) AS ok,
              COUNT(*) AS total
       FROM events
       WHERE type = 'connector' AND date(ts) >= ?
       GROUP BY connector`
    )
      .bind(sinceStr)
      .all<{ connector: string; ok: number; total: number }>(),
  ]);

  return c.json({
    period_days: days,
    command_stats: commandStats.results,
    failed_events: failedEvents.results,
    connector_health: healthStats.results.map((r) => ({
      connector: r.connector,
      success_rate: r.total > 0 ? Math.round((r.ok / r.total) * 100) : null,
      total: r.total,
    })),
  });
});
