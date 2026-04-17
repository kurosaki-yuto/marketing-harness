export interface PublishFeedInput {
  mediaUrl: string;
  caption?: string;
}

export interface PublishStoryInput {
  mediaUrl: string;
}

export interface PublishShortInput {
  videoUrl: string;
  title: string;
  description?: string;
}

export interface InsightsResult {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface SocialAdapter {
  platform: string;
  publishFeed(input: PublishFeedInput): Promise<{ externalId: string }>;
  publishStory(input: PublishStoryInput): Promise<{ externalId: string }>;
  publishShort(input: PublishShortInput): Promise<{ externalId: string }>;
  getInsights(externalId: string): Promise<InsightsResult>;
}

export class NotImplementedError extends Error {
  constructor(method: string, platform: string) {
    super(`${method} is not yet implemented for ${platform} (Phase2)`);
    this.name = "NotImplementedError";
  }
}
