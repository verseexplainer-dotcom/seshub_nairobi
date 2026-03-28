# Copy Lint Rules

These rules define the wording that the copy tools should protect against in `src/`.

## Goal

All frontend copy should sound like a real Nairobi electronics shop.

Keep wording:

- practical
- clear
- human
- direct
- helpful

Avoid wording that sounds:

- AI-generated
- SaaS-style
- process-heavy
- over-polished

## Banned Words

- `flow`
- `journey`
- `optimize`
- `optimise`
- `seamless`
- `shortlist`
- `switch`
- `process`

## Banned Phrases

- `switch to whatsapp`
- `browse on-site`
- `decision-making flow`

## Preferred Rewrites

- `message us on WhatsApp`
- `check availability`
- `if you need help, one of our team will assist you`
- `we can help you confirm before you buy`
- `browse the site and reach out if you need help`

## Review Scope

Review customer-facing text in:

- `src/pages/**/*`
- `src/components/**/*`

If the text sounds like marketing instead of shop support, rewrite it.
