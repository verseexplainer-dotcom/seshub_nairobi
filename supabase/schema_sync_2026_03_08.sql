-- Sync live Supabase schema with current app behavior (March 8, 2026)
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

-- Ensure optional metadata columns exist where app can send them
ALTER TABLE IF EXISTS public.order_intents
  ADD COLUMN IF NOT EXISTS source_page text;
ALTER TABLE IF EXISTS public.order_intents
  ADD COLUMN IF NOT EXISTS consent boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.newsletter_signups
  ADD COLUMN IF NOT EXISTS source_page text;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS image_overrides jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Normalize historic category values to current taxonomy
UPDATE public.products
SET category = 'smartphones'
WHERE lower(category) = 'phones';

UPDATE public.products
SET refurb_grade = 'grade_a'
WHERE lower(category) = 'laptops'
  AND condition = 'refurbished'
  AND refurb_grade IN ('grade_b', 'grade_c');

UPDATE public.products
SET refurb_grade = NULL
WHERE lower(category) = 'laptops'
  AND condition = 'brand_new'
  AND refurb_grade IS NOT NULL;

UPDATE public.products
SET compare_at_kes = NULL
WHERE compare_at_kes IS NOT NULL AND compare_at_kes <= price_kes;

UPDATE public.products
SET stock_qty = 0
WHERE stock_qty IS NOT NULL AND stock_qty < 0;

-- Rebuild products category check constraint
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
        pg_get_constraintdef(oid) ILIKE '%lower(category)%'
        OR pg_get_constraintdef(oid) ILIKE '%condition%'
        OR pg_get_constraintdef(oid) ILIKE '%refurb_grade%'
        OR pg_get_constraintdef(oid) ILIKE '%warranty_months%'
        OR pg_get_constraintdef(oid) ILIKE '%price_kes%'
        OR pg_get_constraintdef(oid) ILIKE '%compare_at_kes%'
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.products
    WHERE lower(category) = 'laptops'
      AND NOT (
        condition IN ('brand_new', 'refurbished')
        AND (
          (condition = 'brand_new' AND refurb_grade IS NULL)
          OR (condition = 'refurbished' AND refurb_grade = 'grade_a')
        )
      )
  ) THEN
    RAISE EXCEPTION 'Laptop condition/grade policy violation found in public.products. Review invalid laptop rows before continuing.';
  END IF;
END
$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_laptop_condition_grade_check
  CHECK (
    lower(category) <> 'laptops'
    OR (
      condition IN ('brand_new', 'refurbished')
      AND (
        (condition = 'brand_new' AND refurb_grade IS NULL)
        OR (condition = 'refurbished' AND refurb_grade = 'grade_a')
      )
    )
  );

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

-- Rebuild events event_type check constraint to include currently emitted app events
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

-- Lock down direct public inserts (writes must go through server API using service role key)
ALTER TABLE IF EXISTS public.order_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.order_intents;
DROP POLICY IF EXISTS "order_intents_anon_insert" ON public.order_intents;
DROP POLICY IF EXISTS "order_intents_public_no_insert" ON public.order_intents;
CREATE POLICY "order_intents_public_no_insert"
  ON public.order_intents FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_anon_insert" ON public.events;
DROP POLICY IF EXISTS "events_public_no_insert" ON public.events;
CREATE POLICY "events_public_no_insert"
  ON public.events FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

ALTER TABLE IF EXISTS public.newsletter_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Newsletter" ON public.newsletter_signups;
DROP POLICY IF EXISTS "newsletter_anon_insert" ON public.newsletter_signups;
DROP POLICY IF EXISTS "newsletter_public_no_insert" ON public.newsletter_signups;
CREATE POLICY "newsletter_public_no_insert"
  ON public.newsletter_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb, int, text, text, text, boolean, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, int, text, text, text, boolean, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.record_order_update(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_update(uuid, uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.backfill_orders_from_order_intents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_orders_from_order_intents() TO service_role;

COMMIT;
