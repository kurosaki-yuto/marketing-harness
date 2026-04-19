import { Hono } from "hono";
import type { Env } from "../../index";
import { sendTelemetry } from "../../lib/telemetry";
import { append } from "../../audit/event-stream";

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
  await c.env.DB.prepare(
    `INSERT INTO social_posts (id, account_id, social_account_id, platform, type, media_url, caption, scheduled_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed')`
  )
    .bind(
      id,
      accountId,
      body.social_account_id,
      body.platform,
      body.type,
      body.media_url,
      body.caption ?? null,
      body.scheduled_at ?? null
    )
    .run();
  sendTelemetry(c.env, "social.proposed", { platform: body.platform, type: body.type, scheduled_at: body.scheduled_at });
  await append(c.env.DB, {
    session_id: accountId,
    type: "action",
    actor: "agent",
    payload: { action: "sns.propose", post_id: id, platform: body.platform, scheduled_at: body.scheduled_at },
  });
  return c.json({ id, status: "proposed", note: "承認後に投稿されます" }, 201);
});

// ユーザーが投稿を承認する（proposed → approved）
socialPostsRouter.post("/:id/approve", async (c) => {
  const accountId = c.get("accountId");
  const post = await c.env.DB.prepare(
    "SELECT id, platform, status FROM social_posts WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .first<{ id: string; platform: string; status: string }>();

  if (!post) return c.json({ error: "Not found" }, 404);
  if (post.status !== "proposed") return c.json({ error: "承認できる状態ではありません" }, 400);

  await c.env.DB.prepare(
    "UPDATE social_posts SET status = 'approved' WHERE id = ? AND account_id = ?"
  )
    .bind(c.req.param("id"), accountId)
    .run();

  await append(c.env.DB, {
    session_id: accountId,
    type: "action",
    actor: "user",
    payload: { action: "sns.approve", post_id: post.id, platform: post.platform },
  });

  return c.json({ id: post.id, status: "approved" });
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
