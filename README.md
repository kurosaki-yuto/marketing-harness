# marketing-harness

> 広告運用 AI エージェントをコミュニティメンバーに配布する OSS。

Cloudflare 無料枠で動く。サーバー代 0 円。**Claude Code CLI が唯一の AI インターフェース**。

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
| API 公開 | ❌ | **全機能** |
| Claude Code 対応 | ❌ | **✅** |
| マルチアカウント | 別契約 | **標準搭載** |
| ソースコード | 非公開 | **MIT** |

---

## なぜ Claude Code CLI 専用？

- **ユーザーの Claude サブスクで動く** — Anthropic API キー不要。追加コストゼロ
- **スキル・エージェントが `.claude/` に揃っている** — `git clone` するだけで Claude がマーケティングのドメインエキスパートになる
- **Worker を軽量に保てる** — Worker は純粋なデータ層（CRUD + ライセンス検証）。AI は全てクライアント側で実行

---

## コミュニティライセンス制

marketing-harness のコードは **MIT ライセンス**で公開していますが、実際に動かすには **コミュニティメンバーシップ（月額）** から発行されるライセンスキーが必要です。

- ライセンスキーは `npx create-marketing-harness` のセットアップ時に入力します
- 退会・解約した場合はキーが即座に失効し、Worker へのアクセスが遮断されます
- セルフホストした license-server を使って独自に管理することも可能です（詳細は末尾参照）

> ライセンスキーの取得: [コミュニティ参加ページ（準備中）]

---

## 機能

- **AI 改善提案** — Claude Code CLI + `.claude/skills/` でナレッジを参照しながら CPA 改善策を提案
- **ナレッジ管理** — マーケターの知見を AI が要約・最適化して資産化
- **KPI 管理・アラート** — 目標値の設定と日次監視、超過時に通知
- **レポート生成** — 月次広告パフォーマンスを Claude Code CLI が分析してレポート生成
- **Meta Ads 連携** — Meta Graph API から日次でキャンペーンデータを同期
- **マルチアカウント** — 1 インスタンスで複数の広告主を管理
- **Claude Code 対応** — MCP server で自然言語から全操作可能

---

## 技術スタック

```
Meta Ads API ──→ Cloudflare Workers (Hono) ──→ D1 (SQLite)
                         ↑                          ↑
                   Cron (5分毎)              account_idスコープ

Next.js 15 (管理画面) ──→ Workers API ──→ D1
Claude Code (MCP) ──→ Workers API ──→ D1   ← AI はここのみ
```

| レイヤー | 技術 |
|---------|------|
| API | Cloudflare Workers + Hono |
| DB | Cloudflare D1 (SQLite) |
| 管理画面 | Next.js 15 (App Router) + Tailwind CSS |
| AI | **Claude Code CLI**（Worker 内に AI なし） |
| 広告データ | Meta Ads API |
| MCP | MCP server (Claude Code 連携) |
| CI/CD | GitHub Actions → 自動デプロイ |

---

## Claude Code パッケージ

`git clone` するだけで、Claude がマーケティングのドメインエキスパートとして振る舞います。

### スラッシュコマンド（7 種）

| コマンド | 機能 |
|---|---|
| `/mh-analyze` | 広告パフォーマンス分析 + 問題キャンペーン特定 |
| `/mh-propose` | KPI 未達キャンペーンの改善提案のみ抽出 |
| `/mh-report [YYYY-MM]` | 月次レポート生成（エグゼクティブサマリー + KPI 表 + 提案） |
| `/mh-creative` | 新クリエイティブ案の生成（コピー・画像指示・動画構成） |
| `/mh-sns-plan [週]` | SNS 投稿計画の立案 + 自動予約 |
| `/mh-funnel` | 広告 → LP → メルマガ → 決済の全ファネル設計 |
| `/mh-kpi` | 対話的 KPI 設定ウィザード |

### 使い方

```bash
# 1. ワンコマンドセットアップ（推奨）
npx create-marketing-harness

# 2. MCP サーバー登録（ウィザード完了後に表示されるコマンドをそのまま実行）
MARKETING_HARNESS_URL=https://your-worker.workers.dev \
MARKETING_HARNESS_API_KEY=your-api-key \
claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js

# 3. Claude Code にログイン（初回のみ）
claude login

# 4. 使い始める
claude
```

