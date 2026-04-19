-- marketing-harness D1 schema
-- マルチアカウント対応: 全テーブルが account_id を持つ

-- アカウント（マルチアカウントの単位）
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  license_key TEXT,
  license_plan TEXT DEFAULT 'community',
  license_expires_at TEXT,
  license_last_verified_at TEXT,
  instance_id TEXT,
  integrations_enabled TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 企業（広告主）
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  spreadsheet_id TEXT,
  meta_ad_account_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- キャンペーン（Meta Ads から同期）
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  objective TEXT,
  daily_budget REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (id, account_id)
);

-- 広告メトリクス（日次）
CREATE TABLE IF NOT EXISTS ad_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  adset_id TEXT,
  ad_id TEXT,
  date TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  ctr REAL,
  cpc REAL,
  cpa REAL,
  roas REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ナレッジ
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'improvement', 'analysis', 'best_practice', 'alert_response',
    'ad_copy', 'ad_creative', 'ad_targeting', 'ad_budget'
  )),
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 変更履歴
CREATE TABLE IF NOT EXISTS change_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  campaign_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('ad_stopped', 'ad_resumed', 'creative_updated', 'targeting_changed', 'budget_changed', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  ai_discussion_summary TEXT,
  affected_entity_type TEXT,
  affected_entity_id TEXT,
  affected_entity_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- KPI設定
CREATE TABLE IF NOT EXISTS kpi_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  targets TEXT DEFAULT '{}',
  thresholds TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (account_id, campaign_id)
);

-- レポート
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  month TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (account_id, company_id, month)
);

-- SNS アカウント連携
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'x', 'youtube')),
  external_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  connected_at TEXT DEFAULT (datetime('now'))
);

-- SNS 投稿（予約・公開管理）
CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'x', 'youtube')),
  type TEXT NOT NULL CHECK (type IN ('feed', 'story', 'reel', 'short')),
  media_url TEXT NOT NULL,
  caption TEXT,
  scheduled_at TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  external_post_id TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_companies_account ON companies(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account ON campaigns(account_id, company_id);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign ON ad_metrics(account_id, campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_account ON knowledge(account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_campaign ON change_history(account_id, company_id, campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_campaign ON kpi_settings(account_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_reports_month ON reports(account_id, company_id, month);
CREATE INDEX IF NOT EXISTS idx_social_accounts_account ON social_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_account ON social_posts(account_id, status, scheduled_at);
