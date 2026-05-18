/**
 * Modelo de Poisson para simulação de partidas de futebol.
 *
 * Modelo multiplicativo (calibrado por força Bradley-Terry):
 *   λ_atk(i) = μ × (F_i / F_ref)^α
 *   λ_def(i) = μ × (F_ref / F_i)^α
 *
 * Para um confronto A vs B:
 *   λ_A = λ_atk(A) × λ_def(B) / μ
 *   λ_B = λ_atk(B) × λ_def(A) / μ
 *   gols_A ~ Poisson(λ_A)
 *   gols_B ~ Poisson(λ_B)
 *
 * Parâmetros calibrados:
 *   α        = 0,45    (damping da assimetria atk/def)
 *   μ        = 1,189834 (baseline de gols por time/partida — alvo 2,8 gols/jogo)
 *   F_ref    = 27,20971 (média geométrica das 48 forças)
 *
 * Limitações documentadas:
 * 1. Assume independência entre gols A e B (na realidade há leve correlação
 *    negativa — Dixon-Coles corrige, mas fica fora do escopo deste trabalho).
 * 2. Não considera mando de campo.
 * 3. 5 seleções têm λ estimado por baixa amostra histórica (source ===
 *    "estimate"). A UI sinaliza esses casos com ícone informativo.
 */

import teamsData from '../../data/teams_poisson.json';

export const ALPHA = 0.45;
export const MU_BASELINE = 1.189834;
export const F_REF = 27.20971;

export interface PoissonTeam {
  name: string;
  force: number;
  matches: number;
  lambda_atk: number;
  lambda_def: number;
  source: 'historical' | 'estimate';
}

export const POISSON_TEAMS: PoissonTeam[] = teamsData as PoissonTeam[];

export const POISSON_TEAM_INDEX = new Map<string, number>(
  POISSON_TEAMS.map((t, i) => [t.name, i])
);

// Defaults preservados na carga do JSON — usados para reset e para restaurar
// o singleton no worker quando o payload não traz customização.
const DEFAULT_LAMBDA_ATK: number[] = POISSON_TEAMS.map(t => t.lambda_atk);
const DEFAULT_LAMBDA_DEF: number[] = POISSON_TEAMS.map(t => t.lambda_def);

export interface LambdaArrays {
  atk: number[];
  def: number[];
}

export function setCustomLambdas(lambdas?: LambdaArrays): void {
  const atk = lambdas?.atk ?? DEFAULT_LAMBDA_ATK;
  const def = lambdas?.def ?? DEFAULT_LAMBDA_DEF;
  for (let i = 0; i < POISSON_TEAMS.length; i++) {
    POISSON_TEAMS[i].lambda_atk = atk[i];
    POISSON_TEAMS[i].lambda_def = def[i];
  }
}

export function getDefaultLambdas(): LambdaArrays {
  return { atk: [...DEFAULT_LAMBDA_ATK], def: [...DEFAULT_LAMBDA_DEF] };
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
    lambdaA: (a.lambda_atk * b.lambda_def) / MU_BASELINE,
    lambdaB: (b.lambda_atk * a.lambda_def) / MU_BASELINE,
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
