import { printStepHeader, askText, printSuccess } from "../lib/prompts.js";

const LICENSE_SERVER_URL =
  process.env.MARKETING_HARNESS_LICENSE_URL ||
  "https://marketing-harness-license.gkoinobori0505.workers.dev";

export async function run({ config }) {
  printStepHeader(1, "コミュニティ登録", "メールアドレスを入力するだけで無料ライセンスを発行します");

  const email = await askText("メールアドレス:", {
    validate: (v) => v.includes("@") ? true : "有効なメールアドレスを入力してください",
  });

  console.log("\n  ライセンスを発行中...");
  let result;
  try {
    const res = await fetch(`${LICENSE_SERVER_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    result = await res.json();
    if (!res.ok) throw new Error(result.error ?? res.status);
  } catch (err) {
    console.error(`\n  ライセンスの発行に失敗しました: ${err.message}`);
    console.error("  ネットワークを確認してもう一度お試しください。");
    process.exit(1);
  }

  printSuccess(`ライセンス発行 OK (${result.created ? "新規" : "既存"}: ${result.key})`);

  config.licenseKey = result.key;
  config.licenseServerUrl = LICENSE_SERVER_URL;
  return { skipped: false };
}
