import { Hono } from "hono";
import type { Env } from "../../index";

export const lineRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

lineRouter.get("/status", async (c) => {
  if (!c.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return c.json({ configured: false, error: "Integration not configured" }, 503);
  }
  try {
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${c.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) return c.json({ configured: true, healthy: false, status: res.status }, 200);
    const info = await res.json() as { userId: string; displayName: string };
    return c.json({ configured: true, healthy: true, botId: info.userId, displayName: info.displayName });
  } catch {
    return c.json({ configured: true, healthy: false, error: "Connection failed" }, 200);
  }
});

lineRouter.post("/test-message", async (c) => {
  if (!c.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return c.json({ error: "Integration not configured" }, 503);
  }
  const { to, message } = await c.req.json<{ to: string; message: string }>();
  if (!to || !message) return c.json({ error: "to and message are required" }, 400);

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text: message }] }),
  });
  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: `LINE API error ${res.status}: ${text}` }, 400);
  }
  return c.json({ success: true });
});

lineRouter.post("/message", async (c) => {
  if (!c.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return c.json({ error: "Integration not configured" }, 503);
  }
  const { to, message } = await c.req.json<{ to: string; message: string }>();
  if (!to || !message) return c.json({ error: "to and message are required" }, 400);

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text: message }] }),
  });
  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: `LINE API error ${res.status}: ${text}` }, 400);
  }
  return c.json({ success: true });
});
