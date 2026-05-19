/**
 * Orquestração genérica da Copa para qualquer modelo (BT, Poisson V1 ou V2).
 *
 * - simulateOneCup(modelId): roda 1 Copa inteira e devolve grupos + chaveamento detalhado.
 * - runCupSimulations(modelId, n, onProgress): roda Monte Carlo e devolve UnifiedStats.
 *
 * O chaveamento R32 segue o emparelhamento de qualifiers definido em
 * buildR32Bracket (lib/knockout). A função é genérica e roda igual para os
 * três modelos.
 */

import { GROUPS } from '../../data/groups';
import { TEAM_INDEX_MAP } from '../../data/teams';
import { btAdapter } from './btAdapter';
import { poissonV1Adapter } from './poissonV1Adapter';
import { poissonV2Adapter } from './poissonV2Adapter';
import type {
  KnockoutMatchOutcome,
  KnockoutResult,
  ModelAdapter,
  ModelId,
  SingleCupResult,
  UnifiedStats,
} from './types';

const N_TEAMS = 48;

// Índices por grupo, pré-computados (12 grupos × 4 times = 48).
const GROUP_INDICES: number[][] = Object.values(GROUPS).map(names =>
  names.map(name => {
    const idx = TEAM_INDEX_MAP.get(name);
    if (idx === undefined) throw new Error(`Time não encontrado em TEAMS: ${name}`);
    return idx;
  })
);

// Retorna o adapter conforme o id (single source of truth).
export function getAdapter(id: ModelId): ModelAdapter {
  switch (id) {
    case 'bt':         return btAdapter;
    case 'poissonV1':  return poissonV1Adapter;
    case 'poissonV2':  return poissonV2Adapter;
  }
}

// Constrói os 16 pares da Rodada de 32 a partir dos 32 classificados.
// Mantém o chaveamento original do projeto (alternado por par de grupos).
function buildR32Bracket(qualifiers: number[]): [number, number][] {
  const first = (g: number) => qualifiers[g * 2];
  const second = (g: number) => qualifiers[g * 2 + 1];
  return [
    [first(0), second(1)], [first(2), second(3)],
    [first(1), second(0)], [first(3), second(2)],
    [first(4), second(5)], [first(6), second(7)],
    [first(5), second(4)], [first(7), second(6)],
    [first(8), second(9)], [first(10), second(11)],
    [first(9), second(8)], [first(11), second(10)],
    [qualifiers[24], qualifiers[25]],
    [qualifiers[26], qualifiers[27]],
    [qualifiers[28], qualifiers[29]],
    [qualifiers[30], qualifiers[31]],
  ];
}

function simulateKnockoutRound(
  adapter: ModelAdapter,
  pairs: [number, number][]
): KnockoutMatchOutcome[] {
  return pairs.map(([a, b]) => adapter.simulateKnockoutMatch(a, b));
}

function nextRoundPairs(matches: KnockoutMatchOutcome[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push([matches[i].winner, matches[i + 1].winner]);
  }
  return pairs;
}

// Roda uma Copa inteira para o modelo escolhido e devolve estrutura detalhada
// (grupos com placares + chaveamento). Usada pela tela "Simular 1 Copa".
export function simulateOneCup(modelId: ModelId): SingleCupResult {
  const adapter = getAdapter(modelId);

  const groupSims = GROUP_INDICES.map(idxs => adapter.simulateGroup(idxs));
  const groupResults = groupSims.map(g => g.result);

  const top2Set = new Set<number>();
  for (const gr of groupResults) {
    top2Set.add(gr.first);
    top2Set.add(gr.second);
  }

  // Top-2 direto + 8 melhores terceiros (mesmo critério usado no original).
  const qualifiers: number[] = [];
  for (const gr of groupResults) qualifiers.push(gr.first, gr.second);

  const thirds = groupResults
    .map(gr => ({ team: gr.third, pts: gr.thirdPoints, gd: gr.thirdGD, gf: gr.thirdGF }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return Math.random() < 0.5 ? -1 : 1;
    });
  for (let i = 0; i < 8; i++) qualifiers.push(thirds[i].team);

  const r32 = simulateKnockoutRound(adapter, buildR32Bracket(qualifiers));
  const r16 = simulateKnockoutRound(adapter, nextRoundPairs(r32));
  const qf = simulateKnockoutRound(adapter, nextRoundPairs(r16));
  const sf = simulateKnockoutRound(adapter, nextRoundPairs(qf));
  const finalRound = simulateKnockoutRound(adapter, nextRoundPairs(sf));

  const knockout: KnockoutResult = {
    r32,
    r16,
    qf,
    sf,
    final: finalRound[0],
    champion: finalRound[0].winner,
  };

  return { groupResults, qualifiers, top2Set, knockout };
}

