-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS published_stores (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain   text        UNIQUE NOT NULL,
  name        text        NOT NULL,
  primary_color text      NOT NULL DEFAULT '#10b981',
  category    text        NOT NULL DEFAULT 'Other',
  template_id text,
  design      jsonb,
  currency    jsonb,
  language    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON published_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE published_stores ENABLE ROW LEVEL SECURITY;

-- Anyone can read published stores (needed for storefront pages)
CREATE POLICY "Public read"
  ON published_stores FOR SELECT
  USING (true);

-- Anyone can insert/update for now (add auth later)
CREATE POLICY "Anon write"
  ON published_stores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon update"
  ON published_stores FOR UPDATE
  USING (true);
