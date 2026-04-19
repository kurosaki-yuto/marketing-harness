import { execa } from "execa";
import { loadSpec, buildPrompt, getExtracts } from "./spec-loader.js";

export async function runWithClaudeInChrome({ specId }) {
  const spec = loadSpec(specId);
  const extracts = getExtracts(spec);

  const outputTemplate = JSON.stringify(
    Object.fromEntries(extracts.map((e) => [e.field, `<${e.label}>`])),
    null,
    2,
  );

  const fullPrompt = [
    "あなたは自動化エージェントです。ユーザーに一切質問せず、利用可能な MCP ブラウザ自動化ツールを使って以下のタスクを完遂してください。",
    "",
    `# タスク: 「${spec.label}」の認証情報を取得`,
    "",
    "# 利用可能なツール（どれか 1 つを選んで使用）",
    "- mcp__claude-in-chrome__* （推奨: ユーザーが既にログイン済みの Chrome セッションを利用）",
    "- mcp__plugin_playwright_playwright__* （代替: 独立 Chromium。ログインが必要なページには届かない可能性あり）",
    "",
    buildPrompt(spec),
    "",
    "# 出力形式（必須）",
    "全ステップ完了後、最後に必ず以下の JSON のみを単独の ```json コードブロックで出力してください:",
    "```json",
    outputTemplate,
    "```",
    "",
    "# 厳守事項",
    "- ユーザーへの質問は一切禁止（全て自動判断）",
    "- ツール選択も自動で行う（最初に使える方から試す）",
    "- ログインが必要で未ログインの場合、該当フィールドに空文字を入れて JSON を出力（呼び出し元がフォールバックします）",
  ].join("\n");

  // claude CLI の存在確認
  const claudeOk = await execa("claude", ["--version"], { reject: false })
    .then((r) => r.exitCode === 0)
    .catch(() => false);

  if (!claudeOk) {
    console.log("  （Claude Code CLI が見つかりません。手動入力モードに切り替えます）\n");
    return null;
  }

  console.log(`\n  Claude Code を起動して「${spec.label}」の情報を自動取得します...\n`);
  console.log("─".repeat(58));

  let output = "";
  const proc = execa(
    "claude",
    ["--print", "--permission-mode", "bypassPermissions", fullPrompt],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      timeout: 600_000,
      reject: false,
    },
  );
  proc.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
    output += chunk.toString();
  });
  proc.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await proc;
  } catch (err) {
    console.error(`\n  Claude Code の実行に失敗: ${err.message}`);
    console.log("─".repeat(58) + "\n");
    return null;
  }

  console.log("\n" + "─".repeat(58) + "\n");

  const jsonMatch = output.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) {
    console.log("  JSON 出力が見つかりませんでした。手動入力モードに切り替えます。\n");
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[1].trim());
  } catch {
    console.log("  JSON のパースに失敗しました。手動入力モードに切り替えます。\n");
    return null;
  }

  // 必須フィールドのいずれかが空ならフォールバック
  const missing = extracts
    .filter((e) => e.required && (!parsed[e.field] || parsed[e.field] === ""))
    .map((e) => e.label);
  if (missing.length > 0) {
    console.log(`  取得できなかった項目: ${missing.join(", ")} — 手動入力に切り替えます。\n`);
    return null;
  }

  // pattern 検証（失敗時は警告のみ）
  for (const extract of extracts) {
    const value = parsed[extract.field];
    if (value && extract.pattern && !new RegExp(extract.pattern).test(value)) {
      console.log(`  警告: 「${extract.label}」の形式が想定と異なります（${extract.pattern}）`);
    }
  }

  return parsed;
}
