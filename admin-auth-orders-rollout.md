# Admin/Auth/Orders Rollout

This branch adds:

- Supabase Auth-backed customer login and profile management
- `/account/*` customer order history
- `/admin/*` staff/admin operations
- transactional order creation from the WhatsApp checkout flow
- normalized `orders`, `order_items`, and `order_status_events`

## Supabase Changes To Apply

1. Open the existing project used by this app.
2. In SQL Editor, run [supabase/migration_2026_03_10_admin_auth_orders_v1.sql](/home/paulaflare/Desktop/ses%20superbase%20stack/supabase/migration_2026_03_10_admin_auth_orders_v1.sql).
3. After the migration succeeds, run:

```sql
select public.backfill_orders_from_order_intents();
```

4. Create or identify the first staff login in `auth.users`.
5. Promote that user in `public.profiles`:

```sql
update public.profiles
set role = 'admin'
where user_id = 'YOUR_AUTH_USER_ID';
```

6. Confirm the app environment still has:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Exact Order On Your Side

1. Back up the project or confirm you have a rollback point before changing schema.
2. Run the migration SQL.
3. Verify these new objects now exist:

- `public.profiles`
- `public.orders`
- `public.order_items`
- `public.order_status_events`
- `public.create_checkout_order(...)`
- `public.record_order_update(...)`
- `public.backfill_orders_from_order_intents()`

4. Run the backfill function.
5. Create one real login you can use for admin testing.
6. Promote that login to `admin` in `public.profiles`.
7. Update Auth redirect settings for the environment you will test.
8. Confirm email/password auth is enabled.
9. Confirm the app runtime env vars are present locally or in Cloudflare.
10. Then start smoke testing.

## Supabase Auth Config

Before testing email signup and password reset:

- set the correct site URL for the current environment
- add redirect URLs for local/dev and deployed environments that must return to `/auth/callback`
- confirm email/password sign-in is enabled
- confirm your email provider is configured if confirmation or reset emails should actually send

Examples:

- `http://localhost:4321/auth/callback`
- `https://your-preview-domain/auth/callback`
- `https://your-production-domain/auth/callback`

Recommended minimum:

- `SITE_URL` should match the environment you are actively testing first
- every environment that can receive auth emails should be listed as an allowed redirect URL
- if you want signup to require email confirmation, leave confirm-email on
- if you want faster local testing, you can temporarily disable confirm-email, but test the confirmation path before release

## Smoke Test

### 1. Auth

- Sign up a new customer at `/auth/sign-up`
- Confirm email flow if your project requires confirmation
- Log in at `/auth/login`
- Request reset at `/auth/reset-password`
- Open `/auth/logout` and confirm the session is cleared

### 2. Customer account

- Open `/account`
- Open `/account/profile`, update name/phone/location, save, and reload
- Confirm the saved profile data persists

### 3. Guest checkout

- Add a product to cart
- Checkout while logged out
- Confirm WhatsApp opens with the new `order_number`
- Confirm both `order_intents` and `orders` got rows, with `orders.user_id = null`

### 4. Logged-in checkout

- Log in as a customer
- Add a product to cart and checkout
- Confirm WhatsApp opens
- Confirm `orders.user_id` matches the signed-in user
- Confirm the order appears at `/account/orders`
- Open `/account/orders/[orderNumber]` and confirm items and timeline render

### 5. Admin access

- Log in as the promoted admin
- Open `/admin` and confirm dashboard metrics load
- Open `/admin/orders` and test search and filters
- Open an order detail page and change payment/fulfillment status
- Add an internal note
- Confirm `order_status_events` gets audit rows

### 6. User admin

- Open `/admin/users`
- Change a user role to `staff` and back if needed
- Deactivate and reactivate a user
- Confirm a deactivated user cannot continue normal access

### 7. Leads and catalog

- Open `/admin/leads` and confirm `order_intents`, newsletter rows, and funnel counts show
- Open `/admin/catalog` and confirm stock/featured visibility works

## Notes

- The migration tries to add a unique newsletter email index only when duplicate emails do not already exist.
- Guest order claiming is still out of scope in this version; only signed-in orders are guaranteed to appear in `/account/orders`.
