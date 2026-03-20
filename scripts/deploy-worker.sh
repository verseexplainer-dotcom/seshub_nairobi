#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_ACCOUNT_ID="e1d8076a3dc603837814ca828736561f"
CONFIG_FILE="$PROJECT_ROOT/wrangler.jsonc"
ENV_FILES=(
  "$PROJECT_ROOT/.env"
  "$PROJECT_ROOT/.env.local"
)

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: $CONFIG_FILE not found."
  exit 1
fi

for env_file in "${ENV_FILES[@]}"; do
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
done

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$EXPECTED_ACCOUNT_ID}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  cat <<'EOF'
Error: CLOUDFLARE_API_TOKEN is required for deploy.
Set it in .env, .env.local, or your shell before running deploy:
  export CLOUDFLARE_API_TOKEN='<your-token>'
EOF
  exit 1
fi

if [[ "$CLOUDFLARE_ACCOUNT_ID" != "$EXPECTED_ACCOUNT_ID" ]]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID mismatch for this project."
  echo "Expected: $EXPECTED_ACCOUNT_ID"
  echo "Found:    $CLOUDFLARE_ACCOUNT_ID"
  exit 1
fi

CONFIG_ACCOUNT_ID="$(sed -n 's/.*"account_id":[[:space:]]*"\([^"]*\)".*/\1/p' "$CONFIG_FILE" | head -n1)"
if [[ "$CONFIG_ACCOUNT_ID" != "$EXPECTED_ACCOUNT_ID" ]]; then
  echo "Error: account_id mismatch in $CONFIG_FILE."
  echo "Expected: $EXPECTED_ACCOUNT_ID"
  echo "Found:    ${CONFIG_ACCOUNT_ID:-<empty>}"
  exit 1
fi

exec bash "$PROJECT_ROOT/scripts/wrangler-project.sh" deploy --config "$CONFIG_FILE"
