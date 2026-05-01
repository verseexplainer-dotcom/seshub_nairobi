# API Map

All project API routes live under `src/pages/api/*`.

## Public API Routes

- `POST /api/checkout/whatsapp` creates a checkout order intent/order and returns WhatsApp handoff details.
- `POST /api/newsletter` records newsletter signup intent through the server route.
- `POST /api/events` is intentionally locked down and does not accept browser analytics writes.
- `GET /api/search/suggest?q=...` returns product search suggestions.

## Auth API Routes

- `GET /api/auth/callback`
- `GET /api/auth/logout`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`
- `POST /api/auth/sign-up`
- `POST /api/auth/update-password`

## Account API Routes

- `POST /api/account/profile`

## Admin API Routes

- `POST /api/admin/orders/[id]/note`
- `POST /api/admin/orders/[id]/status`
- `POST /api/admin/users/[id]/active`
- `POST /api/admin/users/[id]/role`

## Rules

- Keep new API routes under `src/pages/api/*`.
- Validate request bodies before using them.
- Return short human-readable errors where users may see them.
- Keep service-role Supabase operations server-side.

