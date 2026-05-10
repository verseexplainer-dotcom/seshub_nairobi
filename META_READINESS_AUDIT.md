# SES ICT HUB Meta Readiness Audit

Date: 2026-05-10

## What Exists

- Public pages: home, shop, search, cart, product, category, blog, contact, FAQ, track order, auth, account, and admin pages exist under `src/pages`.
- API routes: checkout WhatsApp handoff, newsletter signup, search suggestions, Supabase auth, account profile, admin order/user actions, and a disabled browser analytics endpoint exist under `src/pages/api`.
- Auth system: Supabase email/password authentication is implemented with `/api/auth/callback`, account pages, admin gates, role checks, and session-aware middleware.
- Environment handling: Supabase, Turnstile, fallback image, and Cloudflare deployment variables are documented in `.env.example`; runtime server code reads Cloudflare Worker bindings without exposing service-role keys.
- SEO/meta setup: shared `Layout.astro` provides canonical URLs, descriptions, Open Graph, Twitter cards, and product pages provide Product and Breadcrumb JSON-LD.
- Footer/legal links: footer includes shop, support, contact, FAQ, track order, cart, and sign-in links. Legal links were missing before this readiness pass.
- Analytics/tracking: browser `/api/events` writes are intentionally disabled. Server-side analytics records newsletter signup intent and WhatsApp checkout redirects to Supabase.
- Chat/contact buttons: WhatsApp links exist across header, footer, contact, homepage, product, checkout, blog, and admin order follow-up surfaces.
- Product schema: catalog products include id, slug, title, category, brand, price, condition, warranty, stock, SKU, images, specs, SEO title, and meta description. Product pages output JSON-LD.
- Account deletion/support flow: contact support exists, but there was no dedicated data deletion page or deletion API endpoint before this pass.

## Missing Before Implementation

- Privacy policy, terms, and data deletion pages.
- Machine-readable data deletion endpoint for Meta app review.
- Meta Pixel loading and chat Lead tracking.
- Conversions API server utility and checkout Lead event.
- Meta webhook verification endpoint for Messenger/Instagram.
- Messenger reusable button and floating chat UI.
- Meta-specific environment documentation.
- Meta dashboard setup guide, webhook plan, and rollout checklist.
- Facebook Login readiness documentation for Supabase OAuth configuration.

## Risks

- Meta dashboard setup still requires manual values: app ID, app secret, Pixel ID, CAPI token, page access token, webhook verify token, and WhatsApp token.
- Messenger links require a real Facebook Page username or ID; the code currently falls back to `/contact` until configured.
- Webhook POST is readiness-only. It acknowledges payloads but does not yet persist messages or automate replies.
- CAPI events will not send until `META_PIXEL_ID` and `META_CAPI_TOKEN` are configured in Cloudflare.
- Formal legal review has not been performed. The policy pages are practical operational copy, not legal certification.
- Facebook Login through Supabase requires configuration in both Meta and Supabase dashboards.

## Recommendations

- Configure all Meta secrets as Cloudflare Worker secrets, not public variables, except `PUBLIC_META_PIXEL_ID`.
- Add the new policy URLs to the Meta app dashboard before requesting app review.
- Use `https://sesicthub.co.ke/api/meta/webhook` as the Messenger/Instagram webhook callback URL.
- Subscribe only to webhook fields needed for production support workflows.
- Keep webhook processing minimal until there is a defined customer service workflow for message storage, assignment, and replies.
- Add product catalog sync later as a separate implementation using the existing catalog schema and deterministic product presentation utilities.
