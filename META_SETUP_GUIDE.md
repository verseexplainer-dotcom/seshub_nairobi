# Meta Setup Guide (SES ICT HUB)

This guide maps current code routes and env usage to Meta dashboard setup.

## 1) Create/Configure Meta App

1. Open <https://developers.facebook.com/apps/>.
2. Create (or reuse) the SES ICT HUB app.
3. Set app domain to `sesicthub.co.ke`.
4. Add policy/compliance URLs:
   - Privacy Policy: `https://sesicthub.co.ke/privacy-policy`
   - Terms: `https://sesicthub.co.ke/terms`
   - Data Deletion Instructions: `https://sesicthub.co.ke/data-deletion`
   - Data Deletion Callback/Reference: `https://sesicthub.co.ke/api/data-deletion`

## 2) Facebook Login + Supabase

Code endpoints:

- Start OAuth: `GET /api/auth/facebook?next=/account`
- Callback: `GET /api/auth/callback`

Steps:

1. In Supabase Auth providers, enable Facebook provider.
2. Copy Facebook App ID + App Secret from Meta to Supabase provider settings.
3. In Meta Facebook Login product, add Supabase callback URI exactly as shown by Supabase.
4. Set Worker env:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
5. Validate:
   - `/auth/login` and `/auth/sign-up` should show “Continue with Facebook” when `FACEBOOK_APP_ID` is set.

## 3) Messenger + Instagram Webhooks

Code endpoint:

- Webhook URL: `https://sesicthub.co.ke/api/meta/webhook`
- Verification: `GET` with `hub.*` params
- Events: `POST` with optional signature validation (required when `FACEBOOK_APP_SECRET` is set)

Steps:

1. Add Messenger product to Meta app.
2. Connect SES ICT HUB Facebook Page.
3. Set callback URL to `https://sesicthub.co.ke/api/meta/webhook`.
4. Set verify token to match `MESSENGER_VERIFY_TOKEN`.
5. Subscribe required fields only.
6. If using Instagram messaging, connect Instagram business account to the same Page/app and subscribe relevant Instagram fields.

## 4) Pixel + Conversions API

Code behavior:

- Pixel loads only when `PUBLIC_META_PIXEL_ID` exists.
- Server CAPI checkout Lead events use `META_PIXEL_ID` + `META_CAPI_TOKEN`.

Steps:

1. In Events Manager, create/select Pixel.
2. Set:
   - `PUBLIC_META_PIXEL_ID` (browser)
   - `META_PIXEL_ID` (server)
   - `META_CAPI_TOKEN` (server secret)
3. Test flows:
   - Page load triggers Pixel `PageView`
   - WhatsApp checkout flow triggers server `Lead` event

## 5) Messenger/WhatsApp Deep Link Setup

1. Set `PUBLIC_MESSENGER_PAGE` to page username/ID (for `m.me` links).
2. Keep existing `storefrontDetails.whatsappNumber` and WhatsApp checkout flow.
3. Confirm floating chat/buttons render and open correct targets.

## 6) Domain Verification

If Meta requires domain verification:

1. Place verification token in `PUBLIC_META_DOMAIN_VERIFICATION`.
2. Deploy.
3. Verify domain from Meta dashboard.

## 7) Production Rollout Checklist

1. Deploy to Cloudflare Worker.
2. Confirm all legal pages return HTTP 200.
3. Confirm `/api/data-deletion` returns JSON.
4. Verify webhook in Meta dashboard.
5. Check Pixel in browser only when configured.
6. Run a test checkout and confirm CAPI Lead appears in Events Manager.
7. Confirm Facebook OAuth redirect works end-to-end.
