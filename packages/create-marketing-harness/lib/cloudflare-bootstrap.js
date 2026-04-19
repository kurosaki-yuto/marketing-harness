import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CF_API = "https://api.cloudflare.com/client/v4";

/**
 * Cloudflare API を直叩きして Worker + D1 を作成する（wrangler 不要）。
 * 失敗時は手動手順を /tmp/mh-cloudflare-manual.md に書き出す。
 */
export async function bootstrapCloudflare({ accountId, apiToken, projectName }) {
  try {
    const workerName = projectName ?? generateProjectName();
    const dbName = workerName;

    const [workerResult, d1Result] = await Promise.allSettled([
      createWorker(apiToken, accountId, workerName),
      createD1(apiToken, accountId, dbName),
    ]);

    const workerOk = workerResult.status === "fulfilled" && workerResult.value.success;
    const d1Ok = d1Result.status === "fulfilled" && d1Result.value.success;

    if (!workerOk || !d1Ok) {
      const errors = [
        !workerOk ? (workerResult.reason?.message ?? "Worker 作成失敗") : null,
        !d1Ok ? (d1Result.reason?.message ?? "D1 作成失敗") : null,
      ].filter(Boolean);
      writeManualDoc(errors);
      return { success: false };
    }

    return {
      success: true,
      workerName,
      databaseId: d1Result.value.databaseId,
    };
  } catch (err) {
    writeManualDoc([err?.message ?? String(err)]);
    return { success: false };
  }
}

async function createWorker(apiToken, accountId, name) {
  const res = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${name}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/javascript",
    },
    body: `export default { fetch() { return new Response("ok"); } }`,
  });
  const data = await res.json();
  return { success: res.ok, ...data };
}

async function createD1(apiToken, accountId, name) {
  const res = await fetch(`${CF_API}/accounts/${accountId}/d1/database`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  const databaseId = data?.result?.uuid;
  return { success: res.ok && !!databaseId, databaseId };
}

function writeManualDoc(errors) {
  const content = `# クラウド環境の手動設定手順\n\n## エラー内容\n${errors.map((e) => `- ${e}`).join("\n")}\n\n## 手順\n\n1. https://dash.cloudflare.com にアクセス\n2. 「Workers & Pages」→「Create application」→「Create Worker」\n3. 「D1」→「Create database」（名前: marketing-harness）\n4. 作成後、以下コマンドで設定を続行:\n   \`marketing-harness init\`\n`;
  try {
    mkdirSync("/tmp", { recursive: true });
    writeFileSync("/tmp/mh-cloudflare-manual.md", content, "utf8");
    console.log("  手動設定手順を /tmp/mh-cloudflare-manual.md に書き出しました。");
  } catch { /* 無視 */ }
}

export function generateProjectName() {
  const adj = ["swift", "bright", "calm", "keen", "bold", "smart", "clear", "prime"];
  const noun = ["anchor", "bridge", "crane", "depot", "echo", "forge", "grove", "harbor"];
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `mh-${r(adj)}-${r(noun)}`;
}
