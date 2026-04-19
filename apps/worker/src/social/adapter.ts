import type { Env } from "../index";

export interface SocialPost {
  id: string;
  platform: "instagram" | "tiktok" | "x" | "youtube";
  type: "feed" | "story" | "reel" | "short";
  media_url: string;
  caption: string | null;
  access_token: string;
  external_account_id: string;
}

export interface PublishResult {
  success: boolean;
  external_post_id?: string;
  error?: string;
}

export async function publish(env: Env, post: SocialPost): Promise<PublishResult> {
  switch (post.platform) {
    case "instagram":
      return publishInstagram(post);
    case "x":
      return publishX(post);
    case "tiktok":
      return publishTikTok(post);
    default:
      return { success: false, error: `${post.platform} は未対応です` };
  }
}

async function publishInstagram(post: SocialPost): Promise<PublishResult> {
  try {
    const containerRes = await fetch(
      `https://graph.instagram.com/v19.0/${post.external_account_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: post.media_url,
          caption: post.caption ?? "",
          access_token: post.access_token,
        }),
      }
    );
    const container = await containerRes.json<{ id?: string; error?: { message: string } }>();
    if (!container.id) {
      return { success: false, error: container.error?.message ?? "コンテナ作成に失敗しました" };
    }

    const publishRes = await fetch(
      `https://graph.instagram.com/v19.0/${post.external_account_id}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: post.access_token }),
      }
    );
    const published = await publishRes.json<{ id?: string; error?: { message: string } }>();
    if (!published.id) {
      return { success: false, error: published.error?.message ?? "公開に失敗しました" };
    }
    return { success: true, external_post_id: published.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function publishX(post: SocialPost): Promise<PublishResult> {
  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${post.access_token}`,
      },
      body: JSON.stringify({ text: post.caption ?? "" }),
    });
    const data = await res.json<{ data?: { id: string }; errors?: Array<{ message: string }> }>();
    if (!data.data?.id) {
      return { success: false, error: data.errors?.[0]?.message ?? "X への投稿に失敗しました" };
    }
    return { success: true, external_post_id: data.data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function publishTikTok(post: SocialPost): Promise<PublishResult> {
  return { success: false, error: "TikTok 投稿は近日対応予定です" };
}
