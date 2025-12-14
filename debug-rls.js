const { createClient } = require('@supabase/supabase-js');

// Same credentials as app
const supabase = createClient(
  'https://cgysmftwhjywxitfgrfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXNtZnR3aGp5d3hpdGZncmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjI4NzYsImV4cCI6MjA4MDc5ODg3Nn0.fzTWV_BJxwF71UQnOQaH7AZ7AGTsS4PSF8LPZp1NfaI'
);

async function checkRLS() {
  console.log('=== Checking Supabase RLS ===');

  // Query tasks
  const { data: tasks, error, count } = await supabase
    .from('tasks')
    .select('id, title, publish_date, month, year, created_at', { count: 'exact' })
    .eq('month', 12)
    .eq('year', 2025);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total tasks returned:', tasks.length);
  console.log('Count from Supabase:', count);

  const withPublishDate = tasks.filter(t => t.publish_date);
  console.log('Tasks with publish_date:', withPublishDate.length);

  // Check the most recent tasks
  const sorted = [...tasks].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  console.log('\n=== 10 most recently created tasks ===');
  sorted.slice(0, 10).forEach(t => {
    console.log('  -', t.id.substring(0, 8), '| created:', t.created_at?.substring(0, 10), '| publish_date:', t.publish_date);
  });

  // Check which tasks have publish_date
  console.log('\n=== All tasks with publish_date ===');
  withPublishDate.forEach(t => {
    console.log('  -', (t.title || 'no title').substring(0, 40), '| publish_date:', t.publish_date);
  });
}

checkRLS();
