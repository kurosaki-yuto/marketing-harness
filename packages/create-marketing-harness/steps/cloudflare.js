import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { printStepHeader, printInfo, printSuccess, askSelect, askText } from "../lib/prompts.js";
import { whoami, login } from "../lib/wrangler.js";

export async function run({ config, mode }) {
  printStepHeader(
    mode === "configure" ? "CF" : 3,
    "Cloudflare 認証（必須）",
    "Cloudflare Workers にデプロイするために認証が必要です"
  );

  const isAuthed = await whoami({ cwd: config.projectDir });

  if (isAuthed) {
    printSuccess("Cloudflare 認証済み");
    return { skipped: false };
  }

  const method = await askSelect("Cloudflare の認証方法を選択してください:", [
    { title: "ブラウザでログイン（推奨）", value: "login" },
    { title: "API Token を手動入力", value: "token" },
  ]);

  if (method === "login") {
    console.log("\n  ブラウザが開きます。Cloudflare アカウントでログインしてください...\n");
    await login({ cwd: config.projectDir });
    printSuccess("Cloudflare ログイン完了");
  } else {
    printInfo([
      "Cloudflare Dashboard で API Token を発行してください:",
      "1. https://dash.cloudflare.com/profile/api-tokens を開く",
      "2. 「トークンを作成」→「Edit Cloudflare Workers」テンプレートを選択",
      "3. 「サマリー」を確認して「トークンを作成」をクリック",
      "4. 表示されたトークンをコピー（一度しか表示されません）",
    ]);
    const token = await askText("Cloudflare API Token:");
    config.cloudflareApiToken = token;
    printSuccess("API Token を設定しました");
  }

  return { skipped: false };
}
