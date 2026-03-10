-- Normalize live laptop condition/grade data and enforce the Grade A-only laptop policy.
-- Safe to run on projects already aligned with the March 2026 schema.

BEGIN;

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
    RAISE EXCEPTION 'Laptop condition/grade policy violation found in public.products. Review invalid laptop rows before applying the constraint.';
  END IF;
END
$$;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_laptop_condition_grade_check;

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

COMMIT;
