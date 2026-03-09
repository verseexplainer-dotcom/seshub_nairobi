-- Verify live Supabase schema parity and write-surface hardening (March 9, 2026)
-- Safe to run repeatedly in SQL Editor.

DO $$
DECLARE
  missing_items text[] := ARRAY[]::text[];
  permissive_insert_policies int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'image_overrides'
  ) THEN
    missing_items := array_append(missing_items, 'public.products.image_overrides');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_image_overrides_json_check'
  ) THEN
    missing_items := array_append(missing_items, 'constraint products_image_overrides_json_check');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND indexname = 'uq_products_slug_lower'
  ) THEN
    missing_items := array_append(missing_items, 'index uq_products_slug_lower');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND indexname = 'uq_products_source_id'
  ) THEN
    missing_items := array_append(missing_items, 'index uq_products_source_id');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.products'::regclass
      AND tgname = 'trg_products_updated_at'
      AND NOT tgisinternal
  ) THEN
    missing_items := array_append(missing_items, 'trigger trg_products_updated_at');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND conname = 'events_event_type_check'
  ) THEN
    missing_items := array_append(missing_items, 'constraint events_event_type_check');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_intents'
      AND policyname = 'order_intents_public_no_insert'
  ) THEN
    missing_items := array_append(missing_items, 'policy order_intents_public_no_insert');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'events_public_no_insert'
  ) THEN
    missing_items := array_append(missing_items, 'policy events_public_no_insert');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'newsletter_signups'
      AND policyname = 'newsletter_public_no_insert'
  ) THEN
    missing_items := array_append(missing_items, 'policy newsletter_public_no_insert');
  END IF;

  SELECT COUNT(*)
  INTO permissive_insert_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('order_intents', 'events', 'newsletter_signups')
    AND cmd = 'INSERT'
    AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles))
    AND COALESCE(with_check, '') NOT IN ('false', '(false)');

  IF permissive_insert_policies > 0 THEN
    RAISE EXCEPTION
      'Schema verification failed: found % permissive public INSERT policies on trust tables.',
      permissive_insert_policies;
  END IF;

  IF array_length(missing_items, 1) IS NOT NULL THEN
    RAISE EXCEPTION
      'Schema verification failed. Missing required items: %',
      array_to_string(missing_items, ', ');
  END IF;
END
$$;

SELECT 'OK: schema parity + RLS hardening verification passed.' AS verification_result;
