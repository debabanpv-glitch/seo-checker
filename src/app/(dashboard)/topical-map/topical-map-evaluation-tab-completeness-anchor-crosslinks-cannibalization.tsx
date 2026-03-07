'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  Target,
  Link2,
  GitBranch,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompletenessBreakdown {
  keywordCoverage: number | null;
  pageCoverage: number | null;
  linkHealth: number;
  anchorDiversity: number;
  overlapPenalty: number;
}

interface CompletenessData {
  score: number;
  breakdown: CompletenessBreakdown;
}

interface StatsData {
  targetKeywordCount: number;
  targetPageCount: number;
  keywordCount: number;
  pageCount: number;
  completeness: CompletenessData;
}

interface PageAnchor {
  id: string;
  url: string;
  title: string;
  anchor_to_pillar: string;
  anchor_from_pillar: string;
}

interface CrossClusterLink {
  id: string;
  source_cluster_id: string;
  source_cluster_name: string;
  target_cluster_id: string;
  target_cluster_name: string;
  source_url: string;
  target_url: string;
  anchor_text: string;
  relationship: string;
  verified: boolean;
}

interface ClusterOption {
  id: string;
  name: string;
}

interface OverlapItem {
  keyword: string;
  urls: { url: string; position: number | null }[];
  recommendation: string;
}

interface OverlapData {
  hasOverlap: boolean;
  items: OverlapItem[];
}

interface Props {
  clusterId: string;
  projectId: string;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  prerequisite: 'Tiền đề',
  consequence: 'Hệ quả',
  alternative: 'Thay thế',
  component: 'Thành phần',
  example: 'Ví dụ',
  related: 'Liên quan',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  prerequisite: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  consequence: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  alternative: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  component: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  example: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  related: 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border)]',
};

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--text-primary)]">{score}</span>
        <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
      </div>
    </div>
  );
}

// ── Breakdown Bar ──────────────────────────────────────────────────────────────

