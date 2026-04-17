function printBanner() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  marketing-harness                            ║");
  console.log("║  広告運用 AI エージェント                     ║");
  console.log("╚══════════════════════════════════════════════╝");
}

export function runHelp() {
  printBanner();
  console.log(`
  使い方:
    marketing-harness                   プロジェクト内で起動（メニュー表示）
    marketing-harness --raw             メニューをスキップして Claude Code を直接起動
    marketing-harness configure <svc>   連携サービスの追加・変更
    marketing-harness --version         バージョン表示

  サービス一覧:
    cloudflare / meta / line / utage / google-ads

  新規セットアップ:
    npx create-marketing-harness
`);
}

export function runHelpOutsideProject() {
  printBanner();
  console.log(`
  まだセットアップが済んでいません。

  ─── 初めての方はこちら ───

  1) 新規セットアップ（最初はこれ）:

       npx create-marketing-harness

     ウィザードが Cloudflare 認証・Meta Ads・LINE 等を一つずつ案内します。
     セットアップ完了後、そのまま起動するか選べます。

  ─── 既にプロジェクトがある方 ───

  2) プロジェクトディレクトリに移動してから実行:

       cd <project-name>
       marketing-harness

  困ったら: https://github.com/noukinn/marketing-harness
`);
  process.exit(1);
}

export function runRepair(projectDir) {
  printBanner();
  console.log(`
  セットアップが途中で止まっているようです。
  （wrangler.toml は見つかりましたが .marketing-harness/config.json がありません）

  以下を実行してセットアップを再開してください:

    cd ${projectDir}
    npx create-marketing-harness

  原因が分からない場合は、プロジェクトを一度削除してやり直すのが早いです:

    rm -rf ${projectDir}
    npx create-marketing-harness
`);
  process.exit(1);
}
