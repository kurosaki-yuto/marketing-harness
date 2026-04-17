import clipboard from "clipboardy";
import open from "open";
import { askConfirm, askText, printInfo } from "./prompts.js";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/claude/ghkbgpnilfehbibimgapmipdiknkkjif";

async function showInstallGuide() {
  printInfo([
    "Claude in Chrome は Chrome 拡張機能です。",
    "利用するには以下の準備が必要です:",
    "",
    "1. Claude の有料プランに加入（Pro / Max / Team / Enterprise）",
    `2. Chrome Web Store からインストール:`,
    `   ${CHROME_STORE_URL}`,
    "3. chrome://extensions/ を開き、「Claude」を有効化",
    "4. Chrome を再起動",
    "",
    "準備が完了したら、このステップを再実行してください:",
    "  npx marketing-harness configure <service>",
  ]);
}

export async function runWithClaudeInChrome({ promptText, fields }) {
  const isInstalled = await askConfirm(
    "Claude in Chrome はインストール済みですか？（Claude Pro/Max/Team/Enterprise プラン必須）",
    false
  );

  if (!isInstalled) {
    await showInstallGuide();
    return null;
  }

  console.log("\n  次のプロンプトをクリップボードにコピーしてブラウザに貼り付けてください:\n");
  console.log(`  ---- プロンプト ----`);
  console.log(promptText.split("\n").map((l) => `  ${l}`).join("\n"));
  console.log(`  ------------------\n`);

  await clipboard.write(promptText);
  console.log("  クリップボードにコピーしました。ブラウザを開きます...\n");

  const url = "https://claude.ai/new";
  try {
    await open(url);
  } catch {
    console.log(`  ブラウザで次の URL を開いてください: ${url}`);
  }

  const values = {};
  for (const field of fields) {
    console.log(`  Claude in Chrome で「${field.label}」を取得したら、ここに貼り付けてください:`);
    values[field.name] = await askText(field.label);
  }
  return values;
}
