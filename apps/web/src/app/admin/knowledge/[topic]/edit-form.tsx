"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveKnowledgeAction, deleteKnowledgeAction } from "../actions";
import { Button } from "@/components/ui/button";

export function KnowledgeEditForm({
  topic,
  initialContent,
}: {
  topic: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveKnowledgeAction(topic, content);
    setSaving(false);
    if (result?.ok) {
      setSaved(true);
    } else {
      setError(result?.error ?? "保存に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${topic}」を削除しますか？`)) return;
    await deleteKnowledgeAction(topic);
    router.push("/admin/knowledge");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="w-full border border-black/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none font-mono"
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">保存しました</p>}
      <div className="flex items-center justify-between">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
          削除
        </Button>
      </div>
    </form>
  );
}
