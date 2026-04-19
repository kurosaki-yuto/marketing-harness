import { notFound } from "next/navigation";
import Link from "next/link";
import { getCentralKnowledge } from "@/lib/admin/knowledge-client";
import { KnowledgeEditForm } from "./edit-form";
import { Button } from "@/components/ui/button";

export default async function KnowledgeTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const decoded = decodeURIComponent(topic);
  const entry = await getCentralKnowledge(decoded).catch(() => null);
  if (!entry) notFound();

  return (
    <>
      <header className="bg-white border-b border-black/10 px-6 py-3 flex items-center gap-4">
        <Link href="/admin/knowledge">
          <Button type="button" variant="ghost" size="sm">← 一覧</Button>
        </Link>
        <span className="font-mono text-sm text-black/70">{decoded}</span>
      </header>
      <main className="max-w-3xl mx-auto p-6">
        <KnowledgeEditForm topic={decoded} initialContent={entry.content} />
      </main>
    </>
  );
}
