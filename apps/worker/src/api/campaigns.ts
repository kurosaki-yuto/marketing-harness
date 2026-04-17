import { Hono } from "hono";
import type { Env } from "../index";

export const campaignsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

campaignsRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const companyId = c.req.query("companyId");
  let query = "SELECT * FROM campaigns WHERE account_id = ?";
  const params: unknown[] = [accountId];
  if (companyId) { query += " AND company_id = ?"; params.push(companyId); }
  query += " ORDER BY updated_at DESC";
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

campaignsRouter.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const row = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

campaignsRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    company_id: string;
    name: string;
    status?: string;
    objective?: string;
    daily_budget?: number;
  }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO campaigns (id, account_id, company_id, name, status, objective, daily_budget)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      accountId,
      body.company_id,
      body.name,
      body.status ?? "ACTIVE",
      body.objective ?? null,
      body.daily_budget ?? null
    )
    .run();
  return c.json({ id }, 201);
});

campaignsRouter.put("/:id", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ["name", "status", "objective", "daily_budget"];
  const fields = Object.keys(body)
    .filter((k) => allowed.includes(k))
    .map((k) => `${k} = ?`);
  if (fields.length === 0) return c.json({ error: "No valid fields" }, 400);
  await c.env.DB.prepare(
    `UPDATE campaigns SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ? AND account_id = ?`
  )
    .bind(...Object.values(body).filter((_, i) => allowed.includes(Object.keys(body)[i])), c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});

campaignsRouter.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  await c.env.DB.prepare(
    "DELETE FROM campaigns WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});
