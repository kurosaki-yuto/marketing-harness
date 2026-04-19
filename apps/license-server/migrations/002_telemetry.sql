CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  license_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL,
  received_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_key_time ON telemetry_events(license_key, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_type_time ON telemetry_events(event_type, received_at DESC);
