#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const WORKER_URL = process.env.MARKETING_HARNESS_URL ?? "http://localhost:8787";
const API_KEY = process.env.MARKETING_HARNESS_API_KEY ?? "";

async function apiCall(path: string, options: RequestInit = {}) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

const server = new Server(
  { name: "marketing-harness", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_campaigns",
      description: "広告キャンペーンの一覧を取得します",
      inputSchema: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "企業ID（省略可）" },
        },
      },
    },
    {
      name: "get_metrics",
      description: "広告メトリクスを取得します",
      inputSchema: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "企業ID" },
          campaign_id: { type: "string", description: "キャンペーンID（省略可）" },
          from: { type: "string", description: "開始日 YYYY-MM-DD" },
          to: { type: "string", description: "終了日 YYYY-MM-DD" },
        },
        required: ["company_id"],
      },
    },
    {
      name: "get_report_data",
      description: "月次レポート作成に必要なデータを取得します（メトリクス・変更履歴・ナレッジ）。このデータを基に Claude Code がレポートを生成します",
      inputSchema: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "企業ID" },
          month: { type: "string", description: "対象月 YYYY-MM" },
        },
        required: ["company_id", "month"],
      },
    },
    {
      name: "save_report",
      description: "生成した月次広告レポートを保存します",
      inputSchema: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "企業ID" },
          month: { type: "string", description: "対象月 YYYY-MM" },
          content: { type: "string", description: "レポート本文（Markdown）" },
        },
        required: ["company_id", "month", "content"],
      },
    },
    {
      name: "set_kpi_target",
      description: "KPI目標値を設定します",
      inputSchema: {
        type: "object",
        properties: {
          campaign_id: { type: "string", description: "キャンペーンID" },
          campaign_name: { type: "string", description: "キャンペーン名" },
          targets: {
            type: "object",
            description: "目標値 例: {cpa: 1000, roas: 400}",
          },
          thresholds: {
            type: "object",
            description: "アラート閾値 例: {cpa: 2000}",
          },
        },
        required: ["campaign_id"],
      },
    },
    {
      name: "update_knowledge",
      description: "ナレッジを追加・更新します",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "タイトル" },
          content: { type: "string", description: "内容" },
          category: {
            type: "string",
            enum: ["improvement", "analysis", "best_practice", "alert_response"],
            description: "カテゴリ",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "タグ",
          },
        },
        required: ["title", "content", "category"],
      },
    },
    {
      name: "list_companies",
      description: "広告主（企業）の一覧を取得します",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_knowledge",
      description: "蓄積されたナレッジの一覧を取得します",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_social_accounts",
      description: "連携済みの SNS アカウント一覧を取得します（Instagram、TikTok 等）",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "connect_social_account",
      description: "SNS アカウントを連携します",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "tiktok", "x", "youtube"], description: "プラットフォーム" },
          external_account_id: { type: "string", description: "プラットフォーム上のアカウントID" },
          account_name: { type: "string", description: "アカウント名（表示用）" },
          access_token: { type: "string", description: "アクセストークン" },
        },
        required: ["platform", "external_account_id", "account_name", "access_token"],
      },
    },
    {
      name: "list_social_posts",
      description: "SNS 投稿の一覧を取得します（予約中・公開済みを含む）",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", description: "プラットフォームでフィルタ（省略可）" },
          status: { type: "string", description: "ステータスでフィルタ: draft / scheduled / published / failed（省略可）" },
        },
      },
    },
    {
      name: "schedule_social_post",
      description: "SNS 投稿を予約します（Instagram フィード・ストーリー、TikTok ショート等）",
      inputSchema: {
        type: "object",
        properties: {
          social_account_id: { type: "string", description: "連携 SNS アカウントの ID" },
          platform: { type: "string", enum: ["instagram", "tiktok", "x", "youtube"], description: "投稿先プラットフォーム" },
          type: { type: "string", enum: ["feed", "story", "reel", "short"], description: "投稿タイプ" },
          media_url: { type: "string", description: "メディア URL（画像または動画）" },
          caption: { type: "string", description: "キャプション（省略可）" },
          scheduled_at: { type: "string", description: "予約日時 ISO8601（省略時は下書き）" },
        },
        required: ["social_account_id", "platform", "type", "media_url"],
      },
    },
    {
      name: "publish_social_post_now",
      description: "SNS 投稿をキューに追加します（Phase2 で実際の投稿 API を呼び出します）",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "投稿 ID" },
        },
        required: ["post_id"],
      },
    },
    {
      name: "delete_social_post",
      description: "SNS 投稿を削除します",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "投稿 ID" },
        },
        required: ["post_id"],
      },
    },
    {
      name: "send_line_message",
      description: "LINE ユーザーにメッセージを送信します（push 配信）",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "送信先 LINE ユーザー ID" },
          message: { type: "string", description: "送信するメッセージ本文" },
        },
        required: ["to", "message"],
      },
    },
    {
      name: "list_utage_subscribers",
      description: "UTAGE（宴）の購読者一覧を取得します",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（省略時は 20）" },
        },
      },
    },
    {
      name: "sync_google_ads_campaigns",
      description: "Google Ads のキャンペーンを D1 データベースに同期します",
      inputSchema: {
        type: "object",
        properties: {
          company_id: { type: "string", description: "同期先の企業 ID" },
        },
        required: ["company_id"],
      },
    },
    {
      name: "check_integration_status",
      description: "各サービス連携の接続状態を確認します",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["line", "utage", "google-ads"],
            description: "確認するサービス",
          },
        },
        required: ["service"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case "list_companies": {
        const data = await apiCall("/api/companies");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_campaigns": {
        const q = a.company_id ? `?companyId=${a.company_id}` : "";
        const data = await apiCall(`/api/metrics${q}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_metrics": {
        const params = new URLSearchParams();
        if (a.company_id) params.set("companyId", a.company_id as string);
        if (a.campaign_id) params.set("campaignId", a.campaign_id as string);
        if (a.from) params.set("from", a.from as string);
        if (a.to) params.set("to", a.to as string);
        const data = await apiCall(`/api/metrics?${params}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_report_data": {
        const data = await apiCall("/api/reports/data", {
          method: "POST",
          body: JSON.stringify({ companyId: a.company_id, month: a.month }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "save_report": {
        const data = await apiCall("/api/reports", {
          method: "POST",
          body: JSON.stringify({ companyId: a.company_id, month: a.month, content: a.content }),
        });
        return { content: [{ type: "text", text: `レポートを保存しました (id: ${(data as { id: string }).id})` }] };
      }

      case "set_kpi_target": {
        await apiCall("/api/kpi", {
          method: "POST",
          body: JSON.stringify({
            campaign_id: a.campaign_id,
            campaign_name: a.campaign_name,
            targets: a.targets,
            thresholds: a.thresholds,
          }),
        });
        return { content: [{ type: "text", text: "KPI目標を設定しました" }] };
      }

      case "update_knowledge": {
        const data = await apiCall("/api/knowledge", {
          method: "POST",
          body: JSON.stringify({
            title: a.title,
            content: a.content,
            category: a.category,
            tags: a.tags ?? [],
          }),
        });
        return { content: [{ type: "text", text: `ナレッジを追加しました (id: ${(data as { id: string }).id})` }] };
      }

      case "list_knowledge": {
        const data = await apiCall("/api/knowledge");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_social_accounts": {
        const data = await apiCall("/api/social/accounts");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "connect_social_account": {
        const data = await apiCall("/api/social/accounts", {
          method: "POST",
          body: JSON.stringify({
            platform: a.platform,
            external_account_id: a.external_account_id,
            account_name: a.account_name,
            access_token: a.access_token,
          }),
        });
        return { content: [{ type: "text", text: `SNSアカウントを連携しました (id: ${(data as { id: string }).id})` }] };
      }

      case "list_social_posts": {
        const params = new URLSearchParams();
        if (a.platform) params.set("platform", a.platform as string);
        if (a.status) params.set("status", a.status as string);
        const data = await apiCall(`/api/social/posts?${params}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "schedule_social_post": {
        const data = await apiCall("/api/social/posts", {
          method: "POST",
          body: JSON.stringify({
            social_account_id: a.social_account_id,
            platform: a.platform,
            type: a.type,
            media_url: a.media_url,
            caption: a.caption,
            scheduled_at: a.scheduled_at,
          }),
        });
        return { content: [{ type: "text", text: `投稿を予約しました (id: ${(data as { id: string }).id})` }] };
      }

      case "publish_social_post_now": {
        const data = await apiCall(`/api/social/posts/${a.post_id}/publish`, { method: "POST" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "delete_social_post": {
        await apiCall(`/api/social/posts/${a.post_id}`, { method: "DELETE" });
        return { content: [{ type: "text", text: "投稿を削除しました" }] };
      }

      case "send_line_message": {
        const data = await apiCall("/api/integrations/line/message", {
          method: "POST",
          body: JSON.stringify({ to: a.to, message: a.message }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_utage_subscribers": {
        const q = a.limit ? `?limit=${a.limit}` : "";
        const data = await apiCall(`/api/integrations/utage/subscribers${q}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "sync_google_ads_campaigns": {
        const data = await apiCall("/api/integrations/google-ads/sync", {
          method: "POST",
          body: JSON.stringify({ companyId: a.company_id }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "check_integration_status": {
        const data = await apiCall(`/api/integrations/${a.service}/status`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("marketing-harness MCP server running");
}

main().catch(console.error);
