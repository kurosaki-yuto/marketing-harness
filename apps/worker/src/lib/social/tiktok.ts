import type { SocialAdapter, PublishFeedInput, PublishStoryInput, PublishShortInput, InsightsResult } from "./adapter";
import { NotImplementedError } from "./adapter";

export class TikTokAdapter implements SocialAdapter {
  readonly platform = "tiktok";

  constructor(
    private readonly accessToken: string,
    private readonly openId: string
  ) {}

  async publishFeed(_input: PublishFeedInput): Promise<{ externalId: string }> {
    throw new NotImplementedError("publishFeed", this.platform);
  }

  async publishStory(_input: PublishStoryInput): Promise<{ externalId: string }> {
    throw new NotImplementedError("publishStory", this.platform);
  }

  async publishShort(_input: PublishShortInput): Promise<{ externalId: string }> {
    throw new NotImplementedError("publishShort", this.platform);
  }

  async getInsights(_externalId: string): Promise<InsightsResult> {
    throw new NotImplementedError("getInsights", this.platform);
  }
}
