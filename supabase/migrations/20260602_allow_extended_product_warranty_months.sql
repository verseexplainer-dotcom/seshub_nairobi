ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_warranty_months_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_warranty_months_check
  CHECK (warranty_months IS NULL OR warranty_months IN (3, 6, 12, 24, 36));
