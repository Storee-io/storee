-- Add branding column to published_stores table
ALTER TABLE published_stores
ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_published_stores_branding ON published_stores USING gin(branding);
