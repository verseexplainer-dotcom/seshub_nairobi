# Deploy

This project deploys only as a Cloudflare Worker.

Canonical deployment details also exist in `docs/deployment.md`; keep both files aligned when deployment rules change.

## Required Commands

```bash
npm run build
npm run deploy
```

`npm run deploy` builds the Astro app and runs `scripts/deploy-worker.sh`.

## CI / Config Validation

GitHub Actions runs `npm run validate` on pushes to `main`/`master` and pull requests.
Validation is non-deploying and does not require real secrets in the current workflow.

The validation command includes `npm run config:check`, which verifies that the repo's
Astro, Wrangler, package scripts, `.env.example`, and deployment docs stay aligned.
It checks secret names only; it does not read or require secret values.

`npm run env:check` is available for local or protected CI checks when real runtime
values are present.

## Required Environment Keys

Set these in `.env`, `.env.local`, your shell, or CI secret storage:

```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_FALLBACK_IMAGE_URL=
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
CLOUDFLARE_ACCOUNT_ID=e1d8076a3dc603837814ca828736561f
CLOUDFLARE_API_TOKEN=
```

Do not commit real secrets.

For the current GitHub Actions CI workflow, these keys only need to remain documented
in `.env.example`; secret values are not required unless `npm run env:check` is added
to a protected workflow.

For manual deploys, `CLOUDFLARE_API_TOKEN` is required and `CLOUDFLARE_ACCOUNT_ID`
must be unset or set to `e1d8076a3dc603837814ca828736561f`.

For production runtime, configure the Supabase and Turnstile keys in the Cloudflare
Worker environment so API routes can authenticate users, write trusted records, and
verify checkout/newsletter Turnstile tokens.

## Cloudflare Guardrails

- Use `wrangler.jsonc` as the source of truth for Worker config.
- Keep the locked Cloudflare account id in repo config.
- Use `npm run cf:whoami` to verify the active Cloudflare account before deploy.
- Do not switch this project to Pages or another host without explicit approval.

## Supabase Guardrails

- Keep direct writes behind Astro API routes.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Do not expose service-role credentials to client code.
- RLS must remain enabled.
