#!/usr/bin/env node
import { basename, resolve } from "path";
import prompts from "prompts";
import { printHeader } from "./lib/prompts.js";
import { detectProject } from "./lib/project-detect.js";
import { runHelp, runHelpOutsideProject, runRepair } from "./lib/help.js";

process.on("SIGINT", () => {
  console.log("\n\nセットアップを中断しました。");
  process.exit(1);
});

async function runInit() {
  printHeader();
  const { run: licenseStep }    = await import("./steps/license.js");
  const { run: projectStep }    = await import("./steps/project.js");
  const { run: cloudflareStep } = await import("./steps/cloudflare.js");
  const { run: metaStep }       = await import("./steps/meta.js");
  const { run: lineStep }       = await import("./steps/line.js");
  const { run: utageStep }      = await import("./steps/utage.js");
  const { run: googleAdsStep }  = await import("./steps/google-ads.js");
  const { run: deployStep }     = await import("./steps/deploy.js");

  const config = {};

  await licenseStep({ config });
  await projectStep({ config });
  await cloudflareStep({ config, mode: "init" });
  await metaStep({ config, mode: "init" });
  await lineStep({ config, mode: "init" });
  await utageStep({ config, mode: "init" });
  await googleAdsStep({ config, mode: "init" });
  await deployStep({ config });

  await printCompletionAndMaybeLaunch(config);
}

async function runLaunch(projectDir, { raw = false } = {}) {
  const { run } = await import("./steps/launch.js");
  await run({ projectDir, raw });
}

async function runConfigure(service) {
  const validServices = ["cloudflare", "meta", "line", "utage", "google-ads"];
  if (!validServices.includes(service)) {
    console.error(`\n  未知のサービス: ${service}`);
    console.error(`  使用できるサービス: ${validServices.join(", ")}`);
    process.exit(1);
  }

  const { state, projectDir } = detectProject(process.cwd());
  if (state === "outside") {
    console.error("\n  プロジェクトルートで実行してください（apps/worker/wrangler.toml が見つかりません）");
    console.error(`  現在のディレクトリ: ${process.cwd()}`);
    process.exit(1);
  }

  console.log(`\n  marketing-harness configure: ${service}\n`);

  const config = { projectDir };
  const stepMap = {
    cloudflare:   "./steps/cloudflare.js",
    meta:         "./steps/meta.js",
    line:         "./steps/line.js",
    utage:        "./steps/utage.js",
    "google-ads": "./steps/google-ads.js",
  };

  const { run } = await import(stepMap[service]);
  await run({ config, mode: "configure" });
  console.log("\n  設定が完了しました。Worker を再起動中の場合は少し待ってください。\n");
}

async function printCompletionAndMaybeLaunch(config) {
  const { projectName, projectDir } = config;

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   セットアップ完了！                          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const { launchNow } = await prompts({
    type: "confirm",
    name: "launchNow",
    message: "今すぐ marketing-harness を起動しますか？",
    initial: true,
  });

  if (launchNow) {
    const target = projectDir ?? resolve(process.cwd(), projectName);
    await runLaunch(target);
    return;
  }

  console.log(`\n  次に打つコマンド:`);
  console.log(`    cd ${projectName}`);
  console.log(`    marketing-harness\n`);
  console.log(`  後から連携を追加するには:`);
  console.log(`    marketing-harness configure line    # LINE を追加`);
  console.log(`    marketing-harness configure utage   # UTAGE を追加`);
  console.log(`    marketing-harness configure google-ads\n`);
}

// エントリーポイント
const argv = process.argv.slice(2);
const rawIdx = argv.indexOf("--raw");
const raw = rawIdx !== -1;
if (raw) argv.splice(rawIdx, 1);
const [sub, svc] = argv;
const binName = basename(process.argv[1] ?? "");

const SUBCOMMANDS = new Set(["configure", "launch", "setup", "init", "help", "--help", "-h", "--version", "-v"]);

async function main() {
  if (sub && SUBCOMMANDS.has(sub)) {
    switch (sub) {
      case "configure":
        if (!svc) {
          console.error("\n  使い方: marketing-harness configure <service>");
          console.error("  サービス: cloudflare / meta / line / utage / google-ads\n");
          process.exit(1);
        }
        await runConfigure(svc);
        break;
      case "setup":
      case "init":
        await runInit();
        break;
      case "launch": {
        const { state, projectDir } = detectProject(process.cwd());
        if (state === "ready")       await runLaunch(projectDir, { raw });
        else if (state === "broken") runRepair(projectDir ?? process.cwd());
        else                         runHelpOutsideProject();
        break;
      }
      case "help":
      case "--help":
      case "-h":
        runHelp();
        break;
      case "--version":
      case "-v":
        console.log("0.3.0");
        break;
    }
  } else if (binName.startsWith("create-")) {
    await runInit();
  } else {
    const { state, projectDir } = detectProject(process.cwd());
    if (state === "ready")       await runLaunch(projectDir, { raw });
    else if (state === "broken") runRepair(projectDir ?? process.cwd());
    else                         runHelpOutsideProject();
  }
}

main().catch((err) => {
  console.error("\n  エラー:", err.message ?? err);
  process.exit(1);
});