```
/mh-analyze
/mh-report 2026-04
/mh-kpi
今月 CPA が一番高いキャンペーンを教えて
先週の SNS 投稿の反応を見て今週の計画を立てて
```

### 内蔵スキル（12 種）

| カテゴリ | スキル |
|---|---|
| 広告 | Meta Ads 指標読解 / 構造設計 / KPI 設計 / クリエイティブ評価 / 月次レポート |
| SNS | Instagram 戦略 / TikTok 戦略 / コンテンツカレンダー |
| UTAGE 相当 | メールマーケティング / LP 最適化 / 決済ファネル / MA 設計 |

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

ウィザードに従って進むだけで、以下が全自動で完了します:

1. ライセンスキー検証
2. Cloudflare 認証（未ログインなら自動でブラウザを開く）
3. リポジトリのクローン
4. D1 データベースの作成 + スキーマ適用
5. シークレット（API キー等）の投入
6. Workers へのデプロイ

完了後は表示されるコマンドで Claude Code MCP を登録して使い始めてください。

<details>
<summary>手動セットアップ手順（CLI が裏でやっていること）</summary>

```bash
git clone https://github.com/your-org/marketing-harness.git
cd marketing-harness
pnpm install

# D1 データベース作成
npx wrangler d1 create marketing-harness
# → 出力される database_id を apps/worker/wrangler.toml に記入
npx wrangler d1 execute marketing-harness --file=packages/db/schema.sql --remote

# シークレット設定
npx wrangler secret put META_ACCESS_TOKEN
npx wrangler secret put META_AD_ACCOUNT_ID
npx wrangler secret put API_KEY
npx wrangler secret put LICENSE_KEY
npx wrangler secret put LICENSE_SERVER_URL

# デプロイ
pnpm deploy:worker
# → https://your-worker.your-subdomain.workers.dev

# 管理画面
cp .env.example apps/web/.env.local
# NEXT_PUBLIC_WORKER_URL を設定
pnpm dev:web

# Claude Code 連携
pnpm --filter mcp-server build
claude login
claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js
```

</details>

---

## プロジェクト構成

```
marketing-harness/
├── apps/
│   ├── worker/           # Cloudflare Workers API (Hono)
│   ├── license-server/   # ライセンス検証サーバー
│   └── web/              # Next.js 15 管理画面
├── packages/
│   ├── db/               # D1 スキーマ + マイグレーション
│   ├── sdk/              # TypeScript SDK
│   ├── ads-sdk/          # Meta Ads API ラッパー
│   ├── mcp-server/       # Claude Code 統合
│   └── shared/           # 共有型定義
└── .claude/
    ├── commands/         # スラッシュコマンド 7 種
    ├── agents/           # エージェント 5 種
    └── skills/           # ドメインスキル 12 種
```

---

## License Server セルフホスト（上級者向け）

`apps/license-server/` に同梱の Cloudflare Worker を使って独自のライセンスサーバーを運営できます。

```bash
# 1. D1 DB 作成
npx wrangler d1 create marketing-harness-license
# → database_id を apps/license-server/wrangler.toml に記入

# 2. スキーマ適用
npx wrangler d1 execute marketing-harness-license \
  --file=apps/license-server/schema.sql --remote

# 3. 管理トークン設定
npx wrangler secret put ADMIN_TOKEN   # 任意の強力なトークン

# 4. デプロイ
cd apps/license-server && npx wrangler deploy

# 5. ライセンス発行
curl -X POST https://your-license-server.workers.dev/admin/licenses \
  -H "X-Admin-Token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","plan":"community"}'
# → {"key":"mh_xxx...","plan":"community"}

# 6. ライセンス失効（退会処理）
curl -X DELETE https://your-license-server.workers.dev/admin/licenses/mh_xxx \
  -H "X-Admin-Token: <ADMIN_TOKEN>"
```

Worker 側の `LICENSE_SERVER_URL` を自分のサーバー URL に設定すれば完全独立運用できます。

---

## ライセンス

MIT
