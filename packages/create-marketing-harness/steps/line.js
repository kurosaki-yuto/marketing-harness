import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askSelect, askText } from "../lib/prompts.js";
import { runWithClaudeInChrome } from "../lib/claude-in-chrome.js";
import { putSecret } from "../lib/wrangler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run({ config, mode }) {
  printStepHeader(
    mode === "configure" ? "LINE" : 5,
    "LINE Messaging API 連携（任意）",
    "顧客への LINE 配信・自動応答に使用します"
  );

  if (mode === "init") {
    const skip = await askSkip("LINE");
    if (skip) {
      printSkipped("line");
      config.line = {};
      return { skipped: true };
    }
  }

  const method = await askSelect("LINE チャンネルアクセストークンの取得方法:", [
    { title: "手順を見ながら自分で取得する", value: "manual" },
    { title: "Claude in Chrome に任せる（Pro/Max/Team/Enterprise プラン必須）", value: "chrome" },
  ]);

  let channelAccessToken, channelSecret;

  if (method === "manual") {
    printInfo([
      "LINE Developers Console でチャンネルを作成してください:",
      "",
      "1. https://developers.line.biz/console/ を開く",
      "2. プロバイダーを選択（または新規作成）",
      "3. 「チャンネルを作成」→「Messaging API」を選択",
      "4. 必要事項を入力してチャンネルを作成",
      "5. 「Messaging API 設定」タブを開く",
      "6. 「チャンネルアクセストークン（長期）」の「発行」をクリック",
      "7. トークンをコピー",
      "8. 「基本設定」タブに戻り「チャンネルシークレット」をコピー",
      "",
      "※ Webhook は push 配信のみなら設定不要です",
    ]);
    channelAccessToken = await askText("チャンネルアクセストークン（長期）:");
    channelSecret = await askText("チャンネルシークレット:");
  } else {
    const promptText = readFileSync(
      join(__dirname, "../templates/chrome-prompts/line.md"),
      "utf8"
    );
    const result = await runWithClaudeInChrome({
      promptText,
      fields: [
        { name: "channelAccessToken", label: "チャンネルアクセストークン（長期）" },
        { name: "channelSecret", label: "チャンネルシークレット" },
      ],
    });
    if (!result) {
      printSkipped("line");
      config.line = {};
      return { skipped: true };
    }
    channelAccessToken = result.channelAccessToken;
    channelSecret = result.channelSecret;
  }

  config.line = { channelAccessToken, channelSecret };

  if (mode === "configure") {
    const opts = { cwd: config.projectDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("LINE_CHANNEL_ACCESS_TOKEN", channelAccessToken, opts);
    await putSecret("LINE_CHANNEL_SECRET", channelSecret, opts);
    printSuccess("LINE 連携を設定しました");
  } else {
    printSuccess("LINE の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
