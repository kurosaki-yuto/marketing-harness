import { createMiddleware } from "hono/factory";
import type { Env } from "../index";

type Variables = {
  accountId: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authorization.slice(7);

  // アカウント別APIキーで認証
  const account = await c.env.DB.prepare(
    "SELECT id FROM accounts WHERE api_key = ?"
  )
    .bind(token)
    .first<{ id: string }>();

  if (!account) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("accountId", account.id);
  await next();
});
