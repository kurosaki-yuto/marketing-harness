import { loadSpec, buildPrompt } from "./spec-loader.js";

const SERVICE_LABELS = {
  "meta":       "Meta 広告",
  "line":       "LINE",
  "utage":      "UTAGE",
  "google-ads": "Google 広告",
};

/**
 * 設定モード用の Claude 初期プロンプトを構築する。
 * spawnClaude の promptArg に渡す文字列を返す。
 */
export function buildSetupPrompt(service, _projectDir) {
  const spec = loadSpec(service);
  const label = SERVICE_LABELS[service] ?? service;

  const extracts = spec.extracts ?? spec.steps.filter((s) => s.extract).map((s) => s.extract);
  const exampleObj = {};
  for (const e of extracts) exampleObj[e.field] = `<${e.label}>`;
  const exampleJson = JSON.stringify(exampleObj, null, 2);

  return [
    `あなたは「${label}」の接続設定を完了させる専任エージェントです。`,
    "ユーザーへの質問は最小限にして、claude-in-chrome MCP でブラウザを自動操作して認証情報を取得してください。",
    "ブラウザ操作の前に必ず mcp__claude-in-chrome__tabs_context_mcp でタブの状態を確認してから作業してください。",
    "操作の進捗は「〇〇のページを開いています」「トークンを取得しました」のように業務の言葉で随時伝えてください。",
    "",
    buildPrompt(spec),
    "",
    "# 完了後の必須操作（最重要）",
    "認証情報をすべて取得できたら、Bash ツールで以下のコマンドを実行して保存してください:",
    `marketing-harness apply ${service} '<JSON>'`,
    "",
    "JSON の形式は以下の通りです（各フィールドに実際の値を入れてください）:",
    "```json",
    exampleJson,
    "```",
    "",
    "コマンドが成功したら「接続が完了しました」と一言だけ伝えてください。",
    "取得できなかった場合は何が原因か業務の言葉で説明し、ユーザーが次に取るべき操作を提示してください。",
  ].join("\n");
}
