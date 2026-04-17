import { Hono } from "hono";
import type { Env } from "../../index";

const UTAGE_BASE = "https://api.utage-system.com/v1";

export const utageRouter = new Hono<{
  Bindings: Env;
  Variables: { accountId: string };
}>();

utageRouter.get("/status", async (c) => {
  if (!c.env.UTAGE_API_KEY) {
    return c.json({ configured: false, error: "Integration not configured" }, 503);
  }
  try {
    const res = await fetch(`${UTAGE_BASE}/contacts?limit=1`, {
      headers: { Authorization: `Bearer ${c.env.UTAGE_API_KEY}` },
    });
    if (!res.ok) return c.json({ configured: true, healthy: false, status: res.status }, 200);
    return c.json({ configured: true, healthy: true });
  } catch {
    return c.json({ configured: true, healthy: false, error: "Connection failed" }, 200);
  }
});

utageRouter.get("/subscribers", async (c) => {
  if (!c.env.UTAGE_API_KEY) {
    return c.json({ error: "Integration not configured" }, 503);
  }
  const limit = c.req.query("limit") ?? "20";
  const res = await fetch(`${UTAGE_BASE}/contacts?limit=${limit}`, {
    headers: { Authorization: `Bearer ${c.env.UTAGE_API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: `UTAGE API error ${res.status}: ${text}` }, 400);
  }
  return c.json(await res.json());
});
