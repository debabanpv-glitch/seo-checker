#!/bin/bash
# Cron job: sync Google Sheets data + keyword rankings + notify Telegram
# Usage: Add to crontab to run 2x/day
#   0 9,18 * * * /path/to/scripts/cron-sync-sheets-notify-telegram.sh

APP_URL="${APP_URL:-http://localhost:3000}"

# 1. Sync tasks from Google Sheets + Telegram notify
curl -s -X POST "${APP_URL}/api/v1/sync/auto" \
  -H "Content-Type: application/json" \
  > /dev/null 2>&1

# 2. Sync keyword rankings from configured Google Sheets
curl -s -X POST "${APP_URL}/api/v1/keyword-rankings/sync-all" \
  -H "Content-Type: application/json" \
  -d '{}' \
  > /dev/null 2>&1
