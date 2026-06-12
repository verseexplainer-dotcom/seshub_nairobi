# Messenger / Instagram Webhook Plan

## Current Endpoint Contract

- URL: `https://sesicthub.co.ke/api/meta/webhook`
- `GET`:
  - Validates `hub.mode`, `hub.verify_token`, `hub.challenge`
  - Compares against `MESSENGER_VERIFY_TOKEN`
- `POST`:
  - Enforces payload size limit
  - Parses JSON payload
  - Logs object + entry count
  - Returns `{ ok: true }`

## Security Behavior

1. Verification token check on `GET`.
2. Optional signature validation on `POST`:
   - If `FACEBOOK_APP_SECRET` is configured, endpoint requires `X-Hub-Signature-256`.
   - Signature is validated as HMAC SHA-256 over raw body.
   - Missing or invalid signature is rejected.
3. If `FACEBOOK_APP_SECRET` is not configured, endpoint still accepts `POST` for readiness/testing.

## Required Env

- `MESSENGER_VERIFY_TOKEN` (required for dashboard verify step)
- `FACEBOOK_APP_SECRET` (recommended in production for signature verification)
- `MESSENGER_PAGE_ACCESS_TOKEN` (reserved for future outbound message support)

## Meta Dashboard Setup

1. In app Webhooks product:
   - Callback URL: `https://sesicthub.co.ke/api/meta/webhook`
   - Verify token: same as `MESSENGER_VERIFY_TOKEN`
2. Subscribe Page and/or Instagram fields needed for support workflow.
3. Connect the correct Facebook Page and Instagram Business account.

## Testing Flow

1. Deploy worker with env variables.
2. Verify webhook from Meta dashboard.
3. Send test message to page/IG inbox.
4. Check Cloudflare logs for `meta webhook received`.

## Planned Next Step (Future, Not Implemented Here)

1. Persist minimal webhook event metadata in Supabase.
2. Add idempotency key handling per event/message ID.
3. Introduce admin triage status and assignment.
4. Add outbound replies via Graph API using `MESSENGER_PAGE_ACCESS_TOKEN`.
5. Define retention limits aligned with privacy policy.
