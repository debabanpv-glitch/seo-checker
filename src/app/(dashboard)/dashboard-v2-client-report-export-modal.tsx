'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Download, Check, FileText, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface ClientReport {
  title: string;
  generatedAt: string;
  rawText: string;
  htmlContent: string;
}

const ALL_SECTIONS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'keywords', label: 'Từ khóa' },
  { id: 'content', label: 'Nội dung' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'seo', label: 'SEO Audit' },
  { id: 'actions', label: 'Hành động tiếp theo' },
] as const;

export default function DashboardV2ClientReportExportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [sections, setSections] = useState<string[]>(ALL_SECTIONS.map(s => s.id));
  const [format, setFormat] = useState<'text' | 'html'>('text');
  const [report, setReport] = useState<ClientReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/projects').then(r => r.json()).then(d => {
        setProjects(Array.isArray(d) ? d : d.projects || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) generateReport();
  }, [isOpen, selectedProject, period, sections, format]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, format, sections: sections.join(',') });
      if (selectedProject) params.set('project_id', selectedProject);
      const res = await fetch(`/api/v1/reports/client?${params}`);
      const json = await res.json();
      setReport(json);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadHtml = () => {
    if (!report) return;
    const blob = new Blob([report.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Xuất báo cáo khách hàng</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-4 h-4 text-[#8888a0]" />
          </button>
        </div>

        {/* Config */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Project */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-secondary text-[var(--text-primary)] text-sm px-3 py-1.5 rounded-lg border border-border outline-none"
            >
              <option value="">Tất cả dự án</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Period */}
            <div className="flex gap-1 bg-secondary rounded-lg p-0.5 border border-border">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  period === 'weekly' ? 'bg-accent text-white' : 'text-[#8888a0]'
                }`}
              >
                Tuần
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  period === 'monthly' ? 'bg-accent text-white' : 'text-[#8888a0]'
                }`}
              >
                Tháng
              </button>
            </div>

            {/* Format */}
            <div className="flex gap-1 bg-secondary rounded-lg p-0.5 border border-border">
              <button
                onClick={() => setFormat('text')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  format === 'text' ? 'bg-accent text-white' : 'text-[#8888a0]'
                }`}
              >
                Văn bản
              </button>
              <button
                onClick={() => setFormat('html')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  format === 'html' ? 'bg-accent text-white' : 'text-[#8888a0]'
                }`}
              >
                HTML
              </button>
            </div>
          </div>

          {/* Sections checkboxes */}
          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map(s => (
              <label
                key={s.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all border ${
                  sections.includes(s.id)
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-secondary border-border text-[#8888a0]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={sections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                  className="sr-only"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
              <span className="ml-2 text-sm text-[#8888a0]">Đang tạo báo cáo...</span>
            </div>
          ) : !report ? (
            <p className="text-center text-[#8888a0] py-12">Không thể tạo báo cáo</p>
          ) : format === 'html' ? (
            <div
              className="bg-white rounded-xl p-4 shadow-inner"
              dangerouslySetInnerHTML={{ __html: report.htmlContent }}
            />
          ) : (
            <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-mono bg-secondary rounded-xl p-4 leading-relaxed">
              {report.rawText}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={copyToClipboard}
            disabled={!report}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Đã sao chép!' : 'Sao chép'}
          </button>
          <button
            onClick={downloadHtml}
            disabled={!report}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-[var(--text-primary)] rounded-lg text-sm font-medium border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Tải HTML
          </button>
        </div>
      </div>
    </div>
  );
}
