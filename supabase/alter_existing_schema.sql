-- SES ICT HUB: ALTER-only migration for existing Supabase projects
-- Purpose: align existing schema to current production requirements without dropping tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------
-- PRODUCTS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        NOT NULL,
  title            text        NOT NULL,
  category         text        NOT NULL,
  price_kes        numeric     NOT NULL,
  compare_at_kes   numeric,
  in_stock         boolean     NOT NULL DEFAULT true,
  stock_qty        numeric,
  brand            text,
  condition        text,
  refurb_grade     text,
  short_specs      text,
  description      text,
  warranty_months  numeric,
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
  image_overrides  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_kes numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_qty numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS refurb_grade text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_specs text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_months numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_home boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_rank numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cpu text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ram_gb numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_gb numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_type text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS screen_in numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS categories text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS collections text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_overrides jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.products SET in_stock = true WHERE in_stock IS NULL;
UPDATE public.products SET images = '[]'::jsonb WHERE images IS NULL;
UPDATE public.products SET featured_home = false WHERE featured_home IS NULL;
UPDATE public.products SET image_overrides = '[]'::jsonb WHERE image_overrides IS NULL;
UPDATE public.products SET price_kes = 1 WHERE price_kes IS NULL OR price_kes <= 0;
UPDATE public.products SET stock_qty = 0 WHERE stock_qty IS NOT NULL AND stock_qty < 0;
UPDATE public.products
SET compare_at_kes = NULL
WHERE compare_at_kes IS NOT NULL AND compare_at_kes <= price_kes;
UPDATE public.products
SET category = lower(category)
WHERE category IS NOT NULL;
UPDATE public.products
SET category = 'smartphones'
WHERE lower(category) = 'phones';
UPDATE public.products
SET created_at = now()
WHERE created_at IS NULL;
UPDATE public.products
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE public.products ALTER COLUMN in_stock SET DEFAULT true;
ALTER TABLE public.products ALTER COLUMN images SET DEFAULT '[]'::jsonb;
ALTER TABLE public.products ALTER COLUMN featured_home SET DEFAULT false;
ALTER TABLE public.products ALTER COLUMN image_overrides SET DEFAULT '[]'::jsonb;
ALTER TABLE public.products ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.products ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN category SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN price_kes SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN in_stock SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN images SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN featured_home SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN image_overrides SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN updated_at SET NOT NULL;

DO $$
DECLARE
  c record;
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
        OR pg_get_constraintdef(oid) ILIKE '%compare_at_kes%'
        OR pg_get_constraintdef(oid) ILIKE '%price_kes%'
        OR pg_get_constraintdef(oid) ILIKE '%stock_qty%'
        OR pg_get_constraintdef(oid) ILIKE '%image_overrides%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (lower(category) IN ('laptops', 'desktops', 'printers', 'smartphones', 'accessories'));

ALTER TABLE public.products
  ADD CONSTRAINT products_price_check
  CHECK (price_kes > 0);

ALTER TABLE public.products
  ADD CONSTRAINT products_compare_price_check
  CHECK (compare_at_kes IS NULL OR compare_at_kes > price_kes);

ALTER TABLE public.products
  ADD CONSTRAINT products_stock_qty_check
  CHECK (stock_qty IS NULL OR stock_qty >= 0);

ALTER TABLE public.products
  ADD CONSTRAINT products_condition_check
  CHECK (condition IS NULL OR condition IN ('brand_new', 'refurbished', 'unknown'));

ALTER TABLE public.products
  ADD CONSTRAINT products_refurb_grade_check
  CHECK (refurb_grade IS NULL OR refurb_grade IN ('grade_a', 'grade_b', 'grade_c'));

ALTER TABLE public.products
  ADD CONSTRAINT products_warranty_months_check
  CHECK (warranty_months IS NULL OR warranty_months IN (3, 6, 12));

