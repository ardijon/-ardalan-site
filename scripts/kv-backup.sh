#!/usr/bin/env bash
#
# Dumps the production Cloudflare KV namespace to plain JSON files.
#
#   bash scripts/kv-backup.sh                # -> backups/kv-<UTC timestamp>/
#   bash scripts/kv-backup.sh some/other/dir
#
# WHY THIS EXISTS
# ---------------
# Orders and product edits live only inside Cloudflare KV. If Cloudflare becomes
# unreachable, or the site has to move to another host, that data goes with it.
#
# src/lib/storage.js has a second driver that reads the *same* data from JSON
# files under src/data/, so this script writes the backup in exactly that
# layout: KV key "collection:orders" becomes orders.json. Recovering on a plain
# Node host is then just:
#
#   cp backups/kv-<stamp>/*.json src/data/
#   npm run build && npm start
#
# No code change is needed — with no SITE_KV binding present, storage.js falls
# back to the file driver on its own.
#
# otp:* keys are skipped on purpose: they expire after three minutes and are
# worthless in a backup.

set -u
cd "$(dirname "$0")/.."

# Single source of truth for the namespace id — read it from wrangler.toml rather
# than duplicating it here, so the two can never drift apart.
NS=$(awk '/^\[\[kv_namespaces\]\]/{f=1} f && /^id[[:space:]]*=/{print; exit}' wrangler.toml \
     | sed 's/.*=[[:space:]]*"//; s/".*//')

if [ -z "$NS" ]; then
  echo "❌ شناسهٔ KV در wrangler.toml پیدا نشد (بخش [[kv_namespaces]])."
  exit 1
fi

OUT=${1:-backups/kv-$(date -u +%Y%m%d-%H%M%S)}
mkdir -p "$OUT"

echo "namespace: $NS"
echo "مقصد:     $OUT"
echo

# --remote is explicit: without it wrangler may read the local .wrangler cache
# and silently produce an empty "backup".
list=$(npx wrangler kv key list --namespace-id "$NS" --remote 2>/dev/null | grep -v '^npm notice')
if [ -z "$list" ]; then
  echo "❌ فهرست کلیدها خوانده نشد. آیا با «npx wrangler whoami» لاگین هستید؟"
  exit 1
fi

keys=$(printf '%s' "$list" | node -e '
  let s = ""
  process.stdin.on("data", d => s += d).on("end", () => {
    try { JSON.parse(s).forEach(k => console.log(k.name)) }
    catch { process.exit(1) }
  })')
if [ $? -ne 0 ]; then
  echo "❌ پاسخ wrangler قابل تفسیر نبود."
  exit 1
fi

if [ -z "$keys" ]; then
  echo "ℹ  KV خالی است — چیزی برای پشتیبان‌گیری نیست."
  exit 0
fi

saved=0
failed=0
while IFS= read -r key; do
  [ -z "$key" ] && continue

  case "$key" in
    otp:*)
      echo "⏭  $key (موقتی — رد شد)"
      continue
      ;;
    collection:*)
      # Land in the exact filename the file driver expects.
      file="${key#collection:}.json"
      ;;
    *)
      # Anything else keeps its key as a filename, with ':' and '/' made safe.
      file="_raw/$(printf '%s' "$key" | tr ':/' '__').json"
      mkdir -p "$OUT/_raw"
      ;;
  esac

  value=$(npx wrangler kv key get "$key" --namespace-id "$NS" --remote --text 2>/dev/null \
          | grep -v '^npm notice')

  if [ -z "$value" ]; then
    echo "❌ $key خوانده نشد"
    failed=1
    continue
  fi

  # Validate before writing, so a truncated read never overwrites a good backup,
  # and report how many records landed.
  count=$(printf '%s' "$value" | node -e '
    let s = ""
    process.stdin.on("data", d => s += d).on("end", () => {
      try {
        const v = JSON.parse(s)
        console.log(Array.isArray(v) ? v.length : "1")
      } catch { process.exit(1) }
    })')
  if [ $? -ne 0 ]; then
    echo "❌ $key محتوای JSON معتبری نداشت — نوشته نشد"
    failed=1
    continue
  fi

  printf '%s' "$value" > "$OUT/$file"
  echo "✓ $key → $file ($count رکورد)"
  saved=$((saved + 1))
done <<EOF
$keys
EOF

echo
echo "$saved فایل در $OUT ذخیره شد."
if [ "$failed" -ne 0 ]; then
  echo "⚠  بعضی کلیدها ذخیره نشدند — پیام‌های بالا را ببینید."
  exit 1
fi
echo "بازیابی روی هاست Node:  cp $OUT/*.json src/data/"
