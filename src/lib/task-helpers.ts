/**
 * Shared helper functions for task status detection
 * Used across APIs and client components to ensure consistent logic
 */

export interface TaskStatusFields {
  status_content?: string | null;
  publish_date?: string | null;
}

/**
 * Published theo TRẠNG THÁI nội dung (status-only). Dùng cho salary —
 * nơi đã lọc theo publish_date nên chỉ cần xác nhận status đã đăng.
 * Cũng dùng cho field content_status của sheet_content.
 */
export const isPublishedStatus = (statusContent?: string | null): boolean => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return (
    status.includes('publish') || // gồm cả 'published'
    status.includes('4.') ||
    status === 'done' ||
    status === 'hoàn thành' ||
    status.includes('xuất bản') ||
    status.includes('live') ||
    status.includes('đã đăng')
  );
};

/**
 * Check if a task is published.
 * Priority: publish_date first, then status_content (qua isPublishedStatus).
 */
export const isPublished = (task: TaskStatusFields): boolean => {
  if (task.publish_date) return true;
  return isPublishedStatus(task.status_content);
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
