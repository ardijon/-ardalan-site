#!/usr/bin/env bash
#
# Pushes the Worker's secrets from .env.local to Cloudflare.
#
#   bash scripts/push-secrets.sh
#
# Values are piped straight into wrangler, so nothing is printed to the terminal
# or stored in shell history. Run it again any time a value changes — `secret
# put` overwrites. Secrets take effect immediately; no redeploy needed.

set -u
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "❌ .env.local پیدا نشد. از پوشهٔ اصلی پروژه اجرا کنید."
  exit 1
fi

KEYS="ADMIN_USER ADMIN_PASS ADMIN_SESSION_SECRET ADMIN_TELEGRAM_ID TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID"

failed=0
for key in $KEYS; do
  value=$(grep "^${key}=" .env.local | head -1 | cut -d= -f2- | tr -d '\r\n')
  if [ -z "$value" ]; then
    echo "⚠  $key در .env.local خالی یا موجود نیست — رد شد"
    failed=1
    continue
  fi
  printf '%s' "$value" | npx wrangler secret put "$key" >/dev/null 2>&1 \
    && echo "✓ $key ثبت شد" \
    || { echo "❌ $key ثبت نشد"; failed=1; }
done

echo
if [ "$failed" -eq 0 ]; then
  echo "همه secretها ثبت شدند. بررسی: npx wrangler secret list"
else
  echo "بعضی موارد ثبت نشدند — پیام‌های بالا را ببینید."
  exit 1
fi
