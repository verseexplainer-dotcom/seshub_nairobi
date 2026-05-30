-- SES ICT HUB Production Schema (Static-first Astro + Supabase)
-- Aligned with current app behavior as of 2026-03-08.
-- Note: `supabase/schema.sql` is the canonical source; keep this file in parity.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        NOT NULL,
  title            text        NOT NULL,
  category         text        NOT NULL CHECK (
    lower(category) IN (
      'laptops',
      'gaming_laptops',
      'desktops',
      'printers',
      'smartphones',
      'accessories',
      'monitors',
      'projectors',
      'tablets',
      'software',
      'ups',
      'networking'
    )
  ),
  price_kes        numeric     NOT NULL CHECK (price_kes > 0),
  compare_at_kes   numeric,
  in_stock         boolean     NOT NULL DEFAULT true,
  stock_qty        numeric     CHECK (stock_qty IS NULL OR stock_qty >= 0),
  brand            text,
  condition        text        CHECK (condition IN ('brand_new', 'refurbished', 'unknown')),
  refurb_grade     text        CHECK (refurb_grade IS NULL OR refurb_grade IN ('grade_a', 'grade_b', 'grade_c')),
  short_specs      text,
  description      text,
  warranty_months  numeric     CHECK (warranty_months IN (3, 6, 12)),
  images           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  featured_home    boolean     NOT NULL DEFAULT false,
  featured_rank    numeric,
  sku              text,
  status           text,
  source_id        text,
  cpu              text,
  ram_gb           numeric,
  storage_gb       numeric,
  storage_type     text,
  screen_in        numeric,
  categories       text[],
  tags             text[],
  collections      text[],
  seo_title        text,
  meta_description text,
  image_overrides  jsonb       NOT NULL DEFAULT '[]'::jsonb
                            CHECK (jsonb_typeof(image_overrides) = 'array'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_compare_price_check
    CHECK (compare_at_kes IS NULL OR compare_at_kes > price_kes),
  CONSTRAINT products_laptop_condition_grade_check
    CHECK (
      lower(category) <> 'laptops'
      OR (
        condition IN ('brand_new', 'refurbished')
        AND (
          (condition = 'brand_new' AND refurb_grade IS NULL)
          OR (condition = 'refurbished' AND refurb_grade = 'grade_a')
        )
      )
    )
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category    ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_price_kes   ON public.products (price_kes);
CREATE INDEX IF NOT EXISTS idx_products_in_stock    ON public.products (in_stock);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON public.products (featured_home, featured_rank);
CREATE INDEX IF NOT EXISTS idx_products_brand       ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_updated_at  ON public.products (updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug_lower ON public.products ((lower(slug)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku_lower
  ON public.products ((lower(sku)))
  WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_source_id
  ON public.products (source_id)
  WHERE source_id IS NOT NULL AND btrim(source_id) <> '';
CREATE INDEX IF NOT EXISTS idx_products_sorting ON public.products (in_stock DESC, featured_rank NULLS LAST, updated_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. ORDER_INTENTS
CREATE TABLE IF NOT EXISTS public.order_intents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  source_page   text,
  cart          jsonb       NOT NULL,
  total_kes     int         NOT NULL CHECK (total_kes > 0),
  customer_name text        NOT NULL,
  phone         text        NOT NULL CHECK (length(phone) >= 9),
  location      text,
  consent       boolean     NOT NULL DEFAULT false,
  status        text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed'))
);

ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_intents_anon_insert" ON public.order_intents;
DROP POLICY IF EXISTS "order_intents_public_no_insert" ON public.order_intents;
CREATE POLICY "order_intents_public_no_insert"
  ON public.order_intents FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "order_intents_anon_deny_select" ON public.order_intents;
CREATE POLICY "order_intents_anon_deny_select"
  ON public.order_intents FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "order_intents_auth_deny_select" ON public.order_intents;
CREATE POLICY "order_intents_auth_deny_select"
  ON public.order_intents FOR SELECT
  TO authenticated
  USING (false);

-- 3. EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL CHECK (event_type IN (
                            'page_view',
                            'add_to_cart',
                            'remove_from_cart',
                            'checkout_start',
                            'whatsapp_click',
                            'submit_order_intent',
                            'newsletter_signup_intent',
                            'whatsapp_checkout_redirect'
                          )),
  payload     jsonb       DEFAULT '{}'::jsonb,
  session_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_anon_insert" ON public.events;
DROP POLICY IF EXISTS "events_public_no_insert" ON public.events;
CREATE POLICY "events_public_no_insert"
  ON public.events FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "events_anon_deny_select" ON public.events;
CREATE POLICY "events_anon_deny_select"
  ON public.events FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "events_auth_deny_select" ON public.events;
CREATE POLICY "events_auth_deny_select"
  ON public.events FOR SELECT
  TO authenticated
  USING (false);

-- 4. TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  persona     text        NOT NULL,
  rating      int         DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  quote       text        NOT NULL,
  approved    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_public_read" ON public.testimonials;
CREATE POLICY "testimonials_public_read"
  ON public.testimonials FOR SELECT
  TO anon, authenticated
  USING (approved = true);

-- 5. NEWSLETTER_SIGNUPS
CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        UNIQUE NOT NULL,
  consent     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  source_page text
);

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_anon_insert" ON public.newsletter_signups;
DROP POLICY IF EXISTS "newsletter_public_no_insert" ON public.newsletter_signups;
CREATE POLICY "newsletter_public_no_insert"
  ON public.newsletter_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "newsletter_anon_deny_select" ON public.newsletter_signups;
CREATE POLICY "newsletter_anon_deny_select"
  ON public.newsletter_signups FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "newsletter_auth_deny_select" ON public.newsletter_signups;
CREATE POLICY "newsletter_auth_deny_select"
  ON public.newsletter_signups FOR SELECT
  TO authenticated
  USING (false);
