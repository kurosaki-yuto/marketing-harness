-- 既存 DB 向け: accounts に integrations_enabled カラムを追加
ALTER TABLE accounts ADD COLUMN integrations_enabled TEXT DEFAULT '[]';
