// 共通 UI ヘルパー
import prompts from "prompts";

export function printHeader() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   marketing-harness  setup wizard  v2   ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("広告運用 AI エージェントをあなたの Cloudflare にセットアップします。\n");
}

export function printStepHeader(step, title, description) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  STEP ${step}: ${title}`);
  if (description) console.log(`  ${description}`);
  console.log(`${"─".repeat(50)}\n`);
}

export function printInfo(lines) {
  lines.forEach((l) => console.log(`  ${l}`));
  console.log("");
}

export function printSuccess(msg) {
  console.log(`  OK: ${msg}\n`);
}

export function printSkipped(service) {
  console.log(`  [スキップ] ${service} は後から設定できます:`);
  console.log(`  npx marketing-harness configure ${service}\n`);
}

export async function askSkip(serviceName) {
  const { skip } = await prompts({
    type: "confirm",
    name: "skip",
    message: `${serviceName} の設定をスキップしますか？（後からいつでも設定できます）`,
    initial: false,
  });
  if (skip === undefined) process.exit(1);
  return skip;
}

export async function askText(message, opts = {}) {
  const { value } = await prompts({
    type: "text",
    name: "value",
    message,
    ...opts,
  });
  if (value === undefined) process.exit(1);
  return value;
}

export async function askConfirm(message, initial = true) {
  const { value } = await prompts({
    type: "confirm",
    name: "value",
    message,
    initial,
  });
  if (value === undefined) process.exit(1);
  return value;
}

export async function askSelect(message, choices) {
  const { value } = await prompts({
    type: "select",
    name: "value",
    message,
    choices,
  });
  if (value === undefined) process.exit(1);
  return value;
}
