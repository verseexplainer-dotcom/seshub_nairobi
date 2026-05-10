# Messenger and Instagram Webhook Plan

## Current Endpoint

- Callback URL: `https://sesicthub.co.ke/api/meta/webhook`
- Verify route: `GET /api/meta/webhook`
- Event route: `POST /api/meta/webhook`
- Verify token env var: `MESSENGER_VERIFY_TOKEN`

The endpoint verifies Meta setup and acknowledges incoming payloads. It does not yet store messages or send automated replies.

## Required Meta Dashboard Permissions

Request only what is needed for the production support flow:

- Messenger Page messaging permissions for receiving Page messages.
- Instagram messaging permissions only if the Instagram Business account is connected and support will happen there.
- Page access token for future reply sending.

Exact permissions can change in Meta review, so confirm the current permission names in the dashboard at setup time.

## Testing Flow

1. Deploy to Cloudflare.
2. Set `MESSENGER_VERIFY_TOKEN`.
3. In Meta dashboard, set callback URL to `https://sesicthub.co.ke/api/meta/webhook`.
4. Enter the same verify token.
5. Click Verify and Save.
6. Send a test message to the connected Page.
7. Check Cloudflare Worker logs for `meta webhook received`.

## Future Production Processing

When SES ICT HUB is ready to handle messages inside the admin system:

- Validate Meta request signatures before trusting webhook payloads.
- Store message metadata in Supabase with minimal customer data.
- Link messages to orders or products only when a user explicitly provides an order reference or product link.
- Add staff assignment, response status, and retention controls.
- Send replies through Meta Graph API using `MESSENGER_PAGE_ACCESS_TOKEN`.

## Rollout Notes

- Keep the webhook simple until the support workflow is defined.
- Avoid storing full message text unless there is a clear support and retention policy.
- Do not automate replies for pricing, warranty, or stock until the catalog source of truth is confirmed.
