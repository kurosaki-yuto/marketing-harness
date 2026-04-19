import { join } from "path";
import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askText } from "../lib/prompts.js";
import { runWithClaudeInChrome } from "../lib/claude-in-chrome.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";

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

  let token, accountId;

  const result = await runWithClaudeInChrome({ specId: "meta" });

  if (result) {
    token = result.token;
    accountId = result.accountId;
  } else {
    printInfo([
      "自動取得できなかったので、以下の手順で手動入力してください:",
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
  }

  config.meta = { token, accountId };

  if (mode === "configure") {
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("META_ACCESS_TOKEN", token, opts);
    await putSecret("META_AD_ACCOUNT_ID", accountId, opts);
    writeConfig(config.projectDir, { integrations: { meta: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("Meta Ads 連携を設定しました");
  } else {
    printSuccess("Meta Ads の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
