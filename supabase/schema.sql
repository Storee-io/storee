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

-- ── Products Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid        NOT NULL REFERENCES published_stores(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  price       numeric     NOT NULL,
  original_price numeric,
  description text,
  category    text,
  badge       text,
  image       text,
  image_fallback text,
  collection_id text,
  -- Styled HTML versions (from canvas editor)
  name_html   text,
  category_html text,
  description_html text,
  badge_html  text,
  price_html  text,
  -- Inventory
  stock       integer     DEFAULT 0,
  sku         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category);

-- ── Customers Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid        NOT NULL REFERENCES published_stores(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  name        text        NOT NULL,
  phone       text,
  address     text,
  city        text,
  province    text,
  postal_code text,
  country     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, email)
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_email ON customers(email);

-- ── Orders Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid        NOT NULL REFERENCES published_stores(id) ON DELETE CASCADE,
  customer_id uuid        REFERENCES customers(id) ON DELETE SET NULL,
  order_number text       NOT NULL,
  status      text        NOT NULL DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
  payment_method text,
  shipping_method text,
  subtotal    numeric     NOT NULL,
  shipping_cost numeric,
  discount    numeric,
  total       numeric     NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, order_number)
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ── Order Items Table (line items in order) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  uuid        REFERENCES products(id) ON DELETE SET NULL,
  product_name text       NOT NULL, -- snapshot in case product is deleted
  price       numeric     NOT NULL,
  quantity    integer     NOT NULL,
  subtotal    numeric     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Enable RLS for all new tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public read for products (needed for store preview)
CREATE POLICY "Public read products"
  ON products FOR SELECT
  USING (true);

-- For now, allow anon write to products (add auth later)
CREATE POLICY "Anon write products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon update products"
  ON products FOR UPDATE
  USING (true);

CREATE POLICY "Anon delete products"
  ON products FOR DELETE
  USING (true);

-- Customers: public read, authenticated users can insert their own
CREATE POLICY "Public read customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Anon write customers"
  ON customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon update customers"
  ON customers FOR UPDATE
  USING (true);

-- Orders: public read, authenticated can insert/update
CREATE POLICY "Public read orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Anon write orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon update orders"
  ON orders FOR UPDATE
  USING (true);

-- Order items: read/write same as orders
CREATE POLICY "Public read order items"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Anon write order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Auto-update timestamps
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
