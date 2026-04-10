'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImageOff, ScanSearch, Wrench, Loader2, CheckCircle2, AlertTriangle, ChevronDown, Image, CircleCheck } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import FixAltTextCandidatesTable, { type AltTextCandidate } from './fix-alt-text-candidates-table';

interface Project {
  id: string;
  name: string;
}

interface ScanResult {
  totalMedia: number;
  missingAltMedia: number;
  totalPosts: number;
  postsWithMissingAlt: number;
  inlineImgsMissingAlt: number;
  candidates: AltTextCandidate[];
}

interface FixResult {
  total: number;
  fixed: number;
  failed: number;
  skipped: number;
  errors: { mediaId?: number; postId?: number; error: string }[];
}

type Phase = 'idle' | 'scanning' | 'scanned' | 'fixing' | 'done';

export default function FixAltTextMainDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [candidates, setCandidates] = useState<AltTextCandidate[]>([]);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [error, setError] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    fetch('/api/v1/projects')
      .then(r => r.json())
      .then(d => {
        const list = d.projects ?? [];
        setProjects(list);
        // Auto-select first project with WP configured
        if (list.length > 0) setSelectedProject(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  // Scan handler
  const handleScan = useCallback(async () => {
    if (!selectedProject) return;
    setPhase('scanning');
    setError('');
    setScanResult(null);
    setFixResult(null);

    try {
      const res = await fetch(`/api/v1/wordpress/fix-alt-text?project_id=${selectedProject}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed');

      setScanResult(data);
      // Mark all candidates as selected by default
      setCandidates((data.candidates ?? []).map((c: AltTextCandidate) => ({ ...c, selected: true })));
      setPhase('scanned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi scan');
      setPhase('idle');
    }
  }, [selectedProject]);

  // Fix handler
  const handleFix = useCallback(async () => {
    const selected = candidates.filter(c => c.selected !== false);
    if (selected.length === 0) return;

    setPhase('fixing');
    setError('');

    try {
      const res = await fetch('/api/v1/wordpress/fix-alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fix',
          project_id: selectedProject,
          candidates: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Fix failed');

      setFixResult(data);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi fix');
      setPhase('scanned'); // allow retry
    }
  }, [candidates, selectedProject]);

  if (loadingProjects) return <PageLoading />;

  const selectedCount = candidates.filter(c => c.selected !== false).length;
  const projectName = projects.find(p => p.id === selectedProject)?.name ?? '';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ImageOff className="w-5 h-5" />
            Fix Alt Text
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Quét và sửa ảnh thiếu alt text trên WordPress
          </p>
        </div>
      </div>

      {/* Project Selector + Scan Button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={selectedProject}
            onChange={e => {
              setSelectedProject(e.target.value);
              setPhase('idle');
              setScanResult(null);
              setCandidates([]);
              setFixResult(null);
            }}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
        </div>

        <button
          onClick={handleScan}
          disabled={phase === 'scanning' || phase === 'fixing' || !selectedProject}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {phase === 'scanning' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Đang quét...</>
          ) : (
            <><ScanSearch className="w-4 h-4" /> Quét ảnh thiếu Alt</>
          )}
        </button>

        {phase === 'scanned' && selectedCount > 0 && (
          <button
            onClick={handleFix}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Fix {selectedCount} ảnh
          </button>
        )}

        {phase === 'fixing' && (
          <span className="inline-flex items-center gap-2 text-sm text-yellow-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang fix {selectedCount} ảnh...
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Scan Summary */}
      {scanResult && phase !== 'idle' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Media Library" value={scanResult.totalMedia} />
          <StatCard label="Media thiếu Alt" value={scanResult.missingAltMedia} highlight={scanResult.missingAltMedia > 0 ? 'red' : 'green'} />
          <StatCard label="Bài viết quét" value={scanResult.totalPosts} />
          <StatCard label="Bài có ảnh lỗi" value={scanResult.postsWithMissingAlt} highlight={scanResult.postsWithMissingAlt > 0 ? 'orange' : 'green'} />
          <StatCard label="Inline thiếu Alt" value={scanResult.inlineImgsMissingAlt} highlight={scanResult.inlineImgsMissingAlt > 0 ? 'orange' : 'green'} />
        </div>
      )}

      {/* Fix Result */}
      {fixResult && phase === 'done' && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-green-400">Hoàn tất!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatCard label="Tổng" value={fixResult.total} />
            <StatCard label="Đã fix" value={fixResult.fixed} highlight="green" />
            <StatCard label="Lỗi" value={fixResult.failed} highlight={fixResult.failed > 0 ? 'red' : 'green'} />
            <StatCard label="Bỏ qua" value={fixResult.skipped} />
          </div>
          {fixResult.errors.length > 0 && (
            <div className="mt-3 text-xs text-red-400 space-y-1">
              {fixResult.errors.slice(0, 10).map((e, i) => (
                <div key={i}>
                  {e.mediaId ? `Media #${e.mediaId}` : `Post #${e.postId}`}: {e.error}
                </div>
              ))}
              {fixResult.errors.length > 10 && (
                <div>...và {fixResult.errors.length - 10} lỗi khác</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Candidates Table */}
      {candidates.length > 0 && phase === 'scanned' && (
        <FixAltTextCandidatesTable
          candidates={candidates}
          onUpdate={setCandidates}
        />
      )}

      {/* Empty States */}
      {phase === 'idle' && (
        <EmptyState
          icon={Image}
          title="Chọn dự án và quét"
          description={`Nhấn "Quét ảnh thiếu Alt" để tìm tất cả ảnh thiếu alt text trên ${projectName || 'WordPress'}.`}
        />
      )}

      {phase === 'scanned' && candidates.length === 0 && (
        <EmptyState
          icon={CircleCheck}
          title="Không tìm thấy ảnh thiếu alt text"
          description="Tất cả ảnh trên WordPress đều đã có alt text. Tốt lắm!"
        />
      )}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: 'red' | 'orange' | 'green' }) {
  const colors = {
    red: 'text-red-400',
    orange: 'text-orange-400',
    green: 'text-green-400',
  };
  return (
    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-center">
      <div className={`text-xl font-bold ${highlight ? colors[highlight] : 'text-[var(--text-primary)]'}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-[var(--text-secondary)] mt-1">{label}</div>
    </div>
  );
}
