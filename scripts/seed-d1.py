#!/usr/bin/env python3
"""Seed D1 tag cache from OpenNext manifest SQL file."""
import json
import sys
import urllib.request

ACCOUNT_ID = "107ef8906a1a5180c0c405891c3320e0"
DB_ID = "afeda141-fcde-40d7-9ee5-1a120e9f12bc"
OAUTH_TOKEN = "cfoat_BNuCzAO03tfWpjHoBRc_mgTMSLTEwCrdjNT9BkqYvDE.V4q6Jz6Bq4iYZeP_zFkx1zid5Rr4bpoodavpUNyhezw"

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

# Read the SQL file and extract INSERT statements
with open(".open-next/cloudflare/cache-assets-manifest.sql", "r", encoding="utf-8") as f:
    content = f.read()

# Replace INSERT INTO with INSERT OR REPLACE INTO for idempotency
content = content.replace("INSERT INTO", "INSERT OR REPLACE INTO")

payload = json.dumps({"sql": content}).encode("utf-8")

req = urllib.request.Request(url, data=payload, method="POST")
req.add_header("Authorization", f"Bearer {OAUTH_TOKEN}")
req.add_header("Content-Type", "application/json")

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
        if result.get("success"):
            print("D1 seed completed successfully!")
            for r in result.get("result", []):
                if r.get("changes"):
                    print(f"  Changes: {r['changes']}, Rows written: {r.get('rows_written', 0)}")
        else:
            print("Errors:", json.dumps(result.get("errors", []), indent=2))
            sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
