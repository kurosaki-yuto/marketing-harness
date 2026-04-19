import type { D1Database } from "@cloudflare/workers-types";

type EventType = "action" | "observation" | "delegate" | "connector";
type Actor = "user" | "agent" | "tool" | "cron";

export interface AuditEvent {
  session_id: string;
  type: EventType;
  actor: Actor;
  payload: Record<string, unknown>;
}

async function nextSeq(db: D1Database, sessionId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM events WHERE session_id = ?")
    .bind(sessionId)
    .first<{ next: number }>();
  return row?.next ?? 0;
}

export async function append(db: D1Database, event: AuditEvent): Promise<void> {
  try {
    const seq = await nextSeq(db, event.session_id);
    await db
      .prepare(
        "INSERT INTO events (session_id, seq, type, actor, payload_json, ts) VALUES (?, ?, ?, ?, ?, datetime('now'))"
      )
      .bind(event.session_id, seq, event.type, event.actor, JSON.stringify(event.payload))
      .run();
  } catch (err) {
    console.error("audit.append failed:", err);
  }
}

export async function restore(
  db: D1Database,
  sessionId: string
): Promise<Array<AuditEvent & { seq: number; ts: string }>> {
  const { results } = await db
    .prepare("SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC")
    .bind(sessionId)
    .all<{ session_id: string; seq: number; type: EventType; actor: Actor; payload_json: string; ts: string }>();

  return results.map((r) => ({
    session_id: r.session_id,
    seq: r.seq,
    type: r.type,
    actor: r.actor,
    payload: JSON.parse(r.payload_json) as Record<string, unknown>,
    ts: r.ts,
  }));
}

export async function snapshot(
  db: D1Database,
  sessionId: string,
  state: Record<string, unknown>
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO base_state (session_id, json, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT (session_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`
      )
      .bind(sessionId, JSON.stringify(state))
      .run();
  } catch (err) {
    console.error("audit.snapshot failed:", err);
  }
}

export async function getState(
  db: D1Database,
  sessionId: string
): Promise<Record<string, unknown> | null> {
  const row = await db
    .prepare("SELECT json FROM base_state WHERE session_id = ?")
    .bind(sessionId)
    .first<{ json: string }>();
  return row ? (JSON.parse(row.json) as Record<string, unknown>) : null;
}
