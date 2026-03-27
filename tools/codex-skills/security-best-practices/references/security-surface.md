# Security Surface

Use this map to focus security review work on the highest-risk paths in the repo.

## Session and route control

- `src/middleware.ts`
  - Protects `/account`, `/admin`, and `/api/admin`.
- `src/lib/server-auth.ts`
  - Resolves current user, profile, and staff/admin role state.
- `src/lib/auth-utils.ts`
  - Owns redirect helpers and safe redirect handling.

## Privileged server clients

- `src/lib/supabase-admin.ts`
  - Creates the service-role Supabase client. Keep this server-only.
- `src/lib/supabase-server.ts`
  - Handles request-scoped server access and auth session work.

## Public write endpoints

- `src/pages/api/auth/`
- `src/pages/api/checkout/whatsapp.ts`
- `src/pages/api/newsletter.ts`
- `src/pages/api/events.ts`

Check input validation, method enforcement, redirect safety, and error leakage here first.

## Privileged admin surfaces

- `src/pages/api/admin/`
- `src/pages/admin/`

Check staff gating, data exposure, and safe update behavior.

## Review reminders

- Search for `SUPABASE_SERVICE_ROLE_KEY` and confirm every usage is server-only.
- Search for `redirect_to` and `next` parameters and confirm sanitization.
- Add regression tests for any bug that was reachable from a public route or API call.
