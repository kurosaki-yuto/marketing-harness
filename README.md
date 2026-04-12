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
