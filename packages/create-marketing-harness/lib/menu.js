import prompts from "prompts";

const SERVICES = [
  { title: "Cloudflare", value: "cloudflare" },
  { title: "Meta Ads", value: "meta" },
  { title: "LINE", value: "line" },
  { title: "UTAGE", value: "utage" },
  { title: "Google Ads", value: "google-ads" },
  { title: "キャンセル", value: null },
];

export function printMenuBanner(cfg) {
  const integrations = cfg.integrations ?? {};
  const enabled = Object.entries(integrations)
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k)
    .join(", ") || "なし";

  const lastLaunch = cfg.lastLaunchAt
    ? new Date(cfg.lastLaunchAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "初回起動";

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  marketing-harness                            ║");
  console.log("║  広告運用 AI エージェント                     ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n  Worker:    ${cfg.workerUrl || "(local)"}`);
  console.log(`  連携済み:  ${enabled}`);
  console.log(`  最終起動:  ${lastLaunch}\n`);
}

export async function renderMainMenu(cfg, commands) {
  const commandChoices = commands.map(({ slug, description }) => ({
    title: `${description}`,
    value: { type: "slash", slug },
    description: slug,
  }));

  const choices = [
    ...commandChoices,
    { title: "──────────────────────", value: null, disabled: true },
    { title: "Claude に自由に話しかける", value: { type: "chat" } },
    { title: "連携を追加・変更する", value: { type: "configure" } },
    { title: "終了", value: { type: "exit" } },
  ];

  const { choice } = await prompts({
    type: "select",
    name: "choice",
    message: "何をしますか？",
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
