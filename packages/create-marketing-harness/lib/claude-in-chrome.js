import clipboard from "clipboardy";
import open from "open";
import { askConfirm, askText, printInfo } from "./prompts.js";
import { loadSpec, buildPrompt, extractFieldNames, getExtracts } from "./spec-loader.js";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/claude/ghkbgpnilfehbibimgapmipdiknkkjif";

export async function runWithClaudeInChrome({ specId }) {
  const spec = loadSpec(specId);
  const promptText = buildPrompt(spec);
  const extracts = getExtracts(spec);
  const fieldNames = extractFieldNames(spec);

  const infoLines = [
    `Claude in Chrome で「${spec.label}」の認証情報を自動取得します。`,
    "",
    "事前準備（未完了の場合）:",
    "  1. Claude Pro / Max / Team / Enterprise プランへの加入",
    `  2. Chrome 拡張のインストール: ${CHROME_STORE_URL}`,
    "  3. chrome://extensions/ で「Claude」を有効化",
  ];

  if (spec.prerequisites && spec.prerequisites.length > 0) {
    infoLines.push("", `${spec.label} の事前確認:`);
    for (const pre of spec.prerequisites) infoLines.push(`  - ${pre}`);
  }

  printInfo(infoLines);

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
  console.log(`  (例: { "${fieldNames[0]}": "...", ... })\n`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await askText(`JSON を貼り付け${attempt > 1 ? ` (${attempt}/3 回目)` : ""}:`);

    let parsed;
    try {
      const jsonStr = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      if (attempt < 3) {
        console.log("  JSON のパースに失敗しました。Claude の出力から JSON ブロックだけをコピーして再度貼り付けてください。");
        continue;
      }
      console.log("  JSON のパースに 3 回失敗しました。後から再実行: npx marketing-harness configure " + specId);
      return null;
    }

    const errors = [];
    for (const extract of extracts) {
      const value = parsed[extract.field];
      if (extract.required && !value) {
        errors.push(`  - 「${extract.label}」が含まれていません`);
        continue;
      }
      if (value && extract.pattern) {
        if (!new RegExp(extract.pattern).test(value)) {
          errors.push(`  - 「${extract.label}」の形式が正しくありません（期待: ${extract.pattern}）`);
        }
      }
    }

    if (errors.length > 0) {
      console.log("\n  入力値にエラーがあります:");
      for (const e of errors) console.log(e);
      if (attempt < 3) {
        console.log("  Claude に正しい値を再確認してもらい、JSON を貼り直してください。\n");
        continue;
      }
      console.log("  警告: 値の検証に失敗しましたが、このまま続行します。後から configure で修正可能です。\n");
    }

    return parsed;
  }

  return null;
}
