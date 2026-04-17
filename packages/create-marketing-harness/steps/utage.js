import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askSelect, askText } from "../lib/prompts.js";
import { runWithClaudeInChrome } from "../lib/claude-in-chrome.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  const method = await askSelect("UTAGE API キーの取得方法:", [
    { title: "手順を見ながら自分で取得する", value: "manual" },
    { title: "Claude in Chrome に任せる（Pro/Max/Team/Enterprise プラン必須）", value: "chrome" },
  ]);

  let apiKey;

  if (method === "manual") {
    printInfo([
      "UTAGE 管理画面から API キーを発行してください:",
      "",
      "1. UTAGE 管理画面にログイン",
      "2. 左メニューまたは設定から「API 設定」を開く",
      "3. API キーが未発行の場合は「発行」をクリック",
      "4. 表示された API キーをコピー",
    ]);
    apiKey = await askText("UTAGE API キー:");
  } else {
    const promptText = readFileSync(
      join(__dirname, "../templates/chrome-prompts/utage.md"),
      "utf8"
    );
    const result = await runWithClaudeInChrome({
      promptText,
      fields: [{ name: "apiKey", label: "UTAGE API キー" }],
    });
    if (!result) {
      printSkipped("utage");
      config.utage = {};
      return { skipped: true };
    }
    apiKey = result.apiKey;
  }

  config.utage = { apiKey };

  if (mode === "configure") {
    const opts = { cwd: config.projectDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("UTAGE_API_KEY", apiKey, opts);
    writeConfig(config.projectDir, { integrations: { utage: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("UTAGE 連携を設定しました");
  } else {
    printSuccess("UTAGE の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
