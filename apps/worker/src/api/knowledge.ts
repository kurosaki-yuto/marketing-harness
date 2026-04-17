import { Hono } from "hono";
import type { Env } from "../index";

export const knowledgeRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

knowledgeRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const status = c.req.query("status") ?? "published";
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM knowledge WHERE account_id = ? AND status = ? ORDER BY created_at DESC"
  )
    .bind(accountId, status)
    .all();
  return c.json(results);
});

knowledgeRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    title: string;
    content: string;
    category: string;
    tags?: string[];
  }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO knowledge (id, account_id, title, content, category, tags)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, accountId, body.title, body.content, body.category, JSON.stringify(body.tags ?? []))
    .run();
  return c.json({ id }, 201);
});

knowledgeRouter.put("/:id", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    status?: string;
  }>();
  const row = await c.env.DB.prepare(
    "SELECT id FROM knowledge WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .first();
  if (!row) return c.json({ error: "Not found" }, 404);

  await c.env.DB.prepare(
    `UPDATE knowledge SET
       title = COALESCE(?, title),
       content = COALESCE(?, content),
       category = COALESCE(?, category),
       tags = COALESCE(?, tags),
       status = COALESCE(?, status),
       updated_at = datetime('now')
     WHERE id = ? AND account_id = ?`
  )
    .bind(
      body.title ?? null,
      body.content ?? null,
      body.category ?? null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.status ?? null,
      c.req.param("id"),
      accountId
    )
    .run();
  return c.json({ success: true });
});

knowledgeRouter.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  await c.env.DB.prepare(
    "DELETE FROM knowledge WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});

