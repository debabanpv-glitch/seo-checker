#!/bin/bash
# Cron job: sync Google Sheets data + notify Telegram if new data
# Usage: Add to crontab to run 2x/day
#   0 9,18 * * * /path/to/scripts/cron-sync-sheets-notify-telegram.sh

APP_URL="${APP_URL:-http://localhost:3000}"

curl -s -X POST "${APP_URL}/api/v1/sync/auto" \
  -H "Content-Type: application/json" \
  > /dev/null 2>&1
