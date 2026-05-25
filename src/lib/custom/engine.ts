/**
 * Engine de simulação para o "Torneio Customizado".
 *
 * IMPORTANTE: este motor é INDEPENDENTE do motor da Copa 2026
 * (lib/models/cup.ts). Não consome adapters globais, não chama setters de
 * lambdas/forças, não toca em FORCE_ARRAY/POISSON_TEAMS/V1_TEAMS. Isso
 * garante zero risco de regressão.
 *
 * Fórmulas dos três modelos são replicadas inline:
 *   - BT:  P(A vence B) = F_A / (F_A + F_B)
 *   - V1:  Λ = (λ_a(A) + λ_d(B)) / 2 ; gols ~ Poisson(Λ)
 *   - V2:  λ_atk_i = μ(F_i/F_ref)^α ; λ_def_i = μ(F_ref/F_i)^α
 *          F_ref = média geométrica das forças DO TORNEIO (auto-consistente).
 *
 * A primitiva poissonSample é reusada do projeto (lib/poisson/sampling.ts)
 * porque é puramente funcional (não lê singleton).
 */

import { ALPHA, MU_BASELINE, poissonSample } from '../poisson/sampling';
import type {
  GroupMatch,
  GroupResult,
  KnockoutMatchOutcome,
} from '../models/types';
import {
  log2IntIfPow2,
  type CustomKnockoutResult,
  type CustomSingleResult,
  type CustomTeam,
  type CustomTournament,
  type CustomUnifiedStats,
} from './types';

// =============================================================== Helpers comuns

// Média geométrica positiva. Times com força ≤ 0 são descartados (a validação
// não deveria deixar passar, mas é um cinto-e-suspensório).
function geomeanForces(teams: CustomTeam[]): number {
  let sumLog = 0;
  let n = 0;
  for (const t of teams) {
    if (t.force > 0) {
      sumLog += Math.log(t.force);
      n++;
    }
  }
  if (n === 0) return 1;
  return Math.exp(sumLog / n);
}

// Chave de placar normalizada (sempre "maior-menor") para tally.
function tallyKey(goalsA: number, goalsB: number): string {
  const hi = Math.max(goalsA, goalsB);
  const lo = Math.min(goalsA, goalsB);
  return `${hi}-${lo}`;
}

// =============================================================== Contexto por modelo

interface BtCtx { kind: 'bt'; }
interface V1Ctx { kind: 'poissonV1'; }
interface V2Ctx {
  kind: 'poissonV2';
  alpha: number;
  mu: number;
  // Lambdas pré-computados por índice local (evita recomputar a cada jogo).
  lambdaAtk: number[];
  lambdaDef: number[];
}

type ModelCtx = BtCtx | V1Ctx | V2Ctx;

function buildCtx(t: CustomTournament): ModelCtx {
  if (t.modelId === 'bt') return { kind: 'bt' };
  if (t.modelId === 'poissonV1') return { kind: 'poissonV1' };

  // V2: deriva λ a partir das forças com F_ref local.
  const alpha = t.v2Params?.alpha ?? ALPHA;
  const mu = t.v2Params?.mu ?? MU_BASELINE;
  const fRef = geomeanForces(t.teams);
  const lambdaAtk = t.teams.map(team => mu * Math.pow(team.force / fRef, alpha));
  const lambdaDef = t.teams.map(team => mu * Math.pow(fRef / team.force, alpha));
  return { kind: 'poissonV2', alpha, mu, lambdaAtk, lambdaDef };
}

// =============================================================== Simulação de jogo

// Simula um jogo "para classificar pontos+gols". Retorna gols (undefined em
// BT, já que BT não modela placar).
interface MatchOutcome {
  goalsA?: number;
  goalsB?: number;
  winner: 'A' | 'B' | 'D'; // D = empate
}

