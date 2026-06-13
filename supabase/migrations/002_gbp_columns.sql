-- Add GBP connection fields to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS gbp_account_name TEXT,
  ADD COLUMN IF NOT EXISTS gbp_location_name TEXT,
  ADD COLUMN IF NOT EXISTS gbp_refresh_token TEXT;

-- Track which posts have been published to GBP
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS gbp_post_name TEXT;
