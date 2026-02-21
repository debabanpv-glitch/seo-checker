/**
 * SEO Manager SDK — For Claude Code / external scripts
 * Usage: import { sdk } from './scripts/sdk/seo-manager-sdk'
 */
const BASE = 'http://localhost:3000/api/v1';

async function api(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Worker': 'claude-code' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const sdk = {
  tasks: {
    create: (data: { project: string; keyword: string; title?: string; pic?: string; deadline?: string; note?: string }) =>
      api('/tasks', 'POST', { ...data, pic: data.pic || 'Claude', assigned_to: 'claude', source: 'claude-code' }),
    updateStatus: (taskId: string, status: string, note?: string) =>
      api(`/tasks/${taskId}/status`, 'PUT', { status_content: status, note }),
    publish: (taskId: string, link: string) =>
      api(`/tasks/${taskId}/publish`, 'PUT', { link_publish: link, status_content: '4. Publish', publish_date: new Date().toISOString().split('T')[0] }),
    list: (filters?: { project?: string; status?: string; pic?: string }) =>
      api(`/tasks?${new URLSearchParams(filters as any)}`),
  },
  audit: {
    submit: (data: { url: string; project: string; keyword?: string; score: number; details: any }) =>
      api('/seo-results', 'POST', { ...data, source: 'claude-code' }),
  },
  keywords: {
    track: (data: { keyword: string; position: number; url?: string; project: string }) =>
      api('/keyword-rankings', 'POST', { ...data, source: 'claude-code' }),
    trackBulk: (rankings: Array<{ keyword: string; position: number; url?: string; project: string }>) =>
      api('/keyword-rankings/bulk', 'POST', { rankings, source: 'claude-code' }),
  },
  strategy: {
    updateAction: (actionId: string, data: { status?: string; result?: string; note?: string }) =>
      api(`/strategy/actions/${actionId}`, 'PUT', data),
    createAction: (data: { phase_id: string; project: string; title: string; category?: string; priority?: string }) =>
      api('/strategy/actions', 'POST', { ...data, assigned_to: 'claude' }),
  },
  log: {
    activity: (message: string, project?: string, type?: string) =>
      api('/claude/log', 'POST', { title: message, project_slug: project, activity_type: type || 'general' }),
    detailed: (data: { project?: string; activity_type: string; title: string; description?: string; input_data?: any; output_data?: any }) =>
      api('/claude/log', 'POST', data),
  },
  projects: {
    list: () => api('/projects'),
    get: (slug: string) => api(`/projects?slug=${slug}`),
  },
  notes: {
    add: (data: { project?: string; title: string; content: string; tags?: string[] }) =>
      api('/notes', 'POST', { ...data, source: 'claude-code' }),
  },
  gsc: {
    saveSnapshot: (data: { project: string; clicks: number; impressions: number; ctr: number; position: number; top_queries?: any; top_pages?: any }) =>
      api('/gsc/snapshot', 'POST', { ...data, source: 'claude-code' }),
  },
};
