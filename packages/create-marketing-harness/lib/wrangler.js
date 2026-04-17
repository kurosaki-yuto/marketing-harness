import { execa } from "execa";
import { join } from "path";

async function wrangler(args, { cwd, env = {} } = {}) {
  return execa("npx", ["wrangler", ...args], {
    stdio: "inherit",
    cwd,
    env: { ...process.env, ...env },
  });
}

async function wranglerCapture(args, { cwd, env = {} } = {}) {
  const result = await execa("npx", ["wrangler", ...args], {
    stdio: "pipe",
    cwd,
    env: { ...process.env, ...env },
  });
  return result.stdout;
}

export async function whoami(opts) {
  try {
    await wranglerCapture(["whoami"], opts);
    return true;
  } catch {
    return false;
  }
}

export async function login(opts) {
  await wrangler(["login"], opts);
}

export async function putSecret(name, value, opts) {
  if (!value) return;
  const proc = execa("npx", ["wrangler", "secret", "put", name], {
    cwd: opts?.cwd,
    stdio: ["pipe", "inherit", "inherit"],
    env: { ...process.env, ...(opts?.env ?? {}) },
  });
  proc.stdin.write(value + "\n");
  proc.stdin.end();
  await proc;
}

export async function d1Create(dbName, opts) {
  let dbId;
  try {
    const out = await wranglerCapture(["d1", "create", dbName], opts);
    const match = out.match(/database_id\s*=\s*"([^"]+)"/);
    if (match) dbId = match[1];
  } catch (e) {
    if (!String(e).includes("already exists")) throw e;
  }
  if (!dbId) {
    const listOut = await wranglerCapture(["d1", "list"], opts);
    const listMatch = listOut.match(new RegExp(`${dbName}\\s+([0-9a-f-]{36})`));
    if (listMatch) dbId = listMatch[1];
  }
  return dbId;
}

export async function d1Execute(dbName, filePath, opts) {
  await wrangler(["d1", "execute", dbName, `--file=${filePath}`, "--remote"], opts);
}

export async function deploy(workerDir, opts) {
  try {
    const out = await wranglerCapture(["deploy"], { ...opts, cwd: workerDir });
    const match = out.match(/https:\/\/[^\s]+\.workers\.dev/);
    return match ? match[0] : "";
  } catch {
    await wrangler(["deploy"], { ...opts, cwd: workerDir });
    return "";
  }
}
