import { readConfig } from "./config-file.js";

const SERVICE_LABELS = {
  meta:      "Meta 広告",
  line:      "LINE",
  utage:     "UTAGE",
  googleAds: "Google 広告",
};

/** 設定終了後に接続状態を業務語でサマリー表示する。 */
export function printSetupSummary(projectDir) {
  const cfg = readConfig(projectDir);
  if (!cfg) return;

  const integrations = cfg.integrations ?? {};
  const parts = Object.entries(SERVICE_LABELS).map(([key, label]) => {
    const ok = integrations[key]?.enabled;
    return `${label}: ${ok ? "接続済" : "未設定"}`;
  });

  console.log("\n  ────────────────────────────────");
  console.log("  現在の接続状態");
  for (const p of parts) console.log(`    ${p}`);
  console.log("  ────────────────────────────────\n");
}
