const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cgysmftwhjywxitfgrfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXNtZnR3aGp5d3hpdGZncmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjI4NzYsImV4cCI6MjA4MDc5ODg3Nn0.fzTWV_BJxwF71UQnOQaH7AZ7AGTsS4PSF8LPZp1NfaI'
);

async function debug() {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, publish_date, status_content, month, year')
    .eq('month', 12)
    .eq('year', 2025);

  console.log('Total tasks:', tasks.length);

  // Check all publish_date values
  const withPublishDate = tasks.filter(t => t.publish_date);
  console.log('Tasks with truthy publish_date:', withPublishDate.length);

  // Check for empty strings
  const emptyString = tasks.filter(t => t.publish_date === '');
  console.log('Tasks with empty string publish_date:', emptyString.length);

  // Check for null
  const nullPubDate = tasks.filter(t => t.publish_date === null);
  console.log('Tasks with null publish_date:', nullPubDate.length);

  // Check for undefined
  const undefinedPubDate = tasks.filter(t => t.publish_date === undefined);
  console.log('Tasks with undefined publish_date:', undefinedPubDate.length);

  // Show all unique publish_date values
  const uniqueValues = [...new Set(tasks.map(t => typeof t.publish_date + ':' + t.publish_date))];
  console.log('\nUnique publish_date values (type:value):');
  uniqueValues.forEach(v => console.log(' ', v));

  // Show tasks with publish_date
  console.log('\n=== Tasks with publish_date ===');
  withPublishDate.forEach(t => {
    console.log('  -', t.title?.substring(0, 40), '| publish_date:', t.publish_date);
  });
}

debug();
