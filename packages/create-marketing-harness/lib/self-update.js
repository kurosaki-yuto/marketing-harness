import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { readConfig, writeConfig } from "./config-file.js";
import { d1ExecuteQuiet, deploy } from "./wrangler.js";
import { registerRemoteMcpServer } from "./mcp-settings.js";
import { LATEST_SCHEMA_VERSION } from "./version.js";

/**
 * 起動時に呼ぶ。schemaVersion が古ければ DB migration → Worker 再デプロイ → MCP 同期を
 * 黙って実行する。失敗しても起動は止めない。
 */
export async function selfUpdate(projectDir) {
  const cfg = readConfig(projectDir);
  if (!cfg) return;

  const currentVersion = cfg.schemaVersion ?? 0;
  if (currentVersion >= LATEST_SCHEMA_VERSION) return;

  console.log("  最新版に更新しています…\n");

  try {
    const workerDir = join(projectDir, "apps/worker");
    if (!existsSync(workerDir)) return;

    const wranglerOpts = { cwd: workerDir, env: {} };

    // 未適用 migration を番号順に適用
    const migrationsDir = join(projectDir, "packages/db/migrations");
    if (existsSync(migrationsDir)) {
      const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      const pending = files.filter((f) => {
        const m = f.match(/^0*(\d+)/);
        return m && parseInt(m[1], 10) > currentVersion;
      });

      for (let i = 0; i < pending.length; i++) {
        process.stdout.write(`\r  データを更新しています… (${i + 1}/${pending.length})`);
        await d1ExecuteQuiet("marketing-harness", `../../packages/db/migrations/${pending[i]}`, wranglerOpts);
      }
      if (pending.length > 0) process.stdout.write("\n");
    }

    // Worker 再デプロイ（新 API ルート・cron を反映）
    process.stdout.write("  サーバーを更新しています…");
    await deploy(workerDir, wranglerOpts);
    process.stdout.write("\r  サーバーを更新しました    \n");

    // utage 公式 MCP 同期（apiKey がローカル config に保存されている場合のみ）
    const utageApiKey = cfg.utage?.apiKey;
    if (cfg.integrations?.utage?.enabled && utageApiKey) {
      registerRemoteMcpServer(projectDir, {
        name: "utage",
        url: "https://api.utage-system.com/mcp",
        apiKey: utageApiKey,
      });
    }

    writeConfig(projectDir, { schemaVersion: LATEST_SCHEMA_VERSION });
    console.log("  最新版に更新しました\n");
  } catch {
    console.warn("  更新中に問題が発生しましたが、引き続き利用できます\n");
  }
}
