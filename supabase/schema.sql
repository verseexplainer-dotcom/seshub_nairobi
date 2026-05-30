-- =============================================================
-- SES ICT HUB — Supabase Schema  (admin/auth/orders v1)
-- Run on a fresh project or use the matching migration for existing
-- databases before deploying the new admin/auth/orders feature set.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 0. SHARED HELPERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_value bigint;
BEGIN
  next_value := nextval('public.order_number_seq');
  RETURN format(
    'SES-%s-%s',
    to_char(now(), 'YYYYMMDD'),
    lpad(next_value::text, 5, '0')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'customer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('staff', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() = 'admin';
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. PRODUCTS
-- ─────────────────────────────────────────────────────────────
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
  condition        text        CHECK (condition IN ('brand_new','refurbished','unknown')),
  refurb_grade     text        CHECK (refurb_grade IS NULL OR refurb_grade IN ('grade_a','grade_b','grade_c')),
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

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Indexes
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

-- 2. TESTIMONIALS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 3. LEADS / TRACKING TABLES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_intents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  source_page    text,
  cart           jsonb       NOT NULL,
  total_kes      int         NOT NULL CHECK (total_kes > 0),
  customer_name  text        NOT NULL,
  customer_email text,
  phone          text        NOT NULL CHECK (length(phone) >= 9),
  location       text,
  consent        boolean     NOT NULL DEFAULT false,
  status         text        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new', 'contacted', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_order_intents_created_at ON public.order_intents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_intents_status     ON public.order_intents (status);
CREATE INDEX IF NOT EXISTS idx_order_intents_user_id    ON public.order_intents (user_id);

ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_intents_public_no_insert" ON public.order_intents;
CREATE POLICY "order_intents_public_no_insert"
  ON public.order_intents FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "order_intents_staff_read" ON public.order_intents;
CREATE POLICY "order_intents_staff_read"
  ON public.order_intents FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "order_intents_staff_update" ON public.order_intents;
CREATE POLICY "order_intents_staff_update"
  ON public.order_intents FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

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

CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type       ON public.events (event_type);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_no_insert" ON public.events;
CREATE POLICY "events_public_no_insert"
  ON public.events FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "events_staff_read" ON public.events;
CREATE POLICY "events_staff_read"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        UNIQUE NOT NULL,
  consent     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  source_page text
);

CREATE INDEX IF NOT EXISTS idx_newsletter_created_at ON public.newsletter_signups (created_at DESC);

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_no_insert" ON public.newsletter_signups;
CREATE POLICY "newsletter_public_no_insert"
  ON public.newsletter_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "newsletter_staff_read" ON public.newsletter_signups;
CREATE POLICY "newsletter_staff_read"
  ON public.newsletter_signups FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- ─────────────────────────────────────────────────────────────
-- 4. AUTH PROFILES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id           uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name         text,
  phone             text,
  default_location  text,
  role              text        NOT NULL DEFAULT 'customer'
                                CHECK (role IN ('customer', 'staff', 'admin')),
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_active    ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_updated   ON public.profiles (updated_at DESC);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.role := OLD.role;
  NEW.is_active := OLD.is_active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard ON public.profiles;
