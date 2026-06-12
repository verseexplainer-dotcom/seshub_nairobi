DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
    INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.products'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%lower(category)%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (
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
  );
