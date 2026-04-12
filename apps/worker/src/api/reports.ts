import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../index";

const REPORT_SYSTEM_PROMPT = `あなたは広告運用のプロフェッショナルレポーターです。
以下のデータを基に、月次広告運用レポートを作成してください。

## レポート構成（必須）
### 1. エグゼクティブサマリー
- 当月の主要KPI一覧と前月比
- 一言まとめ

### 2. キャンペーン別パフォーマンス
- 各キャンペーンの主要指標推移
- 特筆すべきトレンド

### 3. 実施した施策と効果
- 当月の変更履歴から、実施した施策を整理
- 各施策の効果（数値変化）

### 4. 課題と改善提案
- 当月で見えた課題
- 来月に向けた改善提案

### 5. 来月のアクションプラン
- 優先度付きのアクション一覧

## 書式ルール
- 数値は具体的に記載
- 重要な数値は **太字** で強調
- 表を活用して見やすくする
- 絵文字は使用しない`;

export const reportsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

reportsRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const companyId = c.req.query("companyId");
  let query = "SELECT id, company_id, month, created_at FROM reports WHERE account_id = ?";
  const params: unknown[] = [accountId];
  if (companyId) { query += " AND company_id = ?"; params.push(companyId); }
  query += " ORDER BY month DESC LIMIT 24";
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

reportsRouter.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const row = await c.env.DB.prepare(
    "SELECT * FROM reports WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

reportsRouter.post("/generate", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{ companyId: string; month: string }>();

  if (!body.companyId || !body.month) {
    return c.json({ error: "companyId and month are required" }, 400);
  }
  if (!/^\d{4}-\d{2}$/.test(body.month)) {
    return c.json({ error: "month must be YYYY-MM format" }, 400);
  }

  // 企業情報
  const company = await c.env.DB.prepare(
    "SELECT * FROM companies WHERE id = ? AND account_id = ?"
  )
    .bind(body.companyId, accountId)
    .first<{ id: string; name: string }>();
  if (!company) return c.json({ error: "Company not found" }, 404);

  // 当月メトリクス（D1から取得）
  const monthStart = `${body.month}-01`;
  const [year, monthNum] = body.month.split("-").map(Number);
  const monthEnd = `${body.month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, "0")}`;

  const prevDate = new Date(year, monthNum - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prevStart = `${prevMonth}-01`;
  const prevEnd = `${prevMonth}-${String(new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  const [currentMetrics, prevMetrics, history, knowledge] = await Promise.all([
    c.env.DB.prepare(
      "SELECT * FROM ad_metrics WHERE account_id = ? AND company_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC"
    ).bind(accountId, body.companyId, monthStart, monthEnd).all<Record<string, unknown>>(),
    c.env.DB.prepare(
      "SELECT * FROM ad_metrics WHERE account_id = ? AND company_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC"
    ).bind(accountId, body.companyId, prevStart, prevEnd).all<Record<string, unknown>>(),
    c.env.DB.prepare(
      "SELECT title, description, change_type, reason, created_at FROM change_history WHERE account_id = ? AND company_id = ? AND created_at LIKE ? ORDER BY created_at DESC LIMIT 50"
    ).bind(accountId, body.companyId, `${body.month}%`).all<Record<string, unknown>>(),
    c.env.DB.prepare(
      "SELECT title, content, category FROM knowledge WHERE account_id = ? AND status = 'published' ORDER BY usage_count DESC, created_at DESC LIMIT 5"
    ).bind(accountId).all<Record<string, unknown>>(),
  ]);

  const reportData = buildReportData(
    company,
    body.month,
    currentMetrics.results,
    prevMetrics.results,
    history.results,
    knowledge.results
  );

  const anthropic = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: REPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: reportData }],
  });

  const content = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  // 保存
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO reports (id, account_id, company_id, month, content)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (account_id, company_id, month) DO UPDATE SET content = excluded.content, updated_at = datetime('now')`
  )
    .bind(id, accountId, body.companyId, body.month, content)
    .run();

  return c.json({ id, report: content, generatedAt: new Date().toISOString() });
});

function buildReportData(
  company: { name: string },
  month: string,
  current: Record<string, unknown>[],
  prev: Record<string, unknown>[],
  history: Record<string, unknown>[],
  knowledge: Record<string, unknown>[]
): string {
  let data = `## 企業情報\n- 企業名: ${company.name}\n- 対象月: ${month}\n\n`;

  const sumMetrics = (rows: Record<string, unknown>[]) => ({
    impressions: rows.reduce((s, r) => s + ((r.impressions as number) || 0), 0),
    clicks: rows.reduce((s, r) => s + ((r.clicks as number) || 0), 0),
    spend: rows.reduce((s, r) => s + ((r.spend as number) || 0), 0),
    conversions: rows.reduce((s, r) => s + ((r.conversions as number) || 0), 0),
  });

  const cur = sumMetrics(current);
  const pre = sumMetrics(prev);
  const ctr = cur.impressions ? (cur.clicks / cur.impressions) * 100 : 0;
  const cpc = cur.clicks ? cur.spend / cur.clicks : 0;
  const cpa = cur.conversions ? cur.spend / cur.conversions : 0;

  data += `## 当月KPIサマリー\n`;
  data += `- Impressions: ${cur.impressions.toLocaleString()} (前月: ${pre.impressions.toLocaleString()})\n`;
  data += `- Clicks: ${cur.clicks.toLocaleString()} (前月: ${pre.clicks.toLocaleString()})\n`;
  data += `- CTR: ${ctr.toFixed(2)}%\n`;
  data += `- CPC: ${Math.round(cpc).toLocaleString()}円\n`;
  data += `- Spend: ${Math.round(cur.spend).toLocaleString()}円 (前月: ${Math.round(pre.spend).toLocaleString()}円)\n`;
  data += `- Conversions: ${cur.conversions} (前月: ${pre.conversions})\n`;
  data += `- CPA: ${Math.round(cpa).toLocaleString()}円\n\n`;

  if (history.length > 0) {
    data += `## 変更履歴（${month}）\n`;
    for (const h of history) {
      data += `- [${h.change_type}] ${h.title}\n`;
      if (h.reason) data += `  理由: ${h.reason}\n`;
    }
    data += "\n";
  }

  if (knowledge.length > 0) {
    data += `## 参考ナレッジ\n`;
    for (const k of knowledge) {
      data += `### ${k.title}\n${(k.content as string).slice(0, 500)}\n\n`;
    }
  }

  return data;
}
