"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { Plus, Building2, X } from "lucide-react";

type Company = {
  id: string;
  name: string;
  description: string | null;
  meta_ad_account_id: string | null;
  created_at: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", meta_ad_account_id: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    apiFetch<Company[]>("/api/companies").then(setCompanies).catch(console.error);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/companies", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ name: "", description: "", meta_ad_account_id: "" });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await apiFetch(`/api/companies/${id}`, { method: "DELETE" });
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
                <h1 className="text-xl font-bold text-black">企業一覧</h1>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> 追加
                </Button>
              </div>

              {showForm && (
                <Card className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium">企業を追加</h2>
                    <button onClick={() => setShowForm(false)} className="text-black/40 hover:text-black">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">企業名 *</label>
                      <Input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="株式会社サンプル"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">説明</label>
                      <Input
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="ECサイト運営会社"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">Meta 広告アカウントID</label>
                      <Input
                        value={form.meta_ad_account_id}
                        onChange={(e) => setForm({ ...form, meta_ad_account_id: e.target.value })}
                        placeholder="act_123456789"
                      />
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
                {companies.length === 0 && (
                  <p className="text-sm text-black/40 text-center py-8">企業がありません</p>
                )}
                {companies.map((c) => (
                  <Card key={c.id} className="flex items-center justify-between hover:border-black/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-black/50" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-black">{c.name}</p>
                        <p className="text-xs text-black/40">{c.description ?? "説明なし"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.meta_ad_account_id && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                          Meta連携済
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-black/30 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
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
