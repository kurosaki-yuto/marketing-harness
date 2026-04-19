import { join } from "path";
import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askText } from "../lib/prompts.js";
import { runWithClaudeInChrome } from "../lib/claude-in-chrome.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";

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

  let channelAccessToken, channelSecret;

  const result = await runWithClaudeInChrome({ specId: "line" });

  if (result) {
    channelAccessToken = result.channelAccessToken;
    channelSecret = result.channelSecret;
  } else {
    printInfo([
      "自動取得できなかったので、以下の手順で手動入力してください:",
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
  }

  config.line = { channelAccessToken, channelSecret };

  if (mode === "configure") {
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("LINE_CHANNEL_ACCESS_TOKEN", channelAccessToken, opts);
    await putSecret("LINE_CHANNEL_SECRET", channelSecret, opts);
    writeConfig(config.projectDir, { integrations: { line: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("LINE 連携を設定しました");
  } else {
    printSuccess("LINE の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
