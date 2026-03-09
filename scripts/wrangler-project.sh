#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_ACCOUNT_ID="e1d8076a3dc603837814ca828736561f"
ENV_FILE="$PROJECT_ROOT/.env.local"
COMMAND="${1:-}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${CLOUDFLARE_ACCOUNT_ID:=$EXPECTED_ACCOUNT_ID}"

if [[ "$CLOUDFLARE_ACCOUNT_ID" != "$EXPECTED_ACCOUNT_ID" ]]; then
  echo "Error: project Cloudflare account mismatch."
  echo "Expected: $EXPECTED_ACCOUNT_ID"
  echo "Found:    $CLOUDFLARE_ACCOUNT_ID"
  exit 1
fi

if [[ "$COMMAND" != "types" && -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  cat <<'EOF'
Error: CLOUDFLARE_API_TOKEN is required for project-local Wrangler commands.
Add it to .env.local or export it in your shell before running this command.
EOF
  exit 1
fi

exec npx wrangler "$@"
