import { join } from "path";
import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askConfirm } from "../lib/prompts.js";
import { runSetup } from "../lib/guided-setup.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";
import { runWithFallback } from "../lib/connector.js";

export async function run({ config, mode, data }) {
  if (mode === "apply") {
    const { developerToken, clientId, clientSecret, refreshToken, customerId } = data ?? {};
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: {} };
    await putSecret("GOOGLE_ADS_DEVELOPER_TOKEN", developerToken, opts);
    await putSecret("GOOGLE_ADS_CLIENT_ID", clientId, opts);
    await putSecret("GOOGLE_ADS_CLIENT_SECRET", clientSecret, opts);
    await putSecret("GOOGLE_ADS_REFRESH_TOKEN", refreshToken, opts);
    await putSecret("GOOGLE_ADS_CUSTOMER_ID", customerId, opts);
    writeConfig(config.projectDir, { integrations: { googleAds: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("Google 広告の接続が完了しました");
    return { skipped: false };
  }

  printStepHeader(
    mode === "configure" ? "GAds" : 7,
    "Google Ads 連携（任意）",
    "Google 広告のキャンペーン同期・KPI 管理に使用します"
  );

  printInfo([
    "注意: Google 広告 API の利用申請には 1〜5 営業日かかります。",
    "審査中はスキップして、承認後に「連携を追加・変更する」から再設定できます。",
  ]);

  if (mode === "init") {
    const skip = await askSkip("Google Ads");
    if (skip) {
      printSkipped("google-ads");
      config.googleAds = {};
      return { skipped: true };
    }
  }

  const devTokenReady = await askConfirm(
    "Developer Token の審査は完了していますか？",
    false
  );

  if (!devTokenReady) {
    printInfo([
      "Google 広告 API の利用申請を先に行ってください:",
      "1. https://ads.google.com/aw/apicenter を開く（MCC アカウントが必要）",
      "2. 申請フォームを送信（Basic access）",
      "3. 審査完了メールが届いたら「連携を追加・変更する」から再設定できます",
    ]);
    printSkipped("google-ads");
    config.googleAds = {};
    return { skipped: true };
  }

  const MANUAL = `1. Google Ads API センター (https://ads.google.com/aw/apicenter) で Developer Token を申請\n2. OAuth クライアント ID・シークレットを Google Cloud Console で取得\n3. リフレッシュトークンは OAuth Playground で取得可能\n4. 取得後、再度このコマンドを実行してください`;
  const setup = await runWithFallback("google-ads", () => runSetup("google-ads"), MANUAL);
  if (!setup.success) { config.googleAds = {}; return { skipped: true }; }
  const { developerToken, clientId, clientSecret, refreshToken, customerId } = setup.result;

  config.googleAds = { developerToken, clientId, clientSecret, refreshToken, customerId };

  if (mode === "configure") {
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("GOOGLE_ADS_DEVELOPER_TOKEN", developerToken, opts);
    await putSecret("GOOGLE_ADS_CLIENT_ID", clientId, opts);
    await putSecret("GOOGLE_ADS_CLIENT_SECRET", clientSecret, opts);
    await putSecret("GOOGLE_ADS_REFRESH_TOKEN", refreshToken, opts);
    await putSecret("GOOGLE_ADS_CUSTOMER_ID", customerId, opts);
    writeConfig(config.projectDir, { integrations: { googleAds: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("Google Ads 連携を設定しました");
  } else {
    printSuccess("Google 広告の情報を取得しました（起動時に自動で設定されます）");
  }

  return { skipped: false };
}
