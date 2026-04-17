import { existsSync } from "fs";
import { join, resolve } from "path";
import { execa } from "execa";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function assertClaudeCli() {
  try {
    await execa("claude", ["--version"], { stdio: "pipe" });
  } catch {
    console.error(`
  Claude Code CLI が見つかりません。インストールしてください:

    curl -fsSL https://claude.ai/install.sh | sh

  またはドキュメント: https://claude.ai/code
`);
    process.exit(2);
  }
}

export async function isMcpRegistered(name, cwd) {
  const res = await execa("claude", ["mcp", "list"], { cwd, reject: false });
  const stdout = res.stdout ?? "";
  return new RegExp(`^${escapeRegex(name)}:\\s`, "m").test(stdout);
}

export async function registerMcp(name, { projectDir, workerUrl, apiKey }) {
  const distPath = resolve(join(projectDir, "packages/mcp-server/dist/index.js"));
  await execa("claude", [
    "mcp", "add",
    "-e", `MARKETING_HARNESS_URL=${workerUrl}`,
    "-e", `MARKETING_HARNESS_API_KEY=${apiKey}`,
    name,
    "--",
    "node",
    distPath,
  ], { cwd: projectDir, stdio: "inherit" });
}

export async function ensureMcpBuilt(projectDir) {
  const distPath = join(projectDir, "packages/mcp-server/dist/index.js");
  if (existsSync(distPath)) return;
  console.log("  MCP server の初回ビルド中...\n");
  await execa("pnpm", ["--filter", "mcp-server", "build"], {
    cwd: projectDir,
    stdio: "inherit",
  });
}
