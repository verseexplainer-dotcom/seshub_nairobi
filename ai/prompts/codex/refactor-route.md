# Refactor Route Prompt

Use this when changing an Astro page or API route.

## Prompt

You are working in the SES ICT HUB Astro storefront.

Task:

- Refactor the requested route without changing its public behavior unless asked.
- Keep API routes under `src/pages/api/*`.
- Keep server-only secrets server-side.
- Keep Cloudflare Worker compatibility.

Before editing:

- Read the route file.
- Read helper functions it imports.
- Check tests that cover the route.

Rules:

- Do not move APIs outside Astro routes.
- Do not shift writes to the client.
- Do not weaken auth, staff checks, or RLS assumptions.
- Keep user-visible errors short and helpful.

Verify:

```bash
npm run routes:check
npm run lint
npm run test
npm run build
```

