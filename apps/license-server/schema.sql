-- marketing-harness license server schema

CREATE TABLE IF NOT EXISTS licenses (
  key TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'community',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  revoked_at TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS license_checks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  license_key TEXT NOT NULL,
  instance_id TEXT,
  checked_at TEXT DEFAULT (datetime('now')),
  result TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_license_checks_key ON license_checks(license_key, checked_at DESC);

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

CREATE TABLE IF NOT EXISTS license_integrations (
  license_key TEXT PRIMARY KEY REFERENCES licenses(key) ON DELETE CASCADE,
  meta_access_token TEXT,
  meta_ad_account_id TEXT,
  line_channel_access_token TEXT,
  line_channel_secret TEXT,
  utage_api_key TEXT,
  google_ads_developer_token TEXT,
  google_ads_client_id TEXT,
  google_ads_client_secret TEXT,
  google_ads_refresh_token TEXT,
  google_ads_customer_id TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS central_knowledge (
  topic TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
