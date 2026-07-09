-- Track JSON-LD schema markup installation status per business
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS schema_status TEXT NOT NULL DEFAULT 'none'
    CHECK (schema_status IN ('none', 'installed_wp', 'installed_manual')),
  ADD COLUMN IF NOT EXISTS schema_installed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schema_wp_page_id INTEGER;
