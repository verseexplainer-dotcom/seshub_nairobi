-- SES ICT HUB Production Schema (Static-first Astro + Supabase)
-- Includes desktops category support and strict RLS defaults.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create/Update Products with 'desktops' category
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (lower(category) IN ('laptops', 'desktops', 'printers', 'phones', 'smartphones', 'accessories')),
  price_kes INT NOT NULL,
  compare_at_kes INT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  brand TEXT NULL,
  condition TEXT NULL CHECK (condition IN ('brand_new', 'refurbished', 'unknown')),
  refurb_grade TEXT NULL CHECK (refurb_grade IN ('grade_a', 'grade_b', 'grade_c')),
  short_specs TEXT NULL,
  description TEXT NULL,
  warranty_months INT NULL CHECK (warranty_months IN (3, 6, 12)),
  images JSONB NOT NULL DEFAULT '[]',
  featured_home BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential Tables
CREATE TABLE IF NOT EXISTS order_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cart JSONB NOT NULL,
  total_kes INT NOT NULL,
  customer_name TEXT,
  phone TEXT,
  location TEXT,
  status TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quote TEXT NOT NULL,
  approved BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  consent BOOLEAN DEFAULT false
);

-- RLS POLICIES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select" ON products;
CREATE POLICY "Public Select" ON products FOR SELECT USING (true);

ALTER TABLE order_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Orders" ON order_intents;
CREATE POLICY "Public Insert Orders" ON order_intents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin Select Orders" ON order_intents;
CREATE POLICY "Admin Select Orders" ON order_intents FOR SELECT USING (false);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select Testimonials" ON testimonials;
CREATE POLICY "Public Select Testimonials" ON testimonials FOR SELECT USING (approved = true);

ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Newsletter" ON newsletter_signups;
CREATE POLICY "Public Insert Newsletter" ON newsletter_signups FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin Select Newsletter" ON newsletter_signups;
CREATE POLICY "Admin Select Newsletter" ON newsletter_signups FOR SELECT USING (false);