function simulateMatch(
  t: CustomTournament,
  ctx: ModelCtx,
  aIdx: number,
  bIdx: number
): MatchOutcome {
  const a = t.teams[aIdx];
  const b = t.teams[bIdx];

  if (ctx.kind === 'bt') {
    // BT puro — sem placar, sem empate.
    const pA = a.force / (a.force + b.force);
    return { winner: Math.random() < pA ? 'A' : 'B' };
  }

  // Poisson V1 ou V2 — ambos amostram gols Poisson.
  let lambdaA: number, lambdaB: number;
  if (ctx.kind === 'poissonV1') {
    lambdaA = (a.lambdaAtk + b.lambdaDef) / 2;
    lambdaB = (b.lambdaAtk + a.lambdaDef) / 2;
  } else {
    lambdaA = (ctx.lambdaAtk[aIdx] * ctx.lambdaDef[bIdx]) / ctx.mu;
    lambdaB = (ctx.lambdaAtk[bIdx] * ctx.lambdaDef[aIdx]) / ctx.mu;
  }
  const goalsA = poissonSample(lambdaA);
  const goalsB = poissonSample(lambdaB);
  const winner = goalsA > goalsB ? 'A' : goalsA < goalsB ? 'B' : 'D';
  return { goalsA, goalsB, winner };
}

// Simula um jogo eliminatório (90' + prorrogação + pênaltis).
const ET_FACTOR = 1 / 3;

function simulateKnockoutMatch(
  t: CustomTournament,
  ctx: ModelCtx,
  aIdx: number,
  bIdx: number
): KnockoutMatchOutcome {
  const a = t.teams[aIdx];
  const b = t.teams[bIdx];

  // BT não modela gols — decide por probabilidade direta.
  if (ctx.kind === 'bt') {
    const pA = a.force / (a.force + b.force);
    return { teamA: aIdx, teamB: bIdx, winner: Math.random() < pA ? aIdx : bIdx };
  }

  // Poisson — calcula lambdas e simula 90 + prorrogação + pênaltis.
  let lambdaA: number, lambdaB: number;
  if (ctx.kind === 'poissonV1') {
    lambdaA = (a.lambdaAtk + b.lambdaDef) / 2;
    lambdaB = (b.lambdaAtk + a.lambdaDef) / 2;
  } else {
    lambdaA = (ctx.lambdaAtk[aIdx] * ctx.lambdaDef[bIdx]) / ctx.mu;
    lambdaB = (ctx.lambdaAtk[bIdx] * ctx.lambdaDef[aIdx]) / ctx.mu;
  }
  let goalsA = poissonSample(lambdaA);
  let goalsB = poissonSample(lambdaB);

  if (goalsA !== goalsB) {
    return {
      teamA: aIdx, teamB: bIdx,
      winner: goalsA > goalsB ? aIdx : bIdx,
      goalsA, goalsB,
    };
  }

  // Prorrogação (30 min = 1/3 de 90).
  goalsA += poissonSample(lambdaA * ET_FACTOR);
  goalsB += poissonSample(lambdaB * ET_FACTOR);
  if (goalsA !== goalsB) {
    return {
      teamA: aIdx, teamB: bIdx,
      winner: goalsA > goalsB ? aIdx : bIdx,
      goalsA, goalsB,
    };
  }

  // Pênaltis: V1 usa proxy P(A) = λ_a(A)/(λ_a(A)+λ_a(B));
  //          V2 usa P(A) = F_A/(F_A+F_B) (mesmo que BT, coerente com sampling.ts).
  let pA: number;
  if (ctx.kind === 'poissonV1') {
    pA = a.lambdaAtk / (a.lambdaAtk + b.lambdaAtk);
  } else {
    pA = a.force / (a.force + b.force);
  }
  return {
    teamA: aIdx, teamB: bIdx,
    winner: Math.random() < pA ? aIdx : bIdx,
    goalsA, goalsB,
    decidedByPens: true,
  };
}

// =============================================================== Fase de grupos

interface GroupSimResult {
  result: GroupResult;
  goalsTotal: number;
  scoreTallies: Map<string, number>;
}

