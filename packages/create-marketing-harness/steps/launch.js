import { execa } from "execa";
import { readConfig, touchLastLaunch } from "../lib/config-file.js";
import { assertClaudeCli, isMcpRegistered, registerMcp, ensureMcpBuilt } from "../lib/claude-cli.js";
import { loadCommands } from "../lib/command-loader.js";
import { printMenuBanner, renderMainMenu, renderConfigureMenu } from "../lib/menu.js";

export async function run({ projectDir, raw = false }) {
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

  const env = {
    ...process.env,
    MARKETING_HARNESS_URL: cfg.workerUrl,
    MARKETING_HARNESS_API_KEY: cfg.apiKey,
  };

  if (raw || process.env.MH_RAW === "1") {
    await spawnClaude([], { cwd: projectDir, env });
    return;
  }

  printMenuBanner(cfg);
  const commands = loadCommands(projectDir);
  const choice = await renderMainMenu(cfg, commands);

  if (choice.type === "exit") {
    process.exit(0);
  }

  if (choice.type === "configure") {
    const service = await renderConfigureMenu();
    if (!service) process.exit(0);
    const stepMap = {
      cloudflare:   "../steps/cloudflare.js",
      meta:         "../steps/meta.js",
      line:         "../steps/line.js",
      utage:        "../steps/utage.js",
      "google-ads": "../steps/google-ads.js",
    };
    const { run: configureStep } = await import(stepMap[service]);
    await configureStep({ config: { projectDir }, mode: "configure" });
    await touchLastLaunch(projectDir);
    process.exit(0);
  }

  const args = choice.type === "slash" ? [choice.slug] : [];
  await spawnClaude(args, { cwd: projectDir, env });
}

async function spawnClaude(args, opts) {
  const child = execa("claude", args, { stdio: "inherit", ...opts });

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

  await touchLastLaunch(opts.cwd);
  process.exit(exitCode);
}
