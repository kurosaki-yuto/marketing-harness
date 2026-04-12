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
      name: "ask_agent",
      description: "AIエージェントに広告運用の改善提案を相談します",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "質問・相談内容" },
          company_id: { type: "string", description: "企業ID（省略可）" },
        },
        required: ["message"],
      },
    },
    {
      name: "create_report",
      description: "月次広告運用レポートを生成します",
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

      case "ask_agent": {
        const res = await fetch(`${WORKER_URL}/api/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: a.message }],
            companyId: a.company_id,
          }),
        });

        // SSEを読んで全文を組み立てる
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const obj = JSON.parse(line.slice(6)) as { text?: string };
                if (obj.text) fullText += obj.text;
              } catch { /* skip */ }
            }
          }
        }
        return { content: [{ type: "text", text: fullText }] };
      }

      case "create_report": {
        const data = await apiCall("/api/reports/generate", {
          method: "POST",
          body: JSON.stringify({ companyId: a.company_id, month: a.month }),
        });
        return { content: [{ type: "text", text: (data as { report: string }).report }] };
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