function simulateGroup(
  t: CustomTournament,
  ctx: ModelCtx,
  indices: number[]
): GroupSimResult {
  const n = indices.length;
  const stats = indices.map(idx => ({
    teamIndex: idx,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  }));

  const matches: GroupMatch[] = [];
  let goalsTotal = 0;
  const scoreTallies = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const out = simulateMatch(t, ctx, indices[i], indices[j]);

      let pA = 0, pB = 0;
      if (out.winner === 'A') pA = 3;
      else if (out.winner === 'B') pB = 3;
      else { pA = 1; pB = 1; } // empate (só em Poisson; BT nunca retorna D)
      stats[i].points += pA;
      stats[j].points += pB;

      if (out.goalsA !== undefined && out.goalsB !== undefined) {
        stats[i].goalsFor += out.goalsA;
        stats[i].goalsAgainst += out.goalsB;
        stats[j].goalsFor += out.goalsB;
        stats[j].goalsAgainst += out.goalsA;
        goalsTotal += out.goalsA + out.goalsB;
        const k = tallyKey(out.goalsA, out.goalsB);
        scoreTallies.set(k, (scoreTallies.get(k) ?? 0) + 1);
      }

      matches.push({
        teamA: indices[i],
        teamB: indices[j],
        pointsA: pA,
        pointsB: pB,
        goalsA: out.goalsA,
        goalsB: out.goalsB,
      });
    }
  }

  // Tiebreaker: pontos → SG → GF → sorteio. Em BT, GF=GA=0 e o sorteio
  // resolve empates (sem força extra; força já está embutida nas vitórias).
  const sorted = [...stats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGD = a.goalsFor - a.goalsAgainst;
    const bGD = b.goalsFor - b.goalsAgainst;
    if (bGD !== aGD) return bGD - aGD;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return Math.random() < 0.5 ? -1 : 1;
  });

  return {
    result: {
      standings: sorted,
      matches,
      first: sorted[0].teamIndex,
      second: sorted.length > 1 ? sorted[1].teamIndex : sorted[0].teamIndex,
      third: sorted.length > 2 ? sorted[2].teamIndex : sorted[sorted.length - 1].teamIndex,
      thirdPoints: sorted.length > 2 ? sorted[2].points : 0,
      thirdGD: sorted.length > 2 ? sorted[2].goalsFor - sorted[2].goalsAgainst : 0,
      thirdGF: sorted.length > 2 ? sorted[2].goalsFor : 0,
    },
    goalsTotal,
    scoreTallies,
  };
}

// =============================================================== Classificação

// Lista os classificados na ordem natural (G0_1, G0_2, ..., G0_K, G1_1, ...)
// + (eventualmente) os melhores terceiros adicionais.
function listQualifiers(
  groupResults: GroupResult[],
  t: CustomTournament
): number[] {
  const K = t.knockout.advancePerGroup;
  const qualifiers: number[] = [];

  // Top-K por grupo, em ordem.
  for (const gr of groupResults) {
    for (let i = 0; i < K; i++) {
      if (i < gr.standings.length) qualifiers.push(gr.standings[i].teamIndex);
    }
  }

  // Política de terceiros (Copa 2026-style). Por enquanto, só `bestN`.
  if (t.knockout.thirdPolicy.kind === 'bestN') {
    const N = Math.min(t.knockout.thirdPolicy.howMany, groupResults.length);
    const thirds = groupResults
      .map(gr => ({
        team: gr.third,
        pts: gr.thirdPoints,
        gd: gr.thirdGD,
        gf: gr.thirdGF,
      }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return Math.random() < 0.5 ? -1 : 1;
      });
    for (let i = 0; i < N; i++) qualifiers.push(thirds[i].team);
  }

  return qualifiers;
}

// =============================================================== Mata-mata

// Chaveamento serpentine para K classificados por grupo, M grupos.
// Para K=2, M=8 (Copa 2002): produz pares
//   1G_A × 2G_B, 1G_C × 2G_D, 1G_E × 2G_F, 1G_G × 2G_H,
//   1G_B × 2G_A, 1G_D × 2G_C, 1G_F × 2G_E, 1G_H × 2G_G.
// Para K=2 com terceiros (Copa 2026-style), o caller passa os terceiros
// concatenados no final de `qualifiers`; serão emparelhados sequencialmente.
function buildFirstRoundPairs(
  qualifiers: number[],
  numGroupQuals: number,   // = M × K (sem terceiros)
  K: number,
  M: number
): [number, number][] {
  const pairs: [number, number][] = [];

  // Lote para top-K de cada par de grupos (vizinhos: G0-G1, G2-G3, …).
  // Convenção: q[g*K + k] = (k+1)º colocado do grupo g.
  for (let pairBase = 0; pairBase < M; pairBase += 2) {
    if (pairBase + 1 >= M) break; // grupo sem par (caso degenerado; validação evita)
    // Primeira passada: 1L×2R, 3L×4R, ...
    for (let pos = 0; pos < K; pos += 2) {
      const left1 = qualifiers[pairBase * K + pos];
      const right2 = qualifiers[(pairBase + 1) * K + (pos + 1)];
      if (left1 !== undefined && right2 !== undefined) pairs.push([left1, right2]);
    }
    // Segunda passada: 1R×2L, 3R×4L, ...
    for (let pos = 0; pos < K; pos += 2) {
      const right1 = qualifiers[(pairBase + 1) * K + pos];
      const left2 = qualifiers[pairBase * K + (pos + 1)];
      if (right1 !== undefined && left2 !== undefined) pairs.push([right1, left2]);
    }
  }

  // Terceiros (se houver), emparelhados sequencialmente.
  for (let i = numGroupQuals; i + 1 < qualifiers.length; i += 2) {
    pairs.push([qualifiers[i], qualifiers[i + 1]]);
  }

  return pairs;
}

