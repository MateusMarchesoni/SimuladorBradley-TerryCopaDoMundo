import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { UnifiedStats } from '../lib/models/types';

// Painel de validação do modelo Poisson — checa média de gols/jogo e
// distribuição de placares contra faixas plausíveis em fase de grupos de Copa.
// Para BT, totalMatchesSimulated=0 e este painel não é renderizado.
export function ValidationPanel({ stats }: { stats: UnifiedStats }) {
  const meanOK = stats.meanGoalsPerMatch >= 2.4 && stats.meanGoalsPerMatch <= 3.3;

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
    <div className="card-fest p-5 animate-pop-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-display text-lg tracking-wide text-copa-dark">✅ Validação do modelo</h3>
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
          <p className="text-[11px] text-gray-500 mt-1">
            Esperado ≈ 2,5 — 3,2 (referência ~2,8)
          </p>
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
