/**
 * Roda o Monte Carlo e o "Ver 1 Copa" para um CustomTournament.
 *
 * Reusa SimulationControls (com simOptions por modelo), ResultsTable,
 * ChartsSection, SingleBracket e ValidationPanel. O worker
 * customSimulator.worker.ts faz o trabalho pesado.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SimulationControls } from '../SimulationControls';
import {
  ResultsTable,
  type ResultsColumn,
} from '../ResultsTable';
import { ChartsSection } from '../ChartsSection';
import { SingleBracket } from '../SingleBracket';
import { ValidationPanel } from '../ValidationPanel';
import { TournamentValidation } from './TournamentValidation';
import {
  roundLabels,
  simulateOneCustomCup,
} from '../../lib/custom/engine';
import { validateTournament } from '../../lib/custom/validate';
import type {
  CustomSimWorkerResponse,
  CustomSingleResult,
  CustomTournament,
  CustomUnifiedStats,
} from '../../lib/custom/types';
import type { UnifiedStats } from '../../lib/models/types';

interface Props {
  tournament: CustomTournament;
  onBack: () => void;
}

// Opções de N de Copas — independente do modelo. Mantém escala parecida com a
// Copa 2026 (até 25k em Poisson) e dá folga até 50k para BT (mais leve).
function simOptionsFor(modelId: CustomTournament['modelId']): readonly number[] {
  return modelId === 'bt'
    ? [1_000, 10_000, 50_000]
    : [1_000, 10_000, 25_000];
}

// Converte CustomUnifiedStats em colunas para o ResultsTable.
function buildCustomColumns(stats: CustomUnifiedStats): ResultsColumn[] {
  const labels = roundLabels(stats.totalQualifiers);
  const cols: ResultsColumn[] = [
    { key: 'top1',      label: '1º Grupo',    short: '1º',     values: stats.top1 },
    { key: 'qualified', label: 'Classificado', short: 'Class.', values: stats.qualified },
  ];
  // perRound[r] = % chegou ao round r+1 (i.e. venceu round r).
  // Labels: o time chega à fase com label rounds[r] — então usar labels[r] já é
  // intuitivo ("Chegou ao R16" = perRound[0] quando totalQuals=32). Para o
  // último round, mostramos "Campeão" em vez de label da Final.
  for (let r = 0; r < labels.length; r++) {
    const isLast = r === labels.length - 1;
    cols.push({
      key: `round_${r}`,
      label: isLast ? 'Campeão' : labels[r + 1] ?? labels[r],
      short: isLast ? 'Campeão' : labels[r + 1] ?? labels[r],
      values: stats.perRound[r],
    });
  }
  return cols;
}

// Adapta CustomUnifiedStats → UnifiedStats para ChartsSection.
// Mapeia perRound em r16/qf/sf/final/champion quando totalQuals = 32. Para
// outros tamanhos, deixa as fases "extras" zeradas (chart ainda renderiza).
function adaptStatsForCharts(stats: CustomUnifiedStats): UnifiedStats {
  const n = stats.champion.length;
  const zeros = new Array<number>(n).fill(0);
  const numRounds = stats.perRound.length;
  // Convenção: queremos r16/qf/sf/final → últimos 4 rounds antes do campeão.
  // Para 32 quals (5 rounds): perRound = [winR32, winR16, winQF, winSF, winFinal=champion]
  //   → r16=perRound[0], qf=perRound[1], sf=perRound[2], final=perRound[3], champion=perRound[4]
  // Para 16 quals (4 rounds): perRound = [winR16, winQF, winSF, winFinal]
  //   → r16=qualified (entrou no R16), qf=perRound[0], sf=perRound[1], final=perRound[2]
  // Generalizo: pegamos os últimos 4 rounds e alinhamos no final.
  const get = (offsetFromEnd: number): number[] =>
    numRounds - offsetFromEnd >= 1 ? stats.perRound[numRounds - offsetFromEnd] : zeros;

  return {
    top2: stats.top1, // melhor aproximação universal
    qualified: stats.qualified,
    r16:     get(5),   // "chegou ao QF" = venceu R16 (5º a partir do fim p/ 5 rounds)
    qf:      get(4),
    sf:      get(3),
    final:   get(2),
    champion: stats.champion,
    meanGoalsPerMatch: stats.meanGoalsPerMatch,
    scoreDist: stats.scoreDist,
    totalMatchesSimulated: stats.totalMatchesSimulated,
  };
}

export function CustomSimulator({ tournament, onBack }: Props) {
  const [numSims, setNumSims] = useState<number>(10_000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mcStats, setMcStats] = useState<CustomUnifiedStats | null>(null);
  const [singleResult, setSingleResult] = useState<CustomSingleResult | null>(null);
  const [showBracket, setShowBracket] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const validation = useMemo(() => validateTournament(tournament), [tournament]);
  const canSimulate = validation.errors.length === 0;

  const teamsByIndex = useMemo(
    () => tournament.teams.map(t => ({ name: t.name, flag: t.flag })),
    [tournament]
  );

  const simOptions = simOptionsFor(tournament.modelId);

  const handleMonteCarlo = useCallback(() => {
    if (isRunning || !canSimulate) return;
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../../workers/customSimulator.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    setIsRunning(true);
    setProgress(0);
    setMcStats(null);
    setShowBracket(false);

    worker.onmessage = (e: MessageEvent<CustomSimWorkerResponse>) => {
      const data = e.data;
      if (data.type === 'progress') {
        setProgress(data.pct);
      } else {
        setMcStats(data.stats);
        setProgress(1);
        setIsRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage({ numCups: numSims, tournament });
  }, [isRunning, canSimulate, numSims, tournament]);

  const handleSingle = useCallback(() => {
    if (!canSimulate) return;
    const result = simulateOneCustomCup(tournament);
    setSingleResult(result);
    setShowBracket(true);
    setMcStats(null);
  }, [canSimulate, tournament]);

  const showScores = tournament.modelId !== 'bt';

  // Labels de cada round para o SingleBracket. Convenção: "Final" para o
  // último, e prefixos amigáveis para os demais.
  const bracketRoundNames = useMemo(() => {
    if (!singleResult) return [];
    const totalQuals = singleResult.qualifiers.length;
    const labels = roundLabels(totalQuals);
    return labels.map(l => {
      switch (l) {
        case 'R32':   return 'Rodada de 32 (16-avos de Final)';
        case 'R16':   return 'Oitavas de Final';
        case 'QF':    return 'Quartas de Final';
        case 'SF':    return 'Semifinais';
        case 'Final': return 'Final';
        default:      return l;
      }
    });
  }, [singleResult]);

  const groupNames = useMemo(() => tournament.groups.map(g => g.name), [tournament]);
  const groupTeamLabels = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const g of tournament.groups) {
      out[g.name] = g.teamIds
        .map(id => tournament.teams.find(t => t.id === id)?.name ?? '')
        .filter(Boolean);
    }
    return out;
  }, [tournament]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-copa-dark font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h2 className="text-lg font-bold text-copa-dark">{tournament.name}</h2>
        <span className="text-xs text-gray-500 font-mono">
          {tournament.modelId} · {tournament.teams.length} times · {tournament.groups.length} grupos
        </span>
      </div>

      <TournamentValidation validation={validation} />

      <SimulationControls
        numSims={numSims}
        onNumSimsChange={setNumSims}
        isRunning={isRunning}
        progress={progress}
        onMonteCarlo={handleMonteCarlo}
        onSingle={handleSingle}
        simOptions={simOptions}
      />

      {!canSimulate && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          Resolva os erros de validação antes de simular.
        </div>
      )}

      {mcStats && (
        <>
          <ChartsSection stats={adaptStatsForCharts(mcStats)} teamsByIndex={teamsByIndex} />
          <ResultsTable
            columns={buildCustomColumns(mcStats)}
            teamsByIndex={teamsByIndex}
            initialSortKey={`round_${mcStats.perRound.length - 1}`}
          />
          {showScores && (
            <ValidationPanel stats={adaptStatsForCharts(mcStats)} />
          )}
        </>
      )}

      {showBracket && singleResult && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-copa-dark">Uma Copa Simulada</h2>
            <button
              onClick={() => setShowBracket(false)}
              className="text-sm text-gray-500 hover:text-copa-dark underline"
            >
              Fechar
            </button>
          </div>
          <SingleBracket
            groupResults={singleResult.groupResults}
            rounds={singleResult.knockout.rounds}
            champion={singleResult.knockout.champion}
            roundNames={bracketRoundNames}
            showScores={showScores}
            teamsByIndex={teamsByIndex}
            groupNames={groupNames}
            groupTeamLabels={groupTeamLabels}
          />
        </div>
      )}

      {!mcStats && !showBracket && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-lg font-medium">
            Clique em <strong className="text-copa-red">"Simular Copas"</strong> para começar.
          </p>
        </div>
      )}
    </main>
  );
}
