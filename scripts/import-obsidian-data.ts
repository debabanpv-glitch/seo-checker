/**
 * Import Obsidian project data into SQLite database.
 * Run: npx tsx scripts/import-obsidian-data.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'seo-manager.db');
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Get project IDs
const projects = sqlite.prepare('SELECT id, slug FROM projects').all() as { id: string; slug: string }[];
const getProjectId = (slug: string): string => {
  const p = projects.find(p => p.slug === slug);
  if (!p) throw new Error(`Project not found: ${slug}`);
  return p.id;
};

// Prepared statements
const insertPhase = sqlite.prepare(`
  INSERT INTO strategy_phases (id, project_id, name, description, phase_type, priority, start_date, end_date, status, progress, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAction = sqlite.prepare(`
  INSERT INTO strategy_actions (id, phase_id, project_id, title, description, category, priority, assigned_to, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertNote = sqlite.prepare(`
  INSERT INTO notes (id, project_id, title, content, tags, source, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// ─── DATA ────────────────────────────────────────────────────────────────────

interface PhaseData {
  name: string;
  description?: string;
  phase_type: string;
  priority?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  progress: number;
  actions: ActionData[];
}

interface ActionData {
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  result?: string;
}

interface NoteData {
  project_slug: string;
  title: string;
  content: string;
  tags: string[];
}

// ─── SAMCO TECH ──────────────────────────────────────────────────────────────

const samcoPhases: PhaseData[] = [
  {
    name: 'Phase 1: Foundation',
    description: 'T1-T2/2026, Weeks 1-8',
    phase_type: 'short_term',
    priority: 0,
    start_date: '2026-01-01',
    end_date: '2026-02-28',
    status: 'in_progress',
    progress: 30,
    actions: [
      {
        title: 'Technical Audit & Speed Fix',
        description: 'Fix page speed 13.9s→<3s, fix 4410 problematic URLs',
        category: 'technical',
        priority: 'critical',
        status: 'doing',
      },
      {
        title: 'Keyword Research & Competitor Analysis',
        description: '',
        category: 'content',
        priority: 'critical',
        status: 'done',
        result: '500+ keywords, 5 clusters chính',
      },
      {
        title: 'Create 5 Pillar Pages',
        description: 'Máy in nhãn, Máy in mã vạch, Máy quét mã vạch, Máy in hóa đơn, Vật tư tiêu hao',
        category: 'content',
        priority: 'high',
        status: 'doing',
      },
      {
        title: 'Create 10 Brand Pages',
        description: 'Brother, Brady, Tepra, Zebra, TSC, Honeywell, Epson, Nhãn Brother, Nhãn TZe, DYMO',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Create 6 Type/Category Pages',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Fix 145,415 Missing Image Alt Texts',
        description: '',
        category: 'technical',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Fix 575 Missing Canonical Tags',
        description: '',
        category: 'technical',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
  {
    name: 'Phase 2: Expansion',
    description: 'T3-T4/2026, Weeks 9-16',
    phase_type: 'short_term',
    priority: 1,
    start_date: '2026-03-01',
    end_date: '2026-04-30',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Create 50 Product Pages',
        description: 'Brother 20, Zebra 10, Honeywell 10, others 10',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Create 20 Category Pages',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Implement Product Schema',
        description: '4000+ products need markup',
        category: 'technical',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Implement FAQ Schema',
        description: '45+ pages ready for FAQ schema',
        category: 'technical',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Add LocalBusiness Schema',
        description: '',
        category: 'technical',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
  {
    name: 'Phase 3: Authority',
    description: 'T5-T6/2026, Weeks 17-24',
    phase_type: 'long_term',
    priority: 2,
    start_date: '2026-05-01',
    end_date: '2026-06-30',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Write 14 Blog Posts',
        description: '6 how-to, 4 comparisons, 4 industry-specific',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Create 5 FAQ Hubs',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Link Building Campaign',
        description: '',
        category: 'links',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Expert Content & E-E-A-T',
        description: '',
        category: 'authority',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
];

// ─── TCNET ───────────────────────────────────────────────────────────────────

const tcnetPhases: PhaseData[] = [
  {
    name: 'Phase 1: Critical Fixes & E-E-A-T',
    description: 'Weeks 1-4 — URGENT',
    phase_type: 'short_term',
    priority: 0,
    start_date: '2026-02-21',
    end_date: '2026-03-21',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Add security headers (.htaccess)',
        description: '15 min',
        category: 'technical',
        priority: 'critical',
        status: 'todo',
      },
      {
        title: 'Add H1 to homepage',
        description: '5 min',
        category: 'technical',
        priority: 'critical',
        status: 'todo',
      },
      {
        title: "Fix title 'tủ điện 150x200' → top 1",
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Add 5 internal links from top-ranked page',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Add author box to 123 blogs',
        description: 'name, photo, title, bio, LinkedIn',
        category: 'authority',
        priority: 'critical',
        status: 'todo',
      },
      {
        title: 'Rewrite About Us page 800+ words',
        description: '',
        category: 'authority',
        priority: 'critical',
        status: 'todo',
      },
      {
        title: 'Add LocalBusiness + Organization schema',
        description: '',
        category: 'technical',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Add datePublished + dateModified display',
        description: '',
        category: 'technical',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Fix 39 dead pages (404→301 redirect)',
        description: '',
        category: 'technical',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Remove 9 unused plugins + readme.html',
        description: '',
        category: 'technical',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
  {
    name: 'Phase 2: Content & Internal Links',
    description: 'Weeks 5-8',
    phase_type: 'short_term',
    priority: 1,
    start_date: '2026-03-22',
    end_date: '2026-04-19',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Create Pillar "Cáp quang là gì" 3000+ words',
        description: '',
        category: 'content',
        priority: 'critical',
        status: 'todo',
      },
      {
        title: 'NOINDEX 423 thin pages <100 words',
        description: '',
        category: 'technical',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Fix 43 cannibalization groups',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Add 234 new internal links',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Add FAQ schema to 45 pages',
        description: '',
        category: 'technical',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Expand 200 thin pages to 500+ words',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
  {
    name: 'Phase 3: Scale & Authority',
    description: 'Weeks 9-12',
    phase_type: 'long_term',
    priority: 2,
    start_date: '2026-04-20',
    end_date: '2026-05-17',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Write 16 supporting posts',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Refresh 289 old pages',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Image SEO (alt, WebP, compress)',
        description: '',
        category: 'technical',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Optimize 47 revenue pages',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
    ],
  },
];

// ─── DU LICH BINH MINH ───────────────────────────────────────────────────────

const dulichPhases: PhaseData[] = [
  {
    name: 'Phase 1: Technical Foundation & Non-Branded Push',
    description: 'Weeks 1-8',
    phase_type: 'short_term',
    priority: 0,
    start_date: '2026-02-21',
    end_date: '2026-04-18',
    status: 'in_progress',
    progress: 40,
    actions: [
      {
        title: 'Fix CTR for 5 main category pages',
        description: 'Title + meta rewrite, current CTR 1.8-2.7% → target 5-8%',
        category: 'content',
        priority: 'critical',
        status: 'doing',
      },
      {
        title: 'Create guide "Du lịch Cần Thơ A-Z" 2000+ words',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Create guide "Du lịch Châu Đốc" 2000+ words',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Create guide "Du lịch Cà Mau" 2000+ words',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Create guide "Du lịch Bến Tre" 1500+ words',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Create guide "Chợ nổi Cái Răng" 1500+ words',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Optimize tour 2N1Đ page for non-branded',
        description: 'Position 2.5, 1436 impr/week, CTR only 1.88%',
        category: 'content',
        priority: 'high',
        status: 'doing',
      },
      {
        title: 'Optimize tour 3N2Đ page',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Create Pillar "Tour Miền Tây Trọn Gói" 3000+ words',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Technical fixes completed (58 titles, 39 metas, 4 H1s)',
        description: '',
        category: 'technical',
        priority: 'high',
        status: 'done',
      },
    ],
  },
  {
    name: 'Phase 2: Seasonal Content & Traffic Scale',
    description: 'Weeks 9-16',
    phase_type: 'short_term',
    priority: 1,
    start_date: '2026-04-19',
    end_date: '2026-06-14',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Blog: "Kinh nghiệm đi tour Miền Tây"',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Blog: "Tour MT nên đi đâu?"',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Blog: "Top 10 đặc sản Miền Tây"',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Seasonal: "Tour mùa nước nổi"',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Create tour landing pages for new destinations',
        description: 'Mỹ Tho Bến Tre, Châu Đốc Trà Sư',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Tour teambuilding page',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
  {
    name: 'Phase 3: Authority & Brand Building',
    description: 'Weeks 17-24',
    phase_type: 'long_term',
    priority: 2,
    start_date: '2026-06-15',
    end_date: '2026-08-09',
    status: 'planned',
    progress: 0,
    actions: [
      {
        title: 'Link Building Campaign',
        description: '',
        category: 'links',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Optimize 47 revenue pages',
        description: '',
        category: 'content',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Seasonal content prep (Tết, 30/4, hè)',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Refresh old content cycle',
        description: '',
        category: 'content',
        priority: 'medium',
        status: 'todo',
      },
    ],
  },
];

// ─── NOTES ───────────────────────────────────────────────────────────────────

const notes: NoteData[] = [
  {
    project_slug: 'samco',
    title: 'Samco Tech - Tình trạng kỹ thuật',
    content: 'Speed trung bình 13.9s (chuẩn <3s). 4,410 URL có vấn đề. 145,415 ảnh thiếu alt text (56.9%). 575 trang thiếu canonical. 0 FAQ schema, 0 LocalBusiness schema. 4,000+ sản phẩm cần Product schema.',
    tags: ['technical', 'audit'],
  },
  {
    project_slug: 'samco',
    title: 'Samco Tech - Topical Map 5 Pillars',
    content: 'Pillar 1: Máy In Nhãn (/may-in-nhan/) - clusters: By Brand, By Type, By Use-case. Pillar 2: Máy In Mã Vạch. Pillar 3: Máy Quét Mã Vạch. Pillar 4: Máy In Hóa Đơn. Pillar 5: Vật Tư Tiêu Hao. Total plan: ~120 pieces content.',
    tags: ['content', 'strategy'],
  },
  {
    project_slug: 'samco',
    title: 'Samco Tech - Brand Guidelines',
    content: "Tone: Expert consultant, reliable with technical specs. Voice: Use 'SAMCO Tech' or 'chúng tôi'. Address: 'Quý khách', 'doanh nghiệp'. CTAs: 'Liên hệ tư vấn', 'Xem chi tiết sản phẩm', 'Yêu cầu báo giá'. WordPress API: samcotech.com.vn/wp-json/wp/v2/ (user: duc)",
    tags: ['brand'],
  },
  {
    project_slug: 'samco',
    title: 'Samco Tech - GSC W08 (12-18/02/2026)',
    content: 'Clicks: 34 (-65%). Impressions: 939 (-65%). CTR: 3.62%. Avg Position: 10.4. Keywords gained: máy in ống supvan (12.5→5.0), epson am c550 (new #2.5). Keywords lost: samcotech, sato cl4nx.',
    tags: ['gsc', 'weekly'],
  },
  {
    project_slug: 'tcnet',
    title: 'TCNET - KHẨN CẤP: Site-wide Position Drop',
    content: 'Từ 06/02/2026: Impressions -60%, Clicks -90%, Position 15.4→26.1 trong 5 ngày. Cần check: Manual Action, Core Web Vitals, Server uptime. E-E-A-T score: 42/100 (target 70+). Audit score: 64/100 (target 82+).',
    tags: ['crisis', 'urgent'],
  },
  {
    project_slug: 'tcnet',
    title: 'TCNET - E-E-A-T Breakdown',
    content: 'Experience 35/100: 0/123 blogs có author box, About Us chỉ 150 từ, 0 testimonials. Expertise 45/100: TB 478 từ/bài (chuẩn 1500-3000), 87% blogs <1000 từ. Authoritativeness 48/100: Thiếu Organization schema, Terms of Use. Trust 52/100: Thiếu security headers, return policy 80 từ.',
    tags: ['eeat', 'audit'],
  },
  {
    project_slug: 'tcnet',
    title: 'TCNET - GSC W08 (12-18/02/2026)',
    content: 'Clicks: 39/tuần. Impressions: 2,371. CTR: 1.64% (rất thấp). Avg Position: 19.8 (ngoài TOP 20). Top 10 keywords: ~8 (target 25+). Branded traffic: 90% (target <70%).',
    tags: ['gsc', 'weekly'],
  },
  {
    project_slug: 'dulichbinhminh',
    title: 'Du Lịch Bình Minh - GSC W08 (12-18/02/2026)',
    content: 'Clicks: 153/tuần. CTR: 7.28% (cao nhất 3 sites). Avg Position: 10.5. Branded traffic: 76% (target 50%). Category CTR: 1.8-2.7% (target 5-8%). 177 indexable pages, 327 keywords tracked.',
    tags: ['gsc', 'weekly'],
  },
  {
    project_slug: 'dulichbinhminh',
    title: 'Du Lịch Bình Minh - Content Calendar 12 Weeks',
    content: 'W1: Fix titles + Blog Kinh nghiệm. W2: Guide Cần Thơ + Optimize tour 2N. W3: Guide Châu Đốc + Optimize tour 3N. W4: Blog Nên đi đâu. W5: Guide Cà Mau. W6: Blog Đặc sản. W7: Guide Bến Tre. W8: Pillar Tour MT Trọn Gói. W9-12: Seasonal + authority.',
    tags: ['content', 'calendar'],
  },
  {
    project_slug: 'dulichbinhminh',
    title: 'Du Lịch Bình Minh - Keyword Focus',
    content: 'Priority: tour miền tây (pos 11.6, CTR 0.96%), tour MT 2N1Đ (pos 2.5, CTR 1.88% - LOW!), tour MT 1 ngày (pos 5.5), du lịch cần thơ (>20 - cần content mới), tour châu đốc (>20 - cần content mới). Seasonal: Tour Tết (prep Nov), Tour lễ 30/4 (prep Feb), Tour hè (prep Apr), Tour mùa nước nổi (prep Jul).',
    tags: ['keywords', 'strategy'],
  },
];

// ─── IMPORT ──────────────────────────────────────────────────────────────────

let phaseCount = 0;
let actionCount = 0;
let noteCount = 0;

const allProjectPhases: { slug: string; phases: PhaseData[] }[] = [
  { slug: 'samco', phases: samcoPhases },
  { slug: 'tcnet', phases: tcnetPhases },
  { slug: 'dulichbinhminh', phases: dulichPhases },
];

const importAll = sqlite.transaction(() => {
  // Insert phases + actions
  for (const { slug, phases } of allProjectPhases) {
    const projectId = getProjectId(slug);

    for (const phase of phases) {
      const phaseId = uuid();
      insertPhase.run(
        phaseId,
        projectId,
        phase.name,
        phase.description ?? null,
        phase.phase_type,
        phase.priority ?? 0,
        phase.start_date ?? null,
        phase.end_date ?? null,
        phase.status,
        phase.progress,
        now(),
        now(),
      );
      phaseCount++;

      for (const action of phase.actions) {
        insertAction.run(
          uuid(),
          phaseId,
          projectId,
          action.title,
          action.description || null,
          action.category,
          action.priority,
          null, // assigned_to
          action.status,
          now(),
          now(),
        );
        actionCount++;
      }
    }
  }

  // Insert notes
  for (const note of notes) {
    const projectId = getProjectId(note.project_slug);
    insertNote.run(
      uuid(),
      projectId,
      note.title,
      note.content,
      JSON.stringify(note.tags),
      'obsidian',
      now(),
    );
    noteCount++;
  }
});

console.log('Importing Obsidian data to:', DB_PATH);
importAll();

console.log(`\nImport complete!`);
console.log(`  + ${phaseCount} strategy phases`);
console.log(`  + ${actionCount} strategy actions`);
console.log(`  + ${noteCount} notes`);

// Verify counts
const verifyPhases = (sqlite.prepare('SELECT COUNT(*) as cnt FROM strategy_phases').get() as { cnt: number }).cnt;
const verifyActions = (sqlite.prepare('SELECT COUNT(*) as cnt FROM strategy_actions').get() as { cnt: number }).cnt;
const verifyNotes = (sqlite.prepare('SELECT COUNT(*) as cnt FROM notes').get() as { cnt: number }).cnt;

console.log(`\nDB verification:`);
console.log(`  strategy_phases: ${verifyPhases} total rows`);
console.log(`  strategy_actions: ${verifyActions} total rows`);
console.log(`  notes: ${verifyNotes} total rows`);

sqlite.close();
