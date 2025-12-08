-- ============================================
-- SUPABASE SCHEMA FOR CONTENT TRACKER
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- Drop existing tables if any
DROP TABLE IF EXISTS monthly_targets CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Table: projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  sheet_name TEXT DEFAULT 'Content',
  monthly_target INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stt INTEGER,
  year INTEGER,
  month INTEGER,
  parent_keyword TEXT,
  keyword_sub TEXT,
  search_volume INTEGER DEFAULT 0,
  title TEXT,
  outline TEXT,
  timeline_outline TEXT,
  status_outline TEXT,
  pic TEXT,
  content_file TEXT,
  deadline DATE,
  status_content TEXT,
  link_publish TEXT,
  publish_date DATE,
  note TEXT,
  month_year TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: monthly_targets
CREATE TABLE monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  target INTEGER DEFAULT 20,
  UNIQUE(project_id, month, year)
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_pic ON tasks(pic);
CREATE INDEX idx_tasks_status_content ON tasks(status_content);
CREATE INDEX idx_tasks_month_year ON tasks(month_year);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_publish_date ON tasks(publish_date);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for anon access (since we use app-level auth)
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all access to monthly_targets" ON monthly_targets FOR ALL USING (true);

-- Insert sample project (Samcotech)
INSERT INTO projects (name, sheet_id, sheet_name, monthly_target)
VALUES ('Samcotech', '19FcF4TUJmFpTt-xs7sLF5QJOUfoGBnMT_EBroUaHQts', 'Content', 20);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for tasks updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! Schema created successfully
-- ============================================
