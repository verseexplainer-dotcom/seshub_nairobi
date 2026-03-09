#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_ACCOUNT_ID="e1d8076a3dc603837814ca828736561f"
ZONE_ID="d905df60d03c0c18c3254ec85d2a0590"
SCRIPT_NAME="ses-ict-hub-www-redirect"
WORKER_FILE="$PROJECT_ROOT/workers/www-redirect.js"
ENV_FILE="$PROJECT_ROOT/.env.local"
CANONICAL_ORIGIN="https://sesicthub.co.ke"

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

if [[ ! -f "$WORKER_FILE" ]]; then
  echo "Error: $WORKER_FILE not found."
  exit 1
fi

UPLOAD_RESPONSE="$(
  curl -sS \
    -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/$EXPECTED_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -F 'metadata={"main_module":"www-redirect.js","compatibility_date":"2026-03-09"};type=application/json' \
    -F "www-redirect.js=@$WORKER_FILE;type=application/javascript+module"
)"

if ! printf '%s' "$UPLOAD_RESPONSE" | rg -q '"success":[[:space:]]*true'; then
  echo "Error: failed to deploy $SCRIPT_NAME."
  echo "$UPLOAD_RESPONSE"
  exit 1
fi

DOMAIN_RESPONSE="$(
  curl -sS \
    -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/$EXPECTED_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME/domains/records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"override_scope\":true,\"override_existing_origin\":false,\"override_existing_dns_record\":true,\"origins\":[{\"hostname\":\"www.sesicthub.co.ke\",\"zone_id\":\"$ZONE_ID\"}]}"
)"

if ! printf '%s' "$DOMAIN_RESPONSE" | rg -q '"success":[[:space:]]*true'; then
  echo "Error: failed to attach www.sesicthub.co.ke to $SCRIPT_NAME."
  echo "$DOMAIN_RESPONSE"
  echo "If the hostname already has DNS records, use a token or dashboard session with DNS edit permission."
  exit 1
fi

echo "www.sesicthub.co.ke now redirects to $CANONICAL_ORIGIN"