CREATE TRIGGER trg_profiles_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_updates();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    default_location
  )
  VALUES (
    NEW.id,
    nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'phone', ''),
    nullif(NEW.raw_user_meta_data ->> 'default_location', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_or_staff_read" ON public.profiles;
CREATE POLICY "profiles_self_or_staff_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_self_or_admin_update" ON public.profiles;
CREATE POLICY "profiles_self_or_admin_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 5. ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text        NOT NULL UNIQUE DEFAULT public.generate_order_number(),
  user_id             uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  order_intent_id     uuid        UNIQUE REFERENCES public.order_intents (id) ON DELETE SET NULL,
  customer_name       text        NOT NULL,
  customer_phone      text        NOT NULL CHECK (length(customer_phone) >= 9),
  customer_email      text,
  customer_location   text,
  subtotal_kes        int         NOT NULL CHECK (subtotal_kes > 0),
  total_kes           int         NOT NULL CHECK (total_kes > 0),
  payment_status      text        NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'refunded')),
  fulfillment_status  text        NOT NULL DEFAULT 'new'
                                  CHECK (fulfillment_status IN ('new', 'contacted', 'processing', 'ready', 'shipped', 'delivered', 'cancelled')),
  source              text        NOT NULL DEFAULT 'whatsapp_checkout',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id            ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at         ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status     ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number       ON public.orders (order_number);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.order_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid        NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id       uuid        REFERENCES public.products (id) ON DELETE SET NULL,
  product_title    text        NOT NULL,
  product_slug     text,
  product_sku      text,
  product_image    text,
  unit_price_kes   int         NOT NULL CHECK (unit_price_kes > 0),
  qty              int         NOT NULL CHECK (qty > 0),
  line_total_kes   int         NOT NULL CHECK (line_total_kes > 0),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid        NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  actor_user_id       uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  event_type          text        NOT NULL
                                   CHECK (event_type IN ('order_created', 'payment_status_updated', 'fulfillment_status_updated', 'note_added', 'backfilled')),
  payment_status      text        NOT NULL
                                   CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'refunded')),
  fulfillment_status  text        NOT NULL
                                   CHECK (fulfillment_status IN ('new', 'contacted', 'processing', 'ready', 'shipped', 'delivered', 'cancelled')),
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id    ON public.order_status_events (order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_created_at  ON public.order_status_events (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_customer_or_staff_read" ON public.orders;
CREATE POLICY "orders_customer_or_staff_read"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;
CREATE POLICY "orders_staff_update"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_items_customer_or_staff_read" ON public.order_items;
CREATE POLICY "order_items_customer_or_staff_read"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    public.is_staff() OR EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_status_events_customer_or_staff_read" ON public.order_status_events;
CREATE POLICY "order_status_events_customer_or_staff_read"
  ON public.order_status_events FOR SELECT
  TO authenticated
  USING (
    public.is_staff() OR EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_status_events.order_id
        AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_status_events_staff_insert" ON public.order_status_events;
CREATE POLICY "order_status_events_staff_insert"
  ON public.order_status_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- ─────────────────────────────────────────────────────────────
-- 6. TRANSACTIONAL ORDER FUNCTIONS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_cart jsonb,
  p_total_kes int,
  p_customer_name text,
  p_phone text,
  p_location text DEFAULT NULL,
  p_consent boolean DEFAULT true,
  p_source_page text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_customer_email text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  order_intent_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_qty int;
  v_product_id uuid;
  v_product_title text;
  v_product_slug text;
  v_product_sku text;
  v_product_image text;
  v_unit_price int;
  v_in_stock boolean;
  v_stock_qty numeric;
  v_subtotal int := 0;
  v_order_id uuid;
  v_order_number text;
  v_order_intent_id uuid;
BEGIN
  IF jsonb_typeof(p_cart) <> 'array' OR jsonb_array_length(p_cart) = 0 THEN
    RAISE EXCEPTION 'Cart is empty or invalid';
  END IF;

  IF p_total_kes IS NULL OR p_total_kes <= 0 THEN
    RAISE EXCEPTION 'Total must be greater than zero';
  END IF;

  IF nullif(trim(p_customer_name), '') IS NULL OR nullif(trim(p_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name and phone are required';
  END IF;

  IF NOT p_consent THEN
    RAISE EXCEPTION 'Consent is required to create an order';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_cart)
  LOOP
    v_qty := greatest(1, coalesce((v_item ->> 'qty')::int, 1));
    v_product_id := NULL;
    v_product_title := NULL;
    v_product_slug := NULL;
    v_product_sku := NULL;
    v_product_image := NULL;
    v_unit_price := NULL;
    v_in_stock := NULL;
    v_stock_qty := NULL;

    SELECT
      p.id,
      p.title,
      p.slug,
      p.sku,
      CASE
        WHEN jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0
          THEN p.images ->> 0
        ELSE NULL
      END,
      round(p.price_kes)::int,
      p.in_stock,
      p.stock_qty
    INTO
      v_product_id,
      v_product_title,
      v_product_slug,
      v_product_sku,
      v_product_image,
      v_unit_price,
      v_in_stock,
      v_stock_qty
    FROM public.products p
    WHERE (
      coalesce(v_item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
      AND p.id = (v_item ->> 'id')::uuid
    )
    OR (
      nullif(v_item ->> 'slug', '') IS NOT NULL
      AND p.slug = v_item ->> 'slug'
    )
    ORDER BY
      CASE
        WHEN coalesce(v_item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
             AND p.id = (v_item ->> 'id')::uuid THEN 0
        ELSE 1
      END
    LIMIT 1;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'A product in the cart is no longer available';
    END IF;

    IF NOT coalesce(v_in_stock, false) THEN
      RAISE EXCEPTION 'Product is out of stock: %', v_product_title;
    END IF;

    IF v_stock_qty IS NOT NULL AND v_stock_qty < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product_title;
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
  END LOOP;

  IF v_subtotal <> p_total_kes THEN
    RAISE EXCEPTION 'Total validation failed. Expected %, received %', v_subtotal, p_total_kes;
  END IF;

  INSERT INTO public.order_intents (
    user_id,
    source_page,
    cart,
    total_kes,
    customer_name,
    customer_email,
    phone,
    location,
    consent,
    status
  )
  VALUES (
    p_user_id,
    p_source_page,
    p_cart,
    v_subtotal,
    trim(p_customer_name),
    nullif(trim(p_customer_email), ''),
    trim(p_phone),
    nullif(trim(p_location), ''),
    p_consent,
    'new'
  )
  RETURNING id INTO v_order_intent_id;

  INSERT INTO public.orders (
    user_id,
    order_intent_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_location,
    subtotal_kes,
    total_kes,
    payment_status,
    fulfillment_status,
    source
  )
  VALUES (
    p_user_id,
    v_order_intent_id,
    trim(p_customer_name),
    trim(p_phone),
    nullif(trim(p_customer_email), ''),
    nullif(trim(p_location), ''),
    v_subtotal,
    v_subtotal,
    'pending',
    'new',
    coalesce(nullif(trim(p_source_page), ''), 'whatsapp_checkout')
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_cart)
  LOOP
    v_qty := greatest(1, coalesce((v_item ->> 'qty')::int, 1));

    SELECT
      p.id,
      p.title,
      p.slug,
      p.sku,
      CASE
        WHEN jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0
          THEN p.images ->> 0
        ELSE NULL
      END,
      round(p.price_kes)::int
    INTO
      v_product_id,
      v_product_title,
      v_product_slug,
      v_product_sku,
      v_product_image,
      v_unit_price
    FROM public.products p
    WHERE (
      coalesce(v_item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
      AND p.id = (v_item ->> 'id')::uuid
    )
    OR (
      nullif(v_item ->> 'slug', '') IS NOT NULL
      AND p.slug = v_item ->> 'slug'
    )
    ORDER BY
      CASE
        WHEN coalesce(v_item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
             AND p.id = (v_item ->> 'id')::uuid THEN 0
        ELSE 1
      END
    LIMIT 1;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_title,
      product_slug,
      product_sku,
      product_image,
      unit_price_kes,
      qty,
      line_total_kes
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_product_title,
      v_product_slug,
      v_product_sku,
      v_product_image,
      v_unit_price,
      v_qty,
      v_unit_price * v_qty
    );
  END LOOP;

  INSERT INTO public.order_status_events (
    order_id,
    actor_user_id,
    event_type,
    payment_status,
    fulfillment_status,
    note
  )
  VALUES (
    v_order_id,
    p_user_id,
    'order_created',
    'pending',
    'new',
    CASE
      WHEN p_user_id IS NULL THEN 'Guest checkout created from the WhatsApp flow.'
      ELSE 'Account-linked checkout created from the storefront.'
    END
  );

  RETURN QUERY
  SELECT v_order_id, v_order_number, v_order_intent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_order_update(
  p_order_id uuid,
  p_actor_user_id uuid DEFAULT NULL,
  p_payment_status text DEFAULT NULL,
  p_fulfillment_status text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%rowtype;
  v_next_payment_status text;
  v_next_fulfillment_status text;
  v_event_type text := 'note_added';
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_next_payment_status := coalesce(nullif(trim(p_payment_status), ''), v_order.payment_status);
  v_next_fulfillment_status := coalesce(nullif(trim(p_fulfillment_status), ''), v_order.fulfillment_status);

  IF v_next_payment_status = v_order.payment_status
     AND v_next_fulfillment_status = v_order.fulfillment_status
     AND nullif(trim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'No changes supplied';
  END IF;

  IF v_next_payment_status <> v_order.payment_status THEN
    v_event_type := 'payment_status_updated';
  END IF;

  IF v_next_fulfillment_status <> v_order.fulfillment_status THEN
    v_event_type := 'fulfillment_status_updated';
  END IF;

  UPDATE public.orders
  SET
    payment_status = v_next_payment_status,
    fulfillment_status = v_next_fulfillment_status,
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.order_status_events (
    order_id,
    actor_user_id,
    event_type,
    payment_status,
    fulfillment_status,
    note
  )
  VALUES (
    p_order_id,
    p_actor_user_id,
    v_event_type,
    v_order.payment_status,
    v_order.fulfillment_status,
    nullif(trim(p_note), '')
  );

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_orders_from_order_intents()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent record;
  v_item jsonb;
  v_order_id uuid;
  v_total int;
  v_mapped_fulfillment text;
  v_product_id uuid;
  v_product_title text;
  v_product_slug text;
  v_product_sku text;
  v_product_image text;
  v_unit_price int;
  v_qty int;
  v_backfilled_count int := 0;
BEGIN
  FOR v_intent IN
    SELECT *
    FROM public.order_intents oi
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.order_intent_id = oi.id
    )
    ORDER BY oi.created_at ASC
  LOOP
    v_total := 0;

    FOR v_item IN
      SELECT value FROM jsonb_array_elements(v_intent.cart)
    LOOP
      v_qty := greatest(1, coalesce((v_item ->> 'qty')::int, 1));
      v_unit_price := greatest(1, coalesce((v_item ->> 'price_kes')::int, 1));
      v_total := v_total + (v_unit_price * v_qty);
    END LOOP;

    v_mapped_fulfillment := CASE v_intent.status
      WHEN 'contacted' THEN 'contacted'
      WHEN 'closed' THEN 'delivered'
      ELSE 'new'
    END;

    INSERT INTO public.orders (
      user_id,
      order_intent_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_location,
      subtotal_kes,
      total_kes,
      payment_status,
      fulfillment_status,
      source,
      created_at,
      updated_at
    )
    VALUES (
      v_intent.user_id,
      v_intent.id,
      v_intent.customer_name,
      v_intent.phone,
      v_intent.customer_email,
      v_intent.location,
      greatest(1, coalesce(v_intent.total_kes, v_total)),
      greatest(1, coalesce(v_intent.total_kes, v_total)),
      'pending',
      v_mapped_fulfillment,
      coalesce(nullif(v_intent.source_page, ''), 'legacy_intent_backfill'),
      v_intent.created_at,
      v_intent.created_at
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN
      SELECT value FROM jsonb_array_elements(v_intent.cart)
    LOOP
      v_qty := greatest(1, coalesce((v_item ->> 'qty')::int, 1));
      v_product_id := NULL;
      v_product_title := nullif(v_item ->> 'title', '');
      v_product_slug := nullif(v_item ->> 'slug', '');
      v_product_sku := NULL;
      v_product_image := nullif(v_item ->> 'image', '');
      v_unit_price := greatest(1, coalesce((v_item ->> 'price_kes')::int, 1));

      SELECT
        p.id,
        p.title,
        p.slug,
        p.sku,
        CASE
          WHEN jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0
            THEN p.images ->> 0
          ELSE NULL
        END,
        round(p.price_kes)::int
      INTO
        v_product_id,
        v_product_title,
        v_product_slug,
        v_product_sku,
        v_product_image,
        v_unit_price
      FROM public.products p
      WHERE (
        coalesce(v_item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
        AND p.id = (v_item ->> 'id')::uuid
      )
      OR (
        nullif(v_item ->> 'slug', '') IS NOT NULL
        AND p.slug = v_item ->> 'slug'
      )
      ORDER BY
        CASE
          WHEN coalesce(v_item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
               AND p.id = (v_item ->> 'id')::uuid THEN 0
          ELSE 1
        END
      LIMIT 1;

      INSERT INTO public.order_items (
        order_id,
        product_id,
        product_title,
        product_slug,
        product_sku,
        product_image,
        unit_price_kes,
        qty,
        line_total_kes,
        created_at
      )
      VALUES (
        v_order_id,
        v_product_id,
        coalesce(v_product_title, 'Legacy item'),
        v_product_slug,
        v_product_sku,
        v_product_image,
        v_unit_price,
        v_qty,
        v_unit_price * v_qty,
        v_intent.created_at
      );
    END LOOP;

    INSERT INTO public.order_status_events (
      order_id,
      actor_user_id,
      event_type,
      payment_status,
      fulfillment_status,
      note,
      created_at
    )
    VALUES (
      v_order_id,
      NULL,
      'backfilled',
      'pending',
      v_mapped_fulfillment,
      'Imported from legacy order_intents.',
      v_intent.created_at
    );

    v_backfilled_count := v_backfilled_count + 1;
  END LOOP;

  RETURN v_backfilled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb, int, text, text, text, boolean, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, int, text, text, text, boolean, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.record_order_update(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_update(uuid, uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.backfill_orders_from_order_intents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_orders_from_order_intents() TO service_role;

-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
