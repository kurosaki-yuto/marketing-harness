import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync } from "fs";
import { join, dirname } from "path";

const CONFIG_DIR = ".marketing-harness";
const CONFIG_FILE = "config.json";

export function getConfigPath(projectDir) {
  return join(projectDir, CONFIG_DIR, CONFIG_FILE);
}

export function readConfig(projectDir) {
  const cfgPath = getConfigPath(projectDir);
  if (!existsSync(cfgPath)) return null;
  try {
    return JSON.parse(readFileSync(cfgPath, "utf8"));
  } catch {
    return null;
  }
}

export function writeConfig(projectDir, partial) {
  const cfgPath = getConfigPath(projectDir);
  const cfgDir = dirname(cfgPath);
  if (!existsSync(cfgDir)) mkdirSync(cfgDir, { recursive: true });

  const existing = readConfig(projectDir) ?? {};
  const merged = deepMerge(existing, partial);

  const tmp = cfgPath + ".tmp";
  writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n");
  try { chmodSync(tmp, 0o600); } catch {}
  renameSync(tmp, cfgPath);
}

export function touchLastLaunch(projectDir) {
  writeConfig(projectDir, { lastLaunchAt: new Date().toISOString() });
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null && typeof sv === "object" && !Array.isArray(sv) &&
      tv !== null && typeof tv === "object" && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv, sv);
    } else {
      result[key] = sv;
    }
  }
  return result;
}
