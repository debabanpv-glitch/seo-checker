#!/bin/bash
# Cron job: poll Telegram bot callback queries every minute
# Usage: * * * * * /path/to/scripts/cron-telegram-poll-callbacks.sh

APP_URL="${APP_URL:-http://localhost:3000}"

curl -s -X POST "${APP_URL}/api/v1/telegram/process-callbacks" \
  -H "Content-Type: application/json" \
  > /dev/null 2>&1
