import { listLicenses } from "@/lib/admin/license-client";
import { logoutAction } from "../login/actions";
import { IssueForm } from "./issue-form";
import { LicenseRow } from "./license-row";
import { Button } from "@/components/ui/button";

export default async function LicensesPage() {
  let licenses: Awaited<ReturnType<typeof listLicenses>> = [];
  try {
    licenses = await listLicenses();
  } catch {
    // worker が未設定の場合は空一覧
  }

  return (
    <>
      <header className="bg-white border-b border-black/10 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-black">marketing-harness admin</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">ログアウト</Button>
        </form>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <IssueForm />
        <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-black/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium">キー</th>
                <th className="text-left px-4 py-3 font-medium">メール</th>
                <th className="text-left px-4 py-3 font-medium">プラン</th>
                <th className="text-left px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-black/40 text-sm">
                    まだライセンスがありません
                  </td>
                </tr>
              ) : (
                licenses.map((license) => (
                  <LicenseRow key={license.key} license={license} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
