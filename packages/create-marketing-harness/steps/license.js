import { printStepHeader, askText, printSuccess } from "../lib/prompts.js";

const LICENSE_SERVER_URL =
  process.env.MARKETING_HARNESS_LICENSE_URL ||
  "https://marketing-harness-license.gkoinobori0505.workers.dev";

export async function run({ config }) {
  printStepHeader(1, "ライセンスキー確認", "コミュニティライセンスキーを入力してください");

  const licenseKey = await askText("コミュニティライセンスキー (mh_...):", {
    validate: (v) => v.startsWith("mh_") ? true : "mh_ から始まるキーを入力してください",
  });

  console.log("\n  ライセンスを確認中...");
  let verifyResult;
  try {
    const res = await fetch(`${LICENSE_SERVER_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: licenseKey, instance_id: "cli-setup" }),
    });
    verifyResult = await res.json();
  } catch {
    console.error("\n  ライセンスサーバーに接続できませんでした。ネットワークを確認してください。");
    process.exit(1);
  }

  if (!verifyResult.valid) {
    console.error(`\n  ライセンスが無効です: ${verifyResult.reason}`);
    console.error("  コミュニティへの参加・更新については運営にお問い合わせください。");
    process.exit(1);
  }

  printSuccess(`ライセンス確認 OK (plan: ${verifyResult.plan})`);

  config.licenseKey = licenseKey;
  config.licenseServerUrl = LICENSE_SERVER_URL;
  return { skipped: false };
}
