-- Migration 006: イベントストリーム + セッション状態テーブル追加（#10 Event-stream 監査）

CREATE TABLE IF NOT EXISTS events (
  session_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('action', 'observation', 'delegate', 'connector')),
  actor TEXT NOT NULL CHECK (actor IN ('user', 'agent', 'tool', 'cron')),
  payload_json TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, seq)
);

CREATE TABLE IF NOT EXISTS base_state (
  session_id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, actor, ts);

-- social_posts の status に proposed / approved を追加（SQLite は CHECK を ALTER できないため再作成）
PRAGMA foreign_keys = OFF;

CREATE TABLE social_posts_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'x', 'youtube')),
  type TEXT NOT NULL CHECK (type IN ('feed', 'story', 'reel', 'short')),
  media_url TEXT NOT NULL,
  caption TEXT,
  scheduled_at TEXT,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'draft', 'scheduled', 'published', 'failed')),
  external_post_id TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

INSERT INTO social_posts_new SELECT * FROM social_posts;
DROP TABLE social_posts;
ALTER TABLE social_posts_new RENAME TO social_posts;

CREATE INDEX IF NOT EXISTS idx_social_posts_account ON social_posts(account_id, status, scheduled_at);

PRAGMA foreign_keys = ON;
