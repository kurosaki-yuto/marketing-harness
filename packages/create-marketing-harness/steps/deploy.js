import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { printStepHeader, printSuccess } from "../lib/prompts.js";
import { d1Create, d1Execute, deploy, putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";
import { MSG } from "../lib/messages.js";

export async function run({ config }) {
  printStepHeader(4, MSG.DEPLOY_STEP, "広告データの保存場所を作成 → 接続キーを設定 → AI を起動");

  const { projectDir } = config;
  const workerDir = join(projectDir, "apps/worker");
  const wranglerOpts = {
    cwd: workerDir,
    env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {},
  };

  console.log(`  ${MSG.DEPLOY_DB_CREATE}\n`);
  const dbId = await d1Create("marketing-harness", wranglerOpts);
  if (!dbId) {
    console.error(`  ${MSG.DEPLOY_DB_CREATE_FAIL}`);
  } else {
    const tomlPath = join(workerDir, "wrangler.toml");
    const toml = readFileSync(tomlPath, "utf8");
    writeFileSync(tomlPath, toml.replace("YOUR_DATABASE_ID_HERE", dbId));
  }

  console.log(`  ${MSG.DEPLOY_SCHEMA}\n`);
  await d1Execute("marketing-harness", "../../packages/db/schema.sql", wranglerOpts);

  console.log(`  ${MSG.DEPLOY_SECRETS}\n`);
  await putSecret("API_KEY", config.apiKey, wranglerOpts);
  await putSecret("LICENSE_KEY", config.licenseKey, wranglerOpts);
  // LICENSE_SERVER_URL は wrangler.toml の [vars] に定義済みなので putSecret 不要

  // 連携 secret（license-server から取得済みの integrations を注入）
  const integ = config.integrations ?? {};
  const meta = integ.meta ?? config.meta ?? {};
  await putSecret("META_ACCESS_TOKEN", meta.accessToken ?? meta.token, wranglerOpts);
  await putSecret("META_AD_ACCOUNT_ID", meta.adAccountId ?? meta.accountId, wranglerOpts);

  const line = integ.line ?? config.line ?? {};
  await putSecret("LINE_CHANNEL_ACCESS_TOKEN", line.channelAccessToken, wranglerOpts);
  await putSecret("LINE_CHANNEL_SECRET", line.channelSecret, wranglerOpts);

  const utage = integ.utage ?? config.utage ?? {};
  await putSecret("UTAGE_API_KEY", utage.apiKey, wranglerOpts);

  const gads = integ.googleAds ?? config.googleAds ?? {};
  await putSecret("GOOGLE_ADS_DEVELOPER_TOKEN", gads.developerToken, wranglerOpts);
  await putSecret("GOOGLE_ADS_CLIENT_ID", gads.clientId, wranglerOpts);
  await putSecret("GOOGLE_ADS_CLIENT_SECRET", gads.clientSecret, wranglerOpts);
  await putSecret("GOOGLE_ADS_REFRESH_TOKEN", gads.refreshToken, wranglerOpts);
  await putSecret("GOOGLE_ADS_CUSTOMER_ID", gads.customerId, wranglerOpts);

  console.log(`\n  ${MSG.DEPLOY_LAUNCHING}\n`);
  const workerUrl = await deploy(workerDir, wranglerOpts);
  console.log("");

  // .env.local 生成
  const webEnvPath = join(projectDir, "apps/web/.env.local");
  writeFileSync(webEnvPath, [
    `NEXT_PUBLIC_WORKER_URL=${workerUrl || "http://localhost:8787"}`,
    `NEXT_PUBLIC_API_KEY=${config.apiKey}`,
  ].join("\n") + "\n");

  printSuccess(MSG.DEPLOY_DONE);
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
      meta:       { enabled: !!(integ.meta?.accessToken ?? config.meta?.token),              configuredAt: (integ.meta?.accessToken ?? config.meta?.token) ? now : undefined },
      line:       { enabled: !!(integ.line?.channelAccessToken ?? config.line?.channelAccessToken), configuredAt: (integ.line?.channelAccessToken ?? config.line?.channelAccessToken) ? now : undefined },
      utage:      { enabled: !!(integ.utage?.apiKey ?? config.utage?.apiKey),                configuredAt: (integ.utage?.apiKey ?? config.utage?.apiKey) ? now : undefined },
      googleAds:  { enabled: !!(integ.googleAds?.refreshToken ?? config.googleAds?.refreshToken), configuredAt: (integ.googleAds?.refreshToken ?? config.googleAds?.refreshToken) ? now : undefined },
    },
    lastLaunchAt: null,
  });

  return { skipped: false };
}
