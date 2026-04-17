"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { FileText, Loader2, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Company = { id: string; name: string };
type ReportSummary = { id: string; company_id: string; month: string; created_at: string };
type ReportDetail = ReportSummary & { content: string };

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<ReportDetail | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ companyId: "", month: new Date().toISOString().slice(0, 7) });

  const loadCompanies = () => apiFetch<Company[]>("/api/companies").then(setCompanies).catch(console.error);
  const loadReports = () => apiFetch<ReportSummary[]>("/api/reports").then(setReports).catch(console.error);

  useEffect(() => {
    loadCompanies();
    loadReports();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genForm.companyId) return;
    setGenerating(true);
    try {
      const result = await apiFetch<{ id: string; report: string }>("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify({ companyId: genForm.companyId, month: genForm.month }),
      });
      setSelected({
        id: result.id,
        company_id: genForm.companyId,
        month: genForm.month,
        created_at: new Date().toISOString(),
        content: result.report,
      });
      loadReports();
    } catch (err) {
      alert(`生成失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpen = async (id: string) => {
    const detail = await apiFetch<ReportDetail>(`/api/reports/${id}`);
    setSelected(detail);
  };

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? id;

  if (selected) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-60">
          <Header onOpenChat={() => setChatOpen(!chatOpen)} chatOpen={chatOpen} />
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 text-sm text-black/50 hover:text-black mb-4 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> レポート一覧に戻る
                </button>
                <div className="flex items-baseline gap-3 mb-6">
                  <h1 className="text-xl font-bold text-black">{selected.month} レポート</h1>
                  <span className="text-sm text-black/40">{companyName(selected.company_id)}</span>
                </div>
                <Card>
                  <div className="prose prose-sm max-w-none text-black">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                  </div>
                </Card>
              </div>
            </main>
            {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60">
        <Header onOpenChat={() => setChatOpen(!chatOpen)} chatOpen={chatOpen} />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-xl font-bold text-black mb-6">レポート</h1>

              <Card className="mb-6">
                <h2 className="font-medium mb-4">月次レポートを生成</h2>
                <form onSubmit={handleGenerate} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-black/60 mb-1 block">企業</label>
                    <select
                      required
                      value={genForm.companyId}
                      onChange={(e) => setGenForm({ ...genForm, companyId: e.target.value })}
                      className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    >
                      <option value="">選択してください</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-black/60 mb-1 block">対象月</label>
                    <input
                      type="month"
                      value={genForm.month}
                      onChange={(e) => setGenForm({ ...genForm, month: e.target.value })}
                      className="rounded-lg border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={generating}>
                    {generating ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" />生成中...</>
                    ) : (
                      "生成"
                    )}
                  </Button>
                </form>
              </Card>

              <div className="space-y-3">
                {reports.length === 0 && (
                  <p className="text-sm text-black/40 text-center py-8">レポートがありません</p>
                )}
                {reports.map((r) => (
                  <Card
                    key={r.id}
                    className="cursor-pointer hover:border-black/20 transition-colors"
                    onClick={() => handleOpen(r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.month} レポート</p>
                        <p className="text-xs text-black/40">{companyName(r.company_id)}</p>
                      </div>
                      <p className="text-xs text-black/30 ml-auto">
                        {new Date(r.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </main>
          {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
