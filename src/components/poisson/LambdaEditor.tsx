import { useState, useRef } from 'react';
import { X, RotateCcw, Download, Upload, Search, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { TEAMS } from '../../data/teams';
import { GROUPS } from '../../data/groups';
import {
  POISSON_TEAMS,
  POISSON_TEAM_INDEX,
  getDefaultLambdas,
  type LambdaArrays,
} from '../../lib/poisson/sampling';

interface Props {
  lambdas: LambdaArrays;
  onLambdasChange: (lambdas: LambdaArrays) => void;
  onClose: () => void;
}

const MAX_LAMBDA = 5;

// Mapeia nome do grupo → índices dentro de POISSON_TEAMS
const GROUP_TEAM_INDICES: [string, number[]][] = Object.entries(GROUPS).map(
  ([groupName, names]) => [
    groupName,
    names.map(n => {
      const idx = POISSON_TEAM_INDEX.get(n);
      if (idx === undefined) throw new Error(`Time não encontrado em POISSON_TEAMS: ${n}`);
      return idx;
    }),
  ]
);

function flagForName(name: string): string {
  return TEAMS.find(t => t.name === name)?.flag ?? '';
}

export function LambdaEditor({ lambdas, onLambdasChange, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A', 'B', 'C']));
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSlider = (idx: number, field: 'gf' | 'ga', value: number) => {
    const nextArr = [...lambdas[field]];
    nextArr[idx] = value;
    onLambdasChange({ ...lambdas, [field]: nextArr });
  };

  const handleReset = () => {
    onLambdasChange(getDefaultLambdas());
  };

  const handleExport = () => {
    const rows = [
      'Nome,λ_gf,λ_ga,Bandeira',
      ...POISSON_TEAMS.map((t, i) =>
        `${t.name},${lambdas.gf[i].toFixed(4)},${lambdas.ga[i].toFixed(4)},${flagForName(t.name)}`
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lambdas_copa2026.csv';
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
      const start = lines[0].toLowerCase().includes('nome') ? 1 : 0;
      const nextGf = [...lambdas.gf];
      const nextGa = [...lambdas.ga];
      const warnings: string[] = [];

      for (let i = start; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 3) continue;
        const name = parts[0].trim();
        const valGf = parseFloat(parts[1].trim());
        const valGa = parseFloat(parts[2].trim());
        const idx = POISSON_TEAM_INDEX.get(name);
        if (idx === undefined) { warnings.push(name); continue; }
        if (isNaN(valGf) || valGf < 0 || isNaN(valGa) || valGa < 0) {
          warnings.push(name + ' (valor inválido)');
          continue;
        }
        nextGf[idx] = Math.min(valGf, MAX_LAMBDA);
        nextGa[idx] = Math.min(valGa, MAX_LAMBDA);
      }

      onLambdasChange({ gf: nextGf, ga: nextGa });
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
    ? GROUP_TEAM_INDICES
        .map(([g, idxs]) =>
          [g, idxs.filter(i => POISSON_TEAMS[i].name.toLowerCase().includes(filterLow))] as [string, number[]]
        )
        .filter(([, idxs]) => idxs.length > 0)
    : GROUP_TEAM_INDICES;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-copa-dark text-white">
          <h2 className="font-bold text-lg">Editar Lambdas (Poisson)</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-3 border-b border-gray-100 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-copa-dark transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-copa-green hover:bg-emerald-700 rounded-xl font-semibold text-white transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-copa-gold hover:bg-yellow-500 rounded-xl font-semibold text-white transition-colors"
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

        {importError && (
          <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {importError}
          </div>
        )}

        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-[11px] text-gray-500 mb-2 leading-snug">
            <span className="font-semibold text-copa-green">λ_gf</span> = gols feitos por jogo &nbsp;·&nbsp;
            <span className="font-semibold text-copa-red">λ_ga</span> = gols sofridos por jogo.
            <span className="block">Em um confronto A×B: λ_A = (A.gf + B.ga)/2.</span>
          </p>
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
                  {idxs.map(idx => {
                    const team = POISSON_TEAMS[idx];
                    return (
                      <div key={idx} className="px-3 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-copa-dark flex items-center gap-1">
                            {flagForName(team.name)} {team.name}
                            {team.source === 'estimate' && (
                              <span
                                className="inline-flex"
                                title="λ estimado (amostra histórica insuficiente)"
                              >
                                <Info className="w-3.5 h-3.5 text-copa-gold" />
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-copa-green">λ_gf</span>
                            <span className="text-xs font-bold text-copa-green w-12 text-right font-mono">
                              {lambdas.gf[idx].toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={MAX_LAMBDA}
                            step={0.01}
                            value={lambdas.gf[idx]}
                            onChange={e => handleSlider(idx, 'gf', parseFloat(e.target.value))}
                            className="w-full h-2 accent-copa-green cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-copa-red">λ_ga</span>
                            <span className="text-xs font-bold text-copa-red w-12 text-right font-mono">
                              {lambdas.ga[idx].toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={MAX_LAMBDA}
                            step={0.01}
                            value={lambdas.ga[idx]}
                            onChange={e => handleSlider(idx, 'ga', parseFloat(e.target.value))}
                            className="w-full h-2 accent-copa-red cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
