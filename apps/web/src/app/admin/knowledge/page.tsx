import Link from "next/link";
import { listCentralKnowledge } from "@/lib/admin/knowledge-client";
import { logoutAction } from "../login/actions";
import { Button } from "@/components/ui/button";
import { KnowledgeNewForm } from "./new-form";

export default async function KnowledgePage() {
  let topics: Awaited<ReturnType<typeof listCentralKnowledge>> = [];
  try {
    topics = await listCentralKnowledge();
  } catch {
    // worker 未設定の場合は空
  }

  return (
    <>
      <header className="bg-white border-b border-black/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/licenses" className="text-sm text-black/50 hover:text-black">ライセンス</Link>
          <span className="font-semibold text-black">中央ナレッジ</span>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">ログアウト</Button>
        </form>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <KnowledgeNewForm />
        <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-black/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium">トピック</th>
                <th className="text-left px-4 py-3 font-medium">更新日時</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {topics.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-black/40 text-sm">
                    まだナレッジがありません
                  </td>
                </tr>
              ) : (
                topics.map((t) => (
                  <tr key={t.topic} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs">{t.topic}</td>
                    <td className="px-4 py-3 text-black/60 text-xs">{t.updated_at}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/knowledge/${encodeURIComponent(t.topic)}`}>
                        <Button type="button" variant="outline" size="sm">編集</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
