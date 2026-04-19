import { fetchUsage } from "@/lib/admin/usage-client";
import type { CommandStat, ConnectorHealth, FailedEvent } from "@/lib/admin/usage-client";
import { logoutAction } from "../login/actions";
import { Button } from "@/components/ui/button";

export default async function UsagePage() {
  let data: Awaited<ReturnType<typeof fetchUsage>> | null = null;
  let error: string | null = null;
  try {
    data = await fetchUsage(30);
  } catch (err) {
    error = err instanceof Error ? err.message : "データの取得に失敗しました";
  }

  const actionLabels: Record<string, string> = {
    "kpi.set": "KPI 設定",
    "sns.propose": "SNS 投稿提案",
    "sns.approve": "SNS 投稿承認",
    "sns.published": "SNS 自動投稿",
    "sns.failed": "SNS 投稿失敗",
    "line.send": "LINE 送信",
  };

  const byAction = data
    ? data.command_stats.reduce<Record<string, number>>((acc, s) => {
        const label = actionLabels[s.action] ?? s.action;
        acc[label] = (acc[label] ?? 0) + s.count;
        return acc;
      }, {})
    : {};
  const actionEntries = Object.entries(byAction).sort(([, a], [, b]) => b - a);

  return (
    <>
      <header className="bg-white border-b border-black/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-black">marketing-harness admin</span>
          <nav className="flex gap-2 text-sm">
            <a href="/admin/licenses" className="text-black/50 hover:text-black transition-colors">ライセンス</a>
            <a href="/admin/knowledge" className="text-black/50 hover:text-black transition-colors">ナレッジ</a>
            <a href="/admin/usage" className="text-black font-medium">利用状況</a>
          </nav>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">ログアウト</Button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-black">利用状況（直近 30 日）</h1>
          <p className="text-sm text-black/50 mt-1">アクション頻度 / 連携の安定性 / 直近の失敗</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* アクション頻度 */}
            <section className="bg-white border border-black/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-black">アクション頻度</h2>
              </div>
              {actionEntries.length === 0 ? (
                <p className="px-4 py-8 text-sm text-black/40 text-center">データがありません</p>
              ) : (
                <div className="divide-y divide-black/5">
                  {actionEntries.map(([label, count]) => {
                    const maxCount = actionEntries[0][1];
                    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                    return (
                      <div key={label} className="px-4 py-3 flex items-center gap-3">
                        <span className="text-sm text-black w-40 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                          <div className="h-full bg-black/20 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-black/50 w-10 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 連携の安定性 */}
            <section className="bg-white border border-black/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-black">連携の安定性</h2>
              </div>
              {data.connector_health.length === 0 ? (
                <p className="px-4 py-8 text-sm text-black/40 text-center">データがありません</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-black/3 text-black/60">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">連携</th>
                      <th className="text-left px-4 py-2 font-medium">成功率</th>
                      <th className="text-left px-4 py-2 font-medium">実行回数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {data.connector_health.map((h: ConnectorHealth) => (
                      <tr key={h.connector}>
                        <td className="px-4 py-3 text-black">{h.connector}</td>
                        <td className="px-4 py-3">
                          {h.success_rate === null ? (
                            <span className="text-black/40">-</span>
                          ) : (
                            <span className={h.success_rate < 80 ? "text-red-600 font-medium" : "text-green-700"}>
                              {h.success_rate}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-black/60">{h.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* 直近の失敗 */}
            <section className="bg-white border border-black/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-black">直近の失敗（20 件）</h2>
              </div>
              {data.failed_events.length === 0 ? (
                <p className="px-4 py-8 text-sm text-black/40 text-center">失敗はありません</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-black/3 text-black/60">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">日時</th>
                      <th className="text-left px-4 py-2 font-medium">アクション</th>
                      <th className="text-left px-4 py-2 font-medium">エラー</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {data.failed_events.map((e: FailedEvent, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-black/50 whitespace-nowrap">
                          {new Date(e.ts).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-black">{actionLabels[e.action] ?? e.action}</td>
                        <td className="px-4 py-3 text-red-600 text-xs max-w-xs truncate">{e.error ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
