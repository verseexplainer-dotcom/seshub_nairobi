# SES ICT HUB Meta Readiness Audit

Date: 2026-05-15  
Project: Astro storefront + Cloudflare Worker + Supabase

## Scope Checked

1. Public pages and legal routes
2. API route structure and webhook readiness
3. Auth system and callback URLs
4. Environment variable handling and secret boundaries
5. SEO/Open Graph/canonical setup
6. Footer/legal/contact/chat surfaces
7. Tracking stack (Pixel/CAPI/server analytics)
8. Product schema readiness for future catalog sync
9. Account deletion and support flow

## What Exists

### 1) Public Pages

- Storefront/content pages: `/`, `/shop`, `/search`, `/cart`, `/contact`, `/track`, `/faq`, `/blog`, `/blog/[slug]`, `/category/[slug]`, `/product/[slug]`
- Auth/account pages: `/auth/login`, `/auth/sign-up`, `/auth/reset-password`, `/account/*`
- Admin pages: `/admin/*`
- Legal/compliance pages: `/privacy-policy`, `/terms`, `/data-deletion`

### 2) API Routes

- Auth: `/api/auth/login`, `/api/auth/sign-up`, `/api/auth/logout`, `/api/auth/reset-password`, `/api/auth/update-password`, `/api/auth/callback`, `/api/auth/facebook`
- Commerce/support: `/api/checkout/whatsapp`, `/api/newsletter`, `/api/search/suggest`, `/api/account/profile`
- Meta/data deletion: `/api/meta/webhook`, `/api/data-deletion`
- Admin operations: `/api/admin/orders/*`, `/api/admin/users/*`
- Browser analytics write endpoint intentionally disabled: `/api/events` returns `410`

### 3) Auth System

- Supabase email/password auth is active
- Session and role enforcement in `src/middleware.ts` (customer vs staff/admin)
- Secure redirect guards via `getSafeRedirectPath`
- Callback flow implemented at `/api/auth/callback`
- Facebook OAuth bootstrap route now available at `/api/auth/facebook` (graceful fallback when not configured)

### 4) Environment Variables and Secret Handling

- Public vs private split exists and is respected:
  - Public: `PUBLIC_*` values only
  - Private: tokens/secrets kept server-side
- Runtime env resolution supports local build env plus Cloudflare Worker runtime bindings
- Meta-related envs present in code and `.env.example`

### 5) SEO/Meta

- `astro.config.mjs` sets `site: https://sesicthub.co.ke`
- Shared layout provides canonical URL, OG, Twitter card metadata
- Product page includes Product + Breadcrumb JSON-LD
- Meta domain verification tag support added via `PUBLIC_META_DOMAIN_VERIFICATION`

### 6) Footer/Legal/Contact

- Footer links include privacy policy, terms, and data deletion
- Dedicated contact page exists
- WhatsApp CTA present broadly; Messenger CTA present through reusable component and floating chat

### 7) Tracking and Analytics

- Pixel script in layout uses `PUBLIC_META_PIXEL_ID` only when configured
- Client-side click hooks emit `Lead` events on contact/chat CTAs
- Server-side Conversions API helper exists and is used on WhatsApp checkout handoff
- Server-side event records stored to Supabase for selected funnels

### 8) Chat and Messaging Readiness

- Reusable components exist:
  - `src/components/WhatsAppButton.astro`
  - `src/components/MessengerButton.astro`
  - `src/components/FloatingChat.astro`
- Messenger deep links follow `https://m.me/{page}?ref={product_slug}` when `PUBLIC_MESSENGER_PAGE` is set
- WhatsApp deep links follow `https://wa.me/{number}?text=...`

### 9) Product Schema (Catalog Sync Readiness)

- Catalog model includes product identity, pricing, stock, condition, specs, media, SEO fields
- Deterministic loaders/normalizers exist in `src/lib/products.ts` and `src/lib/catalog.ts`
- Suitable baseline for later Meta catalog feed/export implementation

## Gaps / Missing Items

1. Cookie consent UI is not implemented (privacy policy mentions cookies/local storage, but no explicit banner/preferences control is present).
2. Messenger webhook processing is currently verification + acknowledgment only (no persistence, routing, or automated reply behavior yet).
3. Instagram messaging handling is not implemented beyond shared Meta webhook readiness.
4. Facebook Login also requires manual Supabase dashboard provider config and Meta dashboard OAuth setup; code alone is not sufficient.
5. `MESSENGER_PAGE_ACCESS_TOKEN` is stored for readiness but not yet used for outbound API replies.
6. Future catalog sync is not implemented yet (no feed endpoint/export job currently).

## Risks

1. If Meta secrets are missing or mismatched across Cloudflare and Meta dashboard, webhook verification and/or CAPI events will fail.
2. Enabling Pixel/CAPI without consent policy enforcement may create compliance risk depending on legal interpretation and campaign geography.
3. Messaging workflows (Messenger/Instagram/WhatsApp) currently depend on manual staff handling and do not yet provide structured SLA/state tracking.
4. Data deletion is support-driven (email + endpoint instructions), not self-service account deletion; operational follow-through is required.

## Recommendations

1. Configure all private Meta values as Cloudflare Worker secrets; keep only `PUBLIC_META_PIXEL_ID`, `PUBLIC_META_DOMAIN_VERIFICATION`, and optional `PUBLIC_MESSENGER_PAGE` public.
2. In Meta App settings, set:
   - Privacy Policy URL: `https://sesicthub.co.ke/privacy-policy`
   - Terms URL: `https://sesicthub.co.ke/terms`
   - Data Deletion URL: `https://sesicthub.co.ke/data-deletion`
   - Deletion callback/reference endpoint: `https://sesicthub.co.ke/api/data-deletion`
3. Keep webhook callback at `https://sesicthub.co.ke/api/meta/webhook` and use the same verify token in dashboard and env.
4. Add webhook signature validation secret (`FACEBOOK_APP_SECRET`) in production before enabling subscribed events (now supported in code).
5. Add a dedicated catalog sync phase later (feed endpoint + scheduler + mapping rules) rather than coupling it to this compliance rollout.
6. Add a lightweight cookie notice if required by policy/legal guidance.
