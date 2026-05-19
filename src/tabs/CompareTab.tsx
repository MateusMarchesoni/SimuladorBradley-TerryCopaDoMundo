/**
 * Tela "Comparar Modelos" — roda BT, Poisson V1 e Poisson V2 lado a lado.
 *
 * Mostra para cada seleção a probabilidade de campeão calculada por cada
 * modelo e a maior divergência (max − min). O ponto pedagógico é evidenciar
 * que a escolha do modelo muda as previsões.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Loader2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TEAMS } from '../data/teams';
import {
  MODEL_META,
  type ModelId,
  type SimWorkerResponse,
  type UnifiedStats,
} from '../lib/models/types';

const SIM_OPTIONS = [1_000, 5_000, 10_000] as const;
const MODELS: ModelId[] = ['bt', 'poissonV1', 'poissonV2'];

type SortKey = 'name' | ModelId | 'div';

interface ModelRunState {
  progress: number;
  stats: UnifiedStats | null;
}

const EMPTY_STATE: ModelRunState = { progress: 0, stats: null };

export function CompareTab() {
  const [numSims, setNumSims] = useState<number>(10_000);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Record<ModelId, ModelRunState>>({
    bt: EMPTY_STATE,
    poissonV1: EMPTY_STATE,
    poissonV2: EMPTY_STATE,
  });
  const [sortKey, setSortKey] = useState<SortKey>('div');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Workers ativos (1 por modelo). Mantemos refs para conseguir terminar caso
  // o usuário inicie nova rodada antes da anterior terminar.
  const workersRef = useRef<Worker[]>([]);

  // Cleanup ao desmontar.
  useEffect(() => {
    return () => {
      workersRef.current.forEach(w => w.terminate());
      workersRef.current = [];
    };
  }, []);

  const handleRun = useCallback(() => {
    if (running) return;
    workersRef.current.forEach(w => w.terminate());
    workersRef.current = [];

    setRunning(true);
    setRuns({ bt: EMPTY_STATE, poissonV1: EMPTY_STATE, poissonV2: EMPTY_STATE });

    let pending = MODELS.length;

    for (const id of MODELS) {
      const worker = new Worker(
        new URL('../workers/simulator.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workersRef.current.push(worker);

      worker.onmessage = (e: MessageEvent<SimWorkerResponse>) => {
        const data = e.data;
        if (data.type === 'progress') {
          const pct = data.pct;
          setRuns(prev => ({ ...prev, [id]: { ...prev[id], progress: pct } }));
        } else {
          const stats = data.stats;
          setRuns(prev => ({ ...prev, [id]: { progress: 1, stats } }));
          worker.terminate();
          pending--;
          if (pending === 0) setRunning(false);
        }
      };

      // Cada worker roda com parâmetros default do seu modelo.
      worker.postMessage({
        numCups: numSims,
        params: { modelId: id },
      });
    }
  }, [running, numSims]);

  const allDone = MODELS.every(id => runs[id].stats !== null);

  // Linhas da tabela: união das 48 seleções, com champion por modelo + divergência.
  const rows = TEAMS.map((t, i) => {
    const bt = runs.bt.stats?.champion[i] ?? 0;
    const v1 = runs.poissonV1.stats?.champion[i] ?? 0;
    const v2 = runs.poissonV2.stats?.champion[i] ?? 0;
    const vals = [bt, v1, v2];
    const div = Math.max(...vals) - Math.min(...vals);
    return {
      idx: i,
      name: t.name,
      flag: t.flag,
      bt,
      poissonV1: v1,
      poissonV2: v2,
      div,
    };
  });

  if (allDone) {
    rows.sort((a, b) => {
      if (sortKey === 'name') {
        const r = a.name.localeCompare(b.name);
        return sortDir === 'desc' ? -r : r;
      }
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === 'desc' ? -diff : diff;
    });
  } else {
    // Antes de rodar, ordena alfabético para previsibilidade.
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  // Top-10 para o gráfico de barras agrupadas (usa BT como base de ranking).
  const top10 = allDone
    ? [...rows]
        .sort((a, b) => {
          const sumA = a.bt + a.poissonV1 + a.poissonV2;
          const sumB = b.bt + b.poissonV1 + b.poissonV2;
          return sumB - sumA;
        })
        .slice(0, 10)
        .map(r => ({
          name: r.flag + ' ' + r.name.split(' ')[0],
          BT: +r.bt.toFixed(2),
          'V1 Histórico': +r.poissonV1.toFixed(2),
          'V2 Forças': +r.poissonV2.toFixed(2),
        }))
    : [];

  // Soma de % campeão por modelo (deve dar ≈ 100% — sanity check da spec).
  const sums = {
    bt: runs.bt.stats?.champion.reduce((s, v) => s + v, 0) ?? 0,
    poissonV1: runs.poissonV1.stats?.champion.reduce((s, v) => s + v, 0) ?? 0,
    poissonV2: runs.poissonV2.stats?.champion.reduce((s, v) => s + v, 0) ?? 0,
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-bold text-copa-dark mb-1">Comparar Modelos</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Roda os três modelos (Bradley-Terry, Poisson V1 e Poisson V2) com a mesma quantidade de
          Copas e compara as probabilidades de campeão. Times onde os modelos discordam mais
          revelam a sensibilidade da previsão aos pressupostos.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-copa-dark mb-2">
            Número de simulações por modelo
          </p>
          <div className="flex gap-2 flex-wrap">
            {SIM_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setNumSims(n)}
                disabled={running}
                className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                  numSims === n
                    ? 'bg-copa-dark text-white border-copa-dark'
                    : 'bg-white text-copa-dark border-gray-300 hover:border-copa-dark'
                } disabled:opacity-50`}
              >
                {n.toLocaleString('pt-BR')}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 text-white font-extrabold text-lg rounded-2xl py-4 shadow-md transition-colors disabled:opacity-60 min-h-[56px]"
        >
          {running ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Play className="w-6 h-6" fill="white" />
          )}
          {running ? 'Rodando os 3 modelos…' : `Rodar nos 3 Modelos (${numSims.toLocaleString('pt-BR')} cada)`}
        </button>

        {running && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODELS.map(id => (
              <div key={id} className="bg-copa-bg rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-copa-dark">{MODEL_META[id].short}</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {Math.round(runs[id].progress * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-copa-gold rounded-full transition-all duration-200"
                    style={{ width: `${Math.round(runs[id].progress * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {allDone && (
        <>
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="text-base font-bold text-copa-dark mb-3">
              Top 10 favoritos por modelo
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={top10} margin={{ left: 4, right: 8, top: 4, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => v.toFixed(2) + '%'}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                <Bar dataKey="BT" fill="#0E5C3A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="V1 Histórico" fill="#E63946" radius={[3, 3, 0, 0]} />
                <Bar dataKey="V2 Forças" fill="#FFB703" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-copa-dark">
                Probabilidade de campeão por modelo
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Clique no cabeçalho para ordenar. "Δ" é a maior divergência entre os três modelos.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-copa-dark text-white">
                    <Th k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" sticky>
                      Seleção
                    </Th>
                    <Th k="bt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                      BT
                    </Th>
                    <Th k="poissonV1" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                      V1 Histórico
                    </Th>
                    <Th k="poissonV2" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                      V2 Forças
                    </Th>
                    <Th k="div" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                      Δ
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 sticky left-0 bg-white font-medium text-copa-dark whitespace-nowrap">
                        <span className="mr-2 text-base">{r.flag}</span>
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmtPct(r.bt)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtPct(r.poissonV1)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtPct(r.poissonV2)}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${divClass(r.div)}`}>
                          {fmtPct(r.div)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-copa-bg border border-gray-200 rounded-2xl p-4 text-xs text-gray-600">
            <p className="font-semibold text-copa-dark mb-1">Verificação: soma de % campeão</p>
            <p>
              BT: <span className="font-mono">{sums.bt.toFixed(2)}%</span> · V1:{' '}
              <span className="font-mono">{sums.poissonV1.toFixed(2)}%</span> · V2:{' '}
              <span className="font-mono">{sums.poissonV2.toFixed(2)}%</span>
            </p>
            <p className="text-gray-500 mt-0.5">
              Esperado: 100% ± 0,5%. Pequenas diferenças vêm da imprecisão de ponto flutuante.
            </p>
          </div>
        </>
      )}

      {!allDone && !running && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🔬</p>
          <p className="text-base font-medium">
            Clique em <strong className="text-copa-red">Rodar nos 3 Modelos</strong> para comparar.
          </p>
        </div>
      )}
    </main>
  );
}

function fmtPct(v: number): string {
  if (v >= 10) return v.toFixed(1) + '%';
  if (v >= 1) return v.toFixed(2) + '%';
  return v.toFixed(3) + '%';
}

function divClass(d: number): string {
  if (d >= 5) return 'bg-red-100 text-red-800 font-semibold';
  if (d >= 2) return 'bg-amber-100 text-amber-800';
  if (d >= 1) return 'bg-yellow-50 text-yellow-700';
  return 'bg-gray-50 text-gray-500';
}

function Th({
  k,
  sortKey,
  sortDir,
  onSort,
  children,
  align = 'right',
  sticky,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'desc' | 'asc';
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
  sticky?: boolean;
}) {
  const Icon =
    k !== sortKey
      ? <ChevronsUpDown className="w-3 h-3 opacity-40 inline ml-0.5" />
      : sortDir === 'desc'
        ? <ChevronDown className="w-3 h-3 inline ml-0.5" />
        : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  return (
    <th
      onClick={() => onSort(k)}
      className={`px-3 py-3 cursor-pointer hover:bg-gray-700 whitespace-nowrap select-none ${
        align === 'left' ? 'text-left' : 'text-right'
      } ${sticky ? 'sticky left-0 bg-copa-dark z-10 min-w-[160px]' : ''}`}
    >
      {children}
      {Icon}
    </th>
  );
}
