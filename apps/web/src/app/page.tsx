"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { BarChart2, BookOpen, TrendingUp, FileText } from "lucide-react";

type DashboardStats = {
  companies: number;
  knowledge: number;
  reports: number;
  kpiActive: number;
};

export default function DashboardPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ companies: 0, knowledge: 0, reports: 0, kpiActive: 0 });

  useEffect(() => {
    Promise.all([
      apiFetch<unknown[]>("/api/companies").catch(() => []),
      apiFetch<unknown[]>("/api/knowledge").catch(() => []),
      apiFetch<unknown[]>("/api/reports").catch(() => []),
      apiFetch<unknown[]>("/api/kpi").catch(() => []),
    ]).then(([companies, knowledge, reports, kpi]) => {
      setStats({
        companies: (companies as unknown[]).length,
        knowledge: (knowledge as unknown[]).length,
        reports: (reports as unknown[]).length,
        kpiActive: (kpi as unknown[]).length,
      });
    });
  }, []);

  const statCards = [
    { label: "企業数", value: stats.companies, icon: BarChart2, href: "/companies" },
    { label: "ナレッジ", value: stats.knowledge, icon: BookOpen, href: "/knowledge" },
    { label: "KPI設定中", value: stats.kpiActive, icon: TrendingUp, href: "/kpi" },
    { label: "レポート", value: stats.reports, icon: FileText, href: "/reports" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60">
        <Header onOpenChat={() => setChatOpen(!chatOpen)} chatOpen={chatOpen} />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-xl font-bold text-black mb-6">ダッシュボード</h1>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <a key={card.label} href={card.href}>
                      <Card className="hover:border-black/20 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-black/60" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-black">{card.value}</p>
                            <p className="text-xs text-black/50">{card.label}</p>
                          </div>
                        </div>
                      </Card>
                    </a>
                  );
                })}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>クイックスタート</CardTitle></CardHeader>
                  <ol className="space-y-2 text-sm text-black/70">
                    <li className="flex gap-2"><span className="text-black font-medium">1.</span> 設定 → APIキーを登録</li>
                    <li className="flex gap-2"><span className="text-black font-medium">2.</span> 企業一覧 → 広告主を追加</li>
                    <li className="flex gap-2"><span className="text-black font-medium">3.</span> Meta Ads連携を設定</li>
                    <li className="flex gap-2"><span className="text-black font-medium">4.</span> AIアシスタントで改善提案を受ける</li>
                  </ol>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Claude Code連携</CardTitle></CardHeader>
                  <div className="space-y-2">
                    <p className="text-sm text-black/60 mb-3">MCPサーバーを登録すると Claude Code から全操作が可能です</p>
                    <code className="block text-xs bg-black/5 rounded-lg p-3 font-mono whitespace-pre">
{`MARKETING_HARNESS_URL=https://your-worker.workers.dev \\
MARKETING_HARNESS_API_KEY=your-key \\
claude mcp add marketing-harness \\
  -- node ./packages/mcp-server/dist/index.js`}
                    </code>
                  </div>
                </Card>
              </div>
            </div>
          </main>
          {chatOpen && (
            <ChatPanel onClose={() => setChatOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
