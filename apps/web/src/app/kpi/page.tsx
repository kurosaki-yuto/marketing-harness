"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { Plus, TrendingUp, X, AlertTriangle } from "lucide-react";

type KpiSetting = {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  targets: string;
  thresholds: string;
  is_active: number;
  updated_at: string;
};

const METRICS = [
  { key: "cpa", label: "CPA（円）" },
  { key: "ctr", label: "CTR（%）" },
  { key: "spend", label: "消化額（円）" },
  { key: "cpc", label: "CPC（円）" },
];

export default function KpiPage() {
  const [items, setItems] = useState<KpiSetting[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    campaign_id: "",
    campaign_name: "",
    targets: {} as Record<string, string>,
    thresholds: {} as Record<string, string>,
  });

  const load = () =>
    apiFetch<KpiSetting[]>("/api/kpi").then(setItems).catch(console.error);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/kpi", {
        method: "POST",
        body: JSON.stringify({
          campaign_id: form.campaign_id,
          campaign_name: form.campaign_name || undefined,
          targets: Object.fromEntries(
            Object.entries(form.targets).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])
          ),
          thresholds: Object.fromEntries(
            Object.entries(form.thresholds).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])
          ),
        }),
      });
      setForm({ campaign_id: "", campaign_name: "", targets: {}, thresholds: {} });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm("削除しますか？")) return;
    await apiFetch(`/api/kpi/${campaignId}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60">
        <Header onOpenChat={() => setChatOpen(!chatOpen)} chatOpen={chatOpen} />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-black">KPI管理</h1>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> 追加
                </Button>
              </div>

              {showForm && (
                <Card className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium">KPIを設定</h2>
                    <button onClick={() => setShowForm(false)} className="text-black/40 hover:text-black">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-black/60 mb-1 block">キャンペーンID *</label>
                        <Input
                          required
                          value={form.campaign_id}
                          onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                          placeholder="123456789"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-black/60 mb-1 block">キャンペーン名</label>
                        <Input
                          value={form.campaign_name}
                          onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
                          placeholder="夏季キャンペーン"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-black/60 mb-2">目標値</p>
                      <div className="grid grid-cols-2 gap-2">
                        {METRICS.map((m) => (
                          <div key={m.key}>
                            <label className="text-xs text-black/50 mb-1 block">{m.label}</label>
                            <Input
                              type="number"
                              value={form.targets[m.key] ?? ""}
                              onChange={(e) => setForm({ ...form, targets: { ...form.targets, [m.key]: e.target.value } })}
                              placeholder="例: 1000"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-black/60 mb-2">アラート閾値（この値を超えたら通知）</p>
                      <div className="grid grid-cols-2 gap-2">
                        {METRICS.map((m) => (
                          <div key={m.key}>
                            <label className="text-xs text-black/50 mb-1 block">{m.label}</label>
                            <Input
                              type="number"
                              value={form.thresholds[m.key] ?? ""}
                              onChange={(e) => setForm({ ...form, thresholds: { ...form.thresholds, [m.key]: e.target.value } })}
                              placeholder="例: 2000"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "保存中..." : "保存"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                        キャンセル
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <div className="space-y-3">
                {items.length === 0 && (
                  <p className="text-sm text-black/40 text-center py-8">KPI設定がありません</p>
                )}
                {items.map((item) => {
                  const targets = (() => { try { return JSON.parse(item.targets) as Record<string, number>; } catch { return {}; } })();
                  const thresholds = (() => { try { return JSON.parse(item.thresholds) as Record<string, number>; } catch { return {}; } })();
                  return (
                    <Card key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-black">
                              {item.campaign_name || item.campaign_id}
                            </p>
                            <p className="text-xs text-black/40 mb-2">ID: {item.campaign_id}</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {Object.entries(targets).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2 text-xs">
                                  <span className="text-black/50">目標 {k.toUpperCase()}:</span>
                                  <span className="font-medium">{v.toLocaleString()}</span>
                                  {thresholds[k] && (
                                    <span className="flex items-center gap-0.5 text-orange-500">
                                      <AlertTriangle className="h-3 w-3" />
                                      {thresholds[k].toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(item.campaign_id)}
                          className="text-black/30 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </main>
          {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
