-- Add crawl_sheet_url column to projects table
-- Run this in Supabase SQL Editor

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS crawl_sheet_url TEXT;

-- Add comment
COMMENT ON COLUMN projects.crawl_sheet_url IS 'Google Sheets URL for Screaming Frog crawl data';
