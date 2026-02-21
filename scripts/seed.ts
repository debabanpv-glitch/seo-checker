/**
 * Seed script — populates SQLite DB with sample data for development.
 * Run: npx tsx scripts/seed.ts
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/lib/db/schema';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH
  ?? path.join(process.cwd(), 'data', 'seo-manager.db');

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

// --- helpers ---
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

async function seed() {
  console.log('Seeding database at', DB_PATH);

  // 1. Projects
  const projectIds = [uuid(), uuid()];
  db.insert(schema.projects).values([
    {
      id: projectIds[0],
      name: 'BDS Ha Noi',
      sheet_id: '1abc_sample_sheet_id',
      sheet_name: 'Content',
      monthly_target: 25,
      ranking_sheet_url: 'https://docs.google.com/spreadsheets/d/1abc_sample',
      created_at: now(),
    },
    {
      id: projectIds[1],
      name: 'Du Lich Viet',
      sheet_id: '2def_sample_sheet_id',
      sheet_name: 'Content',
      monthly_target: 20,
      ranking_sheet_url: '',
      created_at: now(),
    },
  ]).run();
  console.log('  + 2 projects');

  // 2. Members
  const memberNames = ['Nguyen Van A', 'Tran Thi B', 'Le Van C'];
  db.insert(schema.members).values(memberNames.map((name) => ({
    id: uuid(),
    name,
    nickname: name.split(' ').pop() ?? name,
    role: 'Content Writer',
    projects: [projectIds[0]],
    email: `${name.toLowerCase().replace(/ /g, '.')}@example.com`,
    phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
    bank_name: 'Vietcombank',
    bank_account: String(1000000000 + Math.floor(Math.random() * 9000000000)),
    created_at: now(),
  }))).run();
  console.log('  + 3 members');

  // 3. Monthly targets
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  db.insert(schema.monthlyTargets).values(
    projectIds.map((pid) => ({
      id: uuid(),
      project_id: pid,
      month: currentMonth,
      year: currentYear,
      target: pid === projectIds[0] ? 25 : 20,
    }))
  ).run();
  console.log('  + 2 monthly targets');

  // 4. Tasks
  const taskValues = [];
  const pics = memberNames;
  for (let p = 0; p < projectIds.length; p++) {
    for (let i = 0; i < 10; i++) {
      const published = i < 7;
      taskValues.push({
        id: uuid(),
        project_id: projectIds[p],
        stt: i + 1,
        year: currentYear,
        month: currentMonth,
        parent_keyword: `keyword ${p + 1}-${i + 1}`,
        keyword_sub: `sub kw ${p + 1}-${i + 1}-a\nsub kw ${p + 1}-${i + 1}-b`,
        keyword_count: 2,
        keywords_list: [`sub kw ${p + 1}-${i + 1}-a`, `sub kw ${p + 1}-${i + 1}-b`],
        search_volume: 500 + i * 100,
        title: `Bai viet mau ${p + 1}-${i + 1}`,
        outline: '',
        timeline_outline: '',
        status_outline: 'done',
        pic: pics[i % pics.length],
        content_file: '',
        deadline: null,
        status_content: published ? 'published' : 'writing',
        link_publish: published ? `https://example.com/post-${p + 1}-${i + 1}` : '',
        publish_date: published
          ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(5 + i).padStart(2, '0')}`
          : null,
        note: '',
        month_year: `${currentMonth}/${currentYear}`,
        created_at: now(),
        updated_at: now(),
      });
    }
  }
  db.insert(schema.tasks).values(taskValues).run();
  console.log(`  + ${taskValues.length} tasks`);

  // 5. Keyword rankings
  const rankingValues = [];
  for (let p = 0; p < projectIds.length; p++) {
    for (let k = 0; k < 5; k++) {
      for (let d = 0; d < 3; d++) {
        const date = new Date(currentYear, currentMonth - 1 - d, 15);
        rankingValues.push({
          id: uuid(),
          keyword: `keyword ${p + 1}-${k + 1}`,
          url: `https://example.com/post-${p + 1}-${k + 1}`,
          position: Math.max(1, Math.floor(Math.random() * 30) + 1 - d * 2),
          date: date.toISOString().slice(0, 10),
          project_id: projectIds[p],
        });
      }
    }
  }
  db.insert(schema.keywordRankings).values(rankingValues).run();
  console.log(`  + ${rankingValues.length} keyword rankings`);

  // 6. Salary payments (previous month)
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  db.insert(schema.salaryPayments).values(
    memberNames.map((name) => ({
      id: uuid(),
      member_name: name,
      month: prevMonth,
      year: prevYear,
      amount: 5000000 + Math.floor(Math.random() * 3000000),
    }))
  ).run();
  console.log('  + 3 salary payments');

  // 7. Sync logs
  db.insert(schema.syncLogs).values([{
    id: uuid(),
    project_id: null,
    project_name: null,
    status: 'success',
    tasks_synced: 20,
    projects_synced: 2,
    duration_ms: 1500,
    error: null,
    started_at: now(),
    completed_at: now(),
  }]).run();
  console.log('  + 1 sync log');

  console.log('Seed complete!');
  sqlite.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
