import { useCallback, useRef, useState } from 'react';
import { Play, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { TEAMS } from '../../data/teams';
import { POISSON_TEAMS, type LambdaArrays } from '../../lib/poisson/sampling';
import type { PoissonCupStats } from '../../lib/poisson/cupSimulator';

type WorkerMsg =
  | { type: 'progress'; pct: number }
  | { type: 'done'; stats: PoissonCupStats };

const SIM_OPTIONS = [200, 1_000, 5_000] as const;

const COLS: { key: keyof PoissonCupStats; label: string; short: string }[] = [
  { key: 'top2', label: 'Top 2 Grupo', short: 'Top 2' },
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

function flagFor(name: string): string {
  return TEAMS.find(t => t.name === name)?.flag ?? '';
}

interface Props {
  customLambdas?: LambdaArrays;
}

export function CupMode({ customLambdas }: Props) {
  const [numCups, setNumCups] = useState<number>(1_000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<PoissonCupStats | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const handleSimulate = useCallback(() => {
    if (running) return;
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../../workers/poissonCup.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    setRunning(true);
    setProgress(0);
    setStats(null);

    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      if (e.data.type === 'progress') {
        setProgress(e.data.pct);
      } else {
        setStats(e.data.stats);
        setProgress(1);
        setRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage({ numCups, customLambdas });
  }, [running, numCups, customLambdas]);

  // Ranking pelo % campeão para destacar top-5
  const ranked = stats
    ? POISSON_TEAMS.map((t, i) => ({ name: t.name, source: t.source, idx: i }))
        .sort((a, b) => stats.champion[b.idx] - stats.champion[a.idx])
    : null;

  const top5Set = new Set(ranked?.slice(0, 5).map(r => r.name) ?? []);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-copa-dark mb-2">Quantidade de Copas</p>
          <div className="flex gap-2 flex-wrap">
            {SIM_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setNumCups(n)}
                disabled={running}
                className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                  numCups === n
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
          onClick={handleSimulate}
          disabled={running}
          className="flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 text-white font-extrabold text-lg rounded-2xl py-4 shadow-md transition-colors disabled:opacity-60 min-h-[56px]"
        >
          {running ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Play className="w-6 h-6" fill="white" />
          )}
          {running
            ? `Simulando… ${Math.round(progress * 100)}%`
            : `Simular ${numCups.toLocaleString('pt-BR')} Copas`}
        </button>

        {running && (
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-copa-gold rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {stats && ranked && (
        <>
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-copa-dark">
                Probabilidades por Seleção (modelo Poisson)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                As 5 mais prováveis campeãs aparecem destacadas em dourado.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-copa-dark text-white">
                    <th className="text-left px-3 py-3 sticky left-0 bg-copa-dark z-10 min-w-[180px]">
                      Seleção
                    </th>
                    {COLS.map(c => (
                      <th
                        key={c.key as string}
                        className="px-3 py-3 text-right whitespace-nowrap"
                      >
                        <span className="hidden sm:inline">{c.label}</span>
                        <span className="sm:hidden">{c.short}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(r => {
                    const isTop5 = top5Set.has(r.name);
                    return (
                      <tr
                        key={r.idx}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          isTop5 ? 'bg-amber-50/50 border-l-4 border-l-copa-gold' : ''
                        }`}
                      >
                        <td
                          className={`px-3 py-2 sticky left-0 font-medium text-copa-dark whitespace-nowrap ${
                            isTop5 ? 'bg-amber-50/50' : 'bg-white'
                          }`}
                        >
                          <span className="mr-2 text-base">{flagFor(r.name)}</span>
                          {r.name}
                          {r.source === 'estimate' && (
                            <span
                              className="inline-flex ml-1 align-middle"
                              title="λ estimado (amostra insuficiente)"
                            >
                              <Info className="w-3.5 h-3.5 text-copa-gold" />
                            </span>
                          )}
                        </td>
                        {COLS.map(c => {
                          const v = (stats[c.key] as number[])[r.idx];
                          return (
                            <td key={c.key as string} className="px-3 py-2 text-right">
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${colorClass(v)}`}>
                                {fmt(v)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ValidationPanel stats={stats} />
        </>
      )}

      {!stats && !running && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-base font-medium">
            Clique em <strong className="text-copa-red">Simular Copas</strong> para rodar
            o Monte Carlo com modelo Poisson.
          </p>
        </div>
      )}
    </div>
  );
}

function ValidationPanel({ stats }: { stats: PoissonCupStats }) {
  // Esperado: ~2,5 a ~3,1 gols por jogo em fase de grupos de Copa.
  // Faixa-alvo para "calibrado": 2,5 ≤ média ≤ 3,2
  const meanOK = stats.meanGoalsPerMatch >= 2.4 && stats.meanGoalsPerMatch <= 3.3;

  // Verificação simples de distribuição de placares: os mais frequentes devem
  // estar dentro de faixas plausíveis (0-0 entre 6–14%, 1-0 entre 12–22%,
  // 1-1 entre 10–20%, 2-1 entre 8–16%).
  const get = (s: string) => stats.scoreDist.find(d => d.score === s)?.pct ?? 0;
  const checks = [
    { score: '0-0', pct: get('0-0'), min: 5, max: 16, label: '0-0' },
    { score: '1-0', pct: get('1-0'), min: 10, max: 24, label: '1-0' },
    { score: '1-1', pct: get('1-1'), min: 8, max: 22, label: '1-1' },
    { score: '2-1', pct: get('2-1'), min: 7, max: 18, label: '2-1' },
  ];
  const distOK = checks.every(c => c.pct >= c.min && c.pct <= c.max);

  const calibrated = meanOK && distOK;

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-base font-bold text-copa-dark">Validação do modelo</h3>
        {calibrated ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Modelo calibrado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" />
            Fora da faixa esperada
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Verificações sobre {stats.totalMatchesSimulated.toLocaleString('pt-BR')} jogos de fase de
        grupos simulados (tempo regulamentar, 90 minutos).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div
          className={`rounded-xl border-2 p-3 ${
            meanOK ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className="text-xs uppercase text-gray-600 font-semibold">Média de gols/jogo</p>
          <p className="text-2xl font-extrabold text-copa-dark mt-1 font-mono">
            {stats.meanGoalsPerMatch.toFixed(2)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Esperado ≈ 2,5 — 3,2 (referência ~2,8)</p>
        </div>

        <div
          className={`rounded-xl border-2 p-3 ${
            distOK ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className="text-xs uppercase text-gray-600 font-semibold">Distribuição de placares</p>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {checks.map(c => {
              const ok = c.pct >= c.min && c.pct <= c.max;
              return (
                <div key={c.score} className="text-center">
                  <p className="text-[11px] font-mono text-gray-500">{c.label}</p>
                  <p
                    className={`text-base font-bold font-mono ${
                      ok ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {c.pct.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer font-semibold hover:text-copa-dark">
          Ver distribuição completa de placares
        </summary>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
          {stats.scoreDist.map(d => (
            <div key={d.score} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="font-mono text-gray-500">{d.score}</p>
              <p className="font-bold text-copa-dark">{d.pct.toFixed(2)}%</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
