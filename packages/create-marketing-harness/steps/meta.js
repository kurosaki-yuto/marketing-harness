import { join } from "path";
import { printStepHeader, printSkipped, printSuccess, askSkip } from "../lib/prompts.js";
import { runSetup } from "../lib/guided-setup.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";
import { runWithFallback } from "../lib/connector.js";

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

  const MANUAL = `1. https://business.facebook.com/settings → 「システムユーザー」でアクセストークンを生成\n2. 広告アカウント ID は「act_XXXXXXXXXX」の形式\n3. 取得後、再度このコマンドを実行してください`;
  const setup = await runWithFallback("meta", () => runSetup("meta"), MANUAL);
  if (!setup.success) { config.meta = {}; return { skipped: true }; }
  const { token, accountId } = setup.result;

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
