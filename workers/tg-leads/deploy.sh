#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
ENV_FILE="$ROOT/.env.cloudflare"
WORKER_URL="https://gos-ses-leads.diatsht.workers.dev"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет файла $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "В .env.cloudflare нет CLOUDFLARE_API_TOKEN" >&2
  exit 1
fi

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  printf '%s' "$TELEGRAM_BOT_TOKEN" | npx --yes wrangler@4.36.0 secret put TELEGRAM_BOT_TOKEN
  if [[ -n "${TELEGRAM_ADMIN_IDS:-}" ]]; then
    printf '%s' "$TELEGRAM_ADMIN_IDS" | npx --yes wrangler@4.36.0 secret put TELEGRAM_ADMIN_IDS
  fi
  if [[ -z "${TELEGRAM_WEBHOOK_SECRET:-}" ]]; then
    TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"
    printf '\nTELEGRAM_WEBHOOK_SECRET=%s\n' "$TELEGRAM_WEBHOOK_SECRET" >> "$ENV_FILE"
  fi
  printf '%s' "$TELEGRAM_WEBHOOK_SECRET" | npx --yes wrangler@4.36.0 secret put TELEGRAM_WEBHOOK_SECRET
fi

npx --yes wrangler@4.36.0 deploy

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    --data-binary @- >/dev/null <<EOF
{"url":"${WORKER_URL}/webhook","secret_token":"${TELEGRAM_WEBHOOK_SECRET}","allowed_updates":["message"]}
EOF
fi

echo "Воркер: ${WORKER_URL}/"
