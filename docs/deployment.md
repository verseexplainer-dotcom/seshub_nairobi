# Deployment Guide (Cloudflare Worker Only)

This project deploys only to a Cloudflare Worker using `wrangler deploy`.

## Locked Cloudflare Account

- `account_id`: `e1d8076a3dc603837814ca828736561f`
- Source of truth: `wrangler.jsonc`
- Project wrapper: `scripts/wrangler-project.sh`

## Required Deployment Credential

Set this in `.env`, `.env.local`, or your shell/CI secret store (never commit real value):

```bash
CLOUDFLARE_ACCOUNT_ID=e1d8076a3dc603837814ca828736561f
export CLOUDFLARE_API_TOKEN='<your-token>'
```

Project npm scripts now load `.env` and `.env.local` automatically for Wrangler commands.
`.env.local` takes precedence if both files exist.

## GitHub Actions CI

The current GitHub Actions workflow validates the storefront only. It does not deploy
and does not require real secret values.

`npm run validate` includes `npm run config:check`, a non-mutating repository check
that verifies:

- manual deploy scripts are still wired through `scripts/deploy-worker.sh`
- Astro remains configured for Cloudflare Worker server output
- `wrangler.jsonc` still points at the locked Cloudflare account, Worker output, assets, `SESSION` KV binding, and apex route
- `.env.example` and deployment docs list the expected environment keys

Do not add `npm run env:check` to pull-request CI unless the workflow has access to
protected secrets. Forked pull requests will not receive repository secrets.

## Environment Keys

Current CI config check requires these names to stay documented, but not populated:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_FALLBACK_IMAGE_URL`
- `PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Manual deploy requires:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` unset or exactly `e1d8076a3dc603837814ca828736561f`

Production Worker runtime requires:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_FALLBACK_IMAGE_URL`
- `PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Verify Account Context

```bash
npm run cf:whoami
```

Once your token is present, this should resolve against account `e1d8076a3dc603837814ca828736561f`.

## Other Required Runtime Secrets

Set these in Worker environment variables:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_FALLBACK_IMAGE_URL` (recommended)
- `PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## One Deployment Command

```bash
npm run deploy
```

What it does:

1. `npm run build`
2. `scripts/deploy-worker.sh`
3. Loads project-local Cloudflare env values
4. Deploys via `npx wrangler deploy --config wrangler.jsonc`

The deploy script enforces:

- `CLOUDFLARE_API_TOKEN` must be set
- `CLOUDFLARE_ACCOUNT_ID` must match `e1d8076a3dc603837814ca828736561f`
- `wrangler.jsonc` account id must match `e1d8076a3dc603837814ca828736561f`

## Custom Domain Cutover

The storefront Worker is configured for the apex custom domain:

- `sesicthub.co.ke` -> `ses-hub-superbase-stack-app`

The repo also includes a small redirect Worker for the `www` host:

- `www.sesicthub.co.ke` -> `https://sesicthub.co.ke`

Deploy the redirect Worker with:

```bash
bash scripts/deploy-www-redirect.sh
```

Important:

- Cloudflare will not attach a Worker custom domain while `sesicthub.co.ke` or `www.sesicthub.co.ke` still have existing DNS records.
- Delete or replace those DNS records in Cloudflare first, using a token or dashboard session with DNS edit permissions.
- After the DNS records are cleared or you switch to a DNS-edit token, run:

```bash
bash scripts/attach-apex-domain.sh
bash scripts/deploy-www-redirect.sh
```

## SESSION KV Binding

Astro Cloudflare adapter expects a `SESSION` KV binding for session storage.

This project is now configured with:

- production `SESSION` namespace id: `855da47786b843709e951dcef310b455`
- preview `SESSION` namespace id: `bccf2071bd4b43a183df8c896f240b15`

The binding lives in `wrangler.jsonc`.

## Current Cutover Blocker

As of March 9, 2026, the Worker upload succeeds, but custom-domain cutover still requires a Cloudflare token with DNS edit permission.

The current token can:

- upload Workers
- create KV namespaces
- read zone metadata

The current token cannot:

- list DNS records
- replace existing apex or `www` DNS records during Worker custom-domain attachment
