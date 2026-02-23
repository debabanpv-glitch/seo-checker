'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, FileSpreadsheet, FolderOpen } from 'lucide-react';
import type { ImportResult } from './backlinks-types-and-helpers';

interface Props {
  projects: { id: string; name: string }[];
  onImported: () => void;
  onClose: () => void;
}

export function BacklinksImportModal({ projects, onImported, onClose }: Props) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [filePath, setFilePath] = useState('');
  const [mode, setMode] = useState<'upload' | 'path'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!projectId) return;
    setImporting(true);
    setResult(null);

    try {
      if (mode === 'upload') {
        const file = fileRef.current?.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        const res = await fetch('/api/v1/backlinks', { method: 'POST', body: formData });
        setResult(await res.json());
      } else {
        if (!filePath.trim()) return;
        const res = await fetch('/api/v1/backlinks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath.trim(), project_id: projectId }),
        });
        setResult(await res.json());
      }
      onImported();
    } catch (e) {
      setResult({ total: 0, imported: 0, skipped: 0, errors: [String(e)] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Nhập Backlinks</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
        </div>

        {/* Project select */}
        <div>
          <label className="text-xs text-[#8888a0] block mb-1">Dự án</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button onClick={() => setMode('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'upload' ? 'bg-accent/15 text-accent' : 'text-[#8888a0] hover:text-[var(--text-primary)]'}`}>
            <Upload className="w-3.5 h-3.5" /> Tải file lên
          </button>
          <button onClick={() => setMode('path')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'path' ? 'bg-accent/15 text-accent' : 'text-[#8888a0] hover:text-[var(--text-primary)]'}`}>
            <FolderOpen className="w-3.5 h-3.5" /> Đường dẫn file
          </button>
        </div>

        {/* File input */}
        {mode === 'upload' ? (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[#8888a0] mb-2" />
            <p className="text-sm text-[#8888a0] mb-2">Chọn file XLS, XLSX hoặc CSV</p>
            <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv"
              className="text-xs text-[var(--text-primary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent/15 file:text-accent hover:file:bg-accent/25" />
          </div>
        ) : (
          <div>
            <label className="text-xs text-[#8888a0] block mb-1">Đường dẫn file trên server</label>
            <input type="text" value={filePath} onChange={(e) => setFilePath(e.target.value)}
              placeholder="/Users/.../output/file.xls"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm font-mono" />
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`p-3 rounded-lg text-sm ${result.imported > 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
            <p>Đã nhập: {result.imported} / {result.total} | Bỏ qua: {result.skipped}</p>
            {result.errors.length > 0 && (
              <p className="text-xs mt-1 opacity-80">{result.errors[0]}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8888a0] hover:text-[var(--text-primary)]">Hủy</button>
          <button onClick={handleUpload} disabled={importing || !projectId}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white font-medium text-sm transition-colors">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Đang import...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
