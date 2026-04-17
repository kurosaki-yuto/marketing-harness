import { Hono } from "hono";
import type { Env } from "../index";

export const accountsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

accountsRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const account = await c.env.DB.prepare(
    "SELECT id, name, created_at FROM accounts WHERE id = ?"
  )
    .bind(accountId)
    .first();
  return c.json(account);
});

accountsRouter.put("/", async (c) => {
  const accountId = c.get("accountId");
  const { name } = await c.req.json<{ name: string }>();
  await c.env.DB.prepare(
    "UPDATE accounts SET name = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(name, accountId)
    .run();
  return c.json({ success: true });
});

accountsRouter.post("/rotate-key", async (c) => {
  const accountId = c.get("accountId");
  const newKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    "UPDATE accounts SET api_key = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(newKey, accountId)
    .run();
  return c.json({ api_key: newKey });
});
