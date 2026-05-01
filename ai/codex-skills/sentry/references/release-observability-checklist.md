# Release Observability Checklist

Use this checklist when adding or refining Sentry coverage for this storefront.

## Instrument first

- Auth routes
- Checkout or WhatsApp checkout route
- Newsletter and events routes
- Search routes
- Admin APIs

These are the fastest paths to actionable production errors.

## Release expectations

- Tag events with environment and release values.
- Keep local, preview, and production separated.
- Filter secrets, tokens, and personal data before sending events.
- Verify source maps or release metadata only if the deployment flow supports them cleanly.

## Post-deploy loop

- Trigger one deliberate non-production error after setup.
- Confirm the error arrives with useful route and environment context.
- Check that repeated failures group together sensibly.
- Document the minimum triage steps in the deploy notes or README if the flow changes.

## Pairing

- Use this alongside `cloudflare-deploy` when deployment or Wrangler behavior changes.
- Use this after frontend or API releases when the change surface is large enough to justify monitoring attention.
