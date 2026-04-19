// 業務語彙で統一したユーザー向けメッセージ集
// 技術用語（Cloudflare / D1 / MCP / wrangler / deploy / schema）は使わない

export const MSG = {
  // deploy.js
  DEPLOY_STEP: "データ保存先を準備して、広告 AI を起動します",
  DEPLOY_DB_CREATE: "広告データの保存場所を作成中...",
  DEPLOY_DB_CREATE_FAIL: "保存場所の作成に失敗しました。設定ファイルに手動で ID を記入してください。",
  DEPLOY_SCHEMA: "データ構造を初期化中...",
  DEPLOY_SECRETS: "接続キーを設定中...",
  DEPLOY_LAUNCHING: "広告 AI を起動中...",
  DEPLOY_DONE: "起動完了",

  // meta/line/utage/google-ads steps
  META_STEP: "Meta 広告連携（任意）",
  META_DESC: "Meta Ads のデータ取得・KPI 監視・改善提案に使用します",
  LINE_STEP: "LINE 連携（任意）",
  LINE_DESC: "朝の広告レポートを LINE で受け取るために使用します",
  UTAGE_STEP: "UTAGE 連携（任意）",
  UTAGE_DESC: "メルマガ・LP の成果をまとめて確認するために使用します",
  GADS_STEP: "Google 広告連携（任意）",
  GADS_DESC: "Google Ads のデータ取得・KPI 監視に使用します",

  // connector
  CONNECTOR_SKIP: (name) => `${name} の連携は後回しにできます。後から「連携を追加」で設定できます。`,
  CONNECTOR_RESUME: (name) => `${name} の連携を再開します。`,
  CONNECTOR_MANUAL: (name) => `${name} の手動設定手順を /tmp/mh-${name}-manual.md に書き出しました。`,

  // menu
  MENU_CHAT: "AI に相談する（まずヒアリングから）",
  MENU_SEPARATOR: "────────────────────── こういう相談もできます",
  MENU_CONFIGURE: "広告媒体の連携を追加・変更する",
  MENU_EXIT: "終了",
  MENU_WORKER: "接続先",
  MENU_INTEGRATIONS: "連携済み",
  MENU_LAST_LAUNCH: "最終起動",
};
