# Audit Repo Prompt

Use this for a local repository review.

## Prompt

Audit the SES ICT HUB storefront repository from local files only unless external verification is required.

Focus on:

- Runtime guardrails
- API route placement
- Product schema consistency
- Image fallback handling
- Copy tone
- Supabase RLS assumptions
- Cloudflare Worker deployment fit

Commands to consider:

```bash
npm run repo:audit
npm run routes:check
npm run content:check
npm run lint
npm run test
npm run build
```

Report findings first, ordered by severity, with file references.

