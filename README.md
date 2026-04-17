# marketing-harness

> 広告運用AIエージェントの完全オープンソース版。有料SaaSの無料代替。

Cloudflare 無料枠で動く。サーバー代 0 円。Claude Code から全操作可能。

---

## なぜ marketing-harness？

| | 有料広告SaaS | **marketing-harness** |
|---|---|---|
| 月額 | 数万円〜 | **0円** |
| AIチャット改善提案 | ❌ / 限定的 | **✅ Claude API** |
| ナレッジ管理 | ❌ | **✅** |
| KPI監視・アラート | 一部 | **✅** |
| 月次レポート自動生成 | 一部 | **✅ AI生成** |
| Meta Ads 連携 | ✅ | **✅** |
| API 公開 | ❌ | **全機能** |
| Claude Code 対応 | ❌ | **✅** |
| マルチアカウント | 別契約 | **標準搭載** |
| ソースコード | 非公開 | **MIT** |

---

## 機能

- **AIチャット改善提案** — ナレッジをRAGで参照しながらClaude APIがCPA改善策を提案
- **ナレッジ管理** — マーケターの知見をAIが要約・最適化して資産化
- **KPI管理・アラート** — 目標値の設定と日次監視、超過時に通知
- **レポート自動生成** — 月次広告パフォーマンスをAIが分析してレポート生成
- **Meta Ads 連携** — Meta Graph API から日次でキャンペーンデータを同期
- **マルチアカウント** — 1インスタンスで複数の広告主を管理
- **Claude Code 対応** — MCP server で自然言語から全操作可能

---

## 技術スタック

```
Meta Ads API ──→ Cloudflare Workers (Hono) ──→ D1 (SQLite)
                         ↑                          ↑
                   Cron (5分毎)              account_idスコープ
                         ↓
                   Claude API (AI)

Next.js 15 (管理画面) ──→ Workers API ──→ D1
TypeScript SDK ──→ Workers API ──→ D1
Claude Code (MCP) ──→ Workers API ──→ D1
```

| レイヤー | 技術 |
|---------|------|
| API | Cloudflare Workers + Hono |
| DB | Cloudflare D1 (SQLite) |
| 管理画面 | Next.js 15 (App Router) + Tailwind CSS |
| AI | Claude API (Anthropic) |
| 広告データ | Meta Ads API |
| SDK | TypeScript (ESM + CJS) |
| MCP | MCP server (Claude Code連携) |
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
git clone https://github.com/your-org/marketing-harness.git
cd marketing-harness
pnpm install
pnpm --filter mcp-server build

# MCP サーバー登録
MARKETING_HARNESS_URL=https://your-worker.workers.dev \
MARKETING_HARNESS_API_KEY=your-api-key \
claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js

# Claude Code を起動して使う
claude
```

```
# 例
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
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)
- [Anthropic API キー](https://console.anthropic.com/)
- Meta Ads アカウント

### 1. セットアップ

```bash
git clone https://github.com/your-org/marketing-harness.git
cd marketing-harness
pnpm install
```

### 2. D1 データベース作成

```bash
npx wrangler d1 create marketing-harness
# → 出力される database_id を apps/worker/wrangler.toml に記入

npx wrangler d1 execute marketing-harness --file=packages/db/schema.sql
```

### 3. シークレット設定

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put META_ACCESS_TOKEN
npx wrangler secret put META_AD_ACCOUNT_ID
npx wrangler secret put API_KEY
```

### 4. デプロイ

```bash
pnpm deploy:worker
# → https://your-worker.your-subdomain.workers.dev
```

### 5. 管理画面

```bash
cp .env.example apps/web/.env.local
# NEXT_PUBLIC_WORKER_URL を設定
pnpm dev:web
```

### 6. Claude Code 連携

```bash
claude mcp add marketing-harness -- node ./packages/mcp-server/dist/index.js
# Claude Code で「今月のCPA教えて」と聞いてみる
```

---

## プロジェクト構成

```
marketing-harness/
├── apps/
│   ├── worker/           # Cloudflare Workers API (Hono)
│   └── web/              # Next.js 15 管理画面
├── packages/
│   ├── db/               # D1 スキーマ + クエリ
│   ├── sdk/              # TypeScript SDK
│   ├── ads-sdk/          # Meta Ads API ラッパー
│   ├── mcp-server/       # Claude Code 統合
│   └── shared/           # 共有型定義
└── docs/wiki/            # ドキュメント
```

---

## ライセンス

MIT
