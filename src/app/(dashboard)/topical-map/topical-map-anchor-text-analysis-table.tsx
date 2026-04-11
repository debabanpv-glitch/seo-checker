'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { AlertTriangle, ArrowUpDown, Search } from 'lucide-react';
import * as d3 from 'd3';

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

// --- D3 Treemap component for anchor text visualization ---
function TreemapChart({ anchorStats }: { anchorStats: Array<{ anchor: string; count: number; uniqueTargets: number; isGeneric: boolean; isImage: boolean; isEmpty: boolean }> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<string | null>(null);

  const top30 = useMemo(() =>
    anchorStats.filter(a => !a.isEmpty).slice(0, 30),
    [anchorStats]
  );

  const tiles = useMemo(() => {
    if (top30.length === 0) return [];
    const width = 800;
    const height = 400;

    // Build hierarchy data
    const root = d3.hierarchy({ children: top30.map(a => ({ ...a, value: a.count })) })
      .sum(d => (d as any).value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<any>()
      .size([width, height])
      .padding(2)
      .round(true)(root);

    return root.leaves().map(leaf => {
      const d = leaf.data;
      return {
        x: leaf.x0!,
        y: leaf.y0!,
        w: leaf.x1! - leaf.x0!,
        h: leaf.y1! - leaf.y0!,
        anchor: d.anchor,
        count: d.count,
        uniqueTargets: d.uniqueTargets,
        isGeneric: d.isGeneric,
        isImage: d.isImage,
      };
    });
  }, [top30]);

  const getColor = (t: typeof tiles[0]) => {
    if (t.isGeneric) return { bg: '#dc2626', text: '#ffffff' }; // red
    if (t.isImage) return { bg: '#d97706', text: '#ffffff' }; // amber
    // Blue gradient based on count
    const maxCount = tiles[0]?.count || 1;
    const ratio = t.count / maxCount;
    if (ratio > 0.5) return { bg: '#1e40af', text: '#ffffff' };
    if (ratio > 0.2) return { bg: '#3b82f6', text: '#ffffff' };
    return { bg: '#93c5fd', text: '#1e3a5f' };
  };

  return (
    <div>
      <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Top 30 Anchor Text</div>
      <div ref={containerRef} className="relative rounded-lg overflow-hidden border border-[var(--border)]" style={{ aspectRatio: '2/1' }}>
        <svg viewBox="0 0 800 400" className="w-full h-full">
          {tiles.map((t, i) => {
            const colors = getColor(t);
            const isHovered = hoveredAnchor === t.anchor;
            const showLabel = t.w > 40 && t.h > 20;
            const showCount = t.w > 50 && t.h > 35;
            const fontSize = Math.min(Math.max(t.w / 10, 8), 14);
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredAnchor(t.anchor)}
                onMouseLeave={() => setHoveredAnchor(null)}
                className="cursor-pointer"
              >
                <rect
                  x={t.x}
                  y={t.y}
                  width={t.w}
                  height={t.h}
                  rx={3}
                  fill={colors.bg}
                  stroke={isHovered ? '#000' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isHovered ? 2 : 0.5}
                  opacity={hoveredAnchor && !isHovered ? 0.5 : 1}
                />
                {showLabel && (
                  <text
                    x={t.x + t.w / 2}
                    y={t.y + t.h / 2 - (showCount ? 5 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={colors.text}
                    fontSize={fontSize}
                    fontWeight="500"
                  >
                    {t.anchor.length > Math.floor(t.w / (fontSize * 0.6))
                      ? t.anchor.slice(0, Math.floor(t.w / (fontSize * 0.6))) + '…'
                      : t.anchor}
                  </text>
                )}
                {showCount && (
                  <text
                    x={t.x + t.w / 2}
                    y={t.y + t.h / 2 + fontSize * 0.8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={colors.text}
                    fontSize={Math.max(fontSize - 3, 8)}
                    opacity={0.7}
                  >
                    {t.count.toLocaleString()}x
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredAnchor && (() => {
          const t = tiles.find(t => t.anchor === hoveredAnchor);
          if (!t) return null;
          return (
            <div className="absolute bottom-2 left-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none">
              <div className="font-medium text-[var(--text-primary)]">&quot;{t.anchor}&quot;</div>
              <div className="text-[var(--text-muted)]">{t.count}x · →{t.uniqueTargets} trang{t.isGeneric ? ' · ⚠ Generic' : ''}</div>
            </div>
          );
        })()}
      </div>
      <div className="flex gap-4 text-[10px] text-[var(--text-muted)] mt-1.5">
        <span><span className="inline-block w-3 h-2 rounded-sm mr-1" style={{ backgroundColor: '#3b82f6' }} />Bình thường</span>
        <span><span className="inline-block w-3 h-2 rounded-sm mr-1" style={{ backgroundColor: '#dc2626' }} />Generic</span>
        <span><span className="inline-block w-3 h-2 rounded-sm mr-1" style={{ backgroundColor: '#d97706' }} />Hình ảnh</span>
        <span>Ô lớn = dùng nhiều</span>
      </div>
    </div>
  );
}

export function AnchorTextAnalysis({ nodes, edges }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'alpha'>('count');
  const [view, setView] = useState<'chart' | 'top-anchors' | 'by-page' | 'warnings'>('chart');

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
          {([['chart', 'Biểu đồ'], ['top-anchors', 'Bảng chi tiết'], ['by-page', 'Theo trang'], ['warnings', `Cảnh báo (${warnings.length})`]] as const).map(([val, label]) => (
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

      {/* Chart view — Donut + Bar charts (simple, readable) */}
      {view === 'chart' && (() => {
        const total = anchorStats.reduce((s, a) => s + a.count, 0);
        const normalCount = anchorStats.filter(a => !a.isGeneric && !a.isEmpty && !a.isImage).reduce((s, a) => s + a.count, 0);
        const genericCount = anchorStats.filter(a => a.isGeneric).reduce((s, a) => s + a.count, 0);
        const emptyCount = anchorStats.filter(a => a.isEmpty).reduce((s, a) => s + a.count, 0);
        const imageCount = anchorStats.filter(a => a.isImage).reduce((s, a) => s + a.count, 0);

        // Donut segments
        const segments = [
          { label: 'Bình thường', value: normalCount, color: '#3b82f6' },
          { label: 'Generic', value: genericCount, color: '#ef4444' },
          { label: 'Trống', value: emptyCount, color: '#6b7280' },
          { label: 'Hình ảnh', value: imageCount, color: '#f59e0b' },
        ].filter(s => s.value > 0);

        // SVG donut arcs
        let cumulativePercent = 0;
        const donutSegments = segments.map(seg => {
          const percent = seg.value / total;
          const startAngle = cumulativePercent * 2 * Math.PI;
          cumulativePercent += percent;
          const endAngle = cumulativePercent * 2 * Math.PI;
          const x1 = Math.cos(startAngle - Math.PI / 2) * 40;
          const y1 = Math.sin(startAngle - Math.PI / 2) * 40;
          const x2 = Math.cos(endAngle - Math.PI / 2) * 40;
          const y2 = Math.sin(endAngle - Math.PI / 2) * 40;
          const largeArc = percent > 0.5 ? 1 : 0;
          return { ...seg, percent, d: `M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2}` };
        });

        // Top 15 anchors for bar chart
        const top15 = anchorStats.filter(a => !a.isEmpty).slice(0, 15);
        const barMax = top15[0]?.count || 1;

        return (
          <div className="space-y-5">
            {/* Donut + Stats */}
            <div className="flex gap-6 items-start">
              <div className="shrink-0">
                <svg width="120" height="120" viewBox="-50 -50 100 100">
                  {donutSegments.map((seg, i) => (
                    <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth="16" strokeLinecap="round" />
                  ))}
                  <text x="0" y="-4" textAnchor="middle" className="text-lg font-bold fill-[var(--text-primary)]">{anchorStats.length}</text>
                  <text x="0" y="10" textAnchor="middle" className="text-[8px] fill-[var(--text-muted)]">unique</text>
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-xs font-medium text-[var(--text-secondary)]">Phân loại Anchor Text</div>
                {segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs text-[var(--text-primary)] flex-1">{seg.label}</span>
                    <span className="text-xs font-medium tabular-nums">{seg.value.toLocaleString()}</span>
                    <span className="text-[10px] text-[var(--text-muted)] w-10 text-right">{Math.round(seg.value / total * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 15 Anchor Text — horizontal bar chart */}
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-3">Top 15 Anchor Text được dùng nhiều nhất</div>
              <div className="space-y-1">
                {top15.map((a, i) => {
                  const pct = (a.count / barMax) * 100;
                  const color = a.isGeneric ? '#ef4444' : a.isImage ? '#d97706' : '#3b82f6';
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs hover:bg-[var(--bg-accent)] rounded px-1 py-1">
                      <span className="w-[180px] truncate text-[var(--text-primary)] shrink-0" title={a.anchor}>
                        {a.isGeneric && <span className="text-red-400 mr-1">⚠</span>}
                        {a.anchor}
                      </span>
                      <div className="flex-1 h-5 bg-[var(--bg-accent)] rounded overflow-hidden">
                        <div className="h-full rounded flex items-center px-1.5" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}>
                          <span className="text-[10px] text-white font-medium whitespace-nowrap">{a.count.toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] w-20 text-right shrink-0">→{a.uniqueTargets} trang</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-[10px] text-[var(--text-muted)] mt-2">
                <span><span className="inline-block w-2.5 h-2 rounded-sm mr-1" style={{ backgroundColor: '#3b82f6' }} />Bình thường</span>
                <span><span className="inline-block w-2.5 h-2 rounded-sm mr-1" style={{ backgroundColor: '#ef4444' }} />⚠ Generic</span>
                <span><span className="inline-block w-2.5 h-2 rounded-sm mr-1" style={{ backgroundColor: '#d97706' }} />Hình ảnh</span>
              </div>
            </div>

            {/* Top 10 pages receiving most links */}
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-3">Top 10 trang nhận nhiều internal link nhất</div>
              <div className="space-y-1">
                {pageAnchorStats.slice(0, 10).map((p, i) => {
                  const maxLinks = pageAnchorStats[0]?.totalLinks || 1;
                  const pct = (p.totalLinks / maxLinks) * 100;
                  const color = p.diversity < 20 ? '#ef4444' : p.diversity < 50 ? '#f59e0b' : '#3b82f6';
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs hover:bg-[var(--bg-accent)] rounded px-1 py-1">
                      <span className="w-[200px] truncate text-[var(--text-primary)] shrink-0" title={p.title}>
                        {p.title || getPath(p.url)}
                      </span>
                      <div className="flex-1 h-5 bg-[var(--bg-accent)] rounded overflow-hidden">
                        <div className="h-full rounded flex items-center px-1.5" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}>
                          <span className="text-[10px] text-white font-medium whitespace-nowrap">{p.totalLinks} links</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] w-16 text-right shrink-0">{p.uniqueAnchors} anchor</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-2">
                Màu = đa dạng anchor: <span className="text-blue-500">xanh tốt ({'>'}50%)</span> · <span className="text-amber-500">vàng TB (20-50%)</span> · <span className="text-red-500">đỏ kém ({'<'}20%)</span>
              </div>
            </div>
          </div>
        );
      })()}

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
