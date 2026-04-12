import { Hono } from "hono";
import type { Env } from "../index";

export const companiesRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

companiesRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM companies WHERE account_id = ? ORDER BY created_at DESC"
  )
    .bind(accountId)
    .all();
  return c.json(results);
});

companiesRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    name: string;
    description?: string;
    target_audience?: string;
    spreadsheet_id?: string;
    meta_ad_account_id?: string;
  }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO companies (id, account_id, name, description, target_audience, spreadsheet_id, meta_ad_account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      accountId,
      body.name,
      body.description ?? null,
      body.target_audience ?? null,
      body.spreadsheet_id ?? null,
      body.meta_ad_account_id ?? null
    )
    .run();
  return c.json({ id }, 201);
});

companiesRouter.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const row = await c.env.DB.prepare(
    "SELECT * FROM companies WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

companiesRouter.put("/:id", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<Record<string, unknown>>();
  const fields = Object.keys(body)
    .filter((k) => ["name", "description", "target_audience", "spreadsheet_id", "meta_ad_account_id"].includes(k))
    .map((k) => `${k} = ?`)
    .join(", ");
  if (!fields) return c.json({ error: "No valid fields" }, 400);
  await c.env.DB.prepare(
    `UPDATE companies SET ${fields}, updated_at = datetime('now') WHERE id = ? AND account_id = ?`
  )
    .bind(...Object.values(body), c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});

companiesRouter.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  await c.env.DB.prepare(
    "DELETE FROM companies WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});
