-- Add auto-scheduling preference columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS auto_schedule          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_schedule_cadence  text    NOT NULL DEFAULT 'weekly'
    CHECK (auto_schedule_cadence IN ('weekly', 'biweekly', 'monthly'));
