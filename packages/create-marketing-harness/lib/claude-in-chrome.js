import clipboard from "clipboardy";
import open from "open";
import { askConfirm, askText, printInfo } from "./prompts.js";
import { loadSpec, buildPrompt, extractFieldNames } from "./spec-loader.js";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/claude/ghkbgpnilfehbibimgapmipdiknkkjif";

export async function runWithClaudeInChrome({ specId }) {
  const spec = loadSpec(specId);
  const promptText = buildPrompt(spec);

  printInfo([
    `Claude in Chrome で「${spec.label}」の認証情報を自動取得します。`,
    "",
    "事前準備（未完了の場合）:",
    "  1. Claude Pro / Max / Team / Enterprise プランへの加入",
    `  2. Chrome 拡張のインストール: ${CHROME_STORE_URL}`,
    "  3. chrome://extensions/ で「Claude」を有効化",
  ]);

  const isReady = await askConfirm("上記の準備は完了していますか？", false);

  if (!isReady) {
    console.log("\n  Chrome Web Store を開きます...");
    await open(CHROME_STORE_URL).catch(() => {
      console.log(`  手動で開いてください: ${CHROME_STORE_URL}`);
    });
    console.log("  インストール後に以下で再実行できます:");
    console.log("    npx marketing-harness configure " + specId + "\n");
    return null;
  }

  await clipboard.write(promptText);
  console.log("\n  プロンプトをクリップボードにコピーしました。");
  console.log("  Claude in Chrome を開いて貼り付け、実行してください...\n");

  await open("https://claude.ai/new").catch(() => {
    console.log("  ブラウザで https://claude.ai/new を開いてください");
  });

  console.log("  Claude が出力する JSON ブロックをコピーしてここに貼り付けてください:");
  console.log(`  (例: { "${extractFieldNames(spec)[0]}": "...", ... })\n`);

  const raw = await askText("JSON を貼り付け:");

  let parsed;
  try {
    const jsonStr = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    console.log("  JSON のパースに失敗しました。もう一度試してください。");
    return null;
  }

  const missing = extractFieldNames(spec).filter((f) => !parsed[f]);
  if (missing.length > 0) {
    console.log(`  警告: 取得できなかったフィールドがあります: ${missing.join(", ")}`);
  }

  return parsed;
}
