#!/usr/bin/env node
// create-marketing-harness — セットアップウィザード
// 使い方: npx create-marketing-harness

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log("\n╔══════════════════════════════════���═══╗");
  console.log("║      marketing-harness  setup        ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log("広告運用AIエージェントOSSをセットアップします。\n");

  // プロジェクト名
  const name = (await ask("プロジェクト名 [my-ad-agent]: ")).trim() || "my-ad-agent";
  const dir = join(process.cwd(), name);

  if (existsSync(dir)) {
    console.error(`\n✖ ディレクトリ "${name}" がすでに存在します`);
    process.exit(1);
  }

  console.log("\n情報を設定します。後で wrangler secret で変更できます。\n");
  const anthropicKey = (await ask("Anthropic API Key (sk-ant-...): ")).trim();
  const metaToken = (await ask("Meta Access Token (任意、Enterでスキップ): ")).trim();
  const metaAccountId = (await ask("Meta Ad Account ID (act_xxx): ")).trim();
  const apiKey = crypto.randomUUID().replace(/-/g, "");

  rl.close();

  // リポジトリをクローン
  console.log("\n📦 リポジトリをセットアップ中...");
  execSync(`git clone https://github.com/your-org/marketing-harness.git "${name}"`, { stdio: "inherit" });

  // .env.local 生成
  const envContent = [
    `ANTHROPIC_API_KEY=${anthropicKey}`,
    `META_ACCESS_TOKEN=${metaToken}`,
    `META_AD_ACCOUNT_ID=${metaAccountId}`,
    `NEXT_PUBLIC_WORKER_URL=http://localhost:8787`,
  ].join("\n");
  writeFileSync(join(dir, "apps/web/.env.local"), envContent);

  // 生成したAPIキーを表示
  console.log("\n✅ セットアップ完了！\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📁 ディレクトリ: ${name}/`);
  console.log(`🔑 API Key: ${apiKey}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("次のステップ:");
  console.log(`  cd ${name}`);
  console.log("  pnpm install");
  console.log("  npx wrangler d1 create marketing-harness");
  console.log("  npx wrangler d1 execute marketing-harness --file=packages/db/schema.sql");
  console.log(`  npx wrangler secret put API_KEY   # 値: ${apiKey}`);
  console.log("  npx wrangler secret put ANTHROPIC_API_KEY");
  console.log("  pnpm deploy:worker");
  console.log("  pnpm dev:web");
  console.log("\nClaude Code 連携:");
  console.log(`  MARKETING_HARNESS_API_KEY=${apiKey} claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
