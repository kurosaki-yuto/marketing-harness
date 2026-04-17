-- 既存 DB 向け: chat テーブルを削除し、change_history の FK カラムを除去
ALTER TABLE change_history DROP COLUMN chat_session_id;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
