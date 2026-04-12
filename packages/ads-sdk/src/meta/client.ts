const META_API_VERSION = "v22.0";
const META_GRAPH_URL = "https://graph.facebook.com";

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  created_time: string;
};

export type MetaInsight = {
  date_start: string;
  date_stop: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: Array<{ action_type: string; value: string }>;
};

export class MetaAdsClient {
  constructor(
    private readonly accessToken: string,
    private readonly adAccountId: string
  ) {}

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/${path}`);
    url.searchParams.set("access_token", this.accessToken);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await globalThis.fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta API error: ${res.status} ${err}`);
    }
    return res.json() as Promise<T>;
  }

  async getCampaigns(): Promise<MetaCampaign[]> {
    const data = await this.fetch<{ data: MetaCampaign[] }>(
      `${this.adAccountId}/campaigns`,
      {
        fields: "id,name,status,objective,daily_budget,created_time",
        limit: "200",
      }
    );
    return data.data;
  }

  async getDailyInsights(
    level: "campaign" | "adset" | "ad",
    since: string,
    until: string
  ): Promise<MetaInsight[]> {
    const data = await this.fetch<{ data: MetaInsight[] }>(
      `${this.adAccountId}/insights`,
      {
        level,
        fields: `date_start,date_stop,${level}_id,impressions,clicks,spend,ctr,cpc,cpm,actions`,
        time_range: JSON.stringify({ since, until }),
        time_increment: "1",
        limit: "500",
      }
    );
    return data.data;
  }

  extractConversions(insight: MetaInsight): number {
    const actions = insight.actions ?? [];
    const cv = actions.find(
      (a) =>
        a.action_type === "offsite_conversion.fb_pixel_purchase" ||
        a.action_type === "purchase" ||
        a.action_type === "lead"
    );
    return cv ? Number(cv.value) : 0;
  }
}
