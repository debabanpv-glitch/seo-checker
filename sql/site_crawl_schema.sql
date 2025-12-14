-- =====================================================
-- SITE CRAWL ANALYSIS SCHEMA
-- For Screaming Frog data analysis
-- =====================================================

-- 1. Site Crawls - Mỗi lần crawl của 1 project
CREATE TABLE IF NOT EXISTS site_crawls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Crawl metadata
  crawl_date DATE NOT NULL,
  source_type TEXT DEFAULT 'screaming_frog', -- screaming_frog, sitebulb, etc
  source_url TEXT, -- Link Google Sheet nếu có

  -- Summary stats (calculated after import)
  total_urls INTEGER DEFAULT 0,
  indexable_urls INTEGER DEFAULT 0,
  non_indexable_urls INTEGER DEFAULT 0,

  -- Status code breakdown
  status_2xx INTEGER DEFAULT 0,
  status_3xx INTEGER DEFAULT 0,
  status_4xx INTEGER DEFAULT 0,
  status_5xx INTEGER DEFAULT 0,

  -- Health score (0-100)
  health_score INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  opportunities INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crawl Pages - Chi tiết từng URL
CREATE TABLE IF NOT EXISTS crawl_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id UUID REFERENCES site_crawls(id) ON DELETE CASCADE,

  -- Core URL info
  address TEXT NOT NULL,
  content_type TEXT,
  status_code INTEGER,
  status TEXT,

  -- Indexability
  indexability TEXT, -- 'Indexable', 'Non-Indexable'
  indexability_status TEXT, -- Reason if non-indexable

  -- Title
  title TEXT,
  title_length INTEGER,
  title_pixel_width INTEGER,

  -- Meta Description
  meta_description TEXT,
  meta_description_length INTEGER,
  meta_description_pixel_width INTEGER,

  -- Meta Keywords (legacy but still tracked)
  meta_keywords TEXT,

  -- Headings
  h1_1 TEXT,
  h1_1_length INTEGER,
  h1_2 TEXT,
  h1_2_length INTEGER,
  h2_1 TEXT,
  h2_1_length INTEGER,
  h2_2 TEXT,
  h2_2_length INTEGER,

  -- Meta Robots & Directives
  meta_robots TEXT,
  x_robots_tag TEXT,
  meta_refresh TEXT,
  canonical_link TEXT,
  rel_next TEXT,
  rel_prev TEXT,

  -- Content metrics
  size_bytes INTEGER,
  word_count INTEGER,
  sentence_count INTEGER,
  avg_words_per_sentence DECIMAL(5,2),
  flesch_reading_ease DECIMAL(5,2),
  readability TEXT,
  text_ratio DECIMAL(5,2),

  -- Crawl metrics
  crawl_depth INTEGER,
  folder_depth INTEGER,
  link_score DECIMAL(5,2),

  -- Links
  inlinks INTEGER DEFAULT 0,
  unique_inlinks INTEGER DEFAULT 0,
  outlinks INTEGER DEFAULT 0,
  unique_outlinks INTEGER DEFAULT 0,
  external_outlinks INTEGER DEFAULT 0,
  unique_external_outlinks INTEGER DEFAULT 0,

  -- Performance
  response_time DECIMAL(10,2), -- milliseconds

  -- Errors
  spelling_errors INTEGER DEFAULT 0,
  grammar_errors INTEGER DEFAULT 0,

  -- Redirect info
  redirect_url TEXT,
  redirect_type TEXT,

  -- Additional
  hash TEXT,
  last_modified TIMESTAMP WITH TIME ZONE,
  crawl_timestamp TIMESTAMP WITH TIME ZONE,

  -- Calculated issue flags (set by analysis)
  has_critical_issue BOOLEAN DEFAULT FALSE,
  has_warning BOOLEAN DEFAULT FALSE,
  issues JSONB DEFAULT '[]'::jsonb, -- Array of {type, severity, message}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crawl Issues - Định nghĩa các loại lỗi để check
