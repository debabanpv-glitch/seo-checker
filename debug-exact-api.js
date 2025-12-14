const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cgysmftwhjywxitfgrfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXNtZnR3aGp5d3hpdGZncmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjI4NzYsImV4cCI6MjA4MDc5ODg3Nn0.fzTWV_BJxwF71UQnOQaH7AZ7AGTsS4PSF8LPZp1NfaI'
);

async function simulateAPI() {
  const selectedMonth = 12;
  const selectedYear = 2025;

  // EXACT same query as API
  const { data: allTasks, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*)');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // EXACT same filter as API
  const taskList = (allTasks || []).filter(
    (t) => t.month === selectedMonth && t.year === selectedYear
  );

  // EXACT same filter as API
  const validTasks = taskList.filter((t) => t.title || t.keyword_sub || t.parent_keyword);

  console.log('taskList.length:', taskList.length);
  console.log('validTasks.length:', validTasks.length);

  // EXACT same mapping as API
  const allTasksWithProject = validTasks.map((t) => ({
    id: t.id,
    title: t.title,
    keyword_sub: t.keyword_sub,
    pic: t.pic,
    status_content: t.status_content,
    status_outline: t.status_outline,
    publish_date: t.publish_date,
    deadline: t.deadline,
    link_publish: t.link_publish,
    content_file: t.content_file,
    project: t.project,
  }));

  console.log('allTasksWithProject.length:', allTasksWithProject.length);

  // Check publish_date in the mapped result
  const withPubDate = allTasksWithProject.filter(t => t.publish_date);
  console.log('Tasks with publish_date in allTasksWithProject:', withPubDate.length);

  // Output as JSON to simulate API response
  const response = {
    allTasks: allTasksWithProject
  };

  // Now parse the JSON string (simulate client receiving JSON)
  const jsonString = JSON.stringify(response);
  const parsed = JSON.parse(jsonString);

  const clientAllTasks = parsed.allTasks;
  console.log('\n=== After JSON parse (client side) ===');
  console.log('clientAllTasks.length:', clientAllTasks.length);

  const clientWithPubDate = clientAllTasks.filter(t => t.publish_date);
  console.log('Tasks with publish_date after JSON parse:', clientWithPubDate.length);

  // Check if any publish_date got lost in JSON serialization
  const lostInJson = withPubDate.length - clientWithPubDate.length;
  if (lostInJson > 0) {
    console.log('\n!!! Lost', lostInJson, 'publish_date values in JSON serialization !!!');
  }

  // Show sample of tasks with publish_date
  console.log('\n=== Sample tasks with publish_date ===');
  clientWithPubDate.slice(0, 5).forEach(t => {
    console.log('  -', (t.title || t.keyword_sub || '').substring(0, 40), '| publish_date:', t.publish_date);
  });
}

simulateAPI();
