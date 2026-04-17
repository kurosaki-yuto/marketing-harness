# marketing-harness

> 非エンジニアでも使える広告運用 AI エージェント。Cloudflare 無料枠で動く。**Claude Code CLI が唯一の AI インターフェース**。

---

## 対象ユーザー

「Claude Code を触ったことがないけど、広告運用の AI 自動化をしたい」マーケターのために作られています。

`npx create-marketing-harness` を実行するだけで、ウィザードが一つひとつ丁寧に案内します。詰まったときは「Claude in Chrome」に任せるオプションも用意しています。

---

## なぜ marketing-harness？

| | 有料広告SaaS | **marketing-harness** |
|---|---|---|
| 月額 | 数万円〜 | **0円** |
| AI 改善提案 | ❌ / 限定的 | **✅ Claude Code CLI** |
| ナレッジ管理 | ❌ | **✅** |
| KPI監視・アラート | 一部 | **✅** |
| 月次レポート生成 | 一部 | **✅ CLI で生成** |
| Meta Ads 連携 | ✅ | **✅** |
| LINE 連携 | ❌ | **✅** |
| UTAGE（宴）連携 | ❌ | **✅** |
| Google Ads 連携 | ❌ | **✅** |
| API 公開 | ❌ | **全機能** |
| Claude Code 対応 | ❌ | **✅** |
| マルチアカウント | 別契約 | **標準搭載** |
| ソースコード | 非公開 | **MIT** |

---

## クイックスタート

### 前提条件

