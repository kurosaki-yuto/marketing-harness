import type { Env } from "../index";
import { publish } from "../social/adapter";
import { append } from "../audit/event-stream";

type PostRow = {
  id: string;
  account_id: string;
  social_account_id: string;
  platform: "instagram" | "tiktok" | "x" | "youtube";
  type: "feed" | "story" | "reel" | "short";
  media_url: string;
  caption: string | null;
  access_token: string;
  external_account_id: string;
};

export async function publishApprovedPosts(env: Env): Promise<void> {
  const now = new Date().toISOString();

  const { results: posts } = await env.DB.prepare(
    `SELECT sp.*, sa.access_token, sa.external_account_id
     FROM social_posts sp
     JOIN social_accounts sa ON sp.social_account_id = sa.id
     WHERE sp.status = 'approved'
       AND (sp.scheduled_at IS NULL OR sp.scheduled_at <= ?)
     LIMIT 20`
  )
    .bind(now)
    .all<PostRow>();

  for (const post of posts) {
    const result = await publish(env, post);

    if (result.success) {
      await env.DB.prepare(
        `UPDATE social_posts
         SET status = 'published', external_post_id = ?, published_at = datetime('now')
         WHERE id = ?`
      )
        .bind(result.external_post_id ?? null, post.id)
        .run();

      await append(env.DB, {
        session_id: post.account_id,
        type: "action",
        actor: "cron",
        payload: { action: "sns.published", post_id: post.id, platform: post.platform, external_post_id: result.external_post_id },
      });
    } else {
      await env.DB.prepare(
        "UPDATE social_posts SET status = 'failed', error_message = ? WHERE id = ?"
      )
        .bind(result.error ?? "不明なエラー", post.id)
        .run();

      await append(env.DB, {
        session_id: post.account_id,
        type: "observation",
        actor: "cron",
        payload: { action: "sns.failed", post_id: post.id, platform: post.platform, error: result.error },
      });

      console.error(`social-publish failed: post=${post.id} platform=${post.platform} error=${result.error}`);
    }
  }
}
