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
