# Meta Setup Guide for SES ICT HUB

## App Setup

1. Create or open the SES ICT HUB Meta app at <https://developers.facebook.com/apps/>.
2. Set the app domain to `sesicthub.co.ke`.
3. Add these URLs:
   - Privacy Policy URL: `https://sesicthub.co.ke/privacy-policy`
   - Terms URL: `https://sesicthub.co.ke/terms`
   - User Data Deletion URL: `https://sesicthub.co.ke/data-deletion`
   - User Data Deletion Callback URL: `https://sesicthub.co.ke/api/data-deletion`
4. Add products as needed:
   - Facebook Login for customer sign-in through Supabase.
   - Messenger for Page messaging.
   - Instagram Graph API or Instagram messaging if the Instagram account is connected to the Page.
   - WhatsApp Business if SES ICT HUB will use the WhatsApp Cloud API.
   - Meta Pixel and Conversions API for measurement.

## Facebook Login

1. In Meta, enable Facebook Login.
2. In Supabase, enable Facebook as an OAuth provider.
3. Use the Supabase callback URL shown in the Supabase dashboard as the OAuth redirect URI in Meta.
4. Keep this site callback available for normal Supabase auth: `https://sesicthub.co.ke/api/auth/callback`.
5. Request only the minimum scopes needed for sign-in, normally public profile and email.

## Messenger and Instagram Messaging

1. Connect the SES ICT HUB Facebook Page to the Meta app.
2. Generate a Page access token and store it as `MESSENGER_PAGE_ACCESS_TOKEN`.
3. Set webhook callback URL to `https://sesicthub.co.ke/api/meta/webhook`.
4. Set verify token to the same private value stored in `MESSENGER_VERIFY_TOKEN`.
5. Subscribe to only the required message events for the Page and Instagram account.
6. Test webhook verification from the Meta dashboard.

## Pixel and Conversions API

1. Create or select the SES ICT HUB Pixel in Events Manager.
2. Store the browser-safe Pixel ID as `PUBLIC_META_PIXEL_ID`.
3. Store the same Pixel ID server-side as `META_PIXEL_ID`.
4. Generate a Conversions API access token and store it as `META_CAPI_TOKEN`.
5. Use Events Manager Test Events to confirm PageView and Lead events.

## Production Rollout Checklist

- Deploy the code to Cloudflare Worker.
- Add the required Worker secrets through Wrangler or the Cloudflare dashboard.
- Confirm `/privacy-policy`, `/terms`, and `/data-deletion` return 200 over HTTPS.
- Confirm `/api/data-deletion` returns JSON over HTTPS.
- Verify `/api/meta/webhook` in the Meta dashboard.
- Confirm Pixel PageView fires only when `PUBLIC_META_PIXEL_ID` is configured.
- Confirm checkout WhatsApp handoff still creates orders.
- Confirm CAPI Lead events appear in Meta Events Manager after `META_CAPI_TOKEN` is configured.
