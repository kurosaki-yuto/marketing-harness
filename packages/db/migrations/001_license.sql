-- Migration: ライセンス関連カラムを accounts テーブルに追加
-- 既存インスタンス向け ALTER（新規 clone は schema.sql の CREATE TABLE で対応済み）

ALTER TABLE accounts ADD COLUMN license_key TEXT;
ALTER TABLE accounts ADD COLUMN license_plan TEXT DEFAULT 'community';
ALTER TABLE accounts ADD COLUMN license_expires_at TEXT;
ALTER TABLE accounts ADD COLUMN license_last_verified_at TEXT;
ALTER TABLE accounts ADD COLUMN instance_id TEXT;
