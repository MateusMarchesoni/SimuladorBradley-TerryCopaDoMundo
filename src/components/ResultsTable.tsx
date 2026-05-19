import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react';
import { TEAMS } from '../data/teams';
import type { UnifiedStats } from '../lib/models/types';
import { POISSON_V1_DEFAULTS } from '../data/poissonV1Lambdas';
import { POISSON_TEAMS } from '../lib/poisson/sampling';
import type { ModelId } from '../lib/models/types';

interface Props {
  stats: UnifiedStats;
  modelId: ModelId;
}

type SortKey =
  | 'top2'
  | 'qualified'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final'
  | 'champion';

const COLS: { key: SortKey; label: string; short: string }[] = [
  { key: 'top2', label: 'Top 2 no Grupo', short: 'Top 2' },
  { key: 'qualified', label: 'Classificado', short: 'Class.' },
  { key: 'r16', label: 'Oitavas', short: 'Oitavas' },
  { key: 'qf', label: 'Quartas', short: 'Quartas' },
  { key: 'sf', label: 'Semifinal', short: 'Semi' },
  { key: 'final', label: 'Final', short: 'Final' },
  { key: 'champion', label: 'Campeão', short: 'Campeão' },
];

function colorClass(pct: number): string {
  if (pct >= 50) return 'bg-emerald-100 text-emerald-800 font-semibold';
  if (pct >= 20) return 'bg-yellow-100 text-yellow-800';
  if (pct >= 10) return 'bg-orange-100 text-orange-700';
  return 'bg-red-50 text-red-400';
}

function fmt(pct: number): string {
  if (pct >= 10) return pct.toFixed(1) + '%';
  if (pct >= 1) return pct.toFixed(2) + '%';
  return pct.toFixed(3) + '%';
}

// Para o modelo Poisson, checa se o time tem λ estimado (badge informativo).
function isEstimateFor(modelId: ModelId, idx: number): boolean {
  if (modelId === 'poissonV1') return POISSON_V1_DEFAULTS[idx]?.source === 'estimate';
  if (modelId === 'poissonV2') return POISSON_TEAMS[idx]?.source === 'estimate';
  return false;
}

export function ResultsTable({ stats, modelId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('champion');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const rows = TEAMS.map((t, i) => ({
    idx: i,
    name: t.name,
    flag: t.flag,
    isEstimate: isEstimateFor(modelId, i),
    top2: stats.top2[i],
    qualified: stats.qualified[i],
    r16: stats.r16[i],
    qf: stats.qf[i],
    sf: stats.sf[i],
    final: stats.final[i],
    champion: stats.champion[i],
  })).sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === 'desc' ? -diff : diff;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (k !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-40 inline ml-0.5" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 inline ml-0.5" />
      : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-copa-dark">
          Probabilidades por Seleção
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Clique no cabeçalho para ordenar
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-copa-dark text-white">
              <th className="text-left px-3 py-3 sticky left-0 bg-copa-dark z-10 min-w-[160px]">
                Seleção
              </th>
              {COLS.map(c => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className="px-3 py-3 text-right cursor-pointer hover:bg-gray-700 whitespace-nowrap select-none"
                >
                  <span className="hidden sm:inline">{c.label}</span>
                  <span className="sm:hidden">{c.short}</span>
                  <SortIcon k={c.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, pos) => (
              <tr
                key={r.idx}
                className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  pos < 3 ? 'border-l-4 border-l-copa-gold' : ''
                }`}
              >
                <td className="px-3 py-2 sticky left-0 bg-white font-medium text-copa-dark whitespace-nowrap">
                  <span className="mr-2 text-base">{r.flag}</span>
                  {r.name}
                  {r.isEstimate && (
                    <span
                      className="inline-flex ml-1 align-middle"
                      title="λ estimado (amostra histórica insuficiente)"
                    >
                      <Info className="w-3.5 h-3.5 text-copa-gold" />
                    </span>
                  )}
                </td>
                {COLS.map(c => (
                  <td key={c.key} className="px-3 py-2 text-right">
                    <span className={`px-2 py-0.5 rounded-lg text-xs ${colorClass(r[c.key])}`}>
                      {fmt(r[c.key])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
