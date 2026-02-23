'use client';

// ---------------------------------------------------------------------------
// Keyword Ranking — Google Sheets Configuration Modal
// CRUD for sheet URLs mapped to projects for keyword sync
// ---------------------------------------------------------------------------

import { X, Plus, Trash2 } from 'lucide-react';
import { type SheetConfig } from './keyword-ranking-types-and-helpers';
import { Project } from '@/types';

export function SheetConfigModal({
  configs,
  projects,
  onConfigsChange,
  onSave,
  onClose,
}: {
  configs: SheetConfig[];
  projects: Project[];
  onConfigsChange: (configs: SheetConfig[]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Cau hinh Google Sheets</h2>
            <p className="text-xs text-[#8888a0] mt-0.5">Sheet phai public. Can cot: Keyword, Top/Position. Tuy chon: URL, Date, Ranking, Type</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg"><X className="w-4 h-4 text-[#8888a0]" /></button>
        </div>

        <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
          {configs.map((cfg, i) => (
            <div key={i} className="flex gap-2 items-start bg-secondary/30 rounded-lg p-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text" value={cfg.label}
                    onChange={(e) => { const c = [...configs]; c[i] = { ...c[i], label: e.target.value }; onConfigsChange(c); }}
                    placeholder="Ten sheet"
                    className="flex-1 px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] placeholder-[#8888a0] text-xs"
                  />
                  <select
                    value={cfg.project_id}
                    onChange={(e) => { const c = [...configs]; c[i] = { ...c[i], project_id: e.target.value }; onConfigsChange(c); }}
                    className="px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] text-xs"
                  >
                    <option value="">Du an</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <input
                  type="text" value={cfg.url}
                  onChange={(e) => { const c = [...configs]; c[i] = { ...c[i], url: e.target.value }; onConfigsChange(c); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] placeholder-[#8888a0] text-[10px] font-mono"
                />
              </div>
              <button onClick={() => onConfigsChange(configs.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onConfigsChange([...configs, { url: '', project_id: '', label: '' }])}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors w-full justify-center border border-dashed border-accent/30"
          >
            <Plus className="w-3.5 h-3.5" /> Them sheet
          </button>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-[#8888a0] hover:bg-secondary rounded-lg">Huy</button>
          <button onClick={onSave} className="px-4 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-xs font-medium">
            Luu
          </button>
        </div>
      </div>
    </div>
  );
}
