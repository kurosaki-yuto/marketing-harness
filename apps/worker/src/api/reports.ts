import { Hono } from "hono";
import type { Env } from "../index";

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

// レポートデータ取得（AI 生成なし。Claude Code CLI 側で整形する）
reportsRouter.post("/data", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{ companyId: string; month: string }>();

  if (!body.companyId || !body.month) {
    return c.json({ error: "companyId and month are required" }, 400);
  }
  if (!/^\d{4}-\d{2}$/.test(body.month)) {
    return c.json({ error: "month must be YYYY-MM format" }, 400);
  }

  const company = await c.env.DB.prepare(
    "SELECT * FROM companies WHERE id = ? AND account_id = ?"
  )
    .bind(body.companyId, accountId)
    .first<{ id: string; name: string }>();
  if (!company) return c.json({ error: "Company not found" }, 404);

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

  return c.json({
    company,
    month: body.month,
    prevMonth,
    metrics: currentMetrics.results,
    prevMetrics: prevMetrics.results,
    history: history.results,
    knowledge: knowledge.results,
  });
});

// Claude Code CLI が生成した Markdown を保存
reportsRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{ companyId: string; month: string; content: string }>();

  if (!body.companyId || !body.month || !body.content) {
    return c.json({ error: "companyId, month and content are required" }, 400);
  }
  if (!/^\d{4}-\d{2}$/.test(body.month)) {
    return c.json({ error: "month must be YYYY-MM format" }, 400);
  }

  const company = await c.env.DB.prepare(
    "SELECT id FROM companies WHERE id = ? AND account_id = ?"
  )
    .bind(body.companyId, accountId)
    .first<{ id: string }>();
  if (!company) return c.json({ error: "Company not found" }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO reports (id, account_id, company_id, month, content)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (account_id, company_id, month) DO UPDATE SET content = excluded.content, updated_at = datetime('now')`
  )
    .bind(id, accountId, body.companyId, body.month, body.content)
    .run();

  return c.json({ id }, 201);
});