function simulateKnockout(
  t: CustomTournament,
  ctx: ModelCtx,
  qualifiers: number[]
): CustomKnockoutResult {
  const K = t.knockout.advancePerGroup;
  const M = t.groups.length;
  const numGroupQuals = K * M;

  const round1Pairs = buildFirstRoundPairs(qualifiers, numGroupQuals, K, M);

  const rounds: KnockoutMatchOutcome[][] = [];
  let currentPairs = round1Pairs;

  while (currentPairs.length > 0) {
    const round = currentPairs.map(([a, b]) =>
      simulateKnockoutMatch(t, ctx, a, b)
    );
    rounds.push(round);
    if (round.length === 1) break;

    const nextPairs: [number, number][] = [];
    for (let i = 0; i < round.length; i += 2) {
      nextPairs.push([round[i].winner, round[i + 1].winner]);
    }
    currentPairs = nextPairs;
  }

  const champion = rounds[rounds.length - 1][0].winner;
  return { rounds, champion };
}

// =============================================================== APIs públicas

// Roda 1 Copa custom completa. Devolve grupos detalhados + chaveamento.
export function simulateOneCustomCup(t: CustomTournament): CustomSingleResult {
  const ctx = buildCtx(t);

  // Mapa id → índice local em t.teams (cache para a Copa inteira).
  const idToIdx = new Map<string, number>();
  for (let i = 0; i < t.teams.length; i++) idToIdx.set(t.teams[i].id, i);

  const groupSims = t.groups.map(g => {
    const indices = g.teamIds.map(id => {
      const idx = idToIdx.get(id);
      if (idx === undefined) throw new Error(`Time não encontrado: ${id}`);
      return idx;
    });
    return simulateGroup(t, ctx, indices);
  });
  const groupResults = groupSims.map(g => g.result);

  const qualifiers = listQualifiers(groupResults, t);
  const knockout = simulateKnockout(t, ctx, qualifiers);

  return { groupResults, qualifiers, knockout };
}