function BreakdownBar({ label, value, max = 100 }: { label: string; value: number | null; max?: number }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="w-40 text-[var(--text-muted)] shrink-0">{label}</span>
        <span className="text-xs text-[var(--text-muted)] italic">Chưa đặt mục tiêu</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 text-[var(--text-secondary)] shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-[var(--text-primary)]">{value}%</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function TopicalMapEvaluationTab({ clusterId, projectId }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [pages, setPages] = useState<PageAnchor[]>([]);
  const [crossLinks, setCrossLinks] = useState<{ outgoing: CrossClusterLink[]; incoming: CrossClusterLink[] }>({ outgoing: [], incoming: [] });
  const [allClusters, setAllClusters] = useState<ClusterOption[]>([]);
  const [overlapData, setOverlapData] = useState<OverlapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Targets edit state
  const [editTargetKw, setEditTargetKw] = useState('');
  const [editTargetPage, setEditTargetPage] = useState('');
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Cross-link add form
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkForm, setLinkForm] = useState({
    target_cluster_id: '',
    relationship: 'related',
    source_url: '',
    target_url: '',
    anchor_text: '',
  });
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Anchor inline edit
  const [editingAnchorId, setEditingAnchorId] = useState<string | null>(null);
  const [editAnchorTo, setEditAnchorTo] = useState('');
  const [editAnchorFrom, setEditAnchorFrom] = useState('');
  const [isSavingAnchor, setIsSavingAnchor] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, pagesRes, crossRes, clustersRes, overlapRes] = await Promise.all([
        fetch(`/api/v1/topic-clusters?id=${clusterId}&stats=true`),
        fetch(`/api/v1/topic-clusters/pages?clusterId=${clusterId}`),
        fetch(`/api/v1/topic-clusters/cross-links?clusterId=${clusterId}`),
        fetch(`/api/v1/topic-clusters?projectId=${projectId}`),
        fetch(`/api/v1/topic-clusters?id=${clusterId}&overlap=true`),
      ]);

      const statsJson = await statsRes.json();
      const pagesJson = await pagesRes.json();
      const crossJson = await crossRes.json();
      const clustersJson = await clustersRes.json();
      const overlapJson = await overlapRes.json();

      setStats(statsJson);
      setEditTargetKw(String(statsJson.targetKeywordCount ?? 0));
      setEditTargetPage(String(statsJson.targetPageCount ?? 0));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPages((pagesJson.pages ?? []).map((p: any) => ({
        id: p.id,
        url: p.url,
        title: p.title || '',
        anchor_to_pillar: p.anchor_to_pillar || '',
        anchor_from_pillar: p.anchor_from_pillar || '',
      })));

      setCrossLinks(crossJson);

      // All clusters except current
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAllClusters((clustersJson.clusters ?? []).filter((c: any) => c.id !== clusterId));

      const warnings = overlapJson.warnings ?? [];
      setOverlapData({
        hasOverlap: warnings.length > 0,
        items: warnings.map((w: { keyword: string; urls: string[]; urlCount: number }) => ({
          keyword: w.keyword,
          urls: w.urls.map((u: string) => ({ url: u, position: null })),
          recommendation: `Cân nhắc hợp nhất hoặc phân biệt rõ nội dung giữa ${w.urlCount} URL đang cạnh tranh từ khóa này.`,
        })),
      });
    } catch (e) {
      console.error('Failed to fetch evaluation data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [clusterId, projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Save targets ────────────────────────────────────────────────────────────

  const handleSaveTargets = async () => {
    setIsSavingTargets(true);
    try {
      await fetch('/api/v1/topic-clusters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clusterId,
          target_keyword_count: parseInt(editTargetKw) || 0,
          target_page_count: parseInt(editTargetPage) || 0,
        }),
      });
      await fetchAll();
    } catch (e) {
      console.error('Failed to save targets:', e);
    } finally {
      setIsSavingTargets(false);
    }
  };

  // ── Add cross-cluster link ──────────────────────────────────────────────────

  const handleAddLink = async () => {
    if (!linkForm.target_cluster_id) return;
    setIsAddingLink(true);
    try {
      await fetch('/api/v1/topic-clusters/cross-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_cluster_id: clusterId, ...linkForm }),
      });
      setLinkForm({ target_cluster_id: '', relationship: 'related', source_url: '', target_url: '', anchor_text: '' });
      setShowAddLink(false);
      await fetchAll();
    } catch (e) {
      console.error('Failed to add cross-cluster link:', e);
    } finally {
      setIsAddingLink(false);
    }
  };

  // ── Remove cross-cluster link ───────────────────────────────────────────────

  const handleRemoveLink = async (id: string) => {
    if (!confirm('Xóa liên kết này?')) return;
    try {
      await fetch(`/api/v1/topic-clusters/cross-links?id=${id}`, { method: 'DELETE' });
      await fetchAll();
    } catch (e) {
      console.error('Failed to remove link:', e);
    }
  };

  // ── Save anchor inline edit ─────────────────────────────────────────────────

  const startEditAnchor = (page: PageAnchor) => {
    setEditingAnchorId(page.id);
    setEditAnchorTo(page.anchor_to_pillar);
    setEditAnchorFrom(page.anchor_from_pillar);
  };

  const handleSaveAnchor = async () => {
    if (!editingAnchorId) return;
    setIsSavingAnchor(true);
    try {
      await fetch('/api/v1/topic-clusters/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAnchorId,
          anchor_to_pillar: editAnchorTo,
          anchor_from_pillar: editAnchorFrom,
        }),
      });
      setEditingAnchorId(null);
      await fetchAll();
    } catch (e) {
      console.error('Failed to save anchor:', e);
    } finally {
      setIsSavingAnchor(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Đang tải dữ liệu đánh giá...
      </div>
    );
  }

  const completeness = stats?.completeness;
  const pagesWithAnchors = pages.filter((p) => p.anchor_to_pillar.trim() !== '').length;
  const anchorVariety = new Set(pages.map((p) => p.anchor_to_pillar.trim()).filter(Boolean)).size;

  return (
    <div className="space-y-5">

      {/* ── Section 1: Completeness Score ──────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Độ hoàn thiện Cluster</h3>
        </div>

        <div className="flex gap-6 items-start">
          {/* Score ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing score={completeness?.score ?? 0} />
            <span className="text-xs text-[var(--text-muted)]">Điểm tổng</span>
          </div>

          {/* Breakdown bars */}
          <div className="flex-1 space-y-2.5 pt-1">
            <BreakdownBar
              label="Độ phủ từ khóa"
              value={completeness?.breakdown.keywordCoverage ?? null}
            />
            <BreakdownBar
              label="Độ phủ bài viết"
              value={completeness?.breakdown.pageCoverage ?? null}
            />
            <BreakdownBar
              label="Liên kết 2 chiều"
              value={completeness?.breakdown.linkHealth ?? 0}
            />
            <BreakdownBar
              label="Đa dạng anchor"
              value={completeness?.breakdown.anchorDiversity ?? 0}
            />
            {(completeness?.breakdown.overlapPenalty ?? 0) > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="w-40 text-red-400 shrink-0">Phạt trùng lặp</span>
                <span className="text-xs text-red-400 font-medium">
                  -{completeness?.breakdown.overlapPenalty} điểm
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Target inputs */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-3">Mục tiêu cluster</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                Mục tiêu KW
              </label>
              <input
                type="number"
                min="0"
                value={editTargetKw}
                onChange={(e) => setEditTargetKw(e.target.value)}
                className="w-20 px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-center"
              />
              <span className="text-xs text-[var(--text-muted)]">
                (hiện: {stats?.keywordCount ?? 0})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                Mục tiêu bài
              </label>
              <input
                type="number"
                min="0"
                value={editTargetPage}
                onChange={(e) => setEditTargetPage(e.target.value)}
                className="w-20 px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-center"
              />
              <span className="text-xs text-[var(--text-muted)]">
                (hiện: {stats?.pageCount ?? 0})
              </span>
            </div>
            <button
              onClick={handleSaveTargets}
              disabled={isSavingTargets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSavingTargets ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Lưu mục tiêu
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: Anchor Text Distribution ───────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân bố Anchor Text</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>{pagesWithAnchors}/{pages.length} bài có anchor</span>
            <span>·</span>
            <span>{anchorVariety} anchor khác nhau</span>
          </div>
        </div>

        {pages.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">Chưa có bài viết nào</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] bg-[var(--bg-accent)]">
                <th className="px-4 py-2 text-left font-medium">URL</th>
                <th className="px-4 py-2 text-left font-medium">Anchor → Pillar</th>
                <th className="px-4 py-2 text-left font-medium">Anchor Pillar →</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const isEditing = editingAnchorId === page.id;
                return (
                  <tr key={page.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-accent)] transition-colors">
                    <td className="px-4 py-2.5 max-w-[180px]">
                      <a href={page.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-xs truncate block">
                        {page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </a>
                      {page.title && (
                        <span className="text-xs text-[var(--text-muted)] truncate block">{page.title}</span>
                      )}
                    </td>

                    {isEditing ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            autoFocus
                            type="text"
                            value={editAnchorTo}
                            onChange={(e) => setEditAnchorTo(e.target.value)}
                            placeholder="VD: xem thêm về..."
                            className="w-full px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editAnchorFrom}
                            onChange={(e) => setEditAnchorFrom(e.target.value)}
                            placeholder="VD: tìm hiểu thêm..."
                            className="w-full px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={handleSaveAnchor} disabled={isSavingAnchor}
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                              {isSavingAnchor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEditingAnchorId(null)}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5">
                          {page.anchor_to_pillar ? (
                            <span className="text-xs text-[var(--text-primary)] bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                              {page.anchor_to_pillar}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">Chưa có</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {page.anchor_from_pillar ? (
                            <span className="text-xs text-[var(--text-primary)] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              {page.anchor_from_pillar}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">Chưa có</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => startEditAnchor(page)}
                            className="text-xs text-[var(--text-muted)] hover:text-blue-400 px-2 py-0.5 rounded transition-colors"
                          >
                            Sửa
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Section 3: Cross-Cluster Links (Semantic Bridge) ──────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Liên kết Cluster (Semantic Bridge)</h3>
            <span className="text-xs text-[var(--text-muted)]">
              {crossLinks.outgoing.length + crossLinks.incoming.length} liên kết
            </span>
          </div>
          <button
            onClick={() => setShowAddLink(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm liên kết
          </button>
        </div>

        {/* Add form */}
        {showAddLink && (
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-accent)] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Cluster đích *</label>
                <select
                  value={linkForm.target_cluster_id}
                  onChange={(e) => setLinkForm((p) => ({ ...p, target_cluster_id: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                >
                  <option value="">-- Chọn cluster --</option>
                  {allClusters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Quan hệ</label>
                <select
                  value={linkForm.relationship}
                  onChange={(e) => setLinkForm((p) => ({ ...p, relationship: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="url" placeholder="URL nguồn (tùy chọn)" value={linkForm.source_url}
                onChange={(e) => setLinkForm((p) => ({ ...p, source_url: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
              <input type="url" placeholder="URL đích (tùy chọn)" value={linkForm.target_url}
                onChange={(e) => setLinkForm((p) => ({ ...p, target_url: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
            <input type="text" placeholder="Anchor text (tùy chọn)" value={linkForm.anchor_text}
              onChange={(e) => setLinkForm((p) => ({ ...p, anchor_text: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            <div className="flex gap-2">
              <button onClick={handleAddLink} disabled={isAddingLink || !linkForm.target_cluster_id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isAddingLink && <Loader2 className="w-3 h-3 animate-spin" />}
                Thêm
              </button>
              <button onClick={() => setShowAddLink(false)}
                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Links table */}
        {crossLinks.outgoing.length === 0 && crossLinks.incoming.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">
            Chưa có liên kết giữa các cluster
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] bg-[var(--bg-accent)]">
                <th className="px-4 py-2 text-left font-medium">Hướng</th>
                <th className="px-4 py-2 text-left font-medium">Cluster đích/nguồn</th>
                <th className="px-4 py-2 text-left font-medium">Quan hệ</th>
                <th className="px-4 py-2 text-left font-medium">Anchor</th>
                <th className="px-4 py-2 text-center font-medium">Xác nhận</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {crossLinks.outgoing.map((link) => (
                <tr key={link.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-accent)] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      Đi ra
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-[var(--text-primary)] font-medium">{link.target_cluster_name}</span>
                    {link.target_url && (
                      <a href={link.target_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline block truncate max-w-[160px]">
                        {link.target_url.replace(/^https?:\/\/[^/]+/, '') || link.target_url}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${RELATIONSHIP_COLORS[link.relationship] ?? RELATIONSHIP_COLORS.related}`}>
                      {RELATIONSHIP_LABELS[link.relationship] ?? link.relationship}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)] max-w-[120px] truncate">
                    {link.anchor_text || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {link.verified
                      ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                      : <span className="text-xs text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleRemoveLink(link.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {crossLinks.incoming.map((link) => (
                <tr key={link.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-accent)] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Đi vào
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-[var(--text-primary)] font-medium">{link.source_cluster_name}</span>
                    {link.source_url && (
                      <a href={link.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline block truncate max-w-[160px]">
                        {link.source_url.replace(/^https?:\/\/[^/]+/, '') || link.source_url}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${RELATIONSHIP_COLORS[link.relationship] ?? RELATIONSHIP_COLORS.related}`}>
                      {RELATIONSHIP_LABELS[link.relationship] ?? link.relationship}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)] max-w-[120px] truncate">
                    {link.anchor_text || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {link.verified
                      ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                      : <span className="text-xs text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-xs text-[var(--text-muted)] italic">Incoming</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Section 4: Cannibalization ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Phát hiện từ khóa trùng lặp giữa các bài viết trong cluster (keyword cannibalization)</span>
        </div>

        {!overlapData || !overlapData.hasOverlap ? (
          <div className="flex flex-col items-center justify-center py-10 bg-[var(--bg-card)] rounded-xl border border-emerald-500/20">
            <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Không phát hiện trùng lặp</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Các bài viết trong cluster không cạnh tranh từ khóa với nhau
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Phát hiện {overlapData.items.length} từ khóa bị cạnh tranh nội bộ</span>
            </div>

            {overlapData.items.map((item, idx) => (
              <div key={idx} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-accent)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-medium text-[var(--text-primary)] text-sm">{item.keyword}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      — {item.urls.length} URL cùng xếp hạng
                    </span>
                  </div>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-4 py-2 text-left font-medium">URL</th>
                      <th className="px-4 py-2 text-right font-medium">Vị trí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.urls.map((u, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5">
                          <a href={u.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs truncate block max-w-sm">
                            {u.url}
                          </a>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {u.position != null ? (
                            <span className={`text-sm font-medium ${u.position <= 10 ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
                              #{u.position}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-accent)]">
                  <p className="text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-secondary)]">Gợi ý: </span>
                    {item.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
