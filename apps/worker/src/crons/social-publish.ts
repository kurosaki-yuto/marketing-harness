import type { Env } from "../index";

// Phase2 で実装: scheduled_at が過ぎた social_posts を各プラットフォーム API で公開する
// InstagramAdapter / TikTokAdapter の publishFeed/publishStory/publishShort を呼ぶ
export async function publishScheduledPosts(_env: Env): Promise<void> {
  throw new Error("publishScheduledPosts is not yet implemented (Phase2)");
}