// Monte Carlo: roda N Copas, agrega estatísticas.
export function runCustomCupSimulations(
  t: CustomTournament,
  numCups: number,
  onProgress?: (pct: number) => void
): CustomUnifiedStats {
  const ctx = buildCtx(t);

  // Mapa id → índice local em t.teams. Pré-resolve indices dos grupos para
  // evitar lookup repetido por simulação.
  const idToIdx = new Map<string, number>();
  for (let i = 0; i < t.teams.length; i++) idToIdx.set(t.teams[i].id, i);
  const groupIndices: number[][] = t.groups.map(g =>
    g.teamIds.map(id => {
      const idx = idToIdx.get(id);
      if (idx === undefined) throw new Error(`Time não encontrado: ${id}`);
      return idx;
    })
  );

  const N = t.teams.length;
  const K = t.knockout.advancePerGroup;
  const M = t.groups.length;
  const extraThirds =
    t.knockout.thirdPolicy.kind === 'bestN' ? t.knockout.thirdPolicy.howMany : 0;
  const totalQualifiers = K * M + extraThirds;
  const numRoundsRaw = log2IntIfPow2(totalQualifiers);
  if (!Number.isFinite(numRoundsRaw)) {
    throw new Error(
      `Total de classificados (${totalQualifiers}) precisa ser potência de 2 ≥ 2.`
    );
  }
  const numRounds = numRoundsRaw;

  const cTop1 = new Int32Array(N);
  const cQualified = new Int32Array(N);
  const cPerRound: Int32Array[] = [];
  for (let r = 0; r < numRounds; r++) cPerRound.push(new Int32Array(N));
  const cChampion = new Int32Array(N);

  let goalsAcc = 0;
  let matchesAcc = 0;
  const globalScoreTallies = new Map<string, number>();

  const CHUNK = 500;
  const numGroupQuals = K * M;

  for (let s = 0; s < numCups; s++) {
    if (s % CHUNK === 0 && onProgress) onProgress(s / numCups);

    // Fase de grupos.
    const groupSims = groupIndices.map(idxs => simulateGroup(t, ctx, idxs));
    const groupResults = groupSims.map(g => g.result);

    for (const gr of groupResults) cTop1[gr.first]++;
    for (const g of groupSims) {
      goalsAcc += g.goalsTotal;
      // Cada grupo tem C(n, 2) jogos. Generaliza para K time por grupo.
      const n = g.result.standings.length;
      matchesAcc += (n * (n - 1)) / 2;
      for (const [k, v] of g.scoreTallies) {
        globalScoreTallies.set(k, (globalScoreTallies.get(k) ?? 0) + v);
      }
    }

    // Classificação (top-K por grupo + melhores terceiros).
    const qualifiers = listQualifiers(groupResults, t);
    for (const idx of qualifiers) cQualified[idx]++;

    // Mata-mata — replicação da lógica de simulateKnockout, mas tally a
    // cada round para construir perRound.
    const round1Pairs = buildFirstRoundPairs(qualifiers, numGroupQuals, K, M);
    let currentPairs = round1Pairs;
    let roundIdx = 0;

    while (currentPairs.length > 0) {
      const round = currentPairs.map(([a, b]) =>
        simulateKnockoutMatch(t, ctx, a, b)
      );
      // O vencedor "chegou" à próxima rodada → tally em perRound[roundIdx].
      for (const m of round) cPerRound[roundIdx][m.winner]++;
      if (round.length === 1) {
        cChampion[round[0].winner]++;
        break;
      }
      const nextPairs: [number, number][] = [];
      for (let i = 0; i < round.length; i += 2) {
        nextPairs.push([round[i].winner, round[i + 1].winner]);
      }
      currentPairs = nextPairs;
      roundIdx++;
    }
  }

  const pct = (arr: Int32Array) =>
    Array.from(arr).map(v => (v / numCups) * 100);

  // Distribuição de placares (Poisson). BT fica zerado por construção.
  const scoreOrder = ['0-0', '1-0', '1-1', '2-0', '2-1', '2-2', '3-0', '3-1', '3-2'];
  const scoreDist = scoreOrder.map(score => {
    const count = globalScoreTallies.get(score) ?? 0;
    return { score, count, pct: matchesAcc > 0 ? (count / matchesAcc) * 100 : 0 };
  });

  return {
    top1: pct(cTop1),
    qualified: pct(cQualified),
    perRound: cPerRound.map(pct),
    champion: pct(cChampion),
    meanGoalsPerMatch: matchesAcc > 0 ? goalsAcc / matchesAcc : 0,
    scoreDist,
    totalMatchesSimulated: matchesAcc,
    numRounds,
    totalQualifiers,
    numGroups: M,
  };
}

// Helper exposto para a UI: nomes legíveis dos rounds para o número de
// classificados dado. Ex.: 32 → R32 / R16 / QF / SF / Final.
export function roundLabels(totalQualifiers: number): string[] {
  const n = log2IntIfPow2(totalQualifiers);
  if (!Number.isFinite(n)) return [];
  // n rounds; o último é "Final".
  const standard: Record<number, string> = {
    32: 'R32',
    16: 'R16',
    8: 'QF',
    4: 'SF',
    2: 'Final',
  };
  const labels: string[] = [];
  let remaining = totalQualifiers;
  for (let r = 0; r < n; r++) {
    labels.push(standard[remaining] ?? `R${remaining}`);
    remaining = remaining / 2;
  }
  return labels;
}
