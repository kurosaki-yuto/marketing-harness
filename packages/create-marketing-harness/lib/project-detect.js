import { existsSync } from "fs";
import { resolve, join } from "path";

export function detectProject(startCwd = process.cwd()) {
  let dir = resolve(startCwd);
  for (let i = 0; i < 6; i++) {
    const tomlExists = existsSync(join(dir, "apps/worker/wrangler.toml"));
    const cfgExists  = existsSync(join(dir, ".marketing-harness/config.json"));
    if (tomlExists && cfgExists)  return { state: "ready",  projectDir: dir };
    if (tomlExists && !cfgExists) return { state: "broken", projectDir: dir };
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return { state: "outside", projectDir: null };
}
