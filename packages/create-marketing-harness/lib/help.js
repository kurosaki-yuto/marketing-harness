export function runHelp() {
  console.log(`
  marketing-harness

  使い方:
    marketing-harness                   プロジェクト内: Claude Code を起動
    marketing-harness configure <svc>   連携サービスの追加・変更
    marketing-harness --version         バージョン表示

  サービス一覧:
    marketing-harness configure cloudflare
    marketing-harness configure meta
    marketing-harness configure line
    marketing-harness configure utage
    marketing-harness configure google-ads

  新規セットアップ:
    npx create-marketing-harness
`);
}

export function runHelpOutsideProject() {
  console.error(`
  marketing-harness プロジェクト外です。

  新規セットアップ:
    npx create-marketing-harness

  既存プロジェクトがあれば、そのディレクトリに移動して実行:
    cd <project-name> && marketing-harness
`);
  process.exit(1);
}

export function runRepair(projectDir) {
  console.error(`
  セットアップが不完全です。
  （wrangler.toml は見つかりましたが .marketing-harness/config.json がありません）

  以下を実行してセットアップを再開してください:
    cd ${projectDir}
    npx marketing-harness setup
`);
  process.exit(1);
}
