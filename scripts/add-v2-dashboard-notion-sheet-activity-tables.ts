/**
 * Migration: Add V2 Dashboard tables
 * Creates: notion_tasks, notion_content, notion_backlinks, notion_keywords,
 *          notion_competitors, sheet_content, activity_log
 *
 * Run: npx tsx scripts/add-v2-dashboard-notion-sheet-activity-tables.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH
  ?? path.join(process.cwd(), 'data', 'seo-manager.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`Migrating: ${DB_PATH}`);

db.exec(`
  -- Notion Tasks
  CREATE TABLE IF NOT EXISTS notion_tasks (
    notion_page_id TEXT PRIMARY KEY,
    task_name TEXT NOT NULL,
    project TEXT,
    category TEXT,
    status TEXT,
    priority TEXT,
    deadline TEXT,
    assignee TEXT,
    notes TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Notion Content
  CREATE TABLE IF NOT EXISTS notion_content (
    notion_page_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project TEXT,
    work_type TEXT,
    status TEXT,
    target_keyword TEXT,
    page_url TEXT,
    word_count INTEGER,
    onpage_score INTEGER,
    publish_date TEXT,
    assignee TEXT,
    reviewer TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Notion Backlinks
  CREATE TABLE IF NOT EXISTS notion_backlinks (
    notion_page_id TEXT PRIMARY KEY,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    anchor_text TEXT,
    dr INTEGER,
    da INTEGER,
    follow_type TEXT,
    link_type TEXT,
    status TEXT,
    build_date TEXT,
    project TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Notion Keywords
  CREATE TABLE IF NOT EXISTS notion_keywords (
    notion_page_id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
    project TEXT,
    volume INTEGER,
    kd INTEGER,
    cpc REAL,
    intent TEXT,
    funnel TEXT,
    topic_group TEXT,
    current_position REAL,
    target_position INTEGER,
    target_url TEXT,
    status TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Notion Competitors
  CREATE TABLE IF NOT EXISTS notion_competitors (
    notion_page_id TEXT PRIMARY KEY,
    competitor_name TEXT NOT NULL,
    website TEXT,
    da INTEGER,
    dr INTEGER,
    organic_traffic INTEGER,
    backlink_count INTEGER,
    keyword_count INTEGER,
    strengths TEXT,
    weaknesses TEXT,
    opportunities TEXT,
    project TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Sheet Content
  CREATE TABLE IF NOT EXISTS sheet_content (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    stt INTEGER,
    year INTEGER,
    month INTEGER,
    parent_keyword TEXT,
    sub_keywords TEXT,
    search_volume INTEGER,
    title TEXT,
    outline_status TEXT,
    pic TEXT,
    doc_file TEXT,
    deadline TEXT,
    content_status TEXT,
    publish_url TEXT,
    publish_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Activity Log
  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    entity_type TEXT,
    entity_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log('Migration complete: 7 tables created.');
db.close();
