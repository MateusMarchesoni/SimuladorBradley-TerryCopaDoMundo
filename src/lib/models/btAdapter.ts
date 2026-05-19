/**
 * Adapter Bradley-Terry para a interface unificada.
 *
 * Como BT não modela gols, simulateGroup retorna apenas pontos e ordena os
 * standings por pontos → força (comportamento original). Os campos de gols
 * ficam zerados; a UI sabe omitir o placar quando MODEL_META.hasScores=false.
 */

import { getForceArray, simulateMatch } from '../bradleyTerry';
import type {
  GroupSimOutput,
  KnockoutMatchOutcome,
  ModelAdapter,
} from './types';

function simulateGroup(indices: number[]): GroupSimOutput {
  const points = [0, 0, 0, 0];

  const matches: GroupSimOutput['result']['matches'] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const winner = simulateMatch(indices[i], indices[j]);
      const pA = winner === indices[i] ? 3 : 0;
      const pB = winner === indices[j] ? 3 : 0;
      points[i] += pA;
      points[j] += pB;
      matches.push({
        teamA: indices[i],
        teamB: indices[j],
        pointsA: pA,
        pointsB: pB,
      });
    }
  }

  const forceArr = getForceArray();
  // Desempate dentro do grupo: pontos → força (igual ao comportamento original).
  const order = [0, 1, 2, 3].sort((a, b) => {
    if (points[b] !== points[a]) return points[b] - points[a];
    return forceArr[indices[b]] - forceArr[indices[a]];
  });

  const standings = order.map(pos => ({
    teamIndex: indices[pos],
    points: points[pos],
    goalsFor: 0,
    goalsAgainst: 0,
  }));

  return {
    result: {
      standings,
      matches,
      first: standings[0].teamIndex,
      second: standings[1].teamIndex,
      third: standings[2].teamIndex,
      thirdPoints: standings[2].points,
      thirdGD: 0,
      thirdGF: 0,
    },
    goalsTotal: 0,
    scoreTallies: new Map(),
  };
}

function simulateKnockoutMatch(aIdx: number, bIdx: number): KnockoutMatchOutcome {
  const winner = simulateMatch(aIdx, bIdx);
  return { teamA: aIdx, teamB: bIdx, winner };
}

export const btAdapter: ModelAdapter = {
  id: 'bt',
  simulateGroup,
  simulateKnockoutMatch,
};
