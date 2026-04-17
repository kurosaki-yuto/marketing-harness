"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [workerUrl, setWorkerUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupResult, setSignupResult] = useState<{ id: string; api_key: string } | null>(null);
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem("mh_api_key") ?? "");
    setWorkerUrl(localStorage.getItem("mh_worker_url") ?? "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("mh_api_key", apiKey);
    localStorage.setItem("mh_worker_url", workerUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const mcpCommand = `MARKETING_HARNESS_URL=${workerUrl || "https://your-worker.workers.dev"} \\
MARKETING_HARNESS_API_KEY=${apiKey || "your-api-key"} \\
claude mcp add marketing-harness \\
  -- node ./packages/mcp-server/dist/index.js`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningUp(true);
    try {
      const res = await fetch(`${workerUrl || "http://localhost:8787"}/api/accounts/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signupName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string; api_key: string };
      setSignupResult(data);
      setApiKey(data.api_key);
      localStorage.setItem("mh_api_key", data.api_key);
    } catch (err) {
      alert(`作成失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSigningUp(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-xl font-bold text-black">設定</h1>

            <Card>
              <CardHeader><CardTitle>アカウント作成</CardTitle></CardHeader>
              <p className="text-sm text-black/60 mb-3">
                まだアカウントがない場合はここから作成してください。APIキーが発行されます。
              </p>
              {signupResult ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1">
                  <p className="text-xs font-medium text-green-800">作成成功。以下のAPIキーを保存してください（一度しか表示されません）。</p>
                  <p className="text-xs font-mono break-all text-green-900">{signupResult.api_key}</p>
                  <p className="text-xs text-green-700">自動的に「接続設定」に反映されました。</p>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="flex gap-2">
                  <Input
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="アカウント名（例: 株式会社XXX）"
                    required
                  />
                  <Button size="sm" type="submit" disabled={signingUp}>
                    {signingUp ? "作成中..." : "作成"}
                  </Button>
                </form>
              )}
            </Card>

            <Card>
              <CardHeader><CardTitle>接続設定</CardTitle></CardHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-black/60 mb-1 block">Worker URL</label>
                  <Input
                    value={workerUrl}
                    onChange={(e) => setWorkerUrl(e.target.value)}
                    placeholder="https://your-worker.your-subdomain.workers.dev"
                  />
                </div>
                <div>
                  <label className="text-xs text-black/60 mb-1 block">APIキー</label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="your-api-key"
                  />
                </div>
                <Button size="sm" onClick={handleSave}>
                  {saved ? <><Check className="h-4 w-4 mr-1" />保存しました</> : "保存"}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Claude Code 連携</CardTitle></CardHeader>
              <p className="text-sm text-black/60 mb-3">
                以下のコマンドを実行すると Claude Code から自然言語で広告運用を操作できます。
              </p>
              <div className="relative">
                <pre className="text-xs bg-black/5 rounded-lg p-4 font-mono overflow-x-auto whitespace-pre-wrap">{mcpCommand}</pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-black/10 text-black/40 hover:text-black transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-3 text-xs text-black/50 space-y-1">
                <p>登録後は以下のように使えます：</p>
                <p className="font-mono bg-black/5 px-2 py-1 rounded">今月のキャンペーンのCPA一覧を教えて</p>
                <p className="font-mono bg-black/5 px-2 py-1 rounded">CTRが低いキャンペーンの改善提案をして</p>
                <p className="font-mono bg-black/5 px-2 py-1 rounded">先月のレポートを生成して</p>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Meta Ads 同期設定</CardTitle></CardHeader>
              <p className="text-sm text-black/60 mb-3">
                Cloudflare Secrets に以下の値を設定してください。
              </p>
              <div className="space-y-2 text-xs font-mono">
                {[
                  "npx wrangler secret put META_ACCESS_TOKEN",
                  "npx wrangler secret put META_AD_ACCOUNT_ID",
                  "npx wrangler secret put ANTHROPIC_API_KEY",
                  "npx wrangler secret put API_KEY",
                ].map((cmd) => (
                  <div key={cmd} className="bg-black/5 px-3 py-2 rounded-lg">{cmd}</div>
                ))}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
