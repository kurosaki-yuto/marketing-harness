import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../prompts/system";
import { buildContextPrompt, buildKnowledgeContext } from "../lib/rag";
import type { Env } from "../index";

export const chatRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

chatRouter.post("/", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    messages: { role: "user" | "assistant"; content: string }[];
    campaignContext?: Parameters<typeof buildContextPrompt>[0];
    companyId?: string;
    sessionId?: string;
  }>();

  if (!body.messages?.length) {
    return c.json({ error: "messages is required" }, 400);
  }

  let systemPrompt = SYSTEM_PROMPT;
  if (body.campaignContext) {
    systemPrompt += "\n\n" + buildContextPrompt(body.campaignContext);
  }
  if (body.companyId) {
    systemPrompt += await buildKnowledgeContext(c.env.DB, accountId);
  }

  const anthropic = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: body.messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// チャットセッション
chatRouter.get("/sessions", async (c) => {
  const accountId = c.get("accountId");
  const companyId = c.req.query("companyId");
  const query = companyId
    ? "SELECT * FROM chat_sessions WHERE account_id = ? AND company_id = ? ORDER BY updated_at DESC LIMIT 50"
    : "SELECT * FROM chat_sessions WHERE account_id = ? ORDER BY updated_at DESC LIMIT 50";
  const { results } = companyId
    ? await c.env.DB.prepare(query).bind(accountId, companyId).all()
    : await c.env.DB.prepare(query).bind(accountId).all();
  return c.json(results);
});

chatRouter.post("/sessions", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    companyId?: string;
    campaignId?: string;
    campaignName?: string;
    title?: string;
  }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO chat_sessions (id, account_id, company_id, campaign_id, campaign_name, title)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, accountId, body.companyId ?? null, body.campaignId ?? null, body.campaignName ?? null, body.title ?? "新しいチャット")
    .run();
  return c.json({ id }, 201);
});

chatRouter.get("/sessions/:sessionId/messages", async (c) => {
  const accountId = c.get("accountId");
  const { results } = await c.env.DB.prepare(
    `SELECT m.* FROM chat_messages m
     JOIN chat_sessions s ON m.session_id = s.id
     WHERE m.session_id = ? AND s.account_id = ?
     ORDER BY m.created_at ASC`
  )
    .bind(c.req.param("sessionId"), accountId)
    .all();
  return c.json(results);
});

chatRouter.post("/sessions/:sessionId/messages", async (c) => {
  const accountId = c.get("accountId");
  const sessionId = c.req.param("sessionId");
  const body = await c.req.json<{ role: "user" | "assistant"; content: string }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO chat_messages (id, account_id, session_id, role, content)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, accountId, sessionId, body.role, body.content)
    .run();
  return c.json({ id }, 201);
});
