type CampaignInsights = {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  conversions: number;
};

type CampaignContext = {
  name: string;
  status: string;
  objective: string;
  insights?: {
    today: CampaignInsights;
    yesterday: CampaignInsights;
    thisWeek: CampaignInsights;
    lastWeek: CampaignInsights;
  };
};

export function buildContextPrompt(context: CampaignContext): string {
  const { name, status, objective, insights } = context;

  const calcChange = (current: number, previous: number): string => {
    if (previous === 0) return "N/A";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  let prompt = `
## 現在分析中のキャンペーン情報

**キャンペーン名**: ${name}
**ステータス**: ${status}
**目的**: ${objective}
`;

  if (!insights?.today) {
    prompt += `\n※ パフォーマンスデータは現在取得できていません。\n`;
    return prompt;
  }

  const { today, yesterday, thisWeek, lastWeek } = insights;

  prompt += `
### 今日のパフォーマンス (昨日比)
- インプレッション: ${today.impressions.toLocaleString()} (${calcChange(today.impressions, yesterday.impressions)})
- クリック: ${today.clicks.toLocaleString()} (${calcChange(today.clicks, yesterday.clicks)})
- CTR: ${today.ctr.toFixed(2)}% (${calcChange(today.ctr, yesterday.ctr)})
- CPC: ¥${today.cpc.toLocaleString()} (${calcChange(today.cpc, yesterday.cpc)})
- 費用: ¥${today.spend.toLocaleString()} (${calcChange(today.spend, yesterday.spend)})
- CV: ${today.conversions}件 (${calcChange(today.conversions, yesterday.conversions)})

### 今週のパフォーマンス (先週比)
- インプレッション: ${thisWeek.impressions.toLocaleString()} (${calcChange(thisWeek.impressions, lastWeek.impressions)})
- クリック: ${thisWeek.clicks.toLocaleString()} (${calcChange(thisWeek.clicks, lastWeek.clicks)})
- CTR: ${thisWeek.ctr.toFixed(2)}% (${calcChange(thisWeek.ctr, lastWeek.ctr)})
- CPC: ¥${thisWeek.cpc.toLocaleString()} (${calcChange(thisWeek.cpc, lastWeek.cpc)})
- 費用: ¥${thisWeek.spend.toLocaleString()} (${calcChange(thisWeek.spend, lastWeek.spend)})
- CV: ${thisWeek.conversions}件 (${calcChange(thisWeek.conversions, lastWeek.conversions)})

上記のデータを踏まえて、ユーザーの質問に回答してください。
`;

  return prompt;
}

export async function buildKnowledgeContext(
  db: D1Database,
  accountId: string,
  limit = 5
): Promise<string> {
  const { results } = await db
    .prepare(
      `SELECT title, content FROM knowledge
       WHERE account_id = ? AND status = 'published'
       ORDER BY usage_count DESC, created_at DESC
       LIMIT ?`
    )
    .bind(accountId, limit)
    .all<{ title: string; content: string }>();

  if (results.length === 0) return "";

  let ctx = "\n\n## 蓄積されたナレッジ\n以下は過去の分析・議論から蓄積されたナレッジです。回答時にこれらを参考にしてください。\n\n";
  results.forEach((item, i) => {
    const truncated = item.content.length > 500 ? item.content.slice(0, 500) + "..." : item.content;
    ctx += `### ナレッジ${i + 1}: ${item.title}\n${truncated}\n\n`;
  });
  return ctx;
}
