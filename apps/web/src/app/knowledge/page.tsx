"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { Plus, BookOpen, X, Tag } from "lucide-react";

type Knowledge = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  status: string;
  usage_count: number;
  created_at: string;
};

const CATEGORIES = [
  { value: "improvement", label: "改善施策" },
  { value: "analysis", label: "分析" },
  { value: "best_practice", label: "ベストプラクティス" },
  { value: "alert_response", label: "アラート対応" },
  { value: "ad_copy", label: "広告コピー" },
  { value: "ad_creative", label: "クリエイティブ" },
  { value: "ad_targeting", label: "ターゲティング" },
  { value: "ad_budget", label: "予算・スケール" },
];

export default function KnowledgePage() {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "best_practice", tags: "" });

  const load = () =>
    apiFetch<Knowledge[]>("/api/knowledge").then(setItems).catch(console.error);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      setForm({ title: "", content: "", category: "best_practice", tags: "" });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await apiFetch(`/api/knowledge/${id}`, { method: "DELETE" });
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
                <h1 className="text-xl font-bold text-black">ナレッジ</h1>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> 追加
                </Button>
              </div>

              {showForm && (
                <Card className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium">ナレッジを追加</h2>
                    <button onClick={() => setShowForm(false)} className="text-black/40 hover:text-black">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">タイトル *</label>
                      <Input
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="CTR改善のベストプラクティス"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">カテゴリ *</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">内容 *</label>
                      <textarea
                        required
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="知見の詳細..."
                        rows={4}
                        className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-black/60 mb-1 block">タグ（カンマ区切り）</label>
                      <Input
                        value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="CTR, Meta広告, クリエイティブ"
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
                {items.length === 0 && (
                  <p className="text-sm text-black/40 text-center py-8">ナレッジがありません</p>
                )}
                {items.map((item) => {
                  const tags = (() => {
                    try { return JSON.parse(item.tags) as string[]; } catch { return []; }
                  })();
                  const cat = CATEGORIES.find((c) => c.value === item.category);
                  return (
                    <Card key={item.id} className="hover:border-black/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-sm text-black">{item.title}</p>
                              {cat && (
                                <span className="text-xs bg-black/5 text-black/50 px-2 py-0.5 rounded-full">{cat.label}</span>
                              )}
                            </div>
                            <p className="text-xs text-black/50 line-clamp-2">{item.content}</p>
                            {tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {tags.map((t) => (
                                  <span key={t} className="inline-flex items-center gap-0.5 text-xs text-black/40">
                                    <Tag className="h-2.5 w-2.5" />{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
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