ALTER TABLE public.products
  ADD CONSTRAINT products_image_overrides_json_check
  CHECK (jsonb_typeof(image_overrides) = 'array');

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_price_kes ON public.products (price_kes);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured_home, featured_rank);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sorting ON public.products (in_stock DESC, featured_rank NULLS LAST, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug_lower ON public.products ((lower(slug)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku_lower
  ON public.products ((lower(sku)))
  WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_source_id
  ON public.products (source_id)
  WHERE source_id IS NOT NULL AND btrim(source_id) <> '';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------------
-- ORDER_INTENTS
-- -------------------------------------------------------------------
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
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','closed'))
);

ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS source_page text;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS cart jsonb;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS total_kes int;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS consent boolean DEFAULT false;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

UPDATE public.order_intents SET cart = '[]'::jsonb WHERE cart IS NULL;
UPDATE public.order_intents SET total_kes = 1 WHERE total_kes IS NULL OR total_kes <= 0;
UPDATE public.order_intents
SET customer_name = 'Unknown Customer'
WHERE customer_name IS NULL OR btrim(customer_name) = '';
UPDATE public.order_intents
SET phone = '000000000'
WHERE phone IS NULL OR btrim(phone) = '';
UPDATE public.order_intents SET consent = false WHERE consent IS NULL;
UPDATE public.order_intents SET created_at = now() WHERE created_at IS NULL;
UPDATE public.order_intents SET status = 'new' WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public.order_intents ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.order_intents ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.order_intents ALTER COLUMN cart SET NOT NULL;
ALTER TABLE public.order_intents ALTER COLUMN total_kes SET NOT NULL;
ALTER TABLE public.order_intents ALTER COLUMN customer_name SET NOT NULL;
ALTER TABLE public.order_intents ALTER COLUMN phone SET NOT NULL;
ALTER TABLE public.order_intents ALTER COLUMN consent SET DEFAULT false;
ALTER TABLE public.order_intents ALTER COLUMN consent SET NOT NULL;
ALTER TABLE public.order_intents ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE public.order_intents ALTER COLUMN status SET NOT NULL;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.order_intents'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.order_intents DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.order_intents
  ADD CONSTRAINT order_intents_total_check CHECK (total_kes > 0);
ALTER TABLE public.order_intents
  ADD CONSTRAINT order_intents_phone_len_check CHECK (length(phone) >= 9);
ALTER TABLE public.order_intents
  ADD CONSTRAINT order_intents_status_check CHECK (status IN ('new','contacted','closed'));

ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.order_intents;
DROP POLICY IF EXISTS "order_intents_anon_insert" ON public.order_intents;
DROP POLICY IF EXISTS "order_intents_public_no_insert" ON public.order_intents;
CREATE POLICY "order_intents_public_no_insert"
  ON public.order_intents FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS "Admin Select Orders" ON public.order_intents;
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

-- -------------------------------------------------------------------
-- EVENTS
-- -------------------------------------------------------------------
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

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.events SET payload = '{}'::jsonb WHERE payload IS NULL;
UPDATE public.events SET created_at = now() WHERE created_at IS NULL;

ALTER TABLE public.events ALTER COLUMN event_type SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN created_at SET NOT NULL;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (
    event_type IN (
      'page_view',
      'add_to_cart',
      'remove_from_cart',
      'checkout_start',
      'whatsapp_click',
      'submit_order_intent',
      'newsletter_signup_intent',
      'whatsapp_checkout_redirect'
    )
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

-- -------------------------------------------------------------------
-- TESTIMONIALS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  persona     text        NOT NULL,
  rating      int         DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  quote       text        NOT NULL,
  approved    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS persona text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS rating int;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.testimonials SET created_at = now() WHERE created_at IS NULL;
UPDATE public.testimonials SET approved = false WHERE approved IS NULL;
UPDATE public.testimonials SET rating = 5 WHERE rating IS NULL;
UPDATE public.testimonials SET persona = 'Customer' WHERE persona IS NULL OR btrim(persona) = '';

ALTER TABLE public.testimonials ALTER COLUMN approved SET DEFAULT false;
ALTER TABLE public.testimonials ALTER COLUMN approved SET NOT NULL;
ALTER TABLE public.testimonials ALTER COLUMN quote SET NOT NULL;
ALTER TABLE public.testimonials ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.testimonials ALTER COLUMN persona SET NOT NULL;
ALTER TABLE public.testimonials ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.testimonials ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select Testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_public_read" ON public.testimonials;
CREATE POLICY "testimonials_public_read"
  ON public.testimonials FOR SELECT
  TO anon, authenticated
  USING (approved = true);

-- -------------------------------------------------------------------
-- NEWSLETTER_SIGNUPS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  consent     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  source_page text
);

ALTER TABLE public.newsletter_signups ADD COLUMN IF NOT EXISTS consent boolean DEFAULT false;
ALTER TABLE public.newsletter_signups ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.newsletter_signups ADD COLUMN IF NOT EXISTS source_page text;

UPDATE public.newsletter_signups SET consent = false WHERE consent IS NULL;
UPDATE public.newsletter_signups SET created_at = now() WHERE created_at IS NULL;
UPDATE public.newsletter_signups
SET email = concat('unknown+', gen_random_uuid()::text, '@example.invalid')
WHERE email IS NULL OR btrim(email) = '';

ALTER TABLE public.newsletter_signups ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.newsletter_signups ALTER COLUMN consent SET DEFAULT false;
ALTER TABLE public.newsletter_signups ALTER COLUMN consent SET NOT NULL;
ALTER TABLE public.newsletter_signups ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.newsletter_signups ALTER COLUMN created_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_email_lower
  ON public.newsletter_signups ((lower(email)));

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Newsletter" ON public.newsletter_signups;
DROP POLICY IF EXISTS "newsletter_anon_insert" ON public.newsletter_signups;
DROP POLICY IF EXISTS "newsletter_public_no_insert" ON public.newsletter_signups;
CREATE POLICY "newsletter_public_no_insert"
  ON public.newsletter_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS "Admin Select Newsletter" ON public.newsletter_signups;
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

COMMIT;
