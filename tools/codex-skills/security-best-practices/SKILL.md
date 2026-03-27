---
name: security-best-practices
description: Project-specific companion guidance for the official security-best-practices skill when reviewing the SES ICT HUB Astro plus Supabase storefront. Use when auth, admin routes, public write APIs, redirects, or Supabase service-role boundaries need a focused security pass.
---

# Security Best Practices

Use this skill as the storefront-specific overlay on top of the official `security-best-practices` skill.

## Review order

1. Inspect `src/middleware.ts` for route gating and API protection.
2. Inspect `src/lib/server-auth.ts` and `src/lib/auth-utils.ts` for session handling and redirect safety.
3. Inspect `src/lib/supabase-admin.ts` for service-role usage boundaries.
4. Inspect the public write routes:
   - `src/pages/api/auth/`
   - `src/pages/api/checkout/whatsapp.ts`
   - `src/pages/api/newsletter.ts`
   - `src/pages/api/events.ts`
5. Inspect the privileged surfaces:
   - `src/pages/api/admin/`
   - `src/pages/admin/`

## What to look for

- Unsafe redirect parameters or open redirect paths.
- Missing method checks or weak form and query validation.
- Accidental exposure of `SUPABASE_SERVICE_ROLE_KEY` paths to browser code.
- Staff or admin checks that are inconsistent between middleware and route handlers.
- Overly detailed error messages on public endpoints.
- Missing throttling or abuse controls on public write routes.

## Guardrails

- Prefer small hardening changes over framework swaps.
- Ask before adding new security dependencies, changing the schema, or moving auth architecture.
- Document infra-level gaps separately if they require Cloudflare or Supabase dashboard work.
- Keep fixes understandable for a beginner developer. Explain what risk each change reduces.

## Verification

- Run the targeted test files after security changes.
- Add a regression test when a bug was reachable through a route or API handler.
- Re-check signed-out, signed-in customer, and signed-in staff behavior after auth or admin changes.

## Reference

- Read `references/security-surface.md` for the project security map.
