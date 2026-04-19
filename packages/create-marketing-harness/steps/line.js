import { join } from "path";
import { printStepHeader, printSkipped, printSuccess, askSkip } from "../lib/prompts.js";
import { runSetup } from "../lib/guided-setup.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";
import { runWithFallback } from "../lib/connector.js";

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

  const MANUAL = `1. https://developers.line.biz → Messaging API チャネルを作成\n2. チャネルアクセストークン（長期）をコピー\n3. チャネルシークレットをコピー\n4. 取得後、再度このコマンドを実行してください`;
  const setup = await runWithFallback("line", () => runSetup("line"), MANUAL);
  if (!setup.success) { config.line = {}; return { skipped: true }; }
  const { channelAccessToken, channelSecret } = setup.result;

  config.line = { channelAccessToken, channelSecret };

  if (mode === "configure") {
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("LINE_CHANNEL_ACCESS_TOKEN", channelAccessToken, opts);
    await putSecret("LINE_CHANNEL_SECRET", channelSecret, opts);
    writeConfig(config.projectDir, { integrations: { line: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("LINE 連携を設定しました");
  } else {
    printSuccess("LINE の情報を取得しました（起動時に自動で設定されます）");
  }

  return { skipped: false };
}
