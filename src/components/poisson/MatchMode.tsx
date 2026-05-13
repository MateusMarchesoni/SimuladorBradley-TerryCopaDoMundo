import { useMemo, useState } from 'react';
import { Play, Loader2, Info } from 'lucide-react';
import { TEAMS } from '../../data/teams';
import {
  POISSON_TEAMS,
  POISSON_TEAM_INDEX,
  poissonSample,
  lambdasFor,
} from '../../lib/poisson/sampling';
import { ScoreHeatmap } from './ScoreHeatmap';

const HEATMAP_SIZE = 6; // 0..5+
const MAX_SIMS = 100_000;

interface SimulationOutput {
  teamA: string;
  teamB: string;
  lambdaA: number;
  lambdaB: number;
  winA: number;
  draw: number;
  winB: number;
  mostProbable: { a: number; b: number; pct: number };
  matrix: number[][];
  totalSamples: number;
}

function flagForName(name: string): string {
  return TEAMS.find(t => t.name === name)?.flag ?? '';
}

interface TeamDropdownProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  excludeName?: string;
}

function TeamDropdown({ label, value, onChange, excludeName }: TeamDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POISSON_TEAMS
      .filter(t => t.name !== excludeName)
      .filter(t => !q || t.name.toLowerCase().includes(q));
  }, [query, excludeName]);

  const selected = POISSON_TEAMS.find(t => t.name === value);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white hover:border-copa-dark text-left flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-lg">{flagForName(value)}</span>
          <span className="font-semibold text-copa-dark truncate">{value}</span>
          {selected?.source === 'estimate' && (
            <span title="λ estimado (amostra insuficiente)">
              <Info className="w-4 h-4 text-copa-gold" />
            </span>
          )}
        </span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-hidden flex flex-col">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar seleção…"
            className="px-3 py-2 text-sm border-b border-gray-100 outline-none"
          />
          <ul className="overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">Nenhuma seleção encontrada</li>
            )}
            {filtered.map(t => (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(t.name);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                    t.name === value ? 'bg-copa-bg font-semibold' : ''
                  }`}
                >
                  <span className="text-base">{flagForName(t.name)}</span>
                  <span className="truncate">{t.name}</span>
                  {t.source === 'estimate' && (
                    <span title="λ estimado (amostra insuficiente)">
                      <Info className="w-3.5 h-3.5 text-copa-gold ml-auto flex-shrink-0" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProbBar({ winA, draw, winB }: { winA: number; draw: number; winB: number }) {
  return (
    <div className="w-full">
      <div className="h-3 flex rounded-full overflow-hidden bg-gray-100">
        <div className="bg-copa-red" style={{ width: `${winA}%` }} />
        <div className="bg-gray-400" style={{ width: `${draw}%` }} />
        <div className="bg-copa-green" style={{ width: `${winB}%` }} />
      </div>
      <div className="flex justify-between text-xs mt-1 font-semibold">
        <span className="text-copa-red">Vitória A {winA.toFixed(1)}%</span>
        <span className="text-gray-500">Empate {draw.toFixed(1)}%</span>
        <span className="text-copa-green">Vitória B {winB.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function runSimulation(teamAName: string, teamBName: string, nSims: number): SimulationOutput {
  const aIdx = POISSON_TEAM_INDEX.get(teamAName)!;
  const bIdx = POISSON_TEAM_INDEX.get(teamBName)!;
  const a = POISSON_TEAMS[aIdx];
  const b = POISSON_TEAMS[bIdx];
  const { lambdaA, lambdaB } = lambdasFor(a, b);

  const matrix: number[][] = Array.from({ length: HEATMAP_SIZE }, () =>
    new Array(HEATMAP_SIZE).fill(0)
  );

  // Para "placar mais provável" usamos placares não-cap (precisão acima do heatmap também)
  const rawTally = new Map<string, number>();
  let winA = 0;
  let draw = 0;
  let winB = 0;

  for (let i = 0; i < nSims; i++) {
    const ga = poissonSample(lambdaA);
    const gb = poissonSample(lambdaB);

    if (ga > gb) winA++;
    else if (gb > ga) winB++;
    else draw++;

    const ka = Math.min(ga, HEATMAP_SIZE - 1);
    const kb = Math.min(gb, HEATMAP_SIZE - 1);
    matrix[ka][kb]++;

    // Tally exato para placar mais provável (usa cap de segurança 12)
    const exactKey = `${Math.min(ga, 12)}-${Math.min(gb, 12)}`;
    rawTally.set(exactKey, (rawTally.get(exactKey) ?? 0) + 1);
  }

  let bestKey = '0-0';
  let bestCount = -1;
  for (const [k, v] of rawTally) {
    if (v > bestCount) {
      bestCount = v;
      bestKey = k;
    }
  }
  const [bestA, bestB] = bestKey.split('-').map(Number);

  return {
    teamA: teamAName,
    teamB: teamBName,
    lambdaA,
    lambdaB,
    winA: (winA / nSims) * 100,
    draw: (draw / nSims) * 100,
    winB: (winB / nSims) * 100,
    mostProbable: { a: bestA, b: bestB, pct: (bestCount / nSims) * 100 },
    matrix,
    totalSamples: nSims,
  };
}

export function MatchMode() {
  const [teamA, setTeamA] = useState<string>(POISSON_TEAMS[3].name); // Brasil
  const [teamB, setTeamB] = useState<string>(POISSON_TEAMS[5].name); // Argentina
  const [numSims, setNumSims] = useState<number>(10_000);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<SimulationOutput | null>(null);

  const canSimulate = teamA !== teamB && !running;

  const handleSimulate = () => {
    if (!canSimulate) return;
    const n = Math.max(100, Math.min(numSims, MAX_SIMS));
    setRunning(true);
    // setTimeout permite que o spinner renderize antes do bloqueio
    setTimeout(() => {
      const out = runSimulation(teamA, teamB, n);
      setOutput(out);
      setRunning(false);
    }, 16);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TeamDropdown
            label="Time A (mandante visual)"
            value={teamA}
            onChange={setTeamA}
            excludeName={teamB}
          />
          <TeamDropdown
            label="Time B"
            value={teamB}
            onChange={setTeamB}
            excludeName={teamA}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Número de simulações (máx {MAX_SIMS.toLocaleString('pt-BR')})
            </label>
            <input
              type="number"
              min={100}
              max={MAX_SIMS}
              step={1000}
              value={numSims}
              onChange={e => setNumSims(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-copa-dark outline-none"
            />
          </div>

          <button
            onClick={handleSimulate}
            disabled={!canSimulate}
            className="flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 text-white font-extrabold rounded-2xl px-6 py-3 shadow-md transition-colors disabled:opacity-60 min-h-[48px]"
          >
            {running ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" fill="white" />
            )}
            {running ? 'Simulando…' : 'Simular'}
          </button>
        </div>

        {teamA === teamB && (
          <p className="text-xs text-copa-red">Selecione duas seleções diferentes.</p>
        )}
      </div>

      {output && (
        <>
          {/* Resultado principal */}
          <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Placar mais provável
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-copa-dark mt-0.5 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span>{flagForName(output.teamA)}</span>
                    <span className="truncate max-w-[10rem]">{output.teamA}</span>
                  </span>
                  <span className="font-mono text-copa-red">
                    {output.mostProbable.a} × {output.mostProbable.b}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="truncate max-w-[10rem]">{output.teamB}</span>
                    <span>{flagForName(output.teamB)}</span>
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ocorreu em {output.mostProbable.pct.toFixed(2)}% das simulações.
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 font-mono">
                <div>λ_A = <span className="text-copa-dark font-bold">{output.lambdaA.toFixed(3)}</span></div>
                <div>λ_B = <span className="text-copa-dark font-bold">{output.lambdaB.toFixed(3)}</span></div>
                <div className="mt-1 text-[10px] text-gray-400 not-italic">
                  λ_A = (A.gf + B.ga)/2
                </div>
              </div>
            </div>

            <ProbBar winA={output.winA} draw={output.draw} winB={output.winB} />
          </div>

          <ScoreHeatmap
            matrix={output.matrix}
            totalSamples={output.totalSamples}
            teamAName={output.teamA}
            teamBName={output.teamB}
            size={HEATMAP_SIZE}
          />
        </>
      )}

      {!output && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">⚽</p>
          <p className="text-base font-medium">
            Escolha duas seleções e clique em <strong className="text-copa-red">Simular</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
