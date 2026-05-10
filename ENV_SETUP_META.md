# Meta Environment Variables

Only `PUBLIC_META_PIXEL_ID` is browser-visible. All other Meta values must be stored as private Cloudflare Worker secrets or private local `.env.local` values.

## Variables

- `PUBLIC_META_PIXEL_ID`: Browser Pixel ID used by `Layout.astro` to load Meta Pixel and PageView tracking.
- `META_PIXEL_ID`: Server-side Pixel ID used by Conversions API.
- `META_CAPI_TOKEN`: Private Conversions API token.
- `MESSENGER_VERIFY_TOKEN`: Private token used to verify Meta webhook setup.
- `MESSENGER_PAGE_ACCESS_TOKEN`: Private Page access token for future Messenger API replies.
- `FACEBOOK_APP_ID`: Meta app ID for Facebook Login setup and documentation.
- `FACEBOOK_APP_SECRET`: Private Meta app secret for OAuth provider setup.
- `WHATSAPP_TOKEN`: Private WhatsApp Cloud API token for future API-based messaging.

## Local Development

Add optional values to `.env.local`:

```bash
PUBLIC_META_PIXEL_ID=
META_PIXEL_ID=
META_CAPI_TOKEN=
MESSENGER_VERIFY_TOKEN=
MESSENGER_PAGE_ACCESS_TOKEN=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
WHATSAPP_TOKEN=
```

The site builds and runs without these values. Pixel, CAPI, and webhook verification remain inactive until configured.

## Cloudflare Production

Use Cloudflare Worker secrets for private values:

```bash
npx wrangler secret put META_CAPI_TOKEN
npx wrangler secret put MESSENGER_VERIFY_TOKEN
npx wrangler secret put MESSENGER_PAGE_ACCESS_TOKEN
npx wrangler secret put FACEBOOK_APP_SECRET
npx wrangler secret put WHATSAPP_TOKEN
```

Set `PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, and `FACEBOOK_APP_ID` as Worker variables or secrets according to the current deployment convention. Do not expose access tokens in Astro public variables.
