-- Sync live Supabase schema with current app behavior (March 8, 2026)
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure optional metadata columns exist where app can send them
ALTER TABLE IF EXISTS public.order_intents
  ADD COLUMN IF NOT EXISTS source_page text;
ALTER TABLE IF EXISTS public.order_intents
  ADD COLUMN IF NOT EXISTS consent boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.newsletter_signups
  ADD COLUMN IF NOT EXISTS source_page text;

-- Normalize historic category values to current taxonomy
UPDATE public.products
SET category = 'smartphones'
WHERE lower(category) = 'phones';

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
      AND pg_get_constraintdef(oid) ILIKE '%lower(category)%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (lower(category) IN ('laptops', 'desktops', 'printers', 'smartphones', 'accessories'));

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

COMMIT;
