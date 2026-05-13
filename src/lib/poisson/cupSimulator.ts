import { GROUPS } from '../../data/groups';
import { buildR32Bracket } from '../knockout';
import {
  POISSON_TEAMS,
  POISSON_TEAM_INDEX,
  simulatePoissonMatch,
  simulateKnockoutMatch,
} from './sampling';

const POISSON_GROUP_INDICES: number[][] = Object.values(GROUPS).map(names =>
  names.map(name => {
    const idx = POISSON_TEAM_INDEX.get(name);
    if (idx === undefined) throw new Error(`Time não encontrado: ${name}`);
    return idx;
  })
);

const N = POISSON_TEAMS.length;

interface GroupTeamStats {
  teamIndex: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface GroupResult {
  first: number;
  second: number;
  third: number;
  thirdPoints: number;
  thirdGD: number;
  thirdGF: number;
}

function simulateGroup(indices: number[]): {
  result: GroupResult;
  goalsTotal: number;
  scoreTallies: Map<string, number>;
} {
  const stats: GroupTeamStats[] = indices.map(idx => ({
    teamIndex: idx,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  }));

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
      if (goalsA > goalsB) stats[i].points += 3;
      else if (goalsB > goalsA) stats[j].points += 3;
      else {
        stats[i].points += 1;
        stats[j].points += 1;
      }
      goalsTotal += goalsA + goalsB;
      // tally placar normalizado (vencedor à esquerda — facilita 2-1/1-2 unificados)
      const hi = Math.max(goalsA, goalsB);
      const lo = Math.min(goalsA, goalsB);
      const key = `${hi}-${lo}`;
      scoreTallies.set(key, (scoreTallies.get(key) ?? 0) + 1);
    }
  }

  // Desempate: pontos → saldo → gols pró → sorteio
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

function buildQualifiers(groupResults: GroupResult[]): number[] {
  const qualifiers: number[] = [];
  for (const gr of groupResults) {
    qualifiers.push(gr.first, gr.second);
  }

  const thirds = groupResults
    .map(gr => ({ team: gr.third, pts: gr.thirdPoints, gd: gr.thirdGD, gf: gr.thirdGF }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return Math.random() < 0.5 ? -1 : 1;
    });

  for (let i = 0; i < 8; i++) qualifiers.push(thirds[i].team);
  return qualifiers;
}

interface RoundWinners {
  winners: number[];
}

function simulateKnockoutRound(pairs: [number, number][]): RoundWinners {
  const winners: number[] = [];
  for (const [a, b] of pairs) {
    const ta = POISSON_TEAMS[a];
    const tb = POISSON_TEAMS[b];
    const out = simulateKnockoutMatch(ta, tb);
    winners.push(out.winner === 'A' ? a : b);
  }
  return { winners };
}

function nextRoundPairs(winners: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairs.push([winners[i], winners[i + 1]]);
  }
  return pairs;
}

export interface PoissonCupSimResult {
  champion: number;
  finalists: number[];   // 2 times
  semifinalists: number[]; // 4 times
  quarterfinalists: number[]; // 8 times
  r16Reached: number[]; // 16 times (oitavas)
  qualifiers: number[]; // 32 times
  top2: number[];       // 24 times
  // Validação
  goalsTotal: number;
  matchesTotal: number;
  scoreTallies: Map<string, number>;
}

export function simulateOnePoissonCup(): PoissonCupSimResult {
  let goalsTotal = 0;
  let matchesTotal = 0;
  const scoreTallies = new Map<string, number>();

  const groupSims = POISSON_GROUP_INDICES.map(simulateGroup);
  const groupResults = groupSims.map(g => g.result);

  for (const g of groupSims) {
    goalsTotal += g.goalsTotal;
    matchesTotal += 6;
    for (const [k, v] of g.scoreTallies) {
      scoreTallies.set(k, (scoreTallies.get(k) ?? 0) + v);
    }
  }

  const top2: number[] = [];
  for (const gr of groupResults) top2.push(gr.first, gr.second);

  const qualifiers = buildQualifiers(groupResults);

  const r32Pairs = buildR32Bracket(qualifiers);
  const r32 = simulateKnockoutRound(r32Pairs);
  const r16 = simulateKnockoutRound(nextRoundPairs(r32.winners));
  const qf = simulateKnockoutRound(nextRoundPairs(r16.winners));
  const sf = simulateKnockoutRound(nextRoundPairs(qf.winners));
  const finalRound = simulateKnockoutRound(nextRoundPairs(sf.winners));

  return {
    champion: finalRound.winners[0],
    finalists: sf.winners,           // os 2 que venceram a semi vão à final
    semifinalists: qf.winners,       // os 4 que venceram QF vão à semi
    quarterfinalists: r16.winners,   // os 8 que venceram oitavas vão às quartas
    r16Reached: r32.winners,         // os 16 que venceram R32 vão às oitavas
    qualifiers,
    top2,
    goalsTotal,
    matchesTotal,
    scoreTallies,
  };
}

export interface PoissonCupStats {
  champion: number[];     // 0–100 % por time
  final: number[];
  sf: number[];
  qf: number[];
  r16: number[];
  qualified: number[];
  top2: number[];
  // Validação agregada
  meanGoalsPerMatch: number;
  scoreDist: { score: string; pct: number; count: number }[];
  totalMatchesSimulated: number;
}

export function runPoissonCupSimulations(
  numCups: number,
  onProgress?: (pct: number) => void
): PoissonCupStats {
  const cChampion = new Int32Array(N);
  const cFinal = new Int32Array(N);
  const cSF = new Int32Array(N);
  const cQF = new Int32Array(N);
  const cR16 = new Int32Array(N);
  const cQualified = new Int32Array(N);
  const cTop2 = new Int32Array(N);

  let goalsAcc = 0;
  let matchesAcc = 0;
  const globalScoreTallies = new Map<string, number>();

  for (let s = 0; s < numCups; s++) {
    if (s % 50 === 0 && onProgress) onProgress(s / numCups);

    const res = simulateOnePoissonCup();
    cChampion[res.champion]++;
    for (const t of res.finalists) cFinal[t]++;
    for (const t of res.semifinalists) cSF[t]++;
    for (const t of res.quarterfinalists) cQF[t]++;
    for (const t of res.r16Reached) cR16[t]++;
    for (const t of res.qualifiers) cQualified[t]++;
    for (const t of res.top2) cTop2[t]++;

    goalsAcc += res.goalsTotal;
    matchesAcc += res.matchesTotal;
    for (const [k, v] of res.scoreTallies) {
      globalScoreTallies.set(k, (globalScoreTallies.get(k) ?? 0) + v);
    }
  }

  const pct = (arr: Int32Array) => Array.from(arr).map(v => (v / numCups) * 100);

  const scoreOrder = ['0-0', '1-0', '1-1', '2-0', '2-1', '2-2', '3-0', '3-1', '3-2'];
  const scoreDist = scoreOrder.map(score => {
    const count = globalScoreTallies.get(score) ?? 0;
    return { score, count, pct: matchesAcc > 0 ? (count / matchesAcc) * 100 : 0 };
  });

  return {
    champion: pct(cChampion),
    final: pct(cFinal),
    sf: pct(cSF),
    qf: pct(cQF),
    r16: pct(cR16),
    qualified: pct(cQualified),
    top2: pct(cTop2),
    meanGoalsPerMatch: matchesAcc > 0 ? goalsAcc / matchesAcc : 0,
    scoreDist,
    totalMatchesSimulated: matchesAcc,
  };
}
