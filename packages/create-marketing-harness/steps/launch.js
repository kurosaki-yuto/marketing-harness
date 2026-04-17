import { execa } from "execa";
import { readConfig, touchLastLaunch } from "../lib/config-file.js";
import { assertClaudeCli, isMcpRegistered, registerMcp, ensureMcpBuilt } from "../lib/claude-cli.js";

const FIRST_LAUNCH_PROMPT =
  "marketing-harness へようこそ。現在の連携状況を確認し、直近 7 日間のキャンペーン実績をざっと俯瞰して、特に注目すべきキャンペーンが 1〜3 件あれば教えてください。必要なら /mh-analyze の実行を提案してください。";

export async function run({ projectDir }) {
  const cfg = readConfig(projectDir);
  if (!cfg) return;

  await assertClaudeCli();
  await ensureMcpBuilt(projectDir);

  const mcpName = cfg.mcpServerName ?? "marketing-harness";
  const already = await isMcpRegistered(mcpName, projectDir);
  if (!already) {
    console.log("  MCP サーバーを登録中...\n");
    await registerMcp(mcpName, {
      projectDir,
      workerUrl: cfg.workerUrl,
      apiKey: cfg.apiKey,
    });
  }

  const isFirstLaunch = !cfg.lastLaunchAt;
  if (isFirstLaunch) {
    printLaunchBanner(cfg);
  } else {
    console.log("  marketing-harness ready — starting claude...\n");
  }

  const args = isFirstLaunch ? [FIRST_LAUNCH_PROMPT] : [];

  const child = execa("claude", args, {
    cwd: projectDir,
    stdio: "inherit",
    env: {
      ...process.env,
      MARKETING_HARNESS_URL: cfg.workerUrl,
      MARKETING_HARNESS_API_KEY: cfg.apiKey,
    },
  });

  const forward = (sig) => { try { child.kill(sig); } catch {} };
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);

  let exitCode = 0;
  try {
    const result = await child;
    exitCode = result.exitCode ?? 0;
  } catch (err) {
    if (err.isCanceled || err.signal) {
      exitCode = err.exitCode ?? 130;
    } else {
      throw err;
    }
  }

  await touchLastLaunch(projectDir);
  process.exit(exitCode);
}

function printLaunchBanner(cfg) {
  const integrations = cfg.integrations ?? {};
  const enabled = Object.entries(integrations)
    .filter(([, v]) => v && v.enabled)
    .map(([k]) => k)
    .join(", ") || "なし";

  console.log("\n" + "═".repeat(54));
  console.log("  marketing-harness  ready");
  console.log("═".repeat(54));
  console.log(`  Worker:  ${cfg.workerUrl || "(local)"}`);
  console.log(`  連携済み: ${enabled}`);
  console.log(`  コマンド: /mh-analyze  /mh-report  /mh-kpi  /mh-propose`);
  console.log("═".repeat(54) + "\n");
}
