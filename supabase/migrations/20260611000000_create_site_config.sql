-- supabase/migrations/20260611000000_create_site_config.sql
CREATE TABLE site_config (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default scoring mode
INSERT INTO site_config (key, value) VALUES ('scoring_mode', '"phase_confirmation"');

-- RLS: public read, admin write
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site_config"
  ON site_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site_config"
  ON site_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert site_config"
  ON site_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
