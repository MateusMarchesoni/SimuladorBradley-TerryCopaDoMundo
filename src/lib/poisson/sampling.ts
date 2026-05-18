/**
 * Modelo de Poisson para simulação de partidas de futebol.
 *
 * Para um confronto A vs B:
 *   λ_A = (A.lambda_gf + B.lambda_ga) / 2
 *   λ_B = (B.lambda_gf + A.lambda_ga) / 2
 *   gols_A ~ Poisson(λ_A)
 *   gols_B ~ Poisson(λ_B)
 *
 * Limitações documentadas:
 * 1. Assume independência entre gols A e B (na realidade há leve correlação
 *    negativa — Dixon-Coles corrige, mas fica fora do escopo deste trabalho).
 * 2. Não considera mando de campo (Copa em sede neutra, com exceção dos
 *    anfitriões EUA/Canadá/México — ignorar é razoável para a maior parte
 *    dos jogos).
 * 3. 5 seleções têm λ estimado por baixa amostra histórica (source ===
 *    "estimate"). A UI sinaliza esses casos com ícone informativo.
 */

import teamsData from '../../data/teams_poisson.json';

export interface PoissonTeam {
  name: string;
  force: number;
  matches: number;
  lambda_gf: number;
  lambda_ga: number;
  source: 'historical' | 'estimate';
}

export const POISSON_TEAMS: PoissonTeam[] = teamsData as PoissonTeam[];

export const POISSON_TEAM_INDEX = new Map<string, number>(
  POISSON_TEAMS.map((t, i) => [t.name, i])
);

// Defaults preservados na carga do JSON — usados para reset e para restaurar
// o singleton no worker quando o payload não traz customização.
const DEFAULT_LAMBDA_GF: number[] = POISSON_TEAMS.map(t => t.lambda_gf);
const DEFAULT_LAMBDA_GA: number[] = POISSON_TEAMS.map(t => t.lambda_ga);

export interface LambdaArrays {
  gf: number[];
  ga: number[];
}

export function setCustomLambdas(lambdas?: LambdaArrays): void {
  const gf = lambdas?.gf ?? DEFAULT_LAMBDA_GF;
  const ga = lambdas?.ga ?? DEFAULT_LAMBDA_GA;
  for (let i = 0; i < POISSON_TEAMS.length; i++) {
    POISSON_TEAMS[i].lambda_gf = gf[i];
    POISSON_TEAMS[i].lambda_ga = ga[i];
  }
}

export function getDefaultLambdas(): LambdaArrays {
  return { gf: [...DEFAULT_LAMBDA_GF], ga: [...DEFAULT_LAMBDA_GA] };
}

// Algoritmo de Knuth — eficiente e correto para λ < 30 (todos os nossos λ < 5).
export function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

export interface Lambdas {
  lambdaA: number;
  lambdaB: number;
}

export function lambdasFor(a: PoissonTeam, b: PoissonTeam): Lambdas {
  return {
    lambdaA: (a.lambda_gf + b.lambda_ga) / 2,
    lambdaB: (b.lambda_gf + a.lambda_ga) / 2,
  };
}

export interface MatchSample {
  goalsA: number;
  goalsB: number;
}

export function simulatePoissonMatch(a: PoissonTeam, b: PoissonTeam): MatchSample {
  const { lambdaA, lambdaB } = lambdasFor(a, b);
  return {
    goalsA: poissonSample(lambdaA),
    goalsB: poissonSample(lambdaB),
  };
}

// Decide um confronto eliminatório completo (90' + prorrogação + pênaltis).
// Retorna gols do tempo regulamentar + prorrogação e quem passou.
export interface KnockoutOutcome {
  goalsA: number;        // gols somando 90' + prorrogação
  goalsB: number;
  decidedByPens: boolean;
  winner: 'A' | 'B';
}

const ET_FACTOR = 1 / 3; // 30 min = 1/3 de 90 min

export function simulateKnockoutMatch(a: PoissonTeam, b: PoissonTeam): KnockoutOutcome {
  const { lambdaA, lambdaB } = lambdasFor(a, b);
  let goalsA = poissonSample(lambdaA);
  let goalsB = poissonSample(lambdaB);

  if (goalsA !== goalsB) {
    return { goalsA, goalsB, decidedByPens: false, winner: goalsA > goalsB ? 'A' : 'B' };
  }

  // Prorrogação
  goalsA += poissonSample(lambdaA * ET_FACTOR);
  goalsB += poissonSample(lambdaB * ET_FACTOR);

  if (goalsA !== goalsB) {
    return { goalsA, goalsB, decidedByPens: false, winner: goalsA > goalsB ? 'A' : 'B' };
  }

  // Disputa de pênaltis: P(A vence) = força_A / (força_A + força_B)
  const pA = a.force / (a.force + b.force);
  return { goalsA, goalsB, decidedByPens: true, winner: Math.random() < pA ? 'A' : 'B' };
}
