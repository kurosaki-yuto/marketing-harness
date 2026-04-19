import { execa } from "execa";
import { readConfig, touchLastLaunch } from "../lib/config-file.js";
import { assertClaudeCli, isMcpRegistered, registerMcp, ensureMcpBuilt } from "../lib/claude-cli.js";
import { loadCommands } from "../lib/command-loader.js";
import { printMenuBanner, printAlertBanner, renderMainMenu, renderConfigureMenu } from "../lib/menu.js";
import { MARKETING_HARNESS_SYSTEM_PROMPT } from "../lib/system-prompt.js";
import { collectAlerts } from "../lib/alerts.js";
import { selfUpdate } from "../lib/self-update.js";
import { buildSetupPrompt } from "../lib/setup-prompt.js";
import { printSetupSummary } from "../lib/setup-summary.js";

export async function run({ projectDir, raw = false }) {
  await selfUpdate(projectDir);

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

  const sysArgs = ["--append-system-prompt", MARKETING_HARNESS_SYSTEM_PROMPT];

  if (raw || process.env.MH_RAW === "1") {
    await spawnClaude(sysArgs, { cwd: projectDir, env });
    return;
  }

  printMenuBanner(cfg);
  const commands = loadCommands(projectDir);
  const alerts = await collectAlerts(cfg);
  printAlertBanner(alerts);
  const choice = await renderMainMenu(cfg, commands);

  if (choice.type === "exit") {
    process.exit(0);
  }

  if (choice.type === "configure") {
    const service = await renderConfigureMenu();
    if (!service) process.exit(0);
    const prompt = buildSetupPrompt(service, projectDir);
    await spawnClaude([...sysArgs, prompt], { cwd: projectDir, env });
    await touchLastLaunch(projectDir);
    printSetupSummary(projectDir);
    process.exit(0);
  }

  let promptArg = [];
  if (choice.type === "hearing") {
    promptArg = [[
      `ユーザーは「${choice.description}」に関心があります（参考コマンド: ${choice.slug}）。`,
      "",
      `重要: いきなり ${choice.slug} を実行しないでください。`,
      "まず短く（最大3問）状況をヒアリングし、対象期間・媒体・キャンペーンなど必要な前提を確認してから、実行してよいかユーザーに確認してください。",
      "「何を聞きたいか」の例:",
      "- いつの期間を見ますか？（昨日 / 先週 / 今月 など）",
      "- 媒体はどれですか？（Meta / Google / 全部）",
      "- 特に気になっているキャンペーンはありますか？（なければ全体）",
      "",
      "挨拶は不要、いきなり質問から入ってOKです。ユーザーの回答が揃ったら、内容を要約して『この方針で進めますね』と確認してから作業に入ってください。",
    ].join("\n")];
  } else if (choice.type === "chat") {
    const alertContext = alerts.length
      ? `\n参考: 昨日からの変化\n${alerts.map((a) => `- [${a.category}] ${a.text}`).join("\n")}\n`
      : "";
    promptArg = [[
      "ユーザーは相談したいことがあります。まずこう話しかけてください:",
      "「今、広告運用で一番気になっていることは何ですか？ 例えば CPA が上がっている、反応が弱い、レポートを作りたい、新しいクリエイティブが欲しい など、何でもどうぞ。」",
      alertContext,
      "返答を受けたら、2〜3問で状況（期間・媒体・対象キャンペーン）を補足ヒアリングし、提案を一つに絞って承認を取ってから実行してください。",
    ].join("\n")];
  }
  await spawnClaude([...sysArgs, ...promptArg], { cwd: projectDir, env });
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
