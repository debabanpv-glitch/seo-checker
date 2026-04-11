'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, ArrowUpDown, Search } from 'lucide-react';

interface GraphNode {
  id: string;
  title: string;
  group: string;
  internalInLinks: number;
  internalOutLinks: number;
  externalOutLinks: number;
}

interface GraphEdge {
  source: string;
  target: string;
  anchor_text: string;
  position: string;
  nofollow: boolean;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Generic/empty anchors that indicate poor optimization
const GENERIC_ANCHORS = new Set([
  'click here', 'here', 'read more', 'xem thêm', 'xem chi tiết',
  'chi tiết', 'tại đây', 'link', 'bấm vào đây', 'more', 'details',
  '', 'xem ngay', 'đọc thêm',
]);

export function AnchorTextAnalysis({ nodes, edges }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'alpha'>('count');
  const [view, setView] = useState<'top-anchors' | 'by-page' | 'warnings'>('top-anchors');

  // Build node URL → group map
  const nodeGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach(n => map.set(n.id, n.group));
    return map;
  }, [nodes]);

  // Aggregate anchor text stats
  const anchorStats = useMemo(() => {
    const map = new Map<string, { count: number; sources: Set<string>; targets: Set<string>; positions: Set<string> }>();
    for (const e of edges) {
      const anchor = (e.anchor_text || '(trống)').trim();
      const sourceId = typeof e.source === 'object' ? (e.source as GraphNode).id : e.source;
      const targetId = typeof e.target === 'object' ? (e.target as GraphNode).id : e.target;
      if (!map.has(anchor)) {
        map.set(anchor, { count: 0, sources: new Set(), targets: new Set(), positions: new Set() });
      }
      const stat = map.get(anchor)!;
      stat.count++;
      stat.sources.add(sourceId as string);
      stat.targets.add(targetId as string);
      stat.positions.add(e.position);
    }
    return [...map.entries()]
      .map(([anchor, stat]) => ({
        anchor,
        count: stat.count,
        uniqueSources: stat.sources.size,
        uniqueTargets: stat.targets.size,
        positions: [...stat.positions],
        isGeneric: GENERIC_ANCHORS.has(anchor.toLowerCase()),
        isImage: anchor.startsWith('[img:'),
        isEmpty: anchor === '(trống)',
      }))
      .sort((a, b) => sortBy === 'count' ? b.count - a.count : a.anchor.localeCompare(b.anchor));
  }, [edges, sortBy]);

  // Per-page anchor distribution
  const pageAnchorStats = useMemo(() => {
    // Incoming anchors per target page
    const incoming = new Map<string, Map<string, number>>();
    for (const e of edges) {
      const targetId = typeof e.target === 'object' ? (e.target as GraphNode).id : e.target;
      const anchor = (e.anchor_text || '(trống)').trim();
      if (!incoming.has(targetId as string)) incoming.set(targetId as string, new Map());
      const anchors = incoming.get(targetId as string)!;
      anchors.set(anchor, (anchors.get(anchor) || 0) + 1);
    }

    return [...incoming.entries()]
      .map(([url, anchors]) => {
        const node = nodes.find(n => n.id === url);
        const anchorList = [...anchors.entries()].sort((a, b) => b[1] - a[1]);
        const totalLinks = anchorList.reduce((s, [, c]) => s + c, 0);
        const uniqueAnchors = anchorList.length;
        // Diversity score: 1 anchor for all links = 0%, all unique = 100%
        const diversity = totalLinks > 1 ? Math.round((uniqueAnchors / totalLinks) * 100) : 100;
        return {
          url,
          title: node?.title || '',
          group: node?.group || 'Khác',
          totalLinks,
          uniqueAnchors,
          diversity,
          topAnchors: anchorList.slice(0, 5),
        };
      })
      .sort((a, b) => b.totalLinks - a.totalLinks);
  }, [edges, nodes]);

  // Warnings
  const warnings = useMemo(() => {
    const w: Array<{ type: string; message: string; severity: 'high' | 'medium' | 'low'; details: string }> = [];

    // Generic anchors
    const genericCount = anchorStats.filter(a => a.isGeneric).reduce((s, a) => s + a.count, 0);
    if (genericCount > 0) {
      w.push({
        type: 'generic',
        message: `${genericCount} link dùng anchor text chung chung`,
        severity: 'high',
        details: anchorStats.filter(a => a.isGeneric).map(a => `"${a.anchor}" (${a.count}x)`).join(', '),
      });
    }

    // Empty anchors
    const emptyCount = anchorStats.filter(a => a.isEmpty).reduce((s, a) => s + a.count, 0);
    if (emptyCount > 0) {
      w.push({
        type: 'empty',
        message: `${emptyCount} link không có anchor text`,
        severity: 'high',
        details: 'Link không có text hiển thị — ảnh hưởng SEO',
      });
    }

    // Image anchors
    const imgCount = anchorStats.filter(a => a.isImage).reduce((s, a) => s + a.count, 0);
    if (imgCount > 0) {
      w.push({
        type: 'image',
        message: `${imgCount} link dùng hình ảnh làm anchor`,
        severity: 'medium',
        details: 'Kiểm tra alt text của hình ảnh — Google đọc alt thay anchor',
      });
    }

    // Over-optimized (same anchor pointing to same page from many sources)
    const overOptimized = anchorStats.filter(a => a.count > 10 && a.uniqueTargets === 1 && !a.isGeneric && !a.isImage && !a.isEmpty);
    if (overOptimized.length > 0) {
      w.push({
        type: 'over-optimized',
        message: `${overOptimized.length} anchor text có thể bị over-optimized`,
        severity: 'medium',
        details: overOptimized.map(a => `"${a.anchor}" → 1 trang, ${a.count}x`).join(', '),
      });
    }

    // Low diversity pages
    const lowDiversity = pageAnchorStats.filter(p => p.totalLinks > 5 && p.diversity < 20);
    if (lowDiversity.length > 0) {
      w.push({
        type: 'low-diversity',
        message: `${lowDiversity.length} trang có anchor text ít đa dạng (<20%)`,
        severity: 'low',
        details: lowDiversity.map(p => `${p.title.slice(0, 40)} (${p.diversity}%)`).join(', '),
      });
    }

    return w;
  }, [anchorStats, pageAnchorStats]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery) return anchorStats;
    const q = searchQuery.toLowerCase();
    return anchorStats.filter(a => a.anchor.toLowerCase().includes(q));
  }, [anchorStats, searchQuery]);

  const getPath = (url: string) => {
    try { return new URL(url).pathname; } catch { return url; }
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">Phân tích Anchor Text</h3>
        <div className="flex bg-[var(--bg-accent)] rounded-lg p-0.5 border border-[var(--border)]">
          {([['top-anchors', 'Top Anchor'], ['by-page', 'Theo trang'], ['warnings', `Cảnh báo (${warnings.length})`]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setView(val)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                view === val
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Anchors view */}
      {view === 'top-anchors' && (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm anchor text..."
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-accent)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)]"
              />
            </div>
            <button
              onClick={() => setSortBy(prev => prev === 'count' ? 'alpha' : 'count')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortBy === 'count' ? 'Số lượng' : 'A-Z'}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-card)]">
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="py-1.5 pr-2">Anchor Text</th>
                  <th className="py-1.5 px-2 text-right">Lần</th>
                  <th className="py-1.5 px-2 text-right">Nguồn</th>
                  <th className="py-1.5 px-2 text-right">Đích</th>
                  <th className="py-1.5 pl-2">Vị trí</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((a, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-accent)]">
                    <td className="py-1.5 pr-2 max-w-xs truncate">
                      <span className={`${a.isGeneric ? 'text-red-500' : a.isImage ? 'text-amber-500' : a.isEmpty ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>
                        {a.anchor.length > 60 ? a.anchor.slice(0, 60) + '...' : a.anchor}
                      </span>
                      {a.isGeneric && <span className="ml-1 text-red-400" title="Anchor chung chung">⚠</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-[var(--text-secondary)]">{a.count}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-[var(--text-muted)]">{a.uniqueSources}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-[var(--text-muted)]">{a.uniqueTargets}</td>
                    <td className="py-1.5 pl-2 text-[var(--text-muted)]">{a.positions.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="text-xs text-[var(--text-muted)] text-center py-2">
                Hiện 100/{filtered.length} anchor text
              </div>
            )}
          </div>
        </>
      )}

      {/* By Page view */}
      {view === 'by-page' && (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-card)]">
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="py-1.5 pr-2">Trang</th>
                <th className="py-1.5 px-2">Nhóm</th>
                <th className="py-1.5 px-2 text-right">Links</th>
                <th className="py-1.5 px-2 text-right">Anchor</th>
                <th className="py-1.5 px-2 text-right">Đa dạng</th>
                <th className="py-1.5 pl-2">Top anchor</th>
              </tr>
            </thead>
            <tbody>
              {pageAnchorStats.slice(0, 80).map((p, i) => (
                <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-accent)]">
                  <td className="py-1.5 pr-2 max-w-[180px] truncate text-[var(--text-primary)]" title={p.title}>
                    {p.title || getPath(p.url)}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-muted)]">{p.group}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{p.totalLinks}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{p.uniqueAnchors}</td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`tabular-nums ${p.diversity < 20 ? 'text-red-500' : p.diversity < 50 ? 'text-amber-500' : 'text-green-500'}`}>
                      {p.diversity}%
                    </span>
                  </td>
                  <td className="py-1.5 pl-2 max-w-[200px] truncate text-[var(--text-muted)]">
                    {p.topAnchors.slice(0, 3).map(([a, c]) => `${a}(${c})`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Warnings view */}
      {view === 'warnings' && (
        <div className="space-y-2">
          {warnings.length === 0 ? (
            <div className="text-sm text-green-500 py-4 text-center">Không có cảnh báo nào</div>
          ) : (
            warnings.map((w, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs ${
                  w.severity === 'high'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : w.severity === 'medium'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {w.message}
                </div>
                <div className="mt-1 opacity-75">{w.details}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
