-- knowledge テーブルの category CHECK 制約に広告カテゴリを追加
-- SQLite は ALTER TABLE で CHECK 制約を変更できないため、テーブルを再作成する

CREATE TABLE knowledge_new (
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

INSERT INTO knowledge_new SELECT * FROM knowledge;
DROP TABLE knowledge;
ALTER TABLE knowledge_new RENAME TO knowledge;
