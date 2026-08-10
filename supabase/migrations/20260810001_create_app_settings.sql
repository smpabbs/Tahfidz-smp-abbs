-- Create app_settings table for storing global app settings (e.g. WA message templates)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon access (since the app uses anon key)
DROP POLICY IF EXISTS anon_select ON app_settings;
CREATE POLICY anon_select ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS anon_insert ON app_settings;
CREATE POLICY anon_insert ON app_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS anon_update ON app_settings;
CREATE POLICY anon_update ON app_settings FOR UPDATE USING (true);
DROP POLICY IF EXISTS anon_delete ON app_settings;
CREATE POLICY anon_delete ON app_settings FOR DELETE USING (true);