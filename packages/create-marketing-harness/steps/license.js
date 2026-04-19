import { printStepHeader, askText, printSuccess } from "../lib/prompts.js";

const LICENSE_SERVER_URL =
  process.env.MARKETING_HARNESS_LICENSE_URL ||
  "https://marketing-harness-license.gkoinobori0505.workers.dev";

export async function run({ config }) {
  printStepHeader(1, "コミュニティ確認", "メールアドレスでコミュニティ参加を確認します");

  const email = await askText("メールアドレス:", {
    validate: (v) => v.includes("@") ? true : "有効なメールアドレスを入力してください",
  });

  console.log("\n  コミュニティ参加を確認中...");
  let result;
  try {
    const res = await fetch(`${LICENSE_SERVER_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    result = await res.json();

    if (res.status === 403 && result.error === "not_in_community") {
      console.error("\n  このメールアドレスはコミュニティに登録されていません。");
      if (result.community_join_url) {
        console.error(`  参加はこちら: ${result.community_join_url}`);
      }
      console.error("");
      process.exit(1);
    }

    if (!res.ok) throw new Error(result.error ?? res.status);
  } catch (err) {
    if (err.code === "ERR_PROCESS_EXIT_PREVENTED" || err instanceof Error && err.message === "") throw err;
    console.error(`\n  確認に失敗しました: ${err.message}`);
    console.error("  ネットワークを確認してもう一度お試しください。");
    process.exit(1);
  }

  printSuccess(`コミュニティ確認 OK (${email})`);

  config.licenseKey = result.key;
  config.licenseServerUrl = LICENSE_SERVER_URL;
  config.integrations = result.integrations ?? {};

  const integCount = Object.values(config.integrations).filter(Boolean).length;
  if (integCount > 0) {
    console.log(`  統合設定: ${integCount} サービスの認証情報を取得しました\n`);
  }

  return { skipped: false };
}
