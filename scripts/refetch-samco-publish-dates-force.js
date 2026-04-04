#!/usr/bin/env node
/**
 * Re-fetch actual publish dates from WordPress REST API for Samco project.
 * Updates ALL tasks with link_publish (regardless of current publish_date).
 *
 * Usage: node scripts/refetch-samco-publish-dates-force.js
 */

const Database = require('better-sqlite3');
const https = require('https');

const DB_PATH = '/Users/puchinpham/Developer/seo-manager-local/data/seo-manager.db';
const PROJECT_ID = '930d428d-7b6f-4a0f-bd1c-473348e792a5';
const WP_BASE = 'https://samcotech.com.vn/wp-json/wp/v2';
const WP_USER = 'duc';
const WP_PASS = 'OUbn TsMp GyKU 58Vv hYhh HEIx';

const AUTH_HEADER = 'Basic ' + Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64');

function extractSlug(url) {
  if (!url) return '';
  const cleaned = url.replace(/\/$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || '';
}

function httpGet(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        Authorization: AUTH_HEADER,
        'User-Agent': 'SEO-Manager-Sync/1.0',
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function fetchPublishDate(slug) {
  if (!slug) return null;

  // Try published posts first
  const publishedUrl = `${WP_BASE}/posts?slug=${encodeURIComponent(slug)}&_fields=date,slug,link,status&per_page=1`;
  const published = await httpGet(publishedUrl);

  if (Array.isArray(published) && published.length > 0) {
    const d = published[0].date;
    return d ? d.substring(0, 10) : null;
  }

  // Try draft posts
  const draftUrl = `${WP_BASE}/posts?slug=${encodeURIComponent(slug)}&status=draft&_fields=date,slug,link,status&per_page=1`;
  const drafts = await httpGet(draftUrl);

  if (Array.isArray(drafts) && drafts.length > 0) {
    const d = drafts[0].date;
    return d ? d.substring(0, 10) : null;
  }

  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('======================================');
  console.log('Samco WP Publish Date Re-Sync (Force)');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('======================================\n');

  const db = new Database(DB_PATH);

  const tasks = db.prepare(`
    SELECT id, title, link_publish, publish_date
    FROM tasks
    WHERE project_id = ?
      AND status_content = '4. Publish'
      AND link_publish IS NOT NULL
      AND length(link_publish) > 5
    ORDER BY publish_date DESC
  `).all(PROJECT_ID);

  console.log(`Total tasks to process: ${tasks.length}\n`);

  const updateStmt = db.prepare(
    `UPDATE tasks SET publish_date = ?, updated_at = datetime('now') WHERE id = ?`
  );

  let updated = 0;
  let unchanged = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const slug = extractSlug(task.link_publish);
    const prefix = `[${i + 1}/${tasks.length}]`;

    if (!slug) {
      console.log(`${prefix} SKIP    — no slug | ${task.link_publish}`);
      errors++;
      continue;
    }

    try {
      const wpDate = await fetchPublishDate(slug);

      if (!wpDate) {
        console.log(`${prefix} NOT_FOUND — slug=${slug}`);
        notFound++;
      } else if (wpDate === task.publish_date) {
        console.log(`${prefix} SAME    — ${wpDate} | ${slug}`);
        unchanged++;
      } else {
        updateStmt.run(wpDate, task.id);
        console.log(`${prefix} UPDATED — ${task.publish_date || 'NULL'} → ${wpDate} | ${slug}`);
        updated++;
      }
    } catch (err) {
      console.log(`${prefix} ERROR   — slug=${slug} | ${err.message}`);
      errors++;
    }

    await delay(500);
  }

  db.close();

  console.log('\n======================================');
  console.log('Summary:');
  console.log(`  Updated:   ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`  Errors:    ${errors}`);
  console.log(`  Total:     ${tasks.length}`);
  console.log(`Done: ${new Date().toISOString()}`);
  console.log('======================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
