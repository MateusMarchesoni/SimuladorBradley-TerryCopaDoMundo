import { useState, useRef } from 'react';
import { X, RotateCcw, Download, Upload, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { TEAMS } from '../data/teams';
import { GROUPS } from '../data/groups';

interface Props {
  forces: number[];
  onForcesChange: (forces: number[]) => void;
  onClose: () => void;
}

const DEFAULT_FORCES = TEAMS.map(t => t.force);
const MAX_FORCE = 120;

// Mapeia nome do time → índice dentro de GROUPS para agrupar os sliders
const GROUP_TEAM_INDICES: [string, number[]][] = Object.entries(GROUPS).map(
  ([groupName, names]) => [
    groupName,
    names.map(n => TEAMS.findIndex(t => t.name === n)),
  ]
);

export function ForceEditor({ forces, onForcesChange, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A', 'B', 'C']));
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSlider = (idx: number, value: number) => {
    const next = [...forces];
    next[idx] = value;
    onForcesChange(next);
  };

  const handleReset = () => {
    onForcesChange([...DEFAULT_FORCES]);
  };

  const handleExport = () => {
    const rows = ['Nome,Força,Bandeira', ...TEAMS.map((t, i) => `${t.name},${forces[i]},${t.flag}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forcas_copa2026.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n');
      // Detecta se tem cabeçalho
      const start = lines[0].toLowerCase().includes('nome') ? 1 : 0;
      const next = [...forces];
      const warnings: string[] = [];

      for (let i = start; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 2) continue;
        const name = parts[0].trim();
        const val = parseFloat(parts[1].trim());
        const idx = TEAMS.findIndex(t => t.name === name);
        if (idx === -1) { warnings.push(name); continue; }
        if (isNaN(val) || val < 0) { warnings.push(name + ' (valor inválido)'); continue; }
        next[idx] = Math.min(val, MAX_FORCE);
      }

      onForcesChange(next);
      if (warnings.length > 0) {
        setImportError(`Times não encontrados ou inválidos: ${warnings.join(', ')}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleGroup = (g: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const filterLow = search.toLowerCase();
  const filtered = filterLow
    ? GROUP_TEAM_INDICES.map(([g, idxs]) => [g, idxs.filter(i => TEAMS[i].name.toLowerCase().includes(filterLow))] as [string, number[]])
        .filter(([, idxs]) => idxs.length > 0)
    : GROUP_TEAM_INDICES;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      {/* Painel lateral */}
      <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-copa-green via-copa-blue to-copa-purple bg-[length:250%_250%] animate-gradient-x text-white">
          <h2 className="font-display text-lg tracking-wide">⚙️ Editar Forças dos Times</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ações */}
        <div className="flex gap-2 p-3 border-b border-gray-100 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-copa-dark transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar
          </button>
          <button
            onClick={handleExport}
            className="btn-fest-green flex items-center gap-1.5 px-3 py-2 text-sm !rounded-xl"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-fest-gold flex items-center gap-1.5 px-3 py-2 text-sm !rounded-xl"
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {/* Aviso de importação */}
        {importError && (
          <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {importError}
          </div>
        )}

        {/* Busca */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar time..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-copa-dark"
            />
          </div>
        </div>

        {/* Lista de sliders por grupo */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {filtered.map(([groupName, idxs]) => (
            <div key={groupName} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-copa-dark"
              >
                <span>Grupo {groupName}</span>
                {openGroups.has(groupName) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {(openGroups.has(groupName) || filterLow !== '') && (
                <div className="divide-y divide-gray-50">
                  {idxs.map(idx => (
                    <div key={idx} className="px-3 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-copa-dark">
                          {TEAMS[idx].flag} {TEAMS[idx].name}
                        </span>
                        <span className="text-sm font-bold text-copa-green w-14 text-right">
                          {forces[idx].toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={MAX_FORCE}
                        step={0.1}
                        value={forces[idx]}
                        onChange={e => handleSlider(idx, parseFloat(e.target.value))}
                        className="w-full h-2 accent-copa-green cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
