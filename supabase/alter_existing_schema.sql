-- SES ICT HUB: ALTER-only migration for existing Supabase projects
-- Purpose: align existing schema to production requirements without dropping tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------
-- PRODUCTS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price_kes INT NOT NULL,
  compare_at_kes INT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  brand TEXT NULL,
  condition TEXT NULL,
  refurb_grade TEXT NULL,
  short_specs TEXT NULL,
  description TEXT NULL,
  warranty_months INT NULL,
  images JSONB NOT NULL DEFAULT '[]',
  featured_home BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_kes INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS refurb_grade TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_specs TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_months INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_home BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.products SET in_stock = TRUE WHERE in_stock IS NULL;
UPDATE public.products SET images = '[]'::jsonb WHERE images IS NULL;
UPDATE public.products SET featured_home = FALSE WHERE featured_home IS NULL;
UPDATE public.products SET created_at = NOW() WHERE created_at IS NULL;

ALTER TABLE public.products ALTER COLUMN in_stock SET DEFAULT TRUE;
ALTER TABLE public.products ALTER COLUMN images SET DEFAULT '[]'::jsonb;
ALTER TABLE public.products ALTER COLUMN featured_home SET DEFAULT false;
ALTER TABLE public.products ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.products ALTER COLUMN in_stock SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN images SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN featured_home SET NOT NULL;

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%category%'
        OR pg_get_constraintdef(oid) ILIKE '%condition%'
        OR pg_get_constraintdef(oid) ILIKE '%refurb_grade%'
        OR pg_get_constraintdef(oid) ILIKE '%warranty_months%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (lower(category) IN ('laptops', 'desktops', 'printers', 'smartphones', 'accessories'));

ALTER TABLE public.products
  ADD CONSTRAINT products_condition_check
  CHECK (condition IS NULL OR condition IN ('brand_new', 'refurbished', 'unknown'));

ALTER TABLE public.products
  ADD CONSTRAINT products_refurb_grade_check
  CHECK (refurb_grade IS NULL OR refurb_grade IN ('grade_a', 'grade_b', 'grade_c'));

ALTER TABLE public.products
  ADD CONSTRAINT products_warranty_months_check
  CHECK (warranty_months IS NULL OR warranty_months IN (3, 6, 12));

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select" ON public.products;
CREATE POLICY "Public Select" ON public.products FOR SELECT USING (true);

-- -------------------------------------------------------------------
-- ORDER_INTENTS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cart JSONB NOT NULL,
  total_kes INT NOT NULL,
  customer_name TEXT,
  phone TEXT,
  location TEXT,
  status TEXT DEFAULT 'new'
);

ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS cart JSONB;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS total_kes INT;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.order_intents;
CREATE POLICY "Public Insert Orders" ON public.order_intents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin Select Orders" ON public.order_intents;
CREATE POLICY "Admin Select Orders" ON public.order_intents FOR SELECT USING (false);

-- -------------------------------------------------------------------
-- TESTIMONIALS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quote TEXT NOT NULL,
  approved BOOLEAN DEFAULT false
);

ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS persona TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS rating INT;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select Testimonials" ON public.testimonials;
CREATE POLICY "Public Select Testimonials" ON public.testimonials FOR SELECT USING (approved = true);

-- -------------------------------------------------------------------
-- NEWSLETTER_SIGNUPS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  consent BOOLEAN DEFAULT false
);

ALTER TABLE public.newsletter_signups ADD COLUMN IF NOT EXISTS consent BOOLEAN DEFAULT false;

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Newsletter" ON public.newsletter_signups;
CREATE POLICY "Public Insert Newsletter" ON public.newsletter_signups FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin Select Newsletter" ON public.newsletter_signups;
CREATE POLICY "Admin Select Newsletter" ON public.newsletter_signups FOR SELECT USING (false);

COMMIT;
