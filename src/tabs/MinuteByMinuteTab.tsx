/**
 * Tela "Minuto a Minuto" — animação concreta do modelo de Poisson.
 *
 * Disponível apenas para Poisson V1 ou V2 (BT não modela gols). O usuário
 * escolhe duas seleções, o app calcula Λ_A e Λ_B, sorteia número de gols por
 * Poisson(Λ), sorteia minutos uniformes em [1..90] e anima a passagem dos
 * 90 minutos com placar evolutivo.
 *
 * Botões:
 *   - "Repetir": replay determinístico com a mesma seed.
 *   - "Nova simulação": resorteia tudo.
 *
 * Ao final, mostra os 5 placares mais prováveis entre as duas seleções
 * (rodando 1 000 sims rápidas em background).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, Play, RotateCcw, Shuffle } from 'lucide-react';
import { TEAMS, TEAM_INDEX_MAP } from '../data/teams';
import { POISSON_V1_DEFAULTS } from '../data/poissonV1Lambdas';
import { POISSON_TEAMS } from '../lib/poisson/sampling';
import { lambdasForV1 } from '../lib/poisson/v1';
import { lambdasFor } from '../lib/poisson/sampling';
import { mulberry32, poissonSampleWith, randomSeed, type Rng } from '../lib/seeded';
import { MODEL_META, type ModelId } from '../lib/models/types';

type PoissonModelId = 'poissonV1' | 'poissonV2';

const ANIMATION_MS = 10_000; // duração total da animação (10s, dentro do alvo <12s)
const GOAL_FLASH_MS = 700;   // pausa visual em cada gol

interface GoalEvent {
  minute: number;
  team: 'A' | 'B';
}

interface SimRun {
  seed: number;
  lambdaA: number;
  lambdaB: number;
  goalsA: number;
  goalsB: number;
  events: GoalEvent[];
}

function flagFor(name: string): string {
  return TEAMS.find(t => t.name === name)?.flag ?? '';
}

function sourceFor(modelId: PoissonModelId, idx: number): 'historical' | 'estimate' {
  return modelId === 'poissonV1' ? POISSON_V1_DEFAULTS[idx].source : POISSON_TEAMS[idx].source;
}

function lambdasForModel(modelId: PoissonModelId, aIdx: number, bIdx: number) {
  if (modelId === 'poissonV1') return lambdasForV1(aIdx, bIdx);
  return lambdasFor(POISSON_TEAMS[aIdx], POISSON_TEAMS[bIdx]);
}

// Roda 1 simulação seedada e devolve eventos ordenados.
function runSeeded(
  modelId: PoissonModelId,
  aIdx: number,
  bIdx: number,
  seed: number
): SimRun {
  const { lambdaA, lambdaB } = lambdasForModel(modelId, aIdx, bIdx);
  const rng: Rng = mulberry32(seed);

  const goalsA = poissonSampleWith(lambdaA, rng);
  const goalsB = poissonSampleWith(lambdaB, rng);

  const events: GoalEvent[] = [];
  for (let i = 0; i < goalsA; i++) {
    events.push({ minute: 1 + Math.floor(rng() * 90), team: 'A' });
  }
  for (let i = 0; i < goalsB; i++) {
    events.push({ minute: 1 + Math.floor(rng() * 90), team: 'B' });
  }
  events.sort((x, y) => x.minute - y.minute);

  return { seed, lambdaA, lambdaB, goalsA, goalsB, events };
}

// 1 000 sims rápidas (não seedadas) para o painel de placares mais prováveis.
function distributeScores(modelId: PoissonModelId, aIdx: number, bIdx: number) {
  const N = 1000;
  const { lambdaA, lambdaB } = lambdasForModel(modelId, aIdx, bIdx);
  const rng: Rng = mulberry32(randomSeed());
  const tally = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const ga = Math.min(poissonSampleWith(lambdaA, rng), 9);
    const gb = Math.min(poissonSampleWith(lambdaB, rng), 9);
    const key = `${ga}-${gb}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([score, count]) => ({ score, pct: (count / N) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

interface MinuteByMinuteProps {
  // ModelId vem do toggle global; se BT, mostramos aviso.
  activeModelId: ModelId;
}

export function MinuteByMinuteTab({ activeModelId }: MinuteByMinuteProps) {
  const isPoisson = activeModelId !== 'bt';
  const initialModel: PoissonModelId = isPoisson
    ? (activeModelId as PoissonModelId)
    : 'poissonV1';

  const [modelId, setModelId] = useState<PoissonModelId>(initialModel);
  const [teamA, setTeamA] = useState<string>('Brasil');
  const [teamB, setTeamB] = useState<string>('Haiti');
  const [run, setRun] = useState<SimRun | null>(null);
  const [tick, setTick] = useState<number>(0); // 0..90
  const [animating, setAnimating] = useState(false);
  const [topScores, setTopScores] = useState<{ score: string; pct: number }[]>([]);

  const rafRef = useRef<number | null>(null);

  const aIdx = TEAM_INDEX_MAP.get(teamA)!;
  const bIdx = TEAM_INDEX_MAP.get(teamB)!;
  const sameTeam = teamA === teamB;

  // Sincroniza modelo local quando o usuário troca o toggle global p/ V1 ou V2.
  useEffect(() => {
    if (isPoisson) setModelId(activeModelId as PoissonModelId);
  }, [activeModelId, isPoisson]);

  // Cleanup do raf ao desmontar.
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Conta gols até o "minuto" atual.
  const scoreNow = useMemo(() => {
    if (!run) return { a: 0, b: 0 };
    let a = 0, b = 0;
    for (const ev of run.events) {
      if (ev.minute <= tick) {
        if (ev.team === 'A') a++;
        else b++;
      }
    }
    return { a, b };
  }, [run, tick]);

  // Identifica gol no minuto atual (para flash visual).
  const goalNow = useMemo(() => {
    if (!run) return null;
    return run.events.find(ev => ev.minute === tick) ?? null;
  }, [run, tick]);

  const animate = useCallback((events: GoalEvent[]) => {
    setAnimating(true);
    const start = performance.now();
    // Minutos com gol (em ordem crescente, sem duplicatas), para calcular pausas.
    const goalMinutes = [...new Set(events.map(e => e.minute))].sort((x, y) => x - y);
    const totalDuration = ANIMATION_MS + GOAL_FLASH_MS * goalMinutes.length;

    const step = (now: number) => {
      const elapsed = now - start;

      // Quantos gols já foram "atravessados" até este elapsed (descontando suas
      // pausas) determina o minuto exibido.
      let displayMinute = 0;
      let pauseBudget = 0;
      for (let m = 0; m <= 90; m++) {
        // Tempo (linear) necessário para chegar até o minuto m, mais a pausa
        // acumulada por todos os gols cujo minuto ≤ m.
        const needed = (m * ANIMATION_MS) / 90 + pauseBudget;
        if (needed > elapsed) {
          displayMinute = m - 1;
          break;
        }
        displayMinute = m;
        if (goalMinutes.includes(m)) pauseBudget += GOAL_FLASH_MS;
      }
      displayMinute = Math.max(0, Math.min(90, displayMinute));
      setTick(displayMinute);

      if (elapsed < totalDuration && displayMinute < 90) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setTick(90);
        setAnimating(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  const startNew = useCallback(() => {
    if (sameTeam) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const seed = randomSeed();
    const r = runSeeded(modelId, aIdx, bIdx, seed);
    setRun(r);
    setTick(0);
    animate(r.events);

    // Roda em background os 5 placares mais frequentes.
    setTopScores([]);
    setTimeout(() => {
      setTopScores(distributeScores(modelId, aIdx, bIdx));
    }, 16);
  }, [aIdx, bIdx, modelId, sameTeam, animate]);

  const replay = useCallback(() => {
    if (!run) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setTick(0);
    animate(run.events);
  }, [run, animate]);

  const flashGoal = goalNow && animating;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-bold text-copa-dark mb-1">Simulação minuto a minuto</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Veja como o modelo Poisson trata gols como eventos independentes no tempo. Cada gol é
          sorteado por Poisson(Λ) e distribuído uniformemente entre os 90 minutos.
        </p>
      </div>

      {!isPoisson && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">O modelo Bradley-Terry não modela gols.</p>
          <p className="text-xs">
            Esta tela usa o Poisson para sortear os gols por minuto. O modelo selecionado abaixo é{' '}
            <strong>{MODEL_META[modelId].label}</strong>. Para alterar globalmente, volte na aba
            "Simular" e escolha um modelo Poisson.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
        {/* Sub-toggle local de modelo (V1 / V2) */}
        <div
          role="tablist"
          className="inline-flex p-1 bg-copa-bg rounded-xl border border-gray-200 self-start"
        >
          {(['poissonV1', 'poissonV2'] as PoissonModelId[]).map(id => (
            <button
              key={id}
              role="tab"
              aria-selected={modelId === id}
              onClick={() => setModelId(id)}
              disabled={animating}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                modelId === id
                  ? 'bg-copa-dark text-white shadow'
                  : 'text-copa-dark hover:bg-white'
              } disabled:opacity-50`}
            >
              {MODEL_META[id].short}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TeamPick label="Time A" value={teamA} onChange={setTeamA} other={teamB} modelId={modelId} />
          <TeamPick label="Time B" value={teamB} onChange={setTeamB} other={teamA} modelId={modelId} />
        </div>

        {sameTeam && (
          <p className="text-xs text-copa-red">Selecione duas seleções diferentes.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={startNew}
            disabled={sameTeam || animating}
            className="flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 text-white font-extrabold rounded-2xl px-5 py-3 shadow-md transition-colors disabled:opacity-60 min-h-[48px]"
          >
            <Shuffle className="w-5 h-5" />
            Nova simulação
          </button>
          <button
            onClick={replay}
            disabled={!run || animating}
            className="flex items-center justify-center gap-2 bg-copa-green hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 py-3 shadow-md transition-colors disabled:opacity-60 min-h-[48px]"
          >
            <RotateCcw className="w-5 h-5" />
            Repetir
          </button>
        </div>
      </div>

      {run && (
        <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
          {/* Placar e minuto */}
          <div
            className={`rounded-2xl p-5 flex items-center justify-between transition-colors duration-300 ${
              flashGoal
                ? 'bg-gradient-to-r from-copa-gold to-yellow-300'
                : 'bg-copa-dark'
            }`}
          >
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-2xl">{flagFor(teamA)}</span>
              <span className={`text-xs font-bold uppercase tracking-wide ${flashGoal ? 'text-copa-dark' : 'text-white/80'}`}>
                {teamA}
              </span>
            </div>
            <div className="text-center px-4">
              <p className={`text-5xl font-extrabold font-mono ${flashGoal ? 'text-copa-dark' : 'text-white'}`}>
                {scoreNow.a} × {scoreNow.b}
              </p>
              <p className={`mt-1 font-mono text-xs ${flashGoal ? 'text-copa-dark/80' : 'text-white/70'}`}>
                {tick}′ {tick >= 90 && !animating ? '· FIM' : ''}
              </p>
              {flashGoal && (
                <p className="text-copa-red font-extrabold uppercase tracking-widest text-xs mt-1">
                  GOL!
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-2xl">{flagFor(teamB)}</span>
              <span className={`text-xs font-bold uppercase tracking-wide ${flashGoal ? 'text-copa-dark' : 'text-white/80'}`}>
                {teamB}
              </span>
            </div>
          </div>

          {/* Barra de progresso 0..90 */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-copa-gold rounded-full transition-all duration-100"
              style={{ width: `${(tick / 90) * 100}%` }}
            />
          </div>

          {/* Métricas e lista de gols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
            <div className="bg-copa-bg rounded-xl p-3 font-mono">
              <p className="text-[11px] uppercase font-semibold tracking-wide text-gray-500">
                Lambdas do confronto
              </p>
              <p>
                Λ_A ({teamA}) ={' '}
                <span className="text-copa-dark font-bold">{run.lambdaA.toFixed(3)}</span>
              </p>
              <p>
                Λ_B ({teamB}) ={' '}
                <span className="text-copa-dark font-bold">{run.lambdaB.toFixed(3)}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                Gols sorteados: A={run.goalsA}, B={run.goalsB}
              </p>
            </div>
            <div className="bg-copa-bg rounded-xl p-3">
              <p className="text-[11px] uppercase font-semibold tracking-wide text-gray-500 mb-1">
                Minutos dos gols
              </p>
              {run.events.length === 0 ? (
                <p className="text-gray-400 italic">Sem gols nesta simulação.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {run.events.map((ev, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono ${
                        ev.team === 'A'
                          ? 'bg-copa-red/10 text-copa-red'
                          : 'bg-copa-green/10 text-copa-green'
                      }`}
                    >
                      {ev.minute}′ {ev.team === 'A' ? teamA.split(' ')[0] : teamB.split(' ')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Distribuição top-5 placares (em background) */}
          {!animating && topScores.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[11px] uppercase font-semibold tracking-wide text-gray-500 mb-2">
                Placares mais prováveis entre {teamA} e {teamB} (1 000 sims)
              </p>
              <div className="flex flex-wrap gap-2">
                {topScores.map(s => (
                  <span
                    key={s.score}
                    className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-mono text-copa-dark"
                  >
                    {s.score} <span className="text-gray-500">em {s.pct.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!run && !sameTeam && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🕒</p>
          <p className="text-base font-medium">
            Clique em <strong className="text-copa-red">Nova simulação</strong> para começar a animação.
          </p>
        </div>
      )}
    </main>
  );
}

function TeamPick({
  label,
  value,
  onChange,
  other,
  modelId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  other: string;
  modelId: PoissonModelId;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white focus:border-copa-dark outline-none"
      >
        {TEAMS.map((t, i) => {
          const src = sourceFor(modelId, i);
          const disabled = t.name === other;
          return (
            <option key={t.name} value={t.name} disabled={disabled}>
              {t.flag} {t.name}
              {src === 'estimate' ? ' • estimado' : ''}
            </option>
          );
        })}
      </select>
      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
        <Play className="w-2.5 h-2.5" /> escolha duas seleções
        {sourceFor(modelId, TEAM_INDEX_MAP.get(value) ?? 0) === 'estimate' && (
          <span className="inline-flex items-center gap-0.5 ml-1 text-copa-gold">
            <Info className="w-2.5 h-2.5" /> λ estimado
          </span>
        )}
      </p>
    </div>
  );
}
