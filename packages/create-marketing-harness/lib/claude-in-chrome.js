import { execa } from "execa";
import { askText, printInfo } from "./prompts.js";
import { loadSpec, buildPrompt, getExtracts } from "./spec-loader.js";

export async function runWithClaudeInChrome({ specId }) {
  const spec = loadSpec(specId);
  const extracts = getExtracts(spec);

  const fullPrompt = [
    `mcp__claude-in-chrome__* のブラウザ自動化ツールを使って「${spec.label}」の認証情報を取得してください。`,
    `全ステップ完了後、取得した値を必ず \`\`\`json ... \`\`\` ブロックだけで出力してください（説明文は不要）。`,
    "",
    buildPrompt(spec),
  ].join("\n");

  // claude CLI が使えるか確認
  const claudeAvailable = await execa("claude", ["--version"], { reject: false })
    .then((r) => r.exitCode === 0)
    .catch(() => false);

  if (!claudeAvailable) {
    return await fallbackClipboard(specId, spec, extracts, fullPrompt);
  }

  if (spec.prerequisites?.length) {
    printInfo([`${spec.label} の事前確認:`, ...spec.prerequisites.map((p) => `  - ${p}`)]);
  }

  console.log(`\n  Claude Code が「${spec.label}」を自動セットアップします...\n`);
  console.log("─".repeat(52));

  let output = "";
  try {
    const proc = execa("claude", ["--print", fullPrompt], {
      env: { ...process.env },
      timeout: 600_000,
      reject: false,
    });
    proc.stdout?.on("data", (chunk) => { process.stdout.write(chunk); output += chunk.toString(); });
    proc.stderr?.on("data", (chunk) => { process.stderr.write(chunk); });
    await proc;
  } catch (err) {
    console.error(`\n  Claude Code の実行に失敗しました: ${err.message}`);
    return null;
  }

  console.log("\n" + "─".repeat(52));

  const jsonMatch = output.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) {
    console.log("  JSON ブロックが出力されませんでした。手動で再実行できます:");
    console.log(`    marketing-harness configure ${specId}\n`);
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[1].trim());
  } catch {
    console.log("  JSON のパースに失敗しました。");
    return null;
  }

  return validate(parsed, extracts, specId);
}

async function fallbackClipboard(specId, spec, extracts, promptText) {
  const { default: clipboard } = await import("clipboardy");
  const { default: open } = await import("open");

  printInfo([
    `Claude in Chrome で「${spec.label}」の認証情報を取得します。`,
    "",
    "事前準備:",
    "  1. Claude Pro / Max / Team / Enterprise プランへの加入",
    "  2. Chrome 拡張: https://chromewebstore.google.com/detail/claude/ghkbgpnilfehbibimgapmipdiknkkjif",
    "  3. chrome://extensions/ で「Claude」を有効化",
    ...(spec.prerequisites?.length ? ["", `${spec.label} の事前確認:`, ...spec.prerequisites.map((p) => `  - ${p}`)] : []),
  ]);

  const { askConfirm } = await import("./prompts.js");
  const isReady = await askConfirm("上記の準備は完了していますか？", false);
  if (!isReady) {
    await open("https://chromewebstore.google.com/detail/claude/ghkbgpnilfehbibimgapmipdiknkkjif").catch(() => {});
    console.log(`\n  インストール後: marketing-harness configure ${specId}\n`);
    return null;
  }

  await clipboard.write(promptText);
  console.log("\n  プロンプトをクリップボードにコピーしました。Claude に貼り付けて実行してください。");
  await open("https://claude.ai/new").catch(() => {});

  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await askText(`JSON を貼り付け${attempt > 1 ? ` (${attempt}/3)` : ""}:`);
    let parsed;
    try {
      const jsonStr = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      if (attempt < 3) { console.log("  JSON のパースに失敗しました。再度貼り付けてください。"); continue; }
      return null;
    }
    const result = validate(parsed, extracts, specId);
    if (result) return result;
    if (attempt < 3) console.log("  再度貼り付けてください。\n");
  }
  return null;
}

function validate(parsed, extracts, specId) {
  const errors = [];
  for (const extract of extracts) {
    const value = parsed[extract.field];
    if (extract.required && !value) {
      errors.push(`  - 「${extract.label}」が含まれていません`);
      continue;
    }
    if (value && extract.pattern && !new RegExp(extract.pattern).test(value)) {
      errors.push(`  - 「${extract.label}」の形式が正しくありません（期待: ${extract.pattern}）`);
    }
  }
  if (errors.length > 0) {
    console.log("\n  警告: 一部のフィールドに問題があります:");
    for (const e of errors) console.log(e);
    console.log(`  後から修正: marketing-harness configure ${specId}\n`);
  }
  return parsed;
}
