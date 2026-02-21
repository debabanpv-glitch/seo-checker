'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Download, Check, AlertCircle, Trash2,
  X, RefreshCw, Calendar, FileText, HardDrive, Zap,
  TrendingUp, TrendingDown, Minus, ArrowRight,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrawlFolder {
  folder: string;
  date: string;
  csvCount: number;
  path: string;
}

interface AuditSummary {
  total_urls: number;
  status_codes: Record<string, number>;
  content_types?: Record<string, number>;
  indexability?: { indexable: number; nonIndexable: number };
}

interface AuditRecord {
  id: string;
  project_id: string | null;
  audit_type: string;
  audit_date: string;
  summary: AuditSummary | null;
  raw_file: string | null;
  source: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Crawl-over-crawl comparison helper
// ---------------------------------------------------------------------------

function CrawlComparison({ audits }: { audits: AuditRecord[] }) {
  if (audits.length < 2) return null;

  // Sort by audit_date DESC so newest crawl is first (not by created_at)
  const sorted = [...audits].sort((a, b) => b.audit_date.localeCompare(a.audit_date));
  const latest = sorted[0];
  const previous = sorted[1];
  const ls = latest.summary;
  const ps = previous.summary;
  if (!ls || !ps) return null;

  const diff = (a: number, b: number) => a - b;
  const pct = (a: number, b: number) => b === 0 ? 0 : Math.round(((a - b) / b) * 100);

  const metrics = [
    { label: 'URLs', now: ls.total_urls, prev: ps.total_urls },
    { label: 'Indexable', now: ls.indexability?.indexable || 0, prev: ps.indexability?.indexable || 0 },
    { label: '200 OK', now: ls.status_codes?.['200'] || 0, prev: ps.status_codes?.['200'] || 0 },
    { label: '3xx', now: Object.entries(ls.status_codes || {}).filter(([k]) => k.startsWith('3')).reduce((s, [, v]) => s + v, 0), prev: Object.entries(ps.status_codes || {}).filter(([k]) => k.startsWith('3')).reduce((s, [, v]) => s + v, 0) },
    { label: '4xx', now: Object.entries(ls.status_codes || {}).filter(([k]) => k.startsWith('4')).reduce((s, [, v]) => s + v, 0), prev: Object.entries(ps.status_codes || {}).filter(([k]) => k.startsWith('4')).reduce((s, [, v]) => s + v, 0) },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-medium text-[var(--text-primary)] mb-1 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-accent" />
        So sánh Crawl-over-Crawl
      </h2>
      <p className="text-xs text-[#8888a0] mb-4">
        {previous.audit_date} → {latest.audit_date} (mới nhất)
      </p>

      <div className="grid grid-cols-5 gap-3">
        {metrics.map((m) => {
          const d = diff(m.now, m.prev);
          const p = pct(m.now, m.prev);
          // For 3xx/4xx, increase is bad
          const isBadMetric = m.label === '3xx' || m.label === '4xx';
          const isGood = isBadMetric ? d <= 0 : d >= 0;

          return (
            <div key={m.label} className="bg-secondary/50 rounded-lg p-3">
              <div className="text-xs text-[#8888a0] mb-1">{m.label}</div>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono">{m.now.toLocaleString()}</div>
              {d !== 0 ? (
                <div className={cn('flex items-center gap-1 text-xs mt-1', isGood ? 'text-green-400' : 'text-red-400')}>
                  {d > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{d > 0 ? '+' : ''}{d.toLocaleString()} ({p > 0 ? '+' : ''}{p}%)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs mt-1 text-[#8888a0]">
                  <Minus className="w-3 h-3" /> Không đổi
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CrawlImportTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [crawls, setCrawls] = useState<CrawlFolder[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ ok: boolean; msg: string } | null>(null);
  const [basePath, setBasePath] = useState('');

  const showAlert = (ok: boolean, msg: string) => {
    setAlert({ ok, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [scanRes, auditsRes] = await Promise.all([
        fetch('/api/v1/audit-import/scan'),
        fetch('/api/v1/audit-import'),
      ]);
      const scanData = await scanRes.json();
      const auditsData = await auditsRes.json();
      setCrawls(scanData.crawls || []);
      setAudits(auditsData.audits || []);
      setBasePath(scanData.basePath || '');
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImport = async (folder: string) => {
    const parts = folder.split('.');
    const dateLabel = `${parts[0]}-${parts[1]}-${parts[2]}`;
    if (audits.some(a => a.audit_date === dateLabel)) {
      showAlert(false, `Crawl ${dateLabel} đã được import rồi`);
      return;
    }
    setImporting(folder);
    try {
      const res = await fetch('/api/v1/audit-import/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(true, `Import thành công! ${data.imported} URLs từ ${dateLabel}`);
        await fetchData();
      } else {
        showAlert(false, data.error || 'Import thất bại');
      }
    } catch { showAlert(false, 'Có lỗi xảy ra'); }
    finally { setImporting(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa audit này?')) return;
    try {
      const res = await fetch(`/api/v1/audit-import?id=${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchData(); showAlert(true, 'Đã xóa'); }
    } catch { showAlert(false, 'Có lỗi xảy ra'); }
  };

  if (isLoading) return <PageLoading />;

  const importedDates = new Set(audits.map(a => a.audit_date));
  const latestCrawl = crawls.length > 0 ? crawls[0] : null;
  const latestAlreadyImported = latestCrawl ? importedDates.has(latestCrawl.date) : false;

  return (
    <div className="space-y-6">
      {/* Path info + Scan button */}
      <div className="flex items-center justify-between">
        <p className="text-[#8888a0] text-sm">
          Screaming Frog: <span className="font-mono text-xs">{basePath}</span>
        </p>
        <button onClick={() => { setIsLoading(true); fetchData(); }}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/70 rounded-lg text-[var(--text-primary)] text-sm">
          <RefreshCw className="w-4 h-4" /> Scan lại
        </button>
      </div>

      {/* Alert */}
      {alert && (
        <div className={cn('flex items-center gap-2 px-4 py-3 rounded-lg', alert.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
          {alert.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{alert.msg}</span>
          <button onClick={() => setAlert(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Crawl-over-Crawl Comparison */}
      <CrawlComparison audits={audits} />

      {/* Latest Crawl Hero */}
      {latestCrawl ? (
        <div className={cn('bg-card border rounded-xl p-6', latestAlreadyImported ? 'border-success/30' : 'border-accent/50')}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Crawl mới nhất: {latestCrawl.date}</h2>
                {latestAlreadyImported && <span className="px-2 py-0.5 bg-success/10 text-success rounded text-xs font-medium">Đã import</span>}
              </div>
              <p className="text-sm text-[#8888a0]">{latestCrawl.csvCount} files CSV • Folder: {latestCrawl.folder}</p>
            </div>
            {!latestAlreadyImported ? (
              <button onClick={() => handleImport(latestCrawl.folder)} disabled={importing === latestCrawl.folder}
                className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium">
                <Download className={cn('w-4 h-4', importing === latestCrawl.folder && 'animate-spin')} />
                {importing === latestCrawl.folder ? 'Đang import...' : 'Import ngay'}
              </button>
            ) : (
              <span className="flex items-center gap-2 text-success text-sm"><Check className="w-5 h-5" /> Đã import</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-[#8888a0]">
          <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Không tìm thấy folder crawl nào</p>
          <p className="text-xs mt-1">Kiểm tra đường dẫn trong Cài đặt → Cấu hình</p>
        </div>
      )}

      {/* All Crawls grid */}
      {crawls.length > 1 && (
        <div>
          <h2 className="text-sm font-medium text-[#8888a0] mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Tất cả lần crawl ({crawls.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {crawls.map((c) => {
              const isImported = importedDates.has(c.date);
              const isLatest = c.folder === latestCrawl?.folder;
              const isImporting = importing === c.folder;
              return (
                <div key={c.folder} className={cn('bg-card border rounded-xl p-4 transition-colors',
                  isImported ? 'border-success/30' : 'border-border',
                  isLatest && 'ring-1 ring-accent/30'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span className="font-semibold text-[var(--text-primary)]">{c.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isLatest && <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-medium">Mới nhất</span>}
                      {isImported && <span className="px-1.5 py-0.5 bg-success/10 text-success rounded text-[10px] font-medium">Đã import</span>}
                    </div>
                  </div>
                  <p className="text-xs text-[#8888a0] mb-3">{c.csvCount} files CSV</p>
                  {!isImported ? (
                    <button onClick={() => handleImport(c.folder)} disabled={isImporting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white text-sm font-medium">
                      <Download className={cn('w-4 h-4', isImporting && 'animate-spin')} />
                      {isImporting ? 'Đang import...' : 'Import'}
                    </button>
                  ) : (
                    <div className="text-xs text-success text-center py-2"><Check className="w-4 h-4 inline mr-1" />Đã import</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import History table */}
      {audits.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#8888a0] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Lịch sử import ({audits.length})
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Ngày crawl</th>
                  <th className="text-center px-4 py-3 text-[#8888a0] font-medium">URLs</th>
                  <th className="text-center px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">Indexable</th>
                  <th className="text-center px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">200 OK</th>
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">Nguồn</th>
                  <th className="text-right px-4 py-3 text-[#8888a0] font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => {
                  const s = a.summary;
                  return (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{a.audit_date}</td>
                      <td className="px-4 py-3 text-center font-mono">{s?.total_urls || 0}</td>
                      <td className="px-4 py-3 text-center font-mono hidden md:table-cell text-success">{s?.indexability?.indexable || 0}</td>
                      <td className="px-4 py-3 text-center font-mono hidden md:table-cell">{s?.status_codes?.['200'] || 0}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="px-2 py-0.5 bg-secondary rounded text-xs">{a.source}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-[#8888a0] hover:text-danger rounded-lg hover:bg-secondary">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
