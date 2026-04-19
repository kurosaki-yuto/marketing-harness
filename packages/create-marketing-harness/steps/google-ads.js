import { printStepHeader, printInfo, printSkipped, printSuccess, askSkip, askSelect, askText, askConfirm } from "../lib/prompts.js";
import { runWithClaudeInChrome } from "../lib/claude-in-chrome.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";

export async function run({ config, mode }) {
  printStepHeader(
    mode === "configure" ? "GAds" : 7,
    "Google Ads 連携（任意）",
    "Google 広告のキャンペーン同期・KPI 管理に使用します"
  );

  printInfo([
    "注意: Google Ads API の Developer Token 取得には 1〜5 営業日の審査があります。",
    "審査中はスキップして、承認後に以下で再設定できます:",
    "  npx marketing-harness configure google-ads",
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
      "Developer Token を申請してください:",
      "1. https://ads.google.com/aw/apicenter を開く（MCC アカウントが必要）",
      "2. Developer Token を申請（Basic access）",
      "3. 審査完了メールが届いたら以下を実行:",
      "   npx marketing-harness configure google-ads",
    ]);
    printSkipped("google-ads");
    config.googleAds = {};
    return { skipped: true };
  }

  const method = await askSelect("認証情報の取得方法:", [
    { title: "手順を見ながら自分で取得する", value: "manual" },
    { title: "Claude in Chrome に任せる（Pro/Max/Team/Enterprise プラン必須）", value: "chrome" },
  ]);

  let developerToken, clientId, clientSecret, refreshToken, customerId;

  if (method === "manual") {
    printInfo([
      "以下の情報を準備してください:",
      "",
      "【Developer Token】",
      "  Google Ads → ツールと設定 → API センター で確認",
      "",
      "【OAuth2 クライアント認証情報】",
      "  1. https://console.cloud.google.com/ を開く",
      "  2. APIs & Services → Credentials → Create Credentials → OAuth Client ID",
      "  3. アプリタイプ: Desktop app で作成",
      "  4. Client ID と Client Secret をコピー",
      "",
      "【重要】OAuth 同意画面を本番環境に変更してください:",
      "  APIs & Services → OAuth consent screen → アプリを公開",
      "  ※テストのままだとリフレッシュトークンが 7 日で失効します",
      "",
      "【リフレッシュトークン】",
      "  1. https://developers.google.com/oauthplayground/ を開く",
      "  2. 右上の設定 → Use your own OAuth credentials をチェック",
      "  3. Client ID と Secret を入力",
      "  4. Google Ads API v18 → https://www.googleapis.com/auth/adwords を選択",
      "  5. Authorize APIs → Exchange authorization code for tokens",
      "",
      "【カスタマー ID】",
      "  Google Ads 管理画面右上に表示される 123-456-7890 形式の ID",
      "  ハイフンなしで入力 (例: 1234567890)",
    ]);
    developerToken = await askText("Developer Token:");
    clientId = await askText("OAuth2 クライアント ID:");
    clientSecret = await askText("OAuth2 クライアントシークレット:");
    refreshToken = await askText("リフレッシュトークン:");
    customerId = await askText("カスタマー ID（ハイフンなし）:", {
      validate: (v) => /^\d+$/.test(v) ? true : "数字のみで入力してください",
    });
  } else {
    const result = await runWithClaudeInChrome({ specId: "google-ads" });
    if (!result) {
      printSkipped("google-ads");
      config.googleAds = {};
      return { skipped: true };
    }
    ({ developerToken, clientId, clientSecret, refreshToken, customerId } = result);
  }

  config.googleAds = { developerToken, clientId, clientSecret, refreshToken, customerId };

  if (mode === "configure") {
    const opts = { cwd: config.projectDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("GOOGLE_ADS_DEVELOPER_TOKEN", developerToken, opts);
    await putSecret("GOOGLE_ADS_CLIENT_ID", clientId, opts);
    await putSecret("GOOGLE_ADS_CLIENT_SECRET", clientSecret, opts);
    await putSecret("GOOGLE_ADS_REFRESH_TOKEN", refreshToken, opts);
    await putSecret("GOOGLE_ADS_CUSTOMER_ID", customerId, opts);
    writeConfig(config.projectDir, { integrations: { googleAds: { enabled: true, configuredAt: new Date().toISOString() } } });
    printSuccess("Google Ads 連携を設定しました");
  } else {
    printSuccess("Google Ads の情報を取得しました（デプロイ時に設定します）");
  }

  return { skipped: false };
}
