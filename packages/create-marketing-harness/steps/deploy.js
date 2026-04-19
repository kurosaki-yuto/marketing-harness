import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { printStepHeader, printSuccess } from "../lib/prompts.js";
import { d1Create, d1Execute, deploy, putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";

export async function run({ config }) {
  printStepHeader(8, "デプロイ", "D1 データベース作成 → スキーマ適用 → シークレット設定 → デプロイ");

  const { projectDir } = config;
  const workerDir = join(projectDir, "apps/worker");
  const wranglerOpts = {
    cwd: workerDir,
    env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {},
  };

  // D1 作成
  console.log("  D1 データベースを作成中...\n");
  const dbId = await d1Create("marketing-harness", wranglerOpts);
  if (!dbId) {
    console.error("  database_id の取得に失敗しました。手動で wrangler.toml に記入してください。");
  } else {
    console.log(`  database_id: ${dbId}\n`);
    const tomlPath = join(workerDir, "wrangler.toml");
    const toml = readFileSync(tomlPath, "utf8");
    writeFileSync(tomlPath, toml.replace("YOUR_DATABASE_ID_HERE", dbId));
  }

  // スキーマ適用（cwd が apps/worker なので相対パスは ../../packages/db/schema.sql）
  console.log("  データベーステーブルを作成中...\n");
  await d1Execute("marketing-harness", "../../packages/db/schema.sql", wranglerOpts);

  // シークレット投入
  console.log("  シークレットを設定中...\n");
  await putSecret("API_KEY", config.apiKey, wranglerOpts);
  await putSecret("LICENSE_KEY", config.licenseKey, wranglerOpts);
  await putSecret("LICENSE_SERVER_URL", config.licenseServerUrl, wranglerOpts);

  // 連携 secret（init 時は空なので no-op、configure 時に使用）
  const meta = config.meta ?? {};
  await putSecret("META_ACCESS_TOKEN", meta.token, wranglerOpts);
  await putSecret("META_AD_ACCOUNT_ID", meta.accountId, wranglerOpts);

  const line = config.line ?? {};
  await putSecret("LINE_CHANNEL_ACCESS_TOKEN", line.channelAccessToken, wranglerOpts);
  await putSecret("LINE_CHANNEL_SECRET", line.channelSecret, wranglerOpts);

  const utage = config.utage ?? {};
  await putSecret("UTAGE_API_KEY", utage.apiKey, wranglerOpts);

  const gads = config.googleAds ?? {};
  await putSecret("GOOGLE_ADS_DEVELOPER_TOKEN", gads.developerToken, wranglerOpts);
  await putSecret("GOOGLE_ADS_CLIENT_ID", gads.clientId, wranglerOpts);
  await putSecret("GOOGLE_ADS_CLIENT_SECRET", gads.clientSecret, wranglerOpts);
  await putSecret("GOOGLE_ADS_REFRESH_TOKEN", gads.refreshToken, wranglerOpts);
  await putSecret("GOOGLE_ADS_CUSTOMER_ID", gads.customerId, wranglerOpts);

  // デプロイ（確認なし）
  console.log("\n  デプロイ中...\n");
  const workerUrl = await deploy(workerDir, wranglerOpts);
  console.log("");

  // .env.local 生成
  const webEnvPath = join(projectDir, "apps/web/.env.local");
  writeFileSync(webEnvPath, [
    `NEXT_PUBLIC_WORKER_URL=${workerUrl || "http://localhost:8787"}`,
    `NEXT_PUBLIC_API_KEY=${config.apiKey}`,
  ].join("\n") + "\n");

  printSuccess("デプロイ完了");
  config.workerUrl = workerUrl;

  const now = new Date().toISOString();
  writeConfig(projectDir, {
    schemaVersion: 1,
    projectName: config.projectName,
    workerUrl,
    apiKey: config.apiKey,
    createdAt: now,
    mcpServerName: "marketing-harness",
    integrations: {
      cloudflare: { enabled: true, configuredAt: now },
      meta:       { enabled: !!(config.meta?.token),                configuredAt: config.meta?.token ? now : undefined },
      line:       { enabled: !!(config.line?.channelAccessToken),   configuredAt: config.line?.channelAccessToken ? now : undefined },
      utage:      { enabled: !!(config.utage?.apiKey),              configuredAt: config.utage?.apiKey ? now : undefined },
      googleAds:  { enabled: !!(config.googleAds?.refreshToken),    configuredAt: config.googleAds?.refreshToken ? now : undefined },
    },
    lastLaunchAt: null,
  });

  return { skipped: false };
}
