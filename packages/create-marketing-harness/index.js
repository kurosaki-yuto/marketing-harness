#!/usr/bin/env node
import { existsSync } from "fs";
import { resolve } from "path";
import { printHeader } from "./lib/prompts.js";

process.on("SIGINT", () => {
  console.log("\n\nセットアップを中断しました。");
  process.exit(1);
});

async function runInit() {
  printHeader();
  const { run: licenseStep } = await import("./steps/license.js");
  const { run: projectStep } = await import("./steps/project.js");
  const { run: cloudflareStep } = await import("./steps/cloudflare.js");
  const { run: metaStep } = await import("./steps/meta.js");
  const { run: lineStep } = await import("./steps/line.js");
  const { run: utageStep } = await import("./steps/utage.js");
  const { run: googleAdsStep } = await import("./steps/google-ads.js");
  const { run: deployStep } = await import("./steps/deploy.js");

  const config = {};

  await licenseStep({ config });
  await projectStep({ config });
  await cloudflareStep({ config, mode: "init" });
  await metaStep({ config, mode: "init" });
  await lineStep({ config, mode: "init" });
  await utageStep({ config, mode: "init" });
  await googleAdsStep({ config, mode: "init" });
  await deployStep({ config });

  printCompletion(config);
}

async function runConfigure(service) {
  const validServices = ["cloudflare", "meta", "line", "utage", "google-ads"];
  if (!validServices.includes(service)) {
    console.error(`\n  未知のサービス: ${service}`);
    console.error(`  使用できるサービス: ${validServices.join(", ")}`);
    process.exit(1);
  }

  // プロジェクトルートの検出
  const projectDir = resolve(process.cwd());
  const wranglerToml = resolve(projectDir, "apps/worker/wrangler.toml");
  if (!existsSync(wranglerToml)) {
    console.error("\n  プロジェクトルートで実行してください（apps/worker/wrangler.toml が見つかりません）");
    console.error(`  現在のディレクトリ: ${projectDir}`);
    process.exit(1);
  }

  console.log(`\n  marketing-harness configure: ${service}\n`);

  const config = { projectDir };
  const stepMap = {
    cloudflare: "./steps/cloudflare.js",
    meta: "./steps/meta.js",
    line: "./steps/line.js",
    utage: "./steps/utage.js",
    "google-ads": "./steps/google-ads.js",
  };

  const { run } = await import(stepMap[service]);
  await run({ config, mode: "configure" });
  console.log("\n  設定が完了しました。Worker を再起動中の場合は少し待ってください。\n");
}

function printCompletion(config) {
  const { projectName, workerUrl, apiKey } = config;

  console.log("\n" + "━".repeat(52));
  console.log("  セットアップ完了！");
  console.log("━".repeat(52) + "\n");

  if (workerUrl) console.log(`  Worker URL : ${workerUrl}`);
  console.log(`  API Key    : ${apiKey}\n`);

  console.log("  ─── Claude Code MCP を登録する ───");
  console.log(`  cd ${projectName}`);
  console.log("  pnpm --filter mcp-server build");
  console.log(
    `  MARKETING_HARNESS_URL=${workerUrl || "<worker-url>"} MARKETING_HARNESS_API_KEY=${apiKey} \\`
  );
  console.log("  claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js\n");

  console.log("  ─── Claude Code にログインする（初回のみ） ───");
  console.log("  claude login\n");

  console.log("  ─── 使い始める ───");
  console.log("  claude\n");
  console.log("  例: /mh-analyze");
  console.log("  例: 今月 CPA が一番高いキャンペーンを教えて\n");

  console.log("  ─── 後から連携を追加するには ───");
  console.log(`  cd ${projectName}`);
  console.log("  npx marketing-harness configure line   # LINE を追加");
  console.log("  npx marketing-harness configure utage  # UTAGE を追加\n");
}

// エントリーポイント
const [, , subcommand, service] = process.argv;

if (subcommand === "configure") {
  if (!service) {
    console.error("\n  使い方: npx marketing-harness configure <service>");
    console.error("  サービス: cloudflare / meta / line / utage / google-ads\n");
    process.exit(1);
  }
  runConfigure(service).catch((err) => {
    console.error("\n  エラー:", err.message ?? err);
    process.exit(1);
  });
} else {
  runInit().catch((err) => {
    console.error("\n  エラー:", err.message ?? err);
    process.exit(1);
  });
}
