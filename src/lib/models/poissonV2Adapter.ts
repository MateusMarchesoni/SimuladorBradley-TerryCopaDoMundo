/**
 * Adapter Poisson V2 (multiplicativo) para a interface unificada.
 *
 * Reaproveita a lógica de sampling.ts (lambdasFor, simulatePoissonMatch,
 * simulateKnockoutMatch). Padroniza tiebreakers de grupo: pontos → saldo →
 * gols pró → sorteio (compatível com o cupSimulator original).
 */

import {
  POISSON_TEAMS,
  simulatePoissonMatch,
  simulateKnockoutMatch as v2KnockoutMatch,
} from '../poisson/sampling';
import type {
  GroupSimOutput,
  KnockoutMatchOutcome,
  ModelAdapter,
} from './types';

function tallyKey(goalsA: number, goalsB: number): string {
  const hi = Math.max(goalsA, goalsB);
  const lo = Math.min(goalsA, goalsB);
  return `${hi}-${lo}`;
}

function simulateGroup(indices: number[]): GroupSimOutput {
  const stats = indices.map(idx => ({
    teamIndex: idx,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  }));

  const matches: GroupSimOutput['result']['matches'] = [];
  let goalsTotal = 0;
  const scoreTallies = new Map<string, number>();

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = POISSON_TEAMS[indices[i]];
      const b = POISSON_TEAMS[indices[j]];
      const { goalsA, goalsB } = simulatePoissonMatch(a, b);

      stats[i].goalsFor += goalsA;
      stats[i].goalsAgainst += goalsB;
      stats[j].goalsFor += goalsB;
      stats[j].goalsAgainst += goalsA;

      let pA = 0, pB = 0;
      if (goalsA > goalsB) pA = 3;
      else if (goalsB > goalsA) pB = 3;
      else { pA = 1; pB = 1; }
      stats[i].points += pA;
      stats[j].points += pB;

      matches.push({
        teamA: indices[i],
        teamB: indices[j],
        pointsA: pA,
        pointsB: pB,
        goalsA,
        goalsB,
      });

      goalsTotal += goalsA + goalsB;
      const k = tallyKey(goalsA, goalsB);
      scoreTallies.set(k, (scoreTallies.get(k) ?? 0) + 1);
    }
  }

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
      second: sorted[1].teamIndex,
      third: sorted[2].teamIndex,
      thirdPoints: sorted[2].points,
      thirdGD: sorted[2].goalsFor - sorted[2].goalsAgainst,
      thirdGF: sorted[2].goalsFor,
    },
    goalsTotal,
    scoreTallies,
  };
}

function simulateKnockoutMatch(aIdx: number, bIdx: number): KnockoutMatchOutcome {
  const a = POISSON_TEAMS[aIdx];
  const b = POISSON_TEAMS[bIdx];
  const out = v2KnockoutMatch(a, b);
  const winner = out.winner === 'A' ? aIdx : bIdx;
  return {
    teamA: aIdx,
    teamB: bIdx,
    winner,
    goalsA: out.goalsA,
    goalsB: out.goalsB,
    decidedByPens: out.decidedByPens,
  };
}

export const poissonV2Adapter: ModelAdapter = {
  id: 'poissonV2',
  simulateGroup,
  simulateKnockoutMatch,
};
