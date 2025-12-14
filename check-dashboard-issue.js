const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cgysmftwhjywxitfgrfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXNtZnR3aGp5d3hpdGZncmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjI4NzYsImV4cCI6MjA4MDc5ODg3Nn0.fzTWV_BJxwF71UQnOQaH7AZ7AGTsS4PSF8LPZp1NfaI'
);

// Exact isPublished logic from task-helpers.ts
const isPublished = (task) => {
  if (task.publish_date) return true;
  if (!task.status_content) return false;
  const status = task.status_content.toLowerCase().trim();
  return (
    status.includes('publish') ||
    status.includes('4.') ||
    status === 'done' ||
    status === 'hoàn thành'
  );
};

async function check() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, keyword_sub, status_content, publish_date, month, year, project_id')
    .eq('month', 12)
    .eq('year', 2025);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get projects
  const { data: projects } = await supabase.from('projects').select('id, name');
  const projectMap = {};
  projects.forEach(p => projectMap[p.id] = p.name);

  // Filter valid tasks (same as API)
  const validTasks = tasks.filter(t => t.title || t.keyword_sub);

  console.log('=== Checking isPublished logic ===');
  console.log('Total valid tasks for Dec 2025:', validTasks.length);

  // Check each task
  const publishedTasks = validTasks.filter(t => isPublished(t));
  console.log('\nPublished count using isPublished():', publishedTasks.length);

  // Breakdown by project
  console.log('\n=== By Project ===');
  const byProject = {};
  validTasks.forEach(t => {
    const pname = projectMap[t.project_id] || 'Unknown';
    if (!byProject[pname]) byProject[pname] = { total: 0, published: 0 };
    byProject[pname].total++;
    if (isPublished(t)) byProject[pname].published++;
  });

  Object.entries(byProject).forEach(([name, data]) => {
    console.log(name + ': ' + data.published + '/' + data.total + ' published');
  });

  // Show published tasks details
  console.log('\n=== Published Tasks Details ===');
  publishedTasks.slice(0, 5).forEach(t => {
    const title = (t.title || t.keyword_sub || '').substring(0, 50);
    console.log('- ' + title + '... | publish_date: ' + t.publish_date + ' | status: ' + t.status_content);
  });

  // Show tasks with publish_date
  const withPublishDate = validTasks.filter(t => t.publish_date);
  console.log('\nTasks with publish_date: ' + withPublishDate.length);

  // Show tasks without publish_date but considered published
  const publishedByStatus = validTasks.filter(t => !t.publish_date && isPublished(t));
  console.log('Tasks published by status_content only: ' + publishedByStatus.length);
  if (publishedByStatus.length > 0) {
    console.log('These tasks:');
    publishedByStatus.forEach(t => {
      console.log('  - status: "' + t.status_content + '" | ' + (t.title || t.keyword_sub));
    });
  }
}

check();
