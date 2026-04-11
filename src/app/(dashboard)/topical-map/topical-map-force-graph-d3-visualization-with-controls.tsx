'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Network, Upload, Trash2, RefreshCw, ExternalLink, Search } from 'lucide-react';
import * as d3 from 'd3';
// Anchor Text Analysis moved to separate tab (topical-map-anchor-analysis-full-page.tsx)

// --- Types ---

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  status: number;
  internalInLinks: number;
  internalOutLinks: number;
  externalOutLinks: number;
  group: string;
  clickDepth: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  anchor_text: string;
  position: string;
  nofollow: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    totalPages: number;
    totalInternalLinks: number;
    totalExternalLinks: number;
    avgInLinksPerPage: number;
    orphanPages: number;
  };
}

interface CrawlSession {
  id: string;
  domain: string;
  total_pages: number;
  total_links: number;
  internal_links: number;
  external_links: number;
  crawled_at: string;
}

interface Props {
  projectId: string;
}

// --- Color palette for clusters/groups ---
const COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#65a30d',
];

// --- Component ---

export function TopicalMapForceGraph({ projectId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [forceStrength, setForceStrength] = useState(50);
  const [nodeScale, setNodeScale] = useState(50);
  const [showLabels, setShowLabels] = useState(false);
  const [excludeNav, setExcludeNav] = useState(true);
  const [showExternal, setShowExternal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [linkDirection, setLinkDirection] = useState<'all' | 'in' | 'out'>('all');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pageSearch, setPageSearch] = useState('');
  const [pageSortBy, setPageSortBy] = useState<'depth' | 'inLinks' | 'outLinks'>('depth');
  const [depthFilter, setDepthFilter] = useState<'all' | '4+' | '3' | '2' | '1' | '0' | 'unreachable'>('4+');

  // Tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  // --- Fetch sessions ---
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/v1/crawl?projectId=${projectId}`)
      .then(r => r.json())
      .then(d => {
        const list = d.sessions || [];
        setSessions(list);
        if (list.length > 0) setSelectedSessionId(list[0].id);
      })
      .catch(e => setError(e.message));
  }, [projectId]);

  // --- Fetch graph data ---
  const fetchGraph = useCallback(async () => {
    if (!projectId) return;
    // No session = no data yet, show empty state instead of error
    if (sessions.length === 0 && !selectedSessionId) {
      setGraphData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        projectId,
        graph: 'true',
        linkType: showExternal ? 'all' : 'internal',
      });
      if (selectedSessionId) params.set('sessionId', selectedSessionId);
      if (excludeNav) params.set('excludePositions', 'navigation,header,footer');

      const res = await fetch(`/api/v1/crawl?${params}`);
      if (!res.ok) throw new Error('Failed to load graph');
      const data = await res.json();
      setGraphData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, selectedSessionId, excludeNav, showExternal, sessions.length]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // --- Import JSON file ---
  const handleImport = async () => {
    if (!importFile || !projectId) return;
    setIsImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/v1/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, data }),
      });
      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      // Refresh sessions
      const sessRes = await fetch(`/api/v1/crawl?projectId=${projectId}`);
      const sessData = await sessRes.json();
      setSessions(sessData.sessions || []);
      setSelectedSessionId(result.sessionId);
      setImportFile(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsImporting(false);
    }
  };

  // --- Delete session ---
  const handleDelete = async (sessionId: string) => {
    if (!confirm('Xóa dữ liệu crawl này?')) return;
    await fetch(`/api/v1/crawl?sessionId=${sessionId}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      setGraphData(null);
    }
  };

  // --- D3 Force Simulation ---
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const { nodes, edges } = graphData;
    if (nodes.length === 0) return;

    // Deep clone nodes to avoid D3 mutation issues
    const simNodes: GraphNode[] = nodes.map(n => ({ ...n }));
    const simEdges: GraphEdge[] = edges.map(e => ({ ...e }));

    // Node size based on inbound links — more inlinks = more important
    // Min size 8px so all nodes are visible, max 35px to avoid overlap
    const nodeWeight = (n: GraphNode) => n.internalInLinks;
    const maxLinks = Math.max(...simNodes.map(nodeWeight), 1);
    const scaleFactor = nodeScale / 50;
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxLinks])
      .range([8 * scaleFactor, 35 * scaleFactor]);

    // Build group → color index map from node groups
    const groupNames = [...new Set(simNodes.map(n => n.group))].sort();
    const groupColorMap = new Map<string, number>();
    groupNames.forEach((g, i) => groupColorMap.set(g, i % COLORS.length));
    const getGroupColor = (group: string) => COLORS[groupColorMap.get(group) ?? 0];

    // Container group for zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Arrow markers for directed edges — larger + more visible
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -6 12 12')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b');
    // Highlighted arrow
    defs.append('marker')
      .attr('id', 'arrowhead-hover')
      .attr('viewBox', '0 -6 12 12')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3b82f6');

    // Draw edges — darker lines with arrow markers
    const link = g.append('g')
      .selectAll('line')
      .data(simEdges)
      .enter().append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(simNodes)
      .enter().append('circle')
      .attr('r', d => radiusScale(nodeWeight(d)))
      .attr('fill', d => getGroupColor(d.group))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2.5);
        // Highlight connected edges with color + arrow
        const isConnected = (l: GraphEdge) => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return s === d.id || t === d.id;
        };
        link
          .attr('stroke-opacity', l => isConnected(l) ? 0.9 : 0.08)
          .attr('stroke-width', l => isConnected(l) ? 2.5 : 0.5)
          .attr('stroke', l => isConnected(l) ? getGroupColor(d.group) : '#cbd5e1')
          .attr('marker-end', l => isConnected(l) ? 'url(#arrowhead-hover)' : 'url(#arrowhead)');
        // Dim non-connected nodes
        node.attr('opacity', n => {
          if (n.id === d.id) return 1;
          const connected = simEdges.some(l => {
            const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return (s === d.id && t === n.id) || (t === d.id && s === n.id);
          });
          return connected ? 1 : 0.15;
        });
        setTooltip({ x: event.pageX, y: event.pageY, node: d });
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
        link.attr('stroke-opacity', 0.6).attr('stroke-width', 1.5).attr('stroke', '#64748b').attr('marker-end', 'url(#arrowhead)');
        node.attr('opacity', 1);
        setTooltip(null);
      })
      .on('click', (_, d) => setSelectedNode(d));

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    node.call(drag);

    // Labels
    const labels = g.append('g')
      .selectAll('text')
      .data(simNodes)
      .enter().append('text')
      .text(d => {
        try {
          const path = new URL(d.id).pathname;
          return path.length > 40 ? '...' + path.slice(-37) : path;
        } catch { return d.id; }
      })
      .attr('font-size', 9)
      .attr('fill', 'var(--text-secondary)')
      .attr('text-anchor', 'middle')
      .attr('dy', d => radiusScale(nodeWeight(d)) + 12)
      .attr('pointer-events', 'none')
      .style('display', showLabels ? 'block' : 'none');

    // Force simulation — scale forces based on node count
    const forceVal = forceStrength / 50;
    const nodeCount = simNodes.length;
    const chargeStrength = nodeCount > 200 ? -300 : nodeCount > 50 ? -200 : -150;
    const linkDist = nodeCount > 200 ? 120 : nodeCount > 50 ? 100 : 80;

    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(simEdges)
        .id(d => d.id)
        .distance(linkDist * forceVal)
        .strength(0.2))
      .force('charge', d3.forceManyBody().strength(chargeStrength * forceVal))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => radiusScale(nodeWeight(d)) + 3))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x!)
          .attr('y1', d => (d.source as GraphNode).y!)
          .attr('x2', d => (d.target as GraphNode).x!)
          .attr('y2', d => (d.target as GraphNode).y!);
        node
          .attr('cx', d => d.x!)
          .attr('cy', d => d.y!);
        labels
          .attr('x', d => d.x!)
          .attr('y', d => d.y!);
      });

    simulationRef.current = simulation;

    // Fit to screen after initial settle
    setTimeout(() => {
      const bounds = (g.node() as SVGGElement)?.getBBox();
      if (bounds) {
        const scale = Math.min(
          width / (bounds.width + 100),
          height / (bounds.height + 100),
          1.5
        );
        const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
        const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;
        svg.transition().duration(500).call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }, 2000);

    return () => { simulation.stop(); };
  }, [graphData, forceStrength, nodeScale, showLabels]);

  // --- Highlight group filter + link direction (without re-running simulation) ---
  useEffect(() => {
    if (!svgRef.current || !graphData) return;
    const svg = d3.select(svgRef.current);
    const hasFilter = selectedGroups.size > 0;

    if (!hasFilter && linkDirection === 'all') {
      // Reset all
      svg.selectAll('circle').attr('opacity', 1);
      svg.selectAll('line').attr('opacity', 0.5).style('display', 'block');
      svg.selectAll('text').attr('opacity', 1);
      return;
    }

    // Get filtered URLs
    const groupUrls = hasFilter
      ? new Set(graphData.nodes.filter(n => selectedGroups.has(n.group)).map(n => n.id))
      : new Set(graphData.nodes.map(n => n.id));

    svg.selectAll<SVGCircleElement, GraphNode>('circle')
      .attr('opacity', d => groupUrls.has(d.id) ? 1 : 0.08);

    svg.selectAll<SVGLineElement, GraphEdge>('line')
      .each(function (l) {
        const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
        const sourceInGroup = groupUrls.has(s as string);
        const targetInGroup = groupUrls.has(t as string);

        let visible = sourceInGroup || targetInGroup;

        // Link direction filter
        if (visible && hasFilter && linkDirection !== 'all') {
          if (linkDirection === 'out') {
            // Only show links going OUT from selected group
            visible = sourceInGroup;
          } else if (linkDirection === 'in') {
            // Only show links coming IN to selected group
            visible = targetInGroup;
          }
        }

        d3.select(this)
          .style('display', visible ? 'block' : 'none')
          .attr('opacity', visible ? 0.7 : 0.02);
      });

    svg.selectAll<SVGTextElement, GraphNode>('text')
      .attr('opacity', d => groupUrls.has(d.id) ? 1 : 0);
  }, [selectedGroups, linkDirection, graphData]);

  // --- Extract path for display ---
  const getPath = (url: string) => {
    try { return new URL(url).pathname; } catch { return url; }
  };

  // --- Render ---
  const currentSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="space-y-3">
      {/* Top bar: session selector + import */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Session selector */}
        {sessions.length > 0 && (
          <select
            value={selectedSessionId || ''}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.domain} — {new Date(s.crawled_at).toLocaleDateString('vi')} ({s.total_pages} trang)
              </option>
            ))}
          </select>
        )}

        {/* Import */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm cursor-pointer hover:bg-[var(--bg-accent)] transition-colors">
          <Upload className="w-4 h-4" />
          Import JSON
          <input type="file" accept=".json" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
        </label>
        {importFile && (
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isImporting ? 'Đang import...' : `Import ${importFile.name}`}
          </button>
        )}

        {/* Delete */}
        {selectedSessionId && (
          <button
            onClick={() => handleDelete(selectedSessionId)}
            className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            title="Xóa session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Refresh */}
        <button onClick={fetchGraph} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Tải lại">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary stats */}
      {graphData && (
        <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
          <span><strong>{graphData.summary.totalPages}</strong> trang</span>
          <span><strong>{graphData.summary.totalInternalLinks}</strong> link nội bộ</span>
          <span>TB <strong>{graphData.summary.avgInLinksPerPage}</strong> link vào/trang</span>
          {graphData.summary.orphanPages > 0 && (
            <span className="text-amber-500"><strong>{graphData.summary.orphanPages}</strong> mồ côi</span>
          )}
          {graphData.summary.clickDepthDistribution && (() => {
            const d = graphData.summary.clickDepthDistribution;
            return (
              <span className="flex items-center gap-1">
                Click depth:
                <span className="text-green-600" title="Depth 0-1">{d.depth0 + d.depth1}</span>/
                <span className="text-blue-500" title="Depth 2">{d.depth2}</span>/
                <span className="text-amber-500" title="Depth 3">{d.depth3}</span>/
                <span className={d.depth4plus > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'} title="Depth 4+">{d.depth4plus}</span>
                {d.unreachable > 0 && <span className="text-red-500" title="Không truy cập được từ trang chủ">({d.unreachable} ∞)</span>}
              </span>
            );
          })()}
        </div>
      )}

      {/* Main area: graph + controls sidebar */}
      <div className="flex gap-3" style={{ height: '70vh' }}>
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl relative overflow-hidden"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/80 z-10">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm z-10">
              {error}
            </div>
          )}
          {!graphData && !isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
              <Network className="w-12 h-12 opacity-30" />
              <p className="text-sm">Chưa có dữ liệu crawl. Import file JSON từ crawler.</p>
              <code className="text-xs bg-[var(--bg-accent)] px-3 py-1.5 rounded">
                python3 scripts/crawl-internal-links.py https://domain.com
              </code>
            </div>
          )}
          <svg ref={svgRef} className="w-full h-full" />

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg px-3 py-2 text-xs max-w-xs pointer-events-none"
              style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
            >
              <div className="font-medium text-[var(--text-primary)] truncate">{tooltip.node.title || getPath(tooltip.node.id)}</div>
              <div className="text-[var(--text-muted)] truncate">{getPath(tooltip.node.id)}</div>
              <div className="flex gap-3 mt-1 text-[var(--text-secondary)]">
                <span>← {tooltip.node.internalInLinks} vào</span>
                <span>→ {tooltip.node.internalOutLinks} ra</span>
                <span>🔽 depth {tooltip.node.clickDepth === -1 ? '∞' : tooltip.node.clickDepth}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: controls + all pages */}
        <div className="w-64 shrink-0 flex flex-col gap-3 overflow-hidden">
          {/* Force slider */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Lực đẩy</label>
            <input
              type="range" min={10} max={100} value={forceStrength}
              onChange={e => setForceStrength(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Size slider */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Kích thước</label>
            <input
              type="range" min={20} max={100} value={nodeScale}
              onChange={e => setNodeScale(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox" checked={showLabels}
                onChange={e => setShowLabels(e.target.checked)}
                className="accent-blue-500"
              />
              Hiện nhãn
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox" checked={excludeNav}
                onChange={e => setExcludeNav(e.target.checked)}
                className="accent-blue-500"
              />
              Ẩn link nav/header/footer
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox" checked={showExternal}
                onChange={e => setShowExternal(e.target.checked)}
                className="accent-blue-500"
              />
              Hiện link ngoài
            </label>
          </div>

          {/* Link direction filter */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Hướng liên kết</label>
            <div className="flex bg-[var(--bg-accent)] rounded-lg p-0.5 border border-[var(--border)]">
              {([['all', 'Tất cả'], ['in', '← Vào'], ['out', '→ Ra']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLinkDirection(val)}
                  className={`flex-1 px-2 py-1 rounded-md text-xs transition-colors ${
                    linkDirection === val
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected node detail */}
          {selectedNode && (
            <div className="bg-[var(--bg-accent)] border border-[var(--border)] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-primary)]">Chi tiết trang</span>
                <button onClick={() => setSelectedNode(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
              </div>
              <div className="text-xs text-[var(--text-secondary)] break-all">
                <div className="font-medium">{selectedNode.title || '(không có title)'}</div>
                <div className="text-[var(--text-muted)] mt-1">{getPath(selectedNode.id)}</div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="bg-[var(--bg-card)] rounded p-1.5">
                  <div className="font-bold text-blue-500">{selectedNode.internalInLinks}</div>
                  <div className="text-[var(--text-muted)]">Vào</div>
                </div>
                <div className="bg-[var(--bg-card)] rounded p-1.5">
                  <div className="font-bold text-green-500">{selectedNode.internalOutLinks}</div>
                  <div className="text-[var(--text-muted)]">Ra</div>
                </div>
                <div className="bg-[var(--bg-card)] rounded p-1.5">
                  <div className={`font-bold ${selectedNode.clickDepth > 3 ? 'text-red-500' : selectedNode.clickDepth === -1 ? 'text-red-500' : 'text-purple-500'}`}>
                    {selectedNode.clickDepth === -1 ? '∞' : selectedNode.clickDepth}
                  </div>
                  <div className="text-[var(--text-muted)]">Depth</div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">Nhóm: {selectedNode.group}</div>
              <a
                href={selectedNode.id}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Mở trang
              </a>
            </div>
          )}

          {/* Legend — dynamic from graph data */}
          <div className="text-xs space-y-2">
            <div className="font-medium text-[var(--text-secondary)]">Chú thích</div>
            <div className="text-[var(--text-muted)] space-y-0.5">
              <div>Node lớn = nhiều internal links</div>
              <div>Mũi tên = hướng liên kết</div>
              <div>Kéo node, scroll zoom</div>
            </div>
            {graphData && (() => {
              const groups = [...new Set(graphData.nodes.map(n => n.group))].sort();
              const toggleGroup = (group: string) => {
                setSelectedGroups(prev => {
                  const next = new Set(prev);
                  if (next.has(group)) next.delete(group);
                  else next.add(group);
                  return next;
                });
              };
              return (
                <div className="space-y-1 pt-1 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[var(--text-secondary)]">Nhóm trang</div>
                    {selectedGroups.size > 0 && (
                      <button
                        onClick={() => setSelectedGroups(new Set())}
                        className="text-[10px] text-blue-500 hover:underline"
                      >
                        Bỏ lọc
                      </button>
                    )}
                  </div>
                  {groups.map(group => {
                    const count = graphData.nodes.filter(n => n.group === group).length;
                    const colorIdx = groups.indexOf(group) % COLORS.length;
                    const isActive = selectedGroups.has(group);
                    const hasFilter = selectedGroups.size > 0;
                    return (
                      <div
                        key={group}
                        onClick={() => toggleGroup(group)}
                        className={`flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 transition-colors ${
                          isActive
                            ? 'bg-blue-50 ring-1 ring-blue-300'
                            : hasFilter
                              ? 'opacity-40 hover:opacity-70'
                              : 'hover:bg-[var(--bg-accent)]'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[colorIdx] }} />
                        <span className="text-[var(--text-secondary)] truncate flex-1">{group}</span>
                        <span className="text-[var(--text-muted)] tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* All Pages panel */}
          {graphData && graphData.nodes.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">All pages</span>
                  <select
                    value={pageSortBy}
                    onChange={e => setPageSortBy(e.target.value as 'depth' | 'inLinks' | 'outLinks')}
                    className="px-1.5 py-0.5 bg-[var(--bg-accent)] border border-[var(--border)] rounded text-[10px] text-[var(--text-primary)]"
                  >
                    <option value="depth">Click depth</option>
                    <option value="inLinks">Links vào</option>
                    <option value="outLinks">Links ra</option>
                  </select>
                </div>
                {/* Depth filter tabs */}
                <div className="flex flex-wrap gap-1">
                  {([
                    ['all', 'Tất cả'],
                    ['4+', '4+ ⚠'],
                    ['unreachable', '∞'],
                    ['3', 'D3'],
                    ['2', 'D2'],
                    ['1', 'D1'],
                    ['0', 'D0'],
                  ] as const).map(([val, label]) => {
                    const count = val === 'all' ? graphData.nodes.length
                      : val === '4+' ? graphData.nodes.filter(n => n.clickDepth >= 4).length
                      : val === 'unreachable' ? graphData.nodes.filter(n => n.clickDepth === -1).length
                      : graphData.nodes.filter(n => n.clickDepth === Number(val)).length;
                    return (
                      <button
                        key={val}
                        onClick={() => setDepthFilter(val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                          depthFilter === val
                            ? val === '4+' || val === 'unreachable'
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                              : 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                            : 'bg-[var(--bg-accent)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        {label} <span className="opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={pageSearch}
                    onChange={e => setPageSearch(e.target.value)}
                    placeholder="Tìm trang..."
                    className="w-full pl-7 pr-2 py-1 bg-[var(--bg-accent)] border border-[var(--border)] rounded text-[10px] text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const q = pageSearch.toLowerCase();
                  const filtered = graphData.nodes
                    .filter(n => {
                      // Depth filter
                      if (depthFilter === '4+' && n.clickDepth < 4 && n.clickDepth !== -1) return false;
                      if (depthFilter === 'unreachable' && n.clickDepth !== -1) return false;
                      if (['0', '1', '2', '3'].includes(depthFilter) && n.clickDepth !== Number(depthFilter)) return false;
                      // Search filter
                      if (q && !n.title.toLowerCase().includes(q) && !n.id.toLowerCase().includes(q)) return false;
                      return true;
                    })
                    .sort((a, b) => {
                      if (pageSortBy === 'depth') return (a.clickDepth === -1 ? 999 : a.clickDepth) - (b.clickDepth === -1 ? 999 : b.clickDepth);
                      if (pageSortBy === 'inLinks') return b.internalInLinks - a.internalInLinks;
                      return b.internalOutLinks - a.internalOutLinks;
                    });
                  return filtered.slice(0, 200).map(n => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNode(n)}
                      className={`px-3 py-1.5 border-b border-[var(--border)]/30 cursor-pointer hover:bg-[var(--bg-accent)] transition-colors ${
                        selectedNode?.id === n.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="text-[10px] text-[var(--text-primary)] truncate" title={n.title}>
                        {n.title || getPath(n.id)}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)]">
                        <span className="truncate flex-1">{getPath(n.id)}</span>
                        <span className={`shrink-0 ${n.clickDepth > 3 ? 'text-red-500' : n.clickDepth === -1 ? 'text-red-500' : ''}`}>
                          d:{n.clickDepth === -1 ? '∞' : n.clickDepth}
                        </span>
                        <span className="shrink-0">←{n.internalInLinks}</span>
                        <span className="shrink-0">→{n.internalOutLinks}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Charts — changes based on pageSortBy selection */}
      {graphData && graphData.nodes.length > 0 && (() => {
        const ns = graphData.nodes;
        const sW = 700, sH = 300, sPad = { t: 20, r: 20, b: 40, l: 55 };
        const sInnerW = sW - sPad.l - sPad.r;
        const sInnerH = sH - sPad.t - sPad.b;

        // --- Config per view mode ---
        const configs = {
          depth: {
            histTitle: 'Click Depth — Phân bố trang theo độ sâu',
            histNote: 'Depth 0-2 = tốt · 3 = chấp nhận · 4+ = quá sâu · ∞ = không truy cập được',
            scatterTitle: 'Inbound Links × Click Depth',
            scatterNote: 'Góc phải-dưới = nhiều link nhưng depth sâu → vấn đề cấu trúc',
            xLabel: 'Inbound Links', yLabel: 'Click Depth',
            getX: (n: GraphNode) => n.internalInLinks,
            getY: (n: GraphNode) => n.clickDepth,
            dotColor: (n: GraphNode) => n.clickDepth > 3 ? '#ef4444' : n.clickDepth > 2 ? '#f59e0b' : '#3b82f6',
            warnY: 3,
          },
          inLinks: {
            histTitle: 'Inbound Links — Phân bố theo số link trỏ đến',
            histNote: '0 = mồ côi · 1-5 = yếu · 6-20 = trung bình · 20+ = mạnh',
            scatterTitle: 'Inbound Links × Outbound Links',
            scatterNote: 'Góc trái-trên = nhận ít, gửi nhiều → link equity bị rò',
            xLabel: 'Outbound Links', yLabel: 'Inbound Links',
            getX: (n: GraphNode) => n.internalOutLinks,
            getY: (n: GraphNode) => n.internalInLinks,
            dotColor: (n: GraphNode) => n.internalInLinks === 0 ? '#ef4444' : n.internalInLinks < 5 ? '#f59e0b' : '#3b82f6',
            warnY: -1,
          },
          outLinks: {
            histTitle: 'Outbound Links — Phân bố theo số link đi ra',
            histNote: '0 = dead end · 1-5 = ít · 6-20 = tốt · 50+ = quá nhiều',
            scatterTitle: 'Outbound Links × Click Depth',
            scatterNote: 'Góc phải-dưới = nhiều link ra nhưng depth sâu',
            xLabel: 'Outbound Links', yLabel: 'Click Depth',
            getX: (n: GraphNode) => n.internalOutLinks,
            getY: (n: GraphNode) => n.clickDepth >= 0 ? n.clickDepth : 0,
            dotColor: (n: GraphNode) => n.internalOutLinks === 0 ? '#ef4444' : n.internalOutLinks > 50 ? '#f59e0b' : '#3b82f6',
            warnY: -1,
          },
        };
        const cfg = configs[pageSortBy];

        // --- Histogram ---
        const histBuckets: { label: string; count: number; color: string }[] = [];
        if (pageSortBy === 'depth') {
          const depthColors: Record<string, string> = { '0': '#22c55e', '1': '#3b82f6', '2': '#6366f1', '3': '#f59e0b', '4': '#f97316', '5+': '#ef4444', '∞': '#dc2626' };
          const buckets: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0, '∞': 0 };
          ns.forEach(n => {
            if (n.clickDepth === -1) buckets['∞']++;
            else if (n.clickDepth >= 5) buckets['5+']++;
            else buckets[String(n.clickDepth)]++;
          });
          Object.entries(buckets).forEach(([k, v]) => histBuckets.push({ label: k, count: v, color: depthColors[k] }));
        } else {
          // Bin by link count ranges
          const getValue = pageSortBy === 'inLinks' ? (n: GraphNode) => n.internalInLinks : (n: GraphNode) => n.internalOutLinks;
          const ranges = [
            { label: '0', min: 0, max: 0, color: '#ef4444' },
            { label: '1-5', min: 1, max: 5, color: '#f59e0b' },
            { label: '6-20', min: 6, max: 20, color: '#3b82f6' },
            { label: '21-50', min: 21, max: 50, color: '#6366f1' },
            { label: '51-100', min: 51, max: 100, color: '#8b5cf6' },
            { label: '100+', min: 101, max: Infinity, color: '#22c55e' },
          ];
          ranges.forEach(r => {
            const count = ns.filter(n => { const v = getValue(n); return v >= r.min && v <= r.max; }).length;
            histBuckets.push({ label: r.label, count, color: r.color });
          });
        }
        const maxBucket = Math.max(...histBuckets.map(b => b.count), 1);

        // --- Scatter plot ---
        const scatterNodes = pageSortBy === 'depth' ? ns.filter(n => n.clickDepth >= 0) : ns;
        const xVals = scatterNodes.map(cfg.getX);
        const yVals = scatterNodes.map(cfg.getY);
        const sMaxX = Math.max(...xVals, 1);
        const sMaxY = Math.max(...yVals, 1);
        const xTicks = Array.from({ length: 5 }, (_, i) => Math.round(sMaxX * i / 4));
        const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(sMaxY * i / 4));

        return (
          <div className="grid grid-cols-2 gap-4">
            {/* Histogram */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-3">{cfg.histTitle}</div>
              <div className="flex items-end gap-2 h-40">
                {histBuckets.map(({ label, count, color }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-[var(--text-primary)]">{count}</span>
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max((count / maxBucket) * 100, 2)}%`, backgroundColor: color }} />
                    <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-2 text-center">{cfg.histNote}</div>
            </div>

            {/* Scatter Plot */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">{cfg.scatterTitle}</div>
              <div className="text-[10px] text-[var(--text-muted)] mb-2">{cfg.scatterNote}</div>
              <svg viewBox={`0 0 ${sW} ${sH}`} className="w-full">
                {/* Grid */}
                {yTicks.map(v => (
                  <line key={`yg-${v}`} x1={sPad.l} x2={sW - sPad.r} y1={sPad.t + (v / sMaxY) * sInnerH} y2={sPad.t + (v / sMaxY) * sInnerH} stroke="#e2e8f0" strokeWidth="0.5" />
                ))}
                {/* Warning zone */}
                {cfg.warnY > 0 && sMaxY > cfg.warnY && (
                  <rect x={sPad.l} y={sPad.t + (cfg.warnY / sMaxY) * sInnerH} width={sInnerW} height={sInnerH - (cfg.warnY / sMaxY) * sInnerH} fill="#fef2f2" opacity="0.4" />
                )}
                {/* Axes */}
                <line x1={sPad.l} x2={sPad.l} y1={sPad.t} y2={sH - sPad.b} stroke="#94a3b8" />
                <line x1={sPad.l} x2={sW - sPad.r} y1={sH - sPad.b} y2={sH - sPad.b} stroke="#94a3b8" />
                {yTicks.map(v => (
                  <text key={`yl-${v}`} x={sPad.l - 8} y={sPad.t + (v / sMaxY) * sInnerH + 3} textAnchor="end" fontSize="9" fill="#64748b">{v}</text>
                ))}
                <text x={15} y={sH / 2} textAnchor="middle" fontSize="9" fill="#64748b" transform={`rotate(-90, 15, ${sH / 2})`}>{cfg.yLabel}</text>
                {xTicks.map(v => (
                  <text key={`xl-${v}`} x={sPad.l + (v / sMaxX) * sInnerW} y={sH - sPad.b + 16} textAnchor="middle" fontSize="9" fill="#64748b">{v}</text>
                ))}
                <text x={sPad.l + sInnerW / 2} y={sH - 4} textAnchor="middle" fontSize="9" fill="#64748b">{cfg.xLabel}</text>
                {/* Data points */}
                {scatterNodes.map((n, i) => (
                  <circle key={i}
                    cx={sPad.l + (cfg.getX(n) / sMaxX) * sInnerW}
                    cy={sPad.t + (cfg.getY(n) / sMaxY) * sInnerH}
                    r={3.5} fill={cfg.dotColor(n)} fillOpacity={0.5} stroke={cfg.dotColor(n)} strokeWidth={0.5}
                  />
                ))}
              </svg>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
