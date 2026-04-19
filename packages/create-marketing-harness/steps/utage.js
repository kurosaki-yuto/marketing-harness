import { join } from "path";
import { printStepHeader, printSkipped, printSuccess, askSkip } from "../lib/prompts.js";
import { runSetup } from "../lib/guided-setup.js";
import { putSecret } from "../lib/wrangler.js";
import { writeConfig } from "../lib/config-file.js";
import { runWithFallback } from "../lib/connector.js";
import { registerRemoteMcpServer } from "../lib/mcp-settings.js";

export async function run({ config, mode, data }) {
  if (mode === "apply") {
    const { apiKey } = data ?? {};
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: {} };
    await putSecret("UTAGE_API_KEY", apiKey, opts);
    writeConfig(config.projectDir, {
      utage: { apiKey },
      integrations: { utage: { enabled: true, configuredAt: new Date().toISOString() } },
    });
    registerRemoteMcpServer(config.projectDir, {
      name: "utage",
      url: "https://api.utage-system.com/mcp",
      apiKey,
    });
    printSuccess("UTAGE の接続が完了しました");
    return { skipped: false };
  }

  printStepHeader(
    mode === "configure" ? "UTAGE" : 6,
    "UTAGE（宴）連携（任意）",
    "UTAGE の購読者管理・メール配信・ファネル自動化に使用します"
  );

  if (mode === "init") {
    const skip = await askSkip("UTAGE（宴）");
    if (skip) {
      printSkipped("utage");
      config.utage = {};
      return { skipped: true };
    }
  }

  const MANUAL = `1. UTAGE 管理画面 → 設定 → API 連携 → API キーを発行\n2. 取得後、再度このコマンドを実行してください`;
  const setup = await runWithFallback("utage", () => runSetup("utage"), MANUAL);
  if (!setup.success) { config.utage = {}; return { skipped: true }; }
  const { apiKey } = setup.result;

  config.utage = { apiKey };

  // UTAGE 公式リモート MCP を .claude/settings.json に登録
  registerRemoteMcpServer(config.projectDir, {
    name: "utage",
    url: "https://api.utage-system.com/mcp",
    apiKey,
  });

  if (mode === "configure") {
    const workerDir = join(config.projectDir, "apps/worker");
    const opts = { cwd: workerDir, env: config.cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: config.cloudflareApiToken } : {} };
    await putSecret("UTAGE_API_KEY", apiKey, opts);
    writeConfig(config.projectDir, {
      utage: { apiKey },
      integrations: { utage: { enabled: true, configuredAt: new Date().toISOString() } },
    });
    printSuccess("UTAGE 連携を設定しました（公式 MCP を有効化しました）");
  } else {
    printSuccess("UTAGE の情報を取得しました（起動時に公式 MCP が自動で有効化されます）");
  }

  return { skipped: false };
}
