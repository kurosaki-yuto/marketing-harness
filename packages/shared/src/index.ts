import { z } from "zod";

export const CompanySchema = z.object({
  id: z.string(),
  account_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  target_audience: z.string().nullable().optional(),
  meta_ad_account_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const KnowledgeSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.enum(["improvement", "analysis", "best_practice", "alert_response"]),
  tags: z.string().default("[]"),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  usage_count: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AdMetricsSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  company_id: z.string(),
  campaign_id: z.string(),
  date: z.string(),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  spend: z.number().default(0),
  conversions: z.number().default(0),
  ctr: z.number().nullable().optional(),
  cpc: z.number().nullable().optional(),
  cpa: z.number().nullable().optional(),
  roas: z.number().nullable().optional(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const SocialAccountSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  platform: z.enum(["instagram", "tiktok", "x", "youtube"]),
  external_account_id: z.string(),
  account_name: z.string(),
  connected_at: z.string(),
});

export const SocialPostSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  social_account_id: z.string(),
  platform: z.enum(["instagram", "tiktok", "x", "youtube"]),
  type: z.enum(["feed", "story", "reel", "short"]),
  media_url: z.string(),
  caption: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).default("draft"),
  external_post_id: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string(),
  published_at: z.string().nullable().optional(),
});

export type Company = z.infer<typeof CompanySchema>;
export type Knowledge = z.infer<typeof KnowledgeSchema>;
export type AdMetrics = z.infer<typeof AdMetricsSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type SocialAccount = z.infer<typeof SocialAccountSchema>;
export type SocialPost = z.infer<typeof SocialPostSchema>;
