#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_ACCOUNT_ID="e1d8076a3dc603837814ca828736561f"
ZONE_ID="d905df60d03c0c18c3254ec85d2a0590"
SCRIPT_NAME="ses-hub-superbase-stack-app"
HOSTNAME="sesicthub.co.ke"
ENV_FILE="$PROJECT_ROOT/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$EXPECTED_ACCOUNT_ID}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN is required."
  exit 1
fi

if [[ "$CLOUDFLARE_ACCOUNT_ID" != "$EXPECTED_ACCOUNT_ID" ]]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID mismatch."
  exit 1
fi

DOMAIN_RESPONSE="$(
  curl -sS \
    -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/$EXPECTED_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME/domains/records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"override_scope\":true,\"override_existing_origin\":false,\"override_existing_dns_record\":true,\"origins\":[{\"hostname\":\"$HOSTNAME\",\"zone_id\":\"$ZONE_ID\"}]}"
)"

if ! printf '%s' "$DOMAIN_RESPONSE" | rg -q '"success":[[:space:]]*true'; then
  echo "Error: failed to attach $HOSTNAME to $SCRIPT_NAME."
  echo "$DOMAIN_RESPONSE"
  echo "Use a token or dashboard session with DNS edit permission."
  exit 1
fi

echo "$HOSTNAME now points to $SCRIPT_NAME"
