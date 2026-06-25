-- Add checkout_settings column to stores table
-- Run this in your Supabase SQL editor if checkout_settings column doesn't exist

ALTER TABLE stores
ADD COLUMN checkout_settings jsonb DEFAULT '{"contactFields":"both"}'::jsonb;

-- Index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_stores_checkout_settings ON stores USING gin(checkout_settings);
