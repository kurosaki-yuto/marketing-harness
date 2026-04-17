#!/usr/bin/env node
// create-marketing-harness — ワンコマンドセットアップウィザード
// 使い方: npx create-marketing-harness

import { execa } from "execa";
import prompts from "prompts";
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, resolve } from "path";

const REPO_URL = "https://github.com/your-org/marketing-harness.git";
const LICENSE_SERVER_URL =
  process.env.MARKETING_HARNESS_LICENSE_URL ||
  "https://marketing-harness-license.gkoinobori0505.workers.dev";

// Ctrl+C でウィザード中断
process.on("SIGINT", () => {
  console.log("\n\nセットアップを中断しました。");
  process.exit(1);
});

async function run(cmd, args, opts = {}) {
  return execa(cmd, args, { stdio: "inherit", ...opts });
}

async function capture(cmd, args, opts = {}) {
  const result = await execa(cmd, args, { stdio: "pipe", ...opts });
  return result.stdout;
}

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║    marketing-harness  setup wizard   ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log("広告運用 AI エージェントをあなたの Cloudflare にセットアップします。\n");

  // ---- Step 1: ライセンスキー確認 ----
  const { licenseKey } = await prompts({
    type: "text",
    name: "licenseKey",
    message: "コミュニティライセンスキー (mh_...):",
    validate: (v) => v.startsWith("mh_") ? true : "mh_ から始まるキーを入力してください",
  });
  if (!licenseKey) process.exit(1);

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
  console.log(`  ライセンス確認 OK (plan: ${verifyResult.plan})\n`);

  // ---- Step 2: プロジェクト名 ----
  const { projectName } = await prompts({
    type: "text",
    name: "projectName",
    message: "プロジェクト名 [my-marketing-harness]:",
    initial: "my-marketing-harness",
    validate: (v) => /^[a-z0-9-]+$/.test(v) ? true : "英小文字・数字・ハイフンのみ使用できます",
  });
  if (!projectName) process.exit(1);

  const dir = resolve(process.cwd(), projectName);
  if (existsSync(dir)) {
    console.error(`\n  ディレクトリ "${projectName}" が既に存在します`);
    process.exit(1);
  }

  // ---- Step 3: API キー収集 ----
  const answers = await prompts([
    {
      type: "text",
      name: "metaToken",
      message: "Meta Access Token (任意、Enterでスキップ):",
      initial: "",
    },
    {
      type: "text",
      name: "metaAccountId",
      message: "Meta Ad Account ID (act_xxx、任意):",
      initial: "",
    },
  ]);

  if (answers.metaToken === undefined) process.exit(1);

  const apiKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  // ---- Step 4: Cloudflare 認証確認 ----
  console.log("\n  Cloudflare 認証を確認中...");
  try {
    await capture("npx", ["wrangler", "whoami"]);
    console.log("  Cloudflare 認証 OK\n");
  } catch {
    console.log("  未認証です。ブラウザでログインします...");
    await run("npx", ["wrangler", "login"]);
    console.log("");
  }

  // ---- Step 5: git clone ----
  console.log(`  リポジトリをクローン中... (${projectName}/)\n`);
  await run("git", ["clone", REPO_URL, projectName]);
  console.log("");

  // ---- Step 6: pnpm install ----
  console.log("  依存パッケージをインストール中...\n");
  await run("pnpm", ["install"], { cwd: dir });
  console.log("");

  // ---- Step 7: D1 データベース作成 ----
  console.log("  D1 データベースを作成中...\n");
  let dbId;
  try {
    const out = await capture("npx", ["wrangler", "d1", "create", "marketing-harness"], { cwd: dir });
    const match = out.match(/database_id\s*=\s*"([^"]+)"/);
    if (match) {
      dbId = match[1];
    } else {
      // 既存 DB の場合は list から取得
      const listOut = await capture("npx", ["wrangler", "d1", "list"], { cwd: dir });
      const listMatch = listOut.match(/marketing-harness\s+([0-9a-f-]{36})/);
      if (listMatch) dbId = listMatch[1];
    }
  } catch (e) {
    if (String(e).includes("already exists")) {
      const listOut = await capture("npx", ["wrangler", "d1", "list"], { cwd: dir });
      const listMatch = listOut.match(/marketing-harness\s+([0-9a-f-]{36})/);
      if (listMatch) dbId = listMatch[1];
    } else throw e;
  }

  if (!dbId) {
    console.error("  database_id の取得に失敗しました。手動で wrangler.toml に記入してください。");
  } else {
    console.log(`  database_id: ${dbId}\n`);
    // wrangler.toml のプレースホルダを置換
    const tomlPath = join(dir, "apps/worker/wrangler.toml");
    const toml = readFileSync(tomlPath, "utf8");
    writeFileSync(tomlPath, toml.replace("YOUR_DATABASE_ID_HERE", dbId));
  }

  // ---- Step 8: D1 スキーマ適用 ----
  console.log("  データベーステーブルを作成中...\n");
  await run("npx", ["wrangler", "d1", "execute", "marketing-harness", "--file=packages/db/schema.sql"], { cwd: dir });
  console.log("");

  // ---- Step 9: Secrets 投入 ----
  console.log("  シークレットを設定中...\n");

  async function putSecret(name, value) {
    if (!value) return;
    const proc = execa("npx", ["wrangler", "secret", "put", name], {
      cwd: dir,
      stdio: ["pipe", "inherit", "inherit"],
    });
    proc.stdin.write(value + "\n");
    proc.stdin.end();
    await proc;
  }

  await putSecret("API_KEY", apiKey);
  await putSecret("LICENSE_KEY", licenseKey);
  await putSecret("LICENSE_SERVER_URL", LICENSE_SERVER_URL);
  if (answers.metaToken) await putSecret("META_ACCESS_TOKEN", answers.metaToken);
  if (answers.metaAccountId) await putSecret("META_AD_ACCOUNT_ID", answers.metaAccountId);
  console.log("");

  // ---- Step 10: デプロイ ----
  const { doDeploy } = await prompts({
    type: "confirm",
    name: "doDeploy",
    message: "Cloudflare Workers にデプロイしますか？",
    initial: true,
  });

  let workerUrl = "";
  if (doDeploy) {
    console.log("\n  デプロイ中...\n");
    try {
      const deployOut = await capture("npx", ["wrangler", "deploy"], { cwd: join(dir, "apps/worker") });
      const urlMatch = deployOut.match(/https:\/\/[^\s]+\.workers\.dev/);
      if (urlMatch) workerUrl = urlMatch[0];
    } catch {
      await run("npx", ["wrangler", "deploy"], { cwd: join(dir, "apps/worker") });
    }
    console.log("");
  }

  // ---- Step 11: .env.local 生成 ----
  const webEnvPath = join(dir, "apps/web/.env.local");
  writeFileSync(webEnvPath, [
    `NEXT_PUBLIC_WORKER_URL=${workerUrl || "http://localhost:8787"}`,
    `NEXT_PUBLIC_API_KEY=${apiKey}`,
  ].join("\n") + "\n");

  // ---- 完了 ----
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  セットアップ完了！");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  if (workerUrl) console.log(`  Worker URL: ${workerUrl}`);
  console.log(`  API Key   : ${apiKey}\n`);

  console.log("  管理画面を起動する:");
  console.log(`    cd ${projectName}`);
  console.log("    pnpm dev:web\n");

  console.log("  Claude Code MCP を登録する:");
  console.log(`    cd ${projectName}`);
  console.log("    pnpm --filter mcp-server build");
  console.log(
    `    MARKETING_HARNESS_URL=${workerUrl || "<worker-url>"} MARKETING_HARNESS_API_KEY=${apiKey} \\`
  );
  console.log("    claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js\n");

  console.log("  Claude Code にログインする（初回のみ）:");
  console.log("    claude login\n");

  console.log("  Claude Code を起動して使う:");
  console.log("    claude\n");
  console.log("    例: /mh-analyze");
  console.log("    例: 今月 CPA が一番高いキャンペーンを教えて\n");
}

main().catch((err) => {
  console.error("\n  エラー:", err.message ?? err);
  process.exit(1);
});
