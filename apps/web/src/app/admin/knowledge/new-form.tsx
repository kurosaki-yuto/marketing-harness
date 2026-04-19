"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveKnowledgeAction } from "./actions";
import { Button } from "@/components/ui/button";

export function KnowledgeNewForm() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    const result = await saveKnowledgeAction(topic.trim(), content.trim());
    setSaving(false);
    if (result?.ok) {
      setTopic("");
      setContent("");
      router.refresh();
    } else {
      setError(result?.error ?? "保存に失敗しました");
    }
  };

  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-black/70">新規ナレッジ</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="トピック名（例: meta-winning-2026q2）"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border border-black/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 font-mono"
          required
        />
        <textarea
          placeholder="ノウハウ内容（Markdown 可）"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full border border-black/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" size="sm" disabled={saving || !topic.trim() || !content.trim()}>
          {saving ? "保存中..." : "作成"}
        </Button>
      </form>
    </div>
  );
}
