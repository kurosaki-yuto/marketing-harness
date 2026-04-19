-- campaigns にターゲット・クリエイティブ・CTA の構造化フィールドを追加
ALTER TABLE campaigns ADD COLUMN target_audience TEXT;
ALTER TABLE campaigns ADD COLUMN creative_type TEXT;
ALTER TABLE campaigns ADD COLUMN hook_type TEXT;
ALTER TABLE campaigns ADD COLUMN cta_type TEXT;

-- change_history に変更前後の構造化値を追加
ALTER TABLE change_history ADD COLUMN before_value TEXT;
ALTER TABLE change_history ADD COLUMN after_value TEXT;
