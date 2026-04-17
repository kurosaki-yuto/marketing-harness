import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-black">marketing-harness admin</h1>
          <p className="text-sm text-black/50 mt-1">ライセンス管理</p>
        </div>
        {error === "invalid" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            パスワードが正しくありません
          </p>
        )}
        <form action={loginAction} className="space-y-4">
          <div>
            <label className="text-xs text-black/60 mb-1 block">パスワード</label>
            <Input type="password" name="password" required autoFocus />
          </div>
          <Button type="submit" className="w-full">ログイン</Button>
        </form>
      </div>
    </div>
  );
}
