import { Hono } from "hono";
import type { Env } from "../../index";

export const socialPostsRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

socialPostsRouter.get("/", async (c) => {
  const accountId = c.get("accountId");
  const platform = c.req.query("platform");
  const status = c.req.query("status");

  let query = "SELECT * FROM social_posts WHERE account_id = ?";
  const params: unknown[] = [accountId];
  if (platform) { query += " AND platform = ?"; params.push(platform); }
  if (status) { query += " AND status = ?"; params.push(status); }
  query += " ORDER BY created_at DESC LIMIT 100";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

socialPostsRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    social_account_id: string;
    platform: "instagram" | "tiktok" | "x" | "youtube";
    type: "feed" | "story" | "reel" | "short";
    media_url: string;
    caption?: string;
    scheduled_at?: string;
  }>();

  const id = crypto.randomUUID();
  const status = body.scheduled_at ? "scheduled" : "draft";
  await c.env.DB.prepare(
    `INSERT INTO social_posts (id, account_id, social_account_id, platform, type, media_url, caption, scheduled_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      accountId,
      body.social_account_id,
      body.platform,
      body.type,
      body.media_url,
      body.caption ?? null,
      body.scheduled_at ?? null,
      status
    )
    .run();
  return c.json({ id }, 201);
});

// Phase2 で実際の投稿 API 呼び出しを実装。今は scheduled にセットするだけ
socialPostsRouter.post("/:id/publish", async (c) => {
  const accountId = c.get("accountId");
  const post = await c.env.DB.prepare(
    "SELECT * FROM social_posts WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .first<{ id: string; platform: string }>();

  if (!post) return c.json({ error: "Not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE social_posts SET status = 'scheduled', scheduled_at = datetime('now', '+5 seconds') WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();

  return c.json({
    id: post.id,
    status: "scheduled",
    note: "Actual publishing not yet implemented (Phase2). Post queued for processing.",
  });
});

socialPostsRouter.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  await c.env.DB.prepare(
    "DELETE FROM social_posts WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();
  return c.json({ success: true });
});