- Node.js 20+, pnpm 9+
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)（無料枠で動作）
- [Claude Code](https://claude.ai/code) サブスクリプション（AI の実行に使用）
- コミュニティライセンスキー（`mh_` から始まる）

### ワンコマンドセットアップ

```bash
npx create-marketing-harness
```

ウィザードが以下を一つずつ案内します:

1. **ライセンスキー確認** — コミュニティキーを入力
2. **プロジェクト作成** — ディレクトリ名を入力してクローン＆インストール
3. **Cloudflare 認証**（必須）— ブラウザログイン or API Token を選択
4. **Meta 広告連携**（任意）— 取得方法を案内しながら System User Token を設定
5. **LINE 連携**（任意）— Messaging API チャンネルの作成手順を案内
6. **UTAGE（宴）連携**（任意）— API キーの取得方法を案内
7. **Google Ads 連携**（任意）— Developer Token 審査を含む手順を案内
8. **デプロイ** — D1 作成 → スキーマ適用 → シークレット設定 → Workers デプロイ

各ステップは **スキップ可能**です。後からいつでも追加できます。

---

## 詰まったら Claude in Chrome に任せる

各連携ステップで「Claude in Chrome に任せる」を選ぶと:

1. そのサービス用のプロンプトが**クリップボードにコピー**されます
2. `https://claude.ai/new` が自動で開きます
3. ブラウザで Claude に貼り付けて操作してもらいます
4. 取得した値をターミナルに貼り付ければセットアップ再開

**Claude in Chrome の準備が必要な場合:**
- Claude の有料プラン（Pro / Max / Team / Enterprise）が必要です
- [Chrome Web Store](https://chromewebstore.google.com/detail/claude/ghkbgpnilfehbibimgapmipdiknkkjif) から拡張機能をインストール
- `chrome://extensions/` で有効化して Chrome を再起動

---

## 後から連携を追加・変更する

初回セットアップでスキップしたサービスは、プロジェクトディレクトリで以下を実行:

```bash
cd my-marketing-harness

# LINE を追加
npx marketing-harness configure line

# UTAGE を追加
npx marketing-harness configure utage

# Google Ads を追加（Developer Token 審査完了後）
npx marketing-harness configure google-ads

# Meta Ads を変更
npx marketing-harness configure meta

# Cloudflare 認証情報を更新
npx marketing-harness configure cloudflare
```

---

## 使い始める

セットアップ完了後、これだけ:

```bash
cd my-marketing-harness
marketing-harness
```

marketing-harness のメニューが表示されます。やれることを選ぶだけで、裏側の Claude Code が自動で動きます。

```
╔══════════════════════════════════════════════╗
║  marketing-harness                            ║
║  広告運用 AI エージェント                     ║
╚══════════════════════════════════════════════╝

  Worker:    https://marketing-harness.xxx.workers.dev
  連携済み:  meta, line
  最終起動:  初回起動

  何をしますか？

  ▸ 広告パフォーマンスを分析する         (/mh-analyze)
  ▸ KPI 未達キャンペーンの改善提案を見る (/mh-propose)
  ▸ 月次レポートを作成する               (/mh-report)
  ▸ ...
  ▸ Claude に自由に話しかける
  ▸ 連携を追加・変更する
  ▸ 終了
```

Claude Code を直接起動したい場合: `marketing-harness --raw`

---

## 機能一覧

- **AI 改善提案** — Claude Code CLI + `.claude/skills/` でナレッジを参照しながら CPA 改善策を提案
- **ナレッジ管理** — マーケターの知見を AI が要約・最適化して資産化
- **KPI 管理・アラート** — 目標値の設定と日次監視、超過時に通知
- **レポート生成** — 月次広告パフォーマンスを Claude Code CLI が分析してレポート生成
- **Meta Ads 連携** — Meta Graph API から日次でキャンペーンデータを同期
- **LINE 連携** — push メッセージ配信・接続状態監視
- **UTAGE（宴）連携** — 購読者管理・ファネル自動化
- **Google Ads 連携** — キャンペーン同期・KPI 管理
- **マルチアカウント** — 1 インスタンスで複数の広告主を管理
- **Claude Code 対応** — MCP server で自然言語から全操作可能

---

## スラッシュコマンド（7 種）

| コマンド | 機能 |
|---|---|
| `/mh-analyze` | 広告パフォーマンス分析 + 問題キャンペーン特定 |
| `/mh-propose` | KPI 未達キャンペーンの改善提案のみ抽出 |
| `/mh-report [YYYY-MM]` | 月次レポート生成（エグゼクティブサマリー + KPI 表 + 提案） |
| `/mh-creative` | 新クリエイティブ案の生成（コピー・画像指示・動画構成） |
| `/mh-sns-plan [週]` | SNS 投稿計画の立案 + 自動予約 |
| `/mh-funnel` | 広告 → LP → メルマガ → 決済の全ファネル設計 |
| `/mh-kpi` | 対話的 KPI 設定ウィザード |

---

## 技術スタック

```
Meta Ads API ──→ Cloudflare Workers (Hono) ──→ D1 (SQLite)
Google Ads API ─┘        ↑                          ↑
                    Cron (5分毎)              account_idスコープ

Claude Code (MCP) ──→ Workers API ──→ D1   ← AI はここのみ
LINE Messaging API ────────────────→ D1
UTAGE REST API ─────────────────→ D1
```

| レイヤー | 技術 |
|---------|------|
| API | Cloudflare Workers + Hono |
| DB | Cloudflare D1 (SQLite) |
| 管理画面 | Next.js 15 (App Router) + Tailwind CSS |
| AI | **Claude Code CLI**（Worker 内に AI なし） |
| 広告データ | Meta Ads API / Google Ads API v18 |
| コミュニケーション | LINE Messaging API |
| MA・ファネル | UTAGE REST API |
| MCP | MCP server (Claude Code 連携) |
| CI/CD | GitHub Actions → 自動デプロイ |

---

## プロジェクト構成

```
marketing-harness/
├── apps/
│   ├── worker/               # Cloudflare Workers API (Hono)
│   │   └── src/api/
│   │       └── integrations/ # LINE / UTAGE / Google Ads ルータ
│   ├── license-server/       # ライセンス検証サーバー
│   └── web/                  # Next.js 15 管理画面
├── packages/
│   ├── create-marketing-harness/  # セットアップウィザード
│   │   ├── steps/            # ステップモジュール（8 種）
│   │   ├── lib/              # 共通ライブラリ
│   │   └── templates/        # Claude in Chrome 用プロンプト
│   ├── db/                   # D1 スキーマ + マイグレーション
│   ├── sdk/                  # TypeScript SDK
│   ├── ads-sdk/              # Meta Ads API ラッパー
│   ├── mcp-server/           # Claude Code 統合（18 ツール）
│   └── shared/               # 共有型定義
└── .claude/
    ├── commands/             # スラッシュコマンド 7 種
    ├── agents/               # エージェント 5 種
    └── skills/               # ドメインスキル 12 種
```

---

## コミュニティライセンス制

marketing-harness のコードは **MIT ライセンス**で公開していますが、実際に動かすには **コミュニティメンバーシップ（月額）** から発行されるライセンスキーが必要です。

- ライセンスキーは `npx create-marketing-harness` のセットアップ時に入力します
- 退会・解約した場合はキーが即座に失効し、Worker へのアクセスが遮断されます
- セルフホストした license-server を使って独自に管理することも可能です

> ライセンスキーの取得: [コミュニティ参加ページ（準備中）]

---

## License Server セルフホスト（上級者向け）

`apps/license-server/` に同梱の Cloudflare Worker を使って独自のライセンスサーバーを運営できます。

```bash
npx wrangler d1 create marketing-harness-license
npx wrangler d1 execute marketing-harness-license \
  --file=apps/license-server/schema.sql --remote
npx wrangler secret put ADMIN_TOKEN
cd apps/license-server && npx wrangler deploy

# ライセンス発行
curl -X POST https://your-license-server.workers.dev/admin/licenses \
  -H "X-Admin-Token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","plan":"community"}'
```

---

## ライセンス

MIT
