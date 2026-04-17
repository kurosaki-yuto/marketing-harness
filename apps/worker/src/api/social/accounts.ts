import { Hono } from "hono";
import type { Env } from "../../index";

export const socialAccountsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

socialAccountsRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, platform, account_name, external_account_id, connected_at FROM social_accounts WHERE account_id = ? ORDER BY connected_at DESC"
  )
    .bind(accountId)
    .all();
  return c.json(results);
});

socialAccountsRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    platform: "instagram" | "tiktok" | "x" | "youtube";
    external_account_id: string;
    account_name: string;
    access_token: string;
  }>();

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO social_accounts (id, account_id, platform, external_account_id, account_name, access_token)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, accountId, body.platform, body.external_account_id, body.account_name, body.access_token)
    .run();
  return c.json({ id }, 201);
});

socialAccountsRouter.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  await c.env.DB.prepare(
    "DELETE FROM social_accounts WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});
