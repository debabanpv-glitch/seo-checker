'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Network, Upload, Trash2, RefreshCw, ExternalLink, Search, Download } from 'lucide-react';
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
  const [isCrawling, setIsCrawling] = useState(false);
  const [pageSearch, setPageSearch] = useState('');
  const [pageSortBy, setPageSortBy] = useState<'depth' | 'internalLinks' | 'externalLinks'>('depth');
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

    // Node coloring based on current view mode (pageSortBy)
    const groupNames = [...new Set(simNodes.map(n => n.group))].sort();
    const groupColorMap = new Map<string, number>();
    groupNames.forEach((g, i) => groupColorMap.set(g, i % COLORS.length));

    // Color functions per mode
    const depthColorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([6, 0]); // green=0, red=6+
    const inLinksMax = Math.max(...simNodes.map(n => n.internalInLinks), 1);
    const outLinksMax = Math.max(...simNodes.map(n => n.internalOutLinks), 1);
    const totalInternalLinks = (n: GraphNode) => n.internalInLinks + n.internalOutLinks;
    const maxInternal = Math.max(...simNodes.map(totalInternalLinks), 1);
    const extMax = Math.max(...simNodes.map(n => n.externalOutLinks), 1);
    const internalColorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, Math.sqrt(maxInternal)]);
    const externalColorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, Math.sqrt(extMax)]);

    const getNodeColor = (n: GraphNode): string => {
      if (pageSortBy === 'depth') {
        if (n.clickDepth === -1) return '#dc2626';
        return depthColorScale(Math.min(n.clickDepth, 6)) as string;
      }
      if (pageSortBy === 'internalLinks') {
        return internalColorScale(Math.sqrt(totalInternalLinks(n))) as string;
      }
      if (pageSortBy === 'externalLinks') {
        if (n.externalOutLinks === 0) return '#e2e8f0';
        return externalColorScale(Math.sqrt(n.externalOutLinks)) as string;
      }
      return COLORS[groupColorMap.get(n.group) ?? 0];
    };

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

    // Draw edges — hide when in external links mode (edges are all internal)
    const hideEdges = pageSortBy === 'externalLinks';
    const link = g.append('g')
      .selectAll('line')
      .data(simEdges)
      .enter().append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', hideEdges ? 0 : 0.6)
      .attr('stroke-width', hideEdges ? 0 : 1.5)
      .attr('marker-end', hideEdges ? '' : 'url(#arrowhead)');

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(simNodes)
      .enter().append('circle')
      .attr('r', d => radiusScale(nodeWeight(d)))
      .attr('fill', d => getNodeColor(d))
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
          .attr('stroke', l => isConnected(l) ? getNodeColor(d) : '#cbd5e1')
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
  }, [graphData, forceStrength, nodeScale, showLabels, pageSortBy]);

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

        {/* Crawl button — run crawler from UI */}
        <button
          onClick={async () => {
            if (isCrawling) return;
            // Get project domain from API
            const projRes = await fetch(`/api/v1/projects?id=${projectId}`);
            const projData = await projRes.json();
            const domain = projData.project?.website || projData.project?.project_domain;
            if (!domain) { alert('Không tìm thấy domain của project'); return; }
            const url = domain.startsWith('http') ? domain : `https://${domain}`;
            if (!confirm(`Crawl ${url}? (có thể mất 5-30 phút tùy số trang)`)) return;
            setIsCrawling(true);
            try {
              const res = await fetch('/api/v1/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'crawl', projectId, url, maxPages: 6000 }),
              });
              const result = await res.json();
              if (!res.ok) throw new Error(result.error);
              alert(`Crawl xong! ${result.summary?.total_pages || 0} trang, ${result.summary?.total_links || 0} links`);
              // Refresh
              const sessRes = await fetch(`/api/v1/crawl?projectId=${projectId}`);
              const sessData = await sessRes.json();
              setSessions(sessData.sessions || []);
              if (sessData.sessions?.length > 0) setSelectedSessionId(sessData.sessions[0].id);
            } catch (e: unknown) {
              alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
              setIsCrawling(false);
            }
          }}
          disabled={isCrawling}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isCrawling
              ? 'bg-amber-100 text-amber-700 cursor-wait'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Network className="w-4 h-4" />
          {isCrawling ? 'Đang crawl...' : 'Crawl lại'}
        </button>

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
          {/* Download CSV */}
          <button
            onClick={() => {
              if (!graphData) return;
              const rows = graphData.nodes.map(n => ({
                url: n.id,
                title: n.title.replace(/,/g, ' '),
                group: n.group,
                click_depth: n.clickDepth === -1 ? 'unreachable' : n.clickDepth,
                inbound_links: n.internalInLinks,
                outbound_links: n.internalOutLinks,
                external_links: n.externalOutLinks,
                status: n.internalInLinks === 0 ? 'orphan' : n.clickDepth >= 4 ? 'deep' : n.clickDepth === -1 ? 'unreachable' : 'ok',
              }));
              const header = 'URL,Title,Group,Click Depth,Inbound Links,Outbound Links,External Links,Status';
              const csv = [header, ...rows.map(r =>
                `${r.url},"${r.title}",${r.group},${r.click_depth},${r.inbound_links},${r.outbound_links},${r.external_links},${r.status}`
              )].join('\n');
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `internal-links-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-accent)] transition-colors ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
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
              <div>Node lớn = nhiều link trỏ đến</div>
              {pageSortBy === 'depth' && <div>Màu: 🟢 nông → 🔴 sâu (click depth)</div>}
              {pageSortBy === 'internalLinks' && <div>Màu: nhạt → xanh đậm (internal links)</div>}
              {pageSortBy === 'externalLinks' && <div>Màu: nhạt → cam đậm (external links)</div>}
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
                    onChange={e => setPageSortBy(e.target.value as 'depth' | 'internalLinks' | 'externalLinks')}
                    className="px-1.5 py-0.5 bg-[var(--bg-accent)] border border-[var(--border)] rounded text-[10px] text-[var(--text-primary)]"
                  >
                    <option value="depth">Click depth</option>
                    <option value="internalLinks">Internal links</option>
                    <option value="externalLinks">External links</option>
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
                      if (pageSortBy === 'internalLinks') return (b.internalInLinks + b.internalOutLinks) - (a.internalInLinks + a.internalOutLinks);
                      return b.externalOutLinks - a.externalOutLinks;
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

      {/* Actionable Insights — problems + recommendations */}
      {graphData && graphData.nodes.length > 0 && (() => {
        const ns = graphData.nodes;

        // Build issues list based on current view mode
        type Issue = { severity: 'critical' | 'warning' | 'info'; title: string; count: number; action: string; pages: Array<{ title: string; url: string; value: number }>; allPages: Array<{ title: string; url: string; value: number }> };
        const issues: Issue[] = [];

        if (pageSortBy === 'depth') {
          const unreachable = ns.filter(n => n.clickDepth === -1);
          const deep = ns.filter(n => n.clickDepth >= 4 && n.clickDepth !== -1);
          const depth3 = ns.filter(n => n.clickDepth === 3);

          const toRow = (n: GraphNode, val: number) => ({ title: n.title, url: n.id, value: val });
          if (unreachable.length > 0) issues.push({
            severity: 'critical', title: 'Không truy cập được từ trang chủ', count: unreachable.length,
            action: 'Thêm link từ trang chính/danh mục trỏ đến các trang này',
            pages: unreachable.slice(0, 10).map(n => toRow(n, n.internalInLinks)),
            allPages: unreachable.map(n => toRow(n, n.internalInLinks)),
          });
          if (deep.length > 0) { deep.sort((a, b) => b.clickDepth - a.clickDepth); issues.push({
            severity: 'warning', title: 'Click depth ≥ 4 (quá sâu)', count: deep.length,
            action: 'Rút ngắn đường dẫn: thêm link từ trang depth 1-2 trỏ đến',
            pages: deep.slice(0, 10).map(n => toRow(n, n.clickDepth)),
            allPages: deep.map(n => toRow(n, n.clickDepth)),
          }); }
          if (depth3.length > 0) issues.push({
            severity: 'info', title: 'Click depth = 3 (chấp nhận được)', count: depth3.length,
            action: 'Cân nhắc thêm link nếu đây là trang quan trọng',
            pages: depth3.slice(0, 5).map(n => toRow(n, n.clickDepth)),
            allPages: depth3.map(n => toRow(n, n.clickDepth)),
          });
        } else if (pageSortBy === 'internalLinks') {
          const orphans = ns.filter(n => n.internalInLinks === 0 && n.internalOutLinks === 0);
          const weak = ns.filter(n => (n.internalInLinks + n.internalOutLinks) >= 1 && (n.internalInLinks + n.internalOutLinks) <= 3);
          const hubs = ns.filter(n => (n.internalInLinks + n.internalOutLinks) > 50).sort((a, b) => (b.internalInLinks + b.internalOutLinks) - (a.internalInLinks + a.internalOutLinks));

          const toRow2 = (n: GraphNode, val: number) => ({ title: n.title, url: n.id, value: val });
          if (orphans.length > 0) issues.push({
            severity: 'critical', title: 'Trang mồ côi (0 link trỏ đến)', count: orphans.length,
            action: 'Google khó index trang không có link nội bộ nào trỏ đến. Thêm link từ bài viết liên quan.',
            pages: orphans.slice(0, 10).map(n => toRow2(n, 0)),
            allPages: orphans.map(n => toRow2(n, 0)),
          });
          if (weak.length > 0) issues.push({
            severity: 'warning', title: 'Ít link trỏ đến (1-3 links)', count: weak.length,
            action: 'Tăng internal links bằng cách thêm liên kết từ bài viết cùng chủ đề',
            pages: weak.slice(0, 10).map(n => toRow2(n, n.internalInLinks)),
            allPages: weak.map(n => toRow2(n, n.internalInLinks)),
          });
          if (hubs.length > 0) issues.push({
            severity: 'info', title: 'Trang hub (>50 link trỏ đến)', count: hubs.length,
            action: 'Các trang quan trọng nhất. Đảm bảo nội dung chất lượng cao.',
            pages: hubs.slice(0, 10).map(n => toRow2(n, n.internalInLinks)),
            allPages: hubs.map(n => toRow2(n, n.internalInLinks)),
          });
        } else {
          const toRow3 = (n: GraphNode, val: number) => ({ title: n.title, url: n.id, value: val });
          const manyExt = ns.filter(n => n.externalOutLinks > 20).sort((a, b) => b.externalOutLinks - a.externalOutLinks);
          const noExt = ns.filter(n => n.externalOutLinks === 0);
          if (manyExt.length > 0) issues.push({
            severity: 'warning', title: 'Nhiều external links (>20 link ngoài)', count: manyExt.length,
            action: 'Trang link ra FB/YouTube/bên ngoài quá nhiều → rò rỉ PageRank. Cân nhắc nofollow.',
            pages: manyExt.slice(0, 10).map(n => toRow3(n, n.externalOutLinks)),
            allPages: manyExt.map(n => toRow3(n, n.externalOutLinks)),
          });
          if (noExt.length > 0) issues.push({
            severity: 'info', title: 'Không có external link', count: noExt.length,
            action: 'Trang không link ra bên ngoài. Thêm link đến nguồn uy tín (Wikipedia, gov...) để tăng E-E-A-T.',
            pages: noExt.slice(0, 10).map(n => toRow3(n, 0)),
            allPages: noExt.map(n => toRow3(n, 0)),
          });
        }

        const sevColors = { critical: 'bg-red-50 border-red-200', warning: 'bg-amber-50 border-amber-200', info: 'bg-blue-50 border-blue-200' };
        const sevIcons = { critical: '🔴', warning: '🟡', info: '🔵' };
        const modeLabels = { depth: 'Click Depth', internalLinks: 'Internal Links', externalLinks: 'External Links' };

        return (
          <div className="space-y-3">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Phân tích {modeLabels[pageSortBy]} — {issues.reduce((s, i) => s + i.count, 0)} vấn đề
            </div>
            {issues.length === 0 && (
              <div className="text-sm text-green-600 py-4 text-center bg-green-50 rounded-lg">Không phát hiện vấn đề nào</div>
            )}
            {issues.map((issue, idx) => (
              <div key={idx} className={`border rounded-lg p-4 ${sevColors[issue.severity]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{sevIcons[issue.severity]} {issue.title}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const header = 'URL,Title,Value';
                        const rows = issue.allPages.map(p => `${p.url},"${p.title.replace(/"/g, '""')}",${p.value}`);
                        const csv = [header, ...rows].join('\n');
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${issue.title.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
                        a.click();
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/60 hover:bg-white/80 transition-colors flex items-center gap-1"
                      title="Download CSV"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </button>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60">{issue.count} trang</span>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mb-3">💡 {issue.action}</div>
                <div className="space-y-1">
                  {issue.pages.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-white/40 rounded px-2 py-1">
                      <span className="text-[var(--text-primary)] truncate flex-1" title={p.title}>{p.title || getPath(p.url)}</span>
                      <span className="text-[var(--text-muted)] truncate max-w-[200px]">{getPath(p.url)}</span>
                      <span className="font-medium shrink-0 tabular-nums">{p.value}</span>
                    </div>
                  ))}
                  {issue.count > 10 && (
                    <div className="text-[10px] text-[var(--text-muted)] text-center pt-1">
                      +{issue.count - 10} trang nữa — xem trong All Pages bên phải
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
