import { execa } from "execa";
import { loadSpec, buildPrompt, getExtracts } from "./spec-loader.js";

const BAR = "─".repeat(58);

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
    "- mcp__plugin_playwright_playwright__* （代替: 独立 Chromium）",
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
    "- ログインが必要で未ログインの場合、該当フィールドに空文字を入れて JSON を出力",
  ].join("\n");

  const claudeOk = await execa("claude", ["--version"], { reject: false })
    .then((r) => r.exitCode === 0)
    .catch(() => false);

  if (!claudeOk) {
    console.log("  （Claude Code CLI が見つかりません。手動入力モードに切り替えます）\n");
    return null;
  }

  console.log(`\n  Claude Code を起動して「${spec.label}」の情報を自動取得します...\n`);
  console.log(BAR);

  let fullText = "";
  const proc = execa(
    "claude",
    [
      "--print",
      "--output-format", "stream-json",
      "--verbose",
      "--permission-mode", "bypassPermissions",
      fullPrompt,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      timeout: 300_000,
      reject: false,
    },
  );

  let buf = "";
  proc.stdout?.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        const rendered = renderEvent(evt);
        if (rendered) process.stdout.write(rendered + "\n");
        if (evt.type === "assistant" && evt.message?.content) {
          for (const block of evt.message.content) {
            if (block.type === "text") fullText += block.text;
          }
        }
        if (evt.type === "result" && typeof evt.result === "string") {
          fullText += evt.result;
        }
      } catch { /* ignore non-JSON lines */ }
    }
  });
  proc.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await proc;
  } catch (err) {
    console.error(`\n  Claude Code の実行に失敗: ${err.message}`);
    console.log(BAR + "\n");
    return null;
  }

  console.log(BAR + "\n");

  const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/);
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

  const missing = extracts
    .filter((e) => e.required && (!parsed[e.field] || parsed[e.field] === ""))
    .map((e) => e.label);
  if (missing.length > 0) {
    console.log(`  取得できなかった項目: ${missing.join(", ")} — 手動入力に切り替えます。\n`);
    return null;
  }

  for (const extract of extracts) {
    const value = parsed[extract.field];
    if (value && extract.pattern && !new RegExp(extract.pattern).test(value)) {
      console.log(`  警告: 「${extract.label}」の形式が想定と異なります（${extract.pattern}）`);
    }
  }

  return parsed;
}

function renderEvent(evt) {
  if (evt.type === "assistant" && evt.message?.content) {
    const lines = [];
    for (const block of evt.message.content) {
      if (block.type === "tool_use") {
        lines.push(`  → ${summarizeTool(block.name, block.input)}`);
      } else if (block.type === "text" && block.text?.trim()) {
        const snippet = block.text.trim().split("\n")[0].slice(0, 80);
        lines.push(`    ${snippet}`);
      }
    }
    return lines.join("\n") || null;
  }
  if (evt.type === "user" && Array.isArray(evt.message?.content)) {
    for (const block of evt.message.content) {
      if (block.type === "tool_result" && block.is_error) {
        return `  ! ツール実行エラー`;
      }
    }
  }
  if (evt.type === "system" && evt.subtype === "init") {
    return `  Claude Code セッション開始`;
  }
  if (evt.type === "result") {
    return `  完了 (${evt.num_turns ?? "?"} ターン, ${Math.round((evt.duration_ms ?? 0) / 1000)}s)`;
  }
  return null;
}

function summarizeTool(name, input) {
  if (!name) return "ツール実行";
  const short = name.replace(/^mcp__/, "").replace(/^[a-z-]+__/, "");
  if (name.includes("navigate") && input?.url) return `${short}: ${input.url}`;
  if (name.includes("click") && input?.element) return `${short}: ${input.element}`;
  if (name.includes("type") && input?.text) return `${short}: "${String(input.text).slice(0, 40)}"`;
  if (name === "Bash" && input?.command) return `Bash: ${String(input.command).slice(0, 60)}`;
  if (name === "Read" && input?.file_path) return `Read: ${input.file_path}`;
  return short;
}