CREATE TABLE IF NOT EXISTS crawl_issue_definitions (
  id TEXT PRIMARY KEY, -- e.g., 'title_missing', 'status_404'
  category TEXT NOT NULL, -- 'indexability', 'content', 'technical', 'links'
  severity TEXT NOT NULL, -- 'critical', 'warning', 'opportunity'
  name TEXT NOT NULL,
  description TEXT,
  check_field TEXT, -- Field to check
  check_type TEXT, -- 'empty', 'equals', 'greater_than', 'less_than', 'contains', 'regex'
  check_value TEXT, -- Value to compare
  suggestion TEXT, -- How to fix
  weight INTEGER DEFAULT 1, -- Impact on health score
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default issue definitions
INSERT INTO crawl_issue_definitions (id, category, severity, name, description, check_field, check_type, check_value, suggestion, weight) VALUES
-- CRITICAL ISSUES (Indexability & Access)
('status_404', 'indexability', 'critical', 'Trang 404 Not Found', 'URL trả về lỗi 404', 'status_code', 'equals', '404', 'Xóa hoặc redirect URL này', 10),
('status_500', 'indexability', 'critical', 'Lỗi Server 500', 'URL trả về lỗi server', 'status_code', 'greater_than', '499', 'Kiểm tra server và fix lỗi', 10),
('non_indexable', 'indexability', 'critical', 'Không thể index', 'Trang bị chặn index', 'indexability', 'equals', 'Non-Indexable', 'Kiểm tra robots.txt, meta robots, canonical', 10),
('no_canonical', 'indexability', 'critical', 'Thiếu Canonical', 'Trang không có canonical tag', 'canonical_link', 'empty', '', 'Thêm canonical tag cho trang', 8),

-- CONTENT ISSUES
('title_missing', 'content', 'critical', 'Thiếu Title', 'Trang không có title tag', 'title', 'empty', '', 'Thêm title tag cho trang', 8),
('title_too_short', 'content', 'warning', 'Title quá ngắn', 'Title dưới 30 ký tự', 'title_length', 'less_than', '30', 'Tăng độ dài title lên 50-60 ký tự', 3),
('title_too_long', 'content', 'warning', 'Title quá dài', 'Title trên 60 ký tự', 'title_length', 'greater_than', '60', 'Giảm độ dài title xuống 50-60 ký tự', 3),
('meta_missing', 'content', 'warning', 'Thiếu Meta Description', 'Trang không có meta description', 'meta_description', 'empty', '', 'Thêm meta description 120-160 ký tự', 5),
('meta_too_short', 'content', 'warning', 'Meta Description ngắn', 'Meta description dưới 70 ký tự', 'meta_description_length', 'less_than', '70', 'Tăng meta description lên 120-160 ký tự', 2),
('meta_too_long', 'content', 'warning', 'Meta Description dài', 'Meta description trên 160 ký tự', 'meta_description_length', 'greater_than', '160', 'Giảm meta description xuống 120-160 ký tự', 2),
('h1_missing', 'content', 'critical', 'Thiếu H1', 'Trang không có thẻ H1', 'h1_1', 'empty', '', 'Thêm một thẻ H1 duy nhất cho trang', 7),
('multiple_h1', 'content', 'warning', 'Nhiều H1', 'Trang có nhiều hơn 1 H1', 'h1_2', 'not_empty', '', 'Chỉ giữ lại 1 thẻ H1 duy nhất', 4),
('thin_content', 'content', 'warning', 'Nội dung mỏng', 'Trang có ít hơn 300 từ', 'word_count', 'less_than', '300', 'Bổ sung nội dung chất lượng, tối thiểu 500+ từ', 5),

-- TECHNICAL ISSUES
('slow_response', 'technical', 'warning', 'Response chậm', 'Thời gian phản hồi trên 2 giây', 'response_time', 'greater_than', '2000', 'Tối ưu server, cache, nén files', 4),
('large_page', 'technical', 'warning', 'Trang quá nặng', 'Dung lượng trang trên 3MB', 'size_bytes', 'greater_than', '3000000', 'Nén hình ảnh, minify CSS/JS', 3),
('deep_crawl', 'technical', 'opportunity', 'Crawl depth cao', 'Trang cách homepage trên 3 clicks', 'crawl_depth', 'greater_than', '3', 'Cải thiện internal linking', 2),

-- LINK ISSUES
('orphan_page', 'links', 'warning', 'Trang mồ côi', 'Trang có ít hơn 2 internal links trỏ đến', 'unique_inlinks', 'less_than', '2', 'Thêm internal links từ các trang liên quan', 4),
('no_outlinks', 'links', 'opportunity', 'Không có outlinks', 'Trang không có link đi ra', 'outlinks', 'equals', '0', 'Thêm internal links đến các trang liên quan', 2),

-- REDIRECT ISSUES
('redirect_chain', 'technical', 'warning', 'Redirect chain', 'URL bị redirect', 'status_code', 'equals', '301', 'Cập nhật link gốc trỏ thẳng đến URL cuối', 3),
('temp_redirect', 'technical', 'warning', 'Redirect tạm (302)', 'URL dùng redirect tạm thời', 'status_code', 'equals', '302', 'Đổi sang 301 nếu là redirect vĩnh viễn', 3)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  suggestion = EXCLUDED.suggestion,
  weight = EXCLUDED.weight;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crawl_pages_crawl_id ON crawl_pages(crawl_id);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_status ON crawl_pages(status_code);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_indexability ON crawl_pages(indexability);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_issues ON crawl_pages(has_critical_issue, has_warning);
CREATE INDEX IF NOT EXISTS idx_site_crawls_project ON site_crawls(project_id);
CREATE INDEX IF NOT EXISTS idx_site_crawls_date ON site_crawls(crawl_date DESC);

-- RLS Policies
ALTER TABLE site_crawls ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_issue_definitions ENABLE ROW LEVEL SECURITY;

-- Allow all access (adjust based on your auth setup)
CREATE POLICY "Allow all access to site_crawls" ON site_crawls FOR ALL USING (true);
CREATE POLICY "Allow all access to crawl_pages" ON crawl_pages FOR ALL USING (true);
CREATE POLICY "Allow all access to crawl_issue_definitions" ON crawl_issue_definitions FOR ALL USING (true);
