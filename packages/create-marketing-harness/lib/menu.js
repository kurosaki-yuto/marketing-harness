import prompts from "prompts";
import { MSG } from "./messages.js";

const SERVICES = [
  { title: "Meta 広告（Facebook / Instagram）", value: "meta" },
  { title: "LINE（朝のレポート通知）", value: "line" },
  { title: "UTAGE（メルマガ・LP）", value: "utage" },
  { title: "Google 広告", value: "google-ads" },
  { title: "キャンセル", value: null },
];

export function printMenuBanner(cfg) {
  const integrations = cfg.integrations ?? {};

  const statusParts = [
    ["meta",      "Meta"],
    ["line",      "LINE"],
    ["utage",     "UTAGE"],
    ["googleAds", "Google"],
  ].map(([key, label]) => `${label}=${integrations[key]?.enabled ? "接続済" : "未"}`);

  const lastLaunch = cfg.lastLaunchAt
    ? new Date(cfg.lastLaunchAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "初回起動";

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  marketing-harness                            ║");
  console.log("║  広告運用 AI エージェント                     ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n  状態:      ${statusParts.join(" / ")}`);
  console.log(`  ${MSG.MENU_WORKER}:    ${cfg.workerUrl || "(ローカル)"}`);
  console.log(`  ${MSG.MENU_LAST_LAUNCH}:  ${lastLaunch}\n`);
}

export function printAlertBanner(alerts) {
  if (!alerts || alerts.length === 0) return;
  console.log("  ⚠  昨日からの変化");
  for (const a of alerts) console.log(`  ┗ [${a.category}] ${a.text}`);
  console.log("");
}

export async function renderMainMenu(cfg, commands) {
  const exampleChoices = commands.map(({ slug, description }) => ({
    title: `  └ ${description}`,
    value: { type: "hearing", slug, description },
    description: slug,
  }));

  const choices = [
    { title: MSG.MENU_CHAT, value: { type: "chat" } },
    { title: MSG.MENU_SEPARATOR, value: null, disabled: true },
    ...exampleChoices,
    { title: "──────────────────────", value: null, disabled: true },
    { title: MSG.MENU_CONFIGURE, value: { type: "configure" } },
    { title: MSG.MENU_EXIT, value: { type: "exit" } },
  ];

  const { choice } = await prompts({
    type: "select",
    name: "choice",
    message: "どうしますか？",
    choices,
    hint: "矢印キーで選択、Enter で決定",
  });

  if (choice === undefined) return { type: "exit" };
  if (choice === null) return { type: "exit" };
  return choice;
}

export async function renderConfigureMenu() {
  const { service } = await prompts({
    type: "select",
    name: "service",
    message: "設定するサービスを選んでください:",
    choices: SERVICES,
  });

  if (service === undefined || service === null) return null;
  return service;
}
