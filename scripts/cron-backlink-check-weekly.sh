#!/bin/bash
# Cron job: check backlink status weekly + notify Telegram
# Usage: Add to crontab to run every Monday at 10:00
#   0 10 * * 1 /path/to/scripts/cron-backlink-check-weekly.sh

APP_URL="${APP_URL:-http://localhost:3000}"

# 1. Run backlink status check (concurrency=3, ~500ms delay between batches)
CHECK_RESULT=$(curl -s -X POST "${APP_URL}/api/v1/backlinks/check" \
  -H "Content-Type: application/json" \
  -d '{"concurrency": 3}')

# 2. Parse results
TOTAL=$(echo "$CHECK_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total',0))" 2>/dev/null || echo "0")
ALIVE=$(echo "$CHECK_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('alive',0))" 2>/dev/null || echo "0")
DEAD=$(echo "$CHECK_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dead',0))" 2>/dev/null || echo "0")
ERRORS=$(echo "$CHECK_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',0))" 2>/dev/null || echo "0")

# 3. Get detailed summary (anchor missing etc.)
SUMMARY=$(curl -s "${APP_URL}/api/v1/backlinks/check")
ANCHOR_MISSING=$(echo "$SUMMARY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('anchorMissing',0))" 2>/dev/null || echo "0")

# 4. Notify Telegram
MSG="🔗 Backlink Check Weekly
━━━━━━━━━━━━━━━━━
📊 ${TOTAL} unique URLs checked
✅ ${ALIVE} sống
❌ ${DEAD} chết
⚠️ ${ERRORS} lỗi"

if [ "$ANCHOR_MISSING" -gt 0 ]; then
  MSG="${MSG}
🔍 ${ANCHOR_MISSING} mất anchor text"
fi

if [ "$DEAD" -gt 0 ]; then
  MSG="${MSG}

⚡ Có ${DEAD} link chết - kiểm tra tại /backlinks"
fi

# Send via app's Telegram endpoint
curl -s -X POST "${APP_URL}/api/v1/reports/telegram" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"${MSG}\"}" \
  > /dev/null 2>&1

echo "[$(date)] Backlink check done: ${ALIVE} alive, ${DEAD} dead, ${ERRORS} errors / ${TOTAL} URLs"
