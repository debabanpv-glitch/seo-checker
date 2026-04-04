#!/usr/bin/env node
/**
 * Fetches actual publish dates from WordPress REST API for Samco and TCNET,
 * then updates tasks.publish_date where link_publish exists but publish_date is null/empty.
 *
 * Usage: node scripts/sync-wordpress-publish-dates-to-tasks-table.js
 */

const Database = require('better-sqlite3');
const https = require('https');

const DB_PATH = './data/seo-manager.db';

const PROJECTS = [
  {
    id: '930d428d-7b6f-4a0f-bd1c-473348e792a5',
    name: 'Samco',
    baseUrl: 'https://samcotech.com.vn',
    user: 'duc',
    pass: 'OUbn TsMp GyKU 58Vv hYhh HEIx',
  },
  {
    id: 'fc9fa363-be02-4f04-8d84-58dbfc84f1cb',
    name: 'TCNET',
    baseUrl: 'https://mangthanhcong.vn',
    user: 'API',
    pass: 'FGi4ZYCmsrbNBS2tfMCB2RxS',
  },
];

// Extract slug from URL: https://domain.com/some-slug/ -> some-slug
function extractSlug(url) {
  if (!url) return '';
  const cleaned = url.replace(/\/$/, ''); // remove trailing slash
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || '';
}

// Fetch publish date from WP REST API using basic auth
function fetchWpPublishDate(baseUrl, authHeader, slug) {
  return new Promise((resolve) => {
    if (!slug) return resolve(null);

    const apiUrl = `${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=date&per_page=1`;
    const url = new URL(apiUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'User-Agent': 'SEO-Manager-Sync/1.0',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!Array.isArray(json) || json.length === 0) return resolve(null);
          const dateStr = json[0].date; // e.g. "2024-10-15T08:30:00"
          if (!dateStr) return resolve(null);
          resolve(dateStr.substring(0, 10)); // YYYY-MM-DD
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// Delay helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processProject(db, project) {
  const { id, name, baseUrl, user, pass } = project;
  const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

  console.log(`\n=== Project: ${name} (${id}) ===`);

  // Query tasks with link_publish but missing publish_date
  const tasks = db
    .prepare(
      `SELECT id, link_publish, title
       FROM tasks
       WHERE project_id = ?
         AND (publish_date IS NULL OR publish_date = '')
         AND link_publish IS NOT NULL
         AND length(link_publish) > 5`
    )
    .all(id);

  console.log(`Tasks to process: ${tasks.length}`);

  if (tasks.length === 0) {
    console.log('Nothing to update.');
    return { updated: 0, notFound: 0, errors: 0 };
  }

  const updateStmt = db.prepare(
    `UPDATE tasks SET publish_date = ?, updated_at = datetime('now') WHERE id = ?`
  );

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const task of tasks) {
    const slug = extractSlug(task.link_publish);

    if (!slug) {
      console.log(`  [SKIP]      id=${task.id} | no slug from: ${task.link_publish}`);
      errors++;
      continue;
    }

    try {
      const pubDate = await fetchWpPublishDate(baseUrl, authHeader, slug);

      if (!pubDate) {
        console.log(`  [NOT FOUND] slug=${slug}`);
        notFound++;
      } else {
        updateStmt.run(pubDate, task.id);
        console.log(`  [UPDATED]   slug=${slug} -> ${pubDate} | "${task.title.substring(0, 50)}"`);
        updated++;
      }
    } catch (err) {
      console.log(`  [ERROR]     slug=${slug} | ${err.message}`);
      errors++;
    }

    // Small delay to avoid rate limiting
    await delay(300);
  }

  console.log(`\nSummary for ${name}:`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`  Errors:    ${errors}`);

  return { updated, notFound, errors };
}

async function main() {
  console.log('======================================');
  console.log('WordPress Publish Date Sync');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('======================================');

  const db = new Database(DB_PATH);

  let totalUpdated = 0;

  for (const project of PROJECTS) {
    const result = await processProject(db, project);
    totalUpdated += result.updated;
  }

  db.close();

  console.log('\n======================================');
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Done: ${new Date().toISOString()}`);
  console.log('======================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
