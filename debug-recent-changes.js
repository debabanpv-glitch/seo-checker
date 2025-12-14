const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cgysmftwhjywxitfgrfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXNtZnR3aGp5d3hpdGZncmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjI4NzYsImV4cCI6MjA4MDc5ODg3Nn0.fzTWV_BJxwF71UQnOQaH7AZ7AGTsS4PSF8LPZp1NfaI'
);

async function checkRecentChanges() {
  // Get tasks with publish_date ordered by updated_at
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, publish_date, updated_at, month, year')
    .eq('month', 12)
    .eq('year', 2025)
    .not('publish_date', 'is', null)
    .order('updated_at', { ascending: false });

  console.log('Tasks with publish_date, ordered by updated_at:');
  console.log('Total:', tasks.length);

  tasks.forEach(t => {
    console.log('  -', t.updated_at, '|', t.publish_date, '|', (t.title || '').substring(0, 40));
  });

  // Count by publish_date
  const byDate = {};
  tasks.forEach(t => {
    byDate[t.publish_date] = (byDate[t.publish_date] || 0) + 1;
  });

  console.log('\n=== Count by publish_date ===');
  Object.entries(byDate).sort().forEach(([date, count]) => {
    console.log('  ', date, ':', count);
  });

  // Calculate: 29 total, browser shows 20, difference is 9
  // Check if 9 tasks have publish_date after a certain timestamp
  const dec13 = new Date('2025-12-13T00:00:00Z');
  const afterDec13 = tasks.filter(t => new Date(t.publish_date) >= dec13);
  console.log('\nTasks with publish_date on or after Dec 13:', afterDec13.length);
}

checkRecentChanges();
