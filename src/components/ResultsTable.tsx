import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react';
import { TEAMS } from '../data/teams';
import type { TeamView } from '../lib/custom/types';

// Coluna de estatística genérica. O callsite (SimulateTab / CustomSimulator)
// monta a lista a partir do shape específico dos seus stats.
export interface ResultsColumn {
  key: string;
  label: string;
  short: string;
  values: number[];   // valor por índice de time
}

interface Props {
  columns: ResultsColumn[];
  // Default = TEAMS (Copa 2026). Custom passa a lista de times do torneio.
  teamsByIndex?: TeamView[];
  // Marca times com badge "estimado" (V1/V2 históricos). Default = nunca.
  isEstimateByIndex?: (idx: number) => boolean;
  // Coluna usada como ordenação default (key de uma das colunas).
  initialSortKey?: string;
}

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

export function ResultsTable({
  columns,
  teamsByIndex,
  isEstimateByIndex,
  initialSortKey,
}: Props) {
  const resolvedTeams: TeamView[] = teamsByIndex ?? TEAMS;
  const defaultSortKey = initialSortKey ?? columns[columns.length - 1]?.key ?? '';

  const [sortKey, setSortKey] = useState<string>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Mapa key → coluna para lookup rápido na ordenação.
  const colByKey = new Map(columns.map(c => [c.key, c]));
  const sortCol = colByKey.get(sortKey);

  const rows = resolvedTeams.map((t, i) => ({
    idx: i,
    name: t.name,
    flag: t.flag,
    isEstimate: isEstimateByIndex?.(i) ?? false,
  })).sort((a, b) => {
    if (!sortCol) return 0;
    const diff = (sortCol.values[a.idx] ?? 0) - (sortCol.values[b.idx] ?? 0);
    return sortDir === 'desc' ? -diff : diff;
  });

  const SortIcon = ({ k }: { k: string }) => {
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
              {columns.map(c => (
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
                {columns.map(c => {
                  const v = c.values[r.idx] ?? 0;
                  return (
                    <td key={c.key} className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded-lg text-xs ${colorClass(v)}`}>
                        {fmt(v)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Builder de colunas para a Copa 2026 (UnifiedStats com r16/qf/sf/final).
// Mantém a apresentação histórica do projeto.
export function buildCopa2026Columns(stats: {
  top2: number[];
  qualified: number[];
  r16: number[];
  qf: number[];
  sf: number[];
  final: number[];
  champion: number[];
}): ResultsColumn[] {
  return [
    { key: 'top2',      label: 'Top 2 no Grupo', short: 'Top 2',  values: stats.top2 },
    { key: 'qualified', label: 'Classificado',   short: 'Class.', values: stats.qualified },
    { key: 'r16',       label: 'Oitavas',        short: 'Oitavas',values: stats.r16 },
    { key: 'qf',        label: 'Quartas',        short: 'Quartas',values: stats.qf },
    { key: 'sf',        label: 'Semifinal',      short: 'Semi',   values: stats.sf },
    { key: 'final',     label: 'Final',          short: 'Final',  values: stats.final },
    { key: 'champion',  label: 'Campeão',        short: 'Campeão',values: stats.champion },
  ];
}
