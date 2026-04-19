import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { MSG } from "./messages.js";

/**
 * connector を試し、失敗したらスキップして手動手順を /tmp/ に書き出す。
 * OpenHands の retry + stuck-detection パターンを参考にした実装。
 *
 * @param {string} name - connector 名 ("meta" / "line" / "utage" / "google-ads")
 * @param {Function} primaryFn - 自動セットアップ関数 (async)
 * @param {string} manualInstructions - 手動手順の markdown 文字列
 * @returns {{ success: boolean, result?: unknown }}
 */
export async function runWithFallback(name, primaryFn, manualInstructions) {
  try {
    const result = await primaryFn();
    return { success: true, result };
  } catch (err) {
    const displayName = CONNECTOR_DISPLAY_NAMES[name] ?? name;
    const reason = err?.message ?? String(err);
    console.log(`\n  ${displayName} の自動連携に失敗しました。`);
    console.log(`  理由: ${reason}`);

    const manualPath = join("/tmp", `mh-${name}-manual.md`);
    try {
      mkdirSync("/tmp", { recursive: true });
      writeFileSync(manualPath, buildManualDoc(displayName, manualInstructions), "utf8");
      console.log(`\n  ${MSG.CONNECTOR_MANUAL(name)}`);
    } catch {
      // /tmp 書き込み失敗は無視して継続
    }

    console.log(`\n  ${MSG.CONNECTOR_SKIP(displayName)}`);
    return { success: false };
  }
}

/**
 * healthcheck: Worker API に ping して成否を返す
 * @param {string} workerUrl
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
export async function healthcheck(workerUrl, apiKey) {
  try {
    const res = await fetch(`${workerUrl}/api/health`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const CONNECTOR_DISPLAY_NAMES = {
  meta: "Meta 広告",
  line: "LINE",
  utage: "UTAGE",
  "google-ads": "Google 広告",
  cloudflare: "クラウド環境",
};

function buildManualDoc(displayName, instructions) {
  return `# ${displayName} 手動設定手順\n\n${instructions}\n\n---\n設定後は \`marketing-harness configure ${displayName}\` を実行してください。\n`;
}
