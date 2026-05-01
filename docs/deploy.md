# Deploy

This project deploys only as a Cloudflare Worker.

Canonical deployment details also exist in `docs/deployment.md`; keep both files aligned when deployment rules change.

## Required Commands

```bash
npm run build
npm run deploy
```

`npm run deploy` builds the Astro app and runs `scripts/deploy-worker.sh`.

## Required Secrets

Set these in `.env`, `.env.local`, your shell, or CI secret storage:

```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_FALLBACK_IMAGE_URL=
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
CLOUDFLARE_API_TOKEN=
```

Do not commit real secrets.

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

