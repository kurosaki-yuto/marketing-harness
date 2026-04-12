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

export type Company = z.infer<typeof CompanySchema>;
export type Knowledge = z.infer<typeof KnowledgeSchema>;
export type AdMetrics = z.infer<typeof AdMetricsSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
