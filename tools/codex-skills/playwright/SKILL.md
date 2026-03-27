---
name: playwright
description: Project-specific companion guidance for the official Playwright skill when testing the SES ICT HUB Astro storefront. Use when browser-level route checks, shopper-flow validation, auth redirects, cart behavior, or admin-access regression tests are needed.
---

# Playwright

Use this skill as the storefront-specific overlay on top of the official `playwright` skill.

## Workflow

1. Read `AGENTS.md` so the browser checks match the product schema and route requirements.
2. Check `package.json` and the repo tree before adding Playwright files. Ask before adding the Playwright dependency or CI wiring because this repo treats new major dependencies as approval-required.
3. Keep browser tests separate from the current `tsx --test` suite in `tests/*.test.ts`.
4. Prefer short smoke flows first, then grow coverage only after selectors and data are stable.
5. Run the browser suite against a local dev server before proposing CI changes.

## Minimum route coverage

- `/`
- `/shop`
- `/category/laptops`
- one valid `/product/[slug]`
- `/cart`
- `/auth/login`
- `/account` redirect behavior when signed out
- `/admin` redirect or forbidden behavior for non-staff access

## Test design rules

- Prefer role, label, and visible-text selectors over brittle CSS selectors.
- Use stable seeded data or a known slug. Do not depend on a random live product being present.
- Capture screenshots for homepage, category, and product regressions when UI changed.
- Keep end-to-end assertions focused on real buyer outcomes: search, category browse, add-to-cart state, login redirect, admin protection.

## Local execution

- Prefer `npm run dev -- --host 127.0.0.1 --port 4321` for local browser checks.
- Store browser tests under `tests/storefront/` or `tests/e2e/` if the suite is added.
- Run a narrow spec or route group first while iterating.

## Reference

- Read `references/route-matrix.md` for the preferred route and assertion matrix.
