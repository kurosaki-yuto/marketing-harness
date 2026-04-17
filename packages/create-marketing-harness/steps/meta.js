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
    mode === "configure" ? "Meta" : 4,
    "Meta 広告連携（任意）",
    "Meta Ads のデータ同期・KPI 監視・改善提案に使用します"
  );

  if (mode === "init") {
    const skip = await askSkip("Meta 広告");
    if (skip) {
      printSkipped("meta");
      config.meta = {};
      return { skipped: true };
    }
  }

  const method = await askSelect("Meta のシステムユーザートークンの取得方法:", [
    { title: "手順を見ながら自分で取得する", value: "manual" },
    { title: "Claude in Chrome に任せる（Pro/Max/Team/Enterprise プラン必須）", value: "chrome" },
  ]);

  let token, accountId;

  if (method === "manual") {
    printInfo([
      "以下の手順でシステムユーザートークンを発行してください:",
      "",
      "1. https://business.facebook.com/settings/system-users を開く",
      "2. 「システムユーザーを追加」→「管理者」ロールで作成",
      "3. 作成したユーザーを選択→「トークンを生成」",
      "4. 有効期限：無期限 / 権限：ads_read + ads_management を選択してトークンを発行",
      "5. 発行されたトークンをコピー",
      "",
      "次に広告アカウントIDを確認してください:",
      "6. https://adsmanager.facebook.com/ を開く",
      "7. URL に含まれる act_XXXXXXXXXX の部分をコピー",
    ]);
    token = await askText("Meta システムユーザートークン (EAA... で始まる):");
    accountId = await askText("広告アカウントID (act_XXXXXXXXXX):", {
      validate: (v) => v.startsWith("act_") ? true : "act_ で始まる形式で入力してください",
    });
  } else {
    const promptText = readFileSync(
      join(__dirname, "../templates/chrome-prompts/meta.md"),
      "utf8"
    );
    const result = await runWithClaudeInChrome({
      promptText,
      fields: [
        { name: "token", label: "Meta システムユーザートークン" },
        { name: "accountId", label: "広告アカウントID (act_XXXXXXXXXX)" },
      ],
    });
    if (!result) {
      printSkipped("meta");
      config.meta = {};
      return { skipped: true };
    }
    token = result.token;
    accountId = result.accountId;
  }

  config.meta = { token, accountId };

  if (mode === "configure") {
    const opts = { cwd: config.projectDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("META_ACCESS_TOKEN", token, opts);
    await putSecret("META_AD_ACCOUNT_ID", accountId, opts);
    writeConfig(config.projectDir, { integrations: { meta: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("Meta Ads 連携を設定しました");
  } else {
    printSuccess("Meta Ads の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
