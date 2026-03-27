---
name: sentry
description: Project-specific companion guidance for the official Sentry skill when adding or using production error monitoring in the SES ICT HUB Astro plus Cloudflare storefront. Use when releases need error visibility across product, category, auth, checkout, newsletter, search, or admin paths.
---

# Sentry

Use this skill as the storefront-specific overlay on top of the official `sentry` skill.

## Workflow

1. Confirm the runtime shape first: Astro server output on Cloudflare Worker with Supabase-backed APIs.
2. Ask before adding the Sentry SDK, environment variables, or deployment-time release tooling if those are not already approved.
3. Instrument the highest-value server paths first:
   - auth routes
   - checkout and lead capture routes
   - search routes
   - admin APIs
4. Treat browser-side instrumentation as secondary to server and API visibility.
5. Pair monitoring work with deployment notes and one deliberate non-production failure test.

## What good looks like

- Errors are grouped by route or feature area.
- Releases are tied to deploys so regressions are easier to trace.
- Environment tags separate local, preview, and production.
- Sensitive headers, tokens, and personal data are filtered.
- Post-deploy triage has a short repeatable checklist.

## Guardrails

- Keep the integration lightweight and compatible with Cloudflare Worker deployment.
- Do not ship monitoring that leaks secrets, auth tokens, or service-role values.
- Explain the difference between capture, alerting, and triage so the repo owner can maintain it.

## Reference

- Read `references/release-observability-checklist.md` for the release-time checklist.
