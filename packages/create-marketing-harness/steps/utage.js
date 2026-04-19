import { join } from "path";
import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askText } from "../lib/prompts.js";
import { runWithClaudeInChrome } from "../lib/claude-in-chrome.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";

export async function run({ config, mode }) {
  printStepHeader(
    mode === "configure" ? "UTAGE" : 6,
    "UTAGE（宴）連携（任意）",
    "UTAGE の購読者管理・メール配信・ファネル自動化に使用します"
  );

  if (mode === "init") {
    const skip = await askSkip("UTAGE（宴）");
    if (skip) {
      printSkipped("utage");
      config.utage = {};
      return { skipped: true };
    }
  }

  let apiKey;

  const result = await runWithClaudeInChrome({ specId: "utage" });

  if (result) {
    apiKey = result.apiKey;
  } else {
    printInfo([
      "自動取得できなかったので、以下の手順で手動入力してください:",
      "",
      "1. UTAGE 管理画面にログイン",
      "2. 左メニューまたは設定から「API 設定」を開く",
      "3. API キーが未発行の場合は「発行」をクリック",
      "4. 表示された API キーをコピー",
    ]);
    apiKey = await askText("UTAGE API キー:");
  }

  config.utage = { apiKey };

  if (mode === "configure") {
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("UTAGE_API_KEY", apiKey, opts);
    writeConfig(config.projectDir, { integrations: { utage: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("UTAGE 連携を設定しました");
  } else {
    printSuccess("UTAGE の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
