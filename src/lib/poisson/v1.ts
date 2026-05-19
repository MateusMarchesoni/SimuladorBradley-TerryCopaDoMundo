/**
 * Modelo Poisson V1 (Histórico) — médias históricas aditivas.
 *
 * Para um confronto A × B:
 *   Λ_A = (λ_a(A) + λ_d(B)) / 2
 *   Λ_B = (λ_a(B) + λ_d(A)) / 2
 *   gols_A ~ Poisson(Λ_A)
 *   gols_B ~ Poisson(Λ_B)
 *
 * Diferenças em relação ao V2 (multiplicativo):
 *   - V1 usa média aritmética de λ_atk(A) e λ_def(B); V2 multiplica e divide por μ.
 *   - V1 é "ingênuo" no bom sentido: lê diretamente a história de gols pró e
 *     gols contra de cada seleção. Não há damping nem calibração global.
 *
 * Mata-mata: prorrogação com Λ × 1/3 (30 min = 1/3 de 90). Pênaltis decididos
 * por probabilidade proporcional à força ofensiva, P(A) = λ_a(A)/(λ_a(A)+λ_a(B)).
 */

import {
  POISSON_V1_DEFAULTS,
  type PoissonV1Team,
} from '../../data/poissonV1Lambdas';
import { poissonSample } from './sampling';

// Cópia mutável dos parâmetros V1 (permite edição pela UI sem mexer no default).
const V1_TEAMS: PoissonV1Team[] = POISSON_V1_DEFAULTS.map(t => ({ ...t }));

export const POISSON_V1_TEAM_INDEX = new Map<string, number>(
  V1_TEAMS.map((t, i) => [t.name, i])
);

export interface LambdaArraysV1 {
  atk: number[];
  def: number[];
}

const DEFAULT_ATK: number[] = POISSON_V1_DEFAULTS.map(t => t.lambda_atk);
const DEFAULT_DEF: number[] = POISSON_V1_DEFAULTS.map(t => t.lambda_def);

// Substitui os lambdas mutáveis. Sem argumento, restaura os defaults.
export function setCustomLambdasV1(lambdas?: LambdaArraysV1): void {
  const atk = lambdas?.atk ?? DEFAULT_ATK;
  const def = lambdas?.def ?? DEFAULT_DEF;
  for (let i = 0; i < V1_TEAMS.length; i++) {
    V1_TEAMS[i].lambda_atk = atk[i];
    V1_TEAMS[i].lambda_def = def[i];
  }
}

export function getDefaultLambdasV1(): LambdaArraysV1 {
  return { atk: [...DEFAULT_ATK], def: [...DEFAULT_DEF] };
}

export function getPoissonV1Teams(): ReadonlyArray<PoissonV1Team> {
  return V1_TEAMS;
}

export interface LambdasV1 {
  lambdaA: number;
  lambdaB: number;
}

export function lambdasForV1(aIdx: number, bIdx: number): LambdasV1 {
  const a = V1_TEAMS[aIdx];
  const b = V1_TEAMS[bIdx];
  return {
    lambdaA: (a.lambda_atk + b.lambda_def) / 2,
    lambdaB: (b.lambda_atk + a.lambda_def) / 2,
  };
}

export interface MatchSampleV1 {
  goalsA: number;
  goalsB: number;
}

export function simulatePoissonMatchV1(aIdx: number, bIdx: number): MatchSampleV1 {
  const { lambdaA, lambdaB } = lambdasForV1(aIdx, bIdx);
  return {
    goalsA: poissonSample(lambdaA),
    goalsB: poissonSample(lambdaB),
  };
}

// Mata-mata: 90 minutos + (se necessário) prorrogação + pênaltis.
const ET_FACTOR = 1 / 3;

export interface KnockoutOutcomeV1 {
  goalsA: number;
  goalsB: number;
  decidedByPens: boolean;
  winner: 'A' | 'B';
}

export function simulateKnockoutMatchV1(
  aIdx: number,
  bIdx: number
): KnockoutOutcomeV1 {
  const { lambdaA, lambdaB } = lambdasForV1(aIdx, bIdx);
  let goalsA = poissonSample(lambdaA);
  let goalsB = poissonSample(lambdaB);

  if (goalsA !== goalsB) {
    return { goalsA, goalsB, decidedByPens: false, winner: goalsA > goalsB ? 'A' : 'B' };
  }

  // Prorrogação (30 min = 1/3 de 90)
  goalsA += poissonSample(lambdaA * ET_FACTOR);
  goalsB += poissonSample(lambdaB * ET_FACTOR);

  if (goalsA !== goalsB) {
    return { goalsA, goalsB, decidedByPens: false, winner: goalsA > goalsB ? 'A' : 'B' };
  }

  // Pênaltis: P(A) = λ_a(A) / (λ_a(A) + λ_a(B))
  const a = V1_TEAMS[aIdx];
  const b = V1_TEAMS[bIdx];
  const pA = a.lambda_atk / (a.lambda_atk + b.lambda_atk);
  return { goalsA, goalsB, decidedByPens: true, winner: Math.random() < pA ? 'A' : 'B' };
}
