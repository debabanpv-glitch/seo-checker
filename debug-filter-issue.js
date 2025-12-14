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

async function debugFilter() {
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

  // Filter tasks for selected month/year
  const taskList = (allTasks || []).filter(
    (t) => t.month === selectedMonth && t.year === selectedYear
  );

  console.log('Raw taskList for Dec 2025:', taskList.length);

  // API uses this filter for validTasks
  const validTasks = taskList.filter((t) => t.title || t.keyword_sub || t.parent_keyword);
  console.log('validTasks (title || keyword_sub || parent_keyword):', validTasks.length);

  // But API response allTasksWithProject maps from validTasks
  // So allTasks returned has validTasks.length items

  // Now check: how many of validTasks have publish_date?
  const publishedInValidTasks = validTasks.filter(t => isPublished(t));
  console.log('Published in validTasks:', publishedInValidTasks.length);

  // Now simulate what Dashboard receives
  // Dashboard receives allTasksWithProject which is mapped from validTasks
  // Dashboard then filters using isPublished

  // The key difference might be between API stats.published calculation and Dashboard calculation
  // API calculates: validTasks.filter((t) => isPublished(t)).length
  // Dashboard calculates: allTasks.filter((t) => isPublished(t)).length (where allTasks = allTasksWithProject)

  // Both should be the same if allTasksWithProject correctly includes publish_date

  // Let me check: are there any tasks with publish_date that are being filtered out?
  const allWithPublishDate = taskList.filter(t => t.publish_date);
  console.log('\nTasks with publish_date in raw taskList:', allWithPublishDate.length);

  const validWithPublishDate = validTasks.filter(t => t.publish_date);
  console.log('Tasks with publish_date in validTasks:', validWithPublishDate.length);

  // Find tasks with publish_date that got filtered out
  const filteredOut = allWithPublishDate.filter(t => !validTasks.includes(t));
  console.log('Tasks with publish_date filtered out:', filteredOut.length);

  if (filteredOut.length > 0) {
    console.log('\n=== Filtered out tasks with publish_date ===');
    filteredOut.forEach(t => {
      console.log('- id:', t.id);
      console.log('  title:', t.title);
      console.log('  keyword_sub:', t.keyword_sub);
      console.log('  parent_keyword:', t.parent_keyword);
      console.log('  publish_date:', t.publish_date);
      console.log('  project:', t.project?.name);
      console.log('---');
    });
  }

  // Also check: maybe the issue is in how Dashboard calculates total
  // Dashboard: total = published + inProgress
  // Where inProgress = allTasks.filter(t => t.status_content && !isPublished(t)).length

  const inProgress = validTasks.filter(t => t.status_content && !isPublished(t)).length;
  console.log('\nIn Progress (has status_content, not published):', inProgress);
  console.log('Total (published + inProgress):', publishedInValidTasks.length + inProgress);
  console.log('Actual validTasks.length:', validTasks.length);
}

debugFilter();
