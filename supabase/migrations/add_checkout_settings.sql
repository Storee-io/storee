-- Add missing columns to stores table for Store Settings persistence
-- Run this in your Supabase SQL editor

-- Add description column
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS description text DEFAULT 'Premium quality products for your lifestyle';

-- Add email column
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS email text DEFAULT 'hello@mystore.com';

-- Add checkout_settings column
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS checkout_settings jsonb DEFAULT '{"contactFields":"both"}'::jsonb;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_checkout_settings ON stores USING gin(checkout_settings);
