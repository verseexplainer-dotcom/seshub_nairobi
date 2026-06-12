-- =============================================================
-- SES ICT HUB - RLS policy reference
-- =============================================================
--
-- Canonical schema source: supabase/schema.sql
--
-- This file mirrors the current RLS policy layer so reviewers can
-- inspect access rules separately from table definitions. Do not treat
-- this as a standalone migration unless the matching tables, helper
-- functions, and grants from schema.sql already exist.

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials_public_read" ON public.testimonials;
CREATE POLICY "testimonials_public_read"
  ON public.testimonials FOR SELECT
  TO anon, authenticated
  USING (approved = true);

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
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'customer'
    AND is_active = true
  );

DROP POLICY IF EXISTS "profiles_self_or_admin_update" ON public.profiles;
CREATE POLICY "profiles_self_or_admin_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

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

REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb, int, text, text, text, boolean, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, int, text, text, text, boolean, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.record_order_update(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_update(uuid, uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.backfill_orders_from_order_intents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_orders_from_order_intents() TO service_role;
