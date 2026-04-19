import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * プロジェクトの .claude/settings.json にリモート MCP サーバーを登録する。
 * 既存の設定は保持したまま、mcpServers キーだけ追加・更新する。
 */
export function registerRemoteMcpServer(projectDir, { name, url, apiKey }) {
  const claudeDir = join(projectDir, ".claude");
  const settingsPath = join(claudeDir, "settings.json");

  mkdirSync(claudeDir, { recursive: true });

  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch { /* 壊れていたら空で上書き */ }
  }

  settings.mcpServers = settings.mcpServers ?? {};
  settings.mcpServers[name] = {
    url,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  // Claude Code の permissions に mcp__<name>__* を自動追加
  settings.permissions = settings.permissions ?? {};
  settings.permissions.allow = settings.permissions.allow ?? [];
  const wildcard = `mcp__${name}__*`;
  if (!settings.permissions.allow.includes(wildcard)) {
    settings.permissions.allow.push(wildcard);
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return settingsPath;
}
