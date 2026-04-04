#!/usr/bin/env bash
# Fetch actual publish dates from WordPress REST API
# Updates tasks.publish_date where link_publish exists but publish_date is empty

set -euo pipefail

DB="/Users/puchinpham/Developer/seo-manager-local/data/seo-manager.db"

# WordPress credentials
SAMCO_ID="930d428d"
SAMCO_URL="https://samcotech.com.vn"
SAMCO_USER="duc"
SAMCO_PASS="OUbn TsMp GyKU 58Vv hYhh HEIx"

TCNET_ID="fc9fa363"
TCNET_URL="https://mangthanhcong.vn"
TCNET_USER="API"
TCNET_PASS="FGi4ZYCmsrbNBS2tfMCB2RxS"

# Helper: extract slug from URL
# e.g. https://samcotech.com.vn/may-in-nhan-cam-tay/ -> may-in-nhan-cam-tay
extract_slug() {
  local url="$1"
  # Remove trailing slash, then grab last path segment
  echo "$url" | sed 's|/$||' | awk -F'/' '{print $NF}'
}

# Helper: fetch publish date from WP REST API
# Returns YYYY-MM-DD or empty string
fetch_wp_date() {
  local base_url="$1"
  local auth="$2"
  local slug="$3"

  if [ -z "$slug" ]; then
    echo ""
    return
  fi

  local response
  response=$(curl -s --max-time 10 \
    -H "Authorization: Basic $auth" \
    "${base_url}/wp-json/wp/v2/posts?slug=${slug}&_fields=date&per_page=1" 2>/dev/null || echo "")

  if [ -z "$response" ] || [ "$response" = "[]" ]; then
    echo ""
    return
  fi

  # Extract date field: "date":"2024-10-15T08:30:00"
  local date_str
  date_str=$(echo "$response" | grep -oP '"date":"\K[^"]+' | head -1 || echo "")

  if [ -z "$date_str" ]; then
    echo ""
    return
  fi

  # Return just YYYY-MM-DD
  echo "${date_str:0:10}"
}

# Process one project
process_project() {
  local project_id="$1"
  local project_name="$2"
  local base_url="$3"
  local auth="$4"

  echo ""
  echo "=== Project: $project_name ($project_id) ==="

  # Query tasks with link_publish but no publish_date
  local tasks_file
  tasks_file=$(mktemp)

  sqlite3 "$DB" -separator "|" << SQLEOF > "$tasks_file"
SELECT id, link_publish
FROM tasks
WHERE project_id = '$project_id'
AND publish_date IS NULL
AND length(link_publish) > 5;
SQLEOF

  local total
  total=$(wc -l < "$tasks_file" | tr -d ' ')
  echo "Tasks to process: $total"

  if [ "$total" -eq 0 ]; then
    echo "Nothing to update."
    rm -f "$tasks_file"
    return
  fi

  local updated=0
  local not_found=0
  local errors=0

  while IFS='|' read -r task_id link_publish; do
    if [ -z "$task_id" ] || [ -z "$link_publish" ]; then
      continue
    fi

    local slug
    slug=$(extract_slug "$link_publish")

    if [ -z "$slug" ]; then
      echo "  [SKIP] No slug from: $link_publish"
      ((errors++)) || true
      continue
    fi

    local pub_date
    pub_date=$(fetch_wp_date "$base_url" "$auth" "$slug")

    if [ -z "$pub_date" ]; then
      echo "  [NOT FOUND] slug=$slug | url=$link_publish"
      ((not_found++)) || true
    else
      # Update publish_date in DB
      sqlite3 "$DB" << SQLEOF2
UPDATE tasks
SET publish_date = '$pub_date',
    updated_at = datetime('now')
WHERE id = '$task_id';
SQLEOF2
      echo "  [UPDATED] slug=$slug -> $pub_date"
      ((updated++)) || true
    fi

    # Small delay to avoid rate limiting
    sleep 0.3

  done < "$tasks_file"

  rm -f "$tasks_file"

  echo ""
  echo "Summary for $project_name:"
  echo "  Updated:   $updated"
  echo "  Not found: $not_found"
  echo "  Errors:    $errors"
}

# Main execution
echo "======================================"
echo "WordPress Publish Date Sync"
echo "Started: $(date)"
echo "======================================"

# Encode credentials to base64
SAMCO_AUTH=$(printf "%s:%s" "$SAMCO_USER" "$SAMCO_PASS" | base64)
TCNET_AUTH=$(printf "%s:%s" "$TCNET_USER" "$TCNET_PASS" | base64)

# Process Samco
process_project "$SAMCO_ID" "Samco" "$SAMCO_URL" "$SAMCO_AUTH"

# Process TCNET
process_project "$TCNET_ID" "TCNET" "$TCNET_URL" "$TCNET_AUTH"

echo ""
echo "======================================"
echo "Done: $(date)"
echo "======================================"
