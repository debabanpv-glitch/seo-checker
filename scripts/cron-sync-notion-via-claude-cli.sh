#!/bin/bash
# Cron Notion Sync — uses Claude CLI with Notion MCP to pull data into local SQLite
# Schedule: 0 10 * * 1  (every Monday 10:00 Helsinki time)
# Usage: bash scripts/cron-sync-notion-via-claude-cli.sh

cd /Users/puchinpham/Developer/seo-manager-local

PROMPT='Sync tất cả data từ 5 Notion databases vào SQLite local qua POST /api/v1/notion-sync.
Databases:
1. Task Tracker: collection://ec25aebb-422a-4fcf-a51f-a826778fd699 → notion_tasks
2. Content & Onpage: collection://93bf330b-62f2-485b-af8c-714b92333c24 → notion_content
3. Backlink Tracker: collection://e0229e8b-972a-4799-b335-781cb5aa27d7 → notion_backlinks
4. Keyword Research: collection://ebc680c8-0591-4d21-8c40-a2165269b62e → notion_keywords
5. Competitor Analysis: collection://05bc04f4-c5e2-465c-8ea8-e4864de90aef → notion_competitors

Project mapping: SAMCO Tech→samco, Mạng Thành Công→tcnet, Du Lịch Bình Minh→dulichbinhminh.

For each DB: search all entries (page_size 25, max_highlight_length 0), fetch each page properties, map to schema, POST to http://localhost:3000/api/v1/notion-sync with {table, records}. Report totals when done.'

echo "[$(date)] Starting Notion sync via Claude CLI..."
claude --print "$PROMPT" 2>&1 | tail -20
echo "[$(date)] Notion sync completed."
