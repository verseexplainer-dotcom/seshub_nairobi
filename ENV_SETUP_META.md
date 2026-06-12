# ENV Setup for Meta Integrations (SES ICT HUB)

Only values prefixed with `PUBLIC_` can be used in browser-rendered markup/scripts. Keep all tokens and secrets private.

## Public Variables

- `PUBLIC_META_PIXEL_ID`
  - Used by `src/layouts/Layout.astro` to load Meta Pixel in the browser.
  - If empty, Pixel does not load.

- `PUBLIC_META_DOMAIN_VERIFICATION`
  - Used by `src/layouts/Layout.astro` as:
  - `<meta name="facebook-domain-verification" ...>`
  - Optional; only needed for Meta domain verification.

- `PUBLIC_MESSENGER_PAGE`
  - Used by `src/lib/storefront.ts` to build Messenger links:
  - `https://m.me/{page}?ref={product_slug}`
  - If empty, Messenger buttons gracefully fall back to `/contact`.

## Private Variables (Server Only)

- `META_PIXEL_ID` (server-side fallback/explicit ID for CAPI)
- `META_CAPI_TOKEN` (Conversions API token)
- `MESSENGER_VERIFY_TOKEN` (webhook verification token)
- `MESSENGER_PAGE_ACCESS_TOKEN` (future outbound Messenger API usage)
- `FACEBOOK_APP_ID` (Facebook OAuth readiness gate)
- `FACEBOOK_APP_SECRET` (OAuth setup + webhook signature validation)
- `WHATSAPP_TOKEN` (WhatsApp Cloud API token)
- `WHATSAPP_PHONE_NUMBER_ID` (WhatsApp Cloud sender ID)
- `WHATSAPP_NOTIFY_TO` (internal destination for order notifications)

## Local `.env.local` Example

```bash
PUBLIC_META_PIXEL_ID=
PUBLIC_META_DOMAIN_VERIFICATION=
PUBLIC_MESSENGER_PAGE=

META_PIXEL_ID=
META_CAPI_TOKEN=
MESSENGER_VERIFY_TOKEN=
MESSENGER_PAGE_ACCESS_TOKEN=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_NOTIFY_TO=
```

## Cloudflare Production Setup

Use Worker secrets for private values:

```bash
npx wrangler secret put META_CAPI_TOKEN
npx wrangler secret put MESSENGER_VERIFY_TOKEN
npx wrangler secret put MESSENGER_PAGE_ACCESS_TOKEN
npx wrangler secret put FACEBOOK_APP_SECRET
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_NOTIFY_TO
```

Set non-secret values as env vars in `wrangler.jsonc` or dashboard variables:

- `PUBLIC_META_PIXEL_ID`
- `PUBLIC_META_DOMAIN_VERIFICATION`
- `PUBLIC_MESSENGER_PAGE`
- `META_PIXEL_ID` (if you keep pixel ID outside secrets in your convention)
- `FACEBOOK_APP_ID` (non-secret identifier)

## Graceful Failure Behavior (Current Code)

- Missing `PUBLIC_META_PIXEL_ID`: Pixel script is not injected.
- Missing `META_CAPI_TOKEN` or `META_PIXEL_ID`: CAPI calls are skipped.
- Missing `MESSENGER_VERIFY_TOKEN`: webhook verification returns configuration error.
- Missing `FACEBOOK_APP_ID`: `/api/auth/facebook` redirects back with a clear message.
- Missing `PUBLIC_MESSENGER_PAGE`: Messenger button remains functional via `/contact` fallback.
