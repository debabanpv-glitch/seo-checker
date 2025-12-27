-- ============================================
-- KEYWORD RANKINGS TABLE
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- Create keyword_rankings table
CREATE TABLE IF NOT EXISTS keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  url TEXT DEFAULT '',
  position DECIMAL(5,1) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_rankings_unique
ON keyword_rankings(keyword, date, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword ON keyword_rankings(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_date ON keyword_rankings(date);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_project_id ON keyword_rankings(project_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_position ON keyword_rankings(position);

-- Enable Row Level Security
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;

-- Create policy for anon access
CREATE POLICY "Allow all access to keyword_rankings" ON keyword_rankings FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_keyword_rankings_updated_at
  BEFORE UPDATE ON keyword_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! keyword_rankings table created
-- ============================================
