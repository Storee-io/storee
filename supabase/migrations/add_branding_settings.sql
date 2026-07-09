-- Add branding settings to stores table for logo and favicon persistence
-- Run this in your Supabase SQL editor

-- Add branding column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_branding ON stores USING gin(branding);
