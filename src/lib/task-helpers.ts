/**
 * Shared helper functions for task status detection
 * Used across APIs and client components to ensure consistent logic
 */

export interface TaskStatusFields {
  status_content?: string | null;
  publish_date?: string | null;
}

/**
 * Check if a task is published
 * Priority: publish_date first, then status_content
 */
export const isPublished = (task: TaskStatusFields): boolean => {
  // If has publish_date, consider it published
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

/**
 * Check if a task is done QC (waiting to be published)
 */
export const isDoneQC = (statusContent: string | null): boolean => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return (
    status.includes('done qc') ||
    status.includes('3.') ||
    status.includes('chờ publish')
  );
};
