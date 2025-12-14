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

async function simulateAPIResponse() {
  const selectedMonth = 12;
  const selectedYear = 2025;

  // Fetch all tasks with project info (same as API)
  const { data: allTasks, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*)');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Filter tasks for selected month/year (same as API)
  const taskList = (allTasks || []).filter(
    (t) => t.month === selectedMonth && t.year === selectedYear
  );

  // Calculate stats - only count tasks with actual content (same as API)
  const validTasks = taskList.filter((t) => t.title || t.keyword_sub || t.parent_keyword);

  console.log('=== Simulating API Response ===');
  console.log('Raw taskList count:', taskList.length);
  console.log('Valid tasks (with title/keyword_sub):', validTasks.length);

  // This is what API returns as stats.published
  const apiPublished = validTasks.filter((t) => isPublished(t)).length;
  console.log('\nAPI stats.published:', apiPublished);

  // Simulate allTasksWithProject mapping (what API returns as allTasks)
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

  console.log('allTasksWithProject count:', allTasksWithProject.length);

  // Now simulate what Dashboard does with allTasks
  // Dashboard uses isPublished on the mapped tasks
  const dashboardPublished = allTasksWithProject.filter((t) => isPublished(t)).length;
  console.log('\nDashboard calculated published:', dashboardPublished);

  // Check tasks with publish_date in the mapped array
  const withPublishDate = allTasksWithProject.filter(t => t.publish_date);
  console.log('Tasks with publish_date in allTasksWithProject:', withPublishDate.length);

  // Check if there is any difference
  if (apiPublished !== dashboardPublished) {
    console.log('\n!!! MISMATCH DETECTED !!!');
  } else {
    console.log('\nAPI and Dashboard logic match.');
  }

  // Show sample publish_date values
  console.log('\n=== Sample publish_date values ===');
  allTasksWithProject.slice(0, 5).forEach(t => {
    console.log('publish_date:', t.publish_date, '| isPublished:', isPublished(t));
  });

  // Show tasks that ARE published
  console.log('\n=== Published tasks sample ===');
  const publishedTasks = allTasksWithProject.filter(t => isPublished(t));
  publishedTasks.slice(0, 5).forEach(t => {
    console.log('- ' + (t.title || t.keyword_sub).substring(0, 40) + ' | pub_date: ' + t.publish_date);
  });
}

simulateAPIResponse();