// Monte Carlo genérico — agrega probabilidades por fase para todos os times.
export function runCupSimulations(
  modelId: ModelId,
  numCups: number,
  onProgress?: (pct: number) => void
): UnifiedStats {
  const adapter = getAdapter(modelId);

  const cTop2 = new Int32Array(N_TEAMS);
  const cQualified = new Int32Array(N_TEAMS);
  const cR16 = new Int32Array(N_TEAMS);
  const cQF = new Int32Array(N_TEAMS);
  const cSF = new Int32Array(N_TEAMS);
  const cFinal = new Int32Array(N_TEAMS);
  const cChampion = new Int32Array(N_TEAMS);

  let goalsAcc = 0;
  let matchesAcc = 0;
  const globalScoreTallies = new Map<string, number>();

  // Reporta progresso a cada chunk de ~500 sims (também útil para chunking
  // de UI sem travar; o worker faz postMessage a partir disso).
  const CHUNK = 500;

  for (let s = 0; s < numCups; s++) {
    if (s % CHUNK === 0 && onProgress) onProgress(s / numCups);

    // === Fase de grupos
    const groupSims = GROUP_INDICES.map(idxs => adapter.simulateGroup(idxs));
    const groupResults = groupSims.map(g => g.result);

    for (const gr of groupResults) {
      cTop2[gr.first]++;
      cTop2[gr.second]++;
    }
    for (const g of groupSims) {
      goalsAcc += g.goalsTotal;
      matchesAcc += 6;
      for (const [k, v] of g.scoreTallies) {
        globalScoreTallies.set(k, (globalScoreTallies.get(k) ?? 0) + v);
      }
    }

    // === Classificação (top-2 + 8 melhores terceiros)
    const qualifiers: number[] = [];
    for (const gr of groupResults) qualifiers.push(gr.first, gr.second);

    const thirds = groupResults
      .map(gr => ({ team: gr.third, pts: gr.thirdPoints, gd: gr.thirdGD, gf: gr.thirdGF }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return Math.random() < 0.5 ? -1 : 1;
      });
    for (let i = 0; i < 8; i++) qualifiers.push(thirds[i].team);

    for (const t of qualifiers) cQualified[t]++;

    // === Mata-mata
    const r32 = simulateKnockoutRound(adapter, buildR32Bracket(qualifiers));
    const r16 = simulateKnockoutRound(adapter, nextRoundPairs(r32));
    const qf = simulateKnockoutRound(adapter, nextRoundPairs(r16));
    const sf = simulateKnockoutRound(adapter, nextRoundPairs(qf));
    const finalRound = simulateKnockoutRound(adapter, nextRoundPairs(sf));

    for (const m of r32) cR16[m.winner]++;
    for (const m of r16) cQF[m.winner]++;
    for (const m of qf) cSF[m.winner]++;
    for (const m of sf) cFinal[m.winner]++;
    cChampion[finalRound[0].winner]++;
  }

  const pct = (arr: Int32Array) =>
    Array.from(arr).map(v => (v / numCups) * 100);

  // Distribuição de placares (apenas Poisson terá valores; BT fica zerado).
  const scoreOrder = ['0-0', '1-0', '1-1', '2-0', '2-1', '2-2', '3-0', '3-1', '3-2'];
  const scoreDist = scoreOrder.map(score => {
    const count = globalScoreTallies.get(score) ?? 0;
    return { score, count, pct: matchesAcc > 0 ? (count / matchesAcc) * 100 : 0 };
  });

  return {
    top2: pct(cTop2),
    qualified: pct(cQualified),
    r16: pct(cR16),
    qf: pct(cQF),
    sf: pct(cSF),
    final: pct(cFinal),
    champion: pct(cChampion),
    meanGoalsPerMatch: matchesAcc > 0 ? goalsAcc / matchesAcc : 0,
    scoreDist,
    totalMatchesSimulated: matchesAcc,
  };
}
