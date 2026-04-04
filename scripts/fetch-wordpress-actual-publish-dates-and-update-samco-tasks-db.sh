#!/usr/bin/env bash
# Fix Samco publish dates by fetching actual dates from WordPress REST API
# Strategy: search by slug words, match by URL, update DB

set -euo pipefail

DB="/Users/puchinpham/Developer/seo-manager-local/data/seo-manager.db"
WP_BASE="https://samcotech.com.vn/wp-json/wp/v2"
WP_USER="duc"
WP_PASS="OUbn TsMp GyKU 58Vv hYhh HEIx"
PROJECT_ID="930d428d-7b6f-4a0f-bd1c-473348e792a5"

UPDATED=0
SKIPPED=0
NOT_FOUND=0

echo "=== Samco WP Publish Date Fixer ==="
echo "DB: $DB"
echo ""

# Fetch all 20 tasks with wrong publish dates
while IFS='|' read -r task_id title link_publish; do
  # Skip empty URLs
  if [[ -z "$link_publish" ]]; then
    echo "SKIP [$title] — no link_publish"
    ((SKIPPED++))
    continue
  fi

  # Extract slug from URL
  # e.g. https://samcotech.com.vn/cach-thay-ribbon-may-in-nhan/ -> cach-thay-ribbon-may-in-nhan
  slug=$(echo "$link_publish" | sed 's|/$||' | sed 's|.*/||')

  if [[ -z "$slug" ]]; then
    echo "SKIP [$title] — cannot extract slug from $link_publish"
    ((SKIPPED++))
    continue
  fi

  # Convert slug hyphens to spaces for search query
  search_query=$(echo "$slug" | tr '-' ' ')

  echo "Processing: $title"
  echo "  URL: $link_publish"
  echo "  Slug: $slug"
  echo "  Search: $search_query"

  # Query WP API — search by words, get top 5 results
  response=$(curl -s --max-time 15 \
    -u "$WP_USER:$WP_PASS" \
    "${WP_BASE}/posts?search=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${search_query}'))")&_fields=date,slug,link&per_page=5" 2>/dev/null || echo "[]")

  # Check if we got valid JSON
  if ! echo "$response" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    echo "  ERROR: Invalid JSON response"
    ((SKIPPED++))
    sleep 0.5
    continue
  fi

  # Find matching post by comparing URLs
  matched_date=$(echo "$response" | python3 -c "
import sys, json, urllib.parse

posts = json.load(sys.stdin)
target = '${link_publish}'.rstrip('/')

for p in posts:
    post_link = p.get('link','').rstrip('/')
    post_slug = p.get('slug','')

    # Match by exact link or by slug
    if post_link == target or post_slug == '${slug}':
        # date format: 2026-03-10T08:30:00 -> 2026-03-10
        d = p['date'][:10]
        print(d)
        sys.exit(0)

print('')
")

  if [[ -n "$matched_date" && "$matched_date" != "2026-03-16" ]]; then
    echo "  MATCH: actual date = $matched_date"
    # Update DB
    sqlite3 "$DB" "UPDATE tasks SET publish_date = '${matched_date}', updated_at = datetime('now') WHERE id = '${task_id}';"
    echo "  UPDATED in DB"
    ((UPDATED++))
  elif [[ -n "$matched_date" && "$matched_date" == "2026-03-16" ]]; then
    echo "  INFO: WP also says 2026-03-16 — keeping as is"
    ((SKIPPED++))
  else
    echo "  NOT FOUND: no matching post in WP search results"
    # Show what we got for debugging
    echo "$response" | python3 -c "
import sys, json
posts = json.load(sys.stdin)
if posts:
    for p in posts[:3]:
        print(f\"    candidate: {p.get('slug')} | {p.get('date','')[:10]} | {p.get('link','')}\")
else:
    print('    (empty results)')
" 2>/dev/null || true
    ((NOT_FOUND++))
  fi

  echo ""
  sleep 0.5

done < <(sqlite3 "$DB" "SELECT id, title, link_publish FROM tasks WHERE project_id = '${PROJECT_ID}' AND status_content = '4. Publish' AND publish_date LIKE '2026-03-16%';")

echo "=== Summary ==="
echo "Updated: $UPDATED"
echo "Skipped: $SKIPPED"
echo "Not found: $NOT_FOUND"
