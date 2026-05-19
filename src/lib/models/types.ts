/**
 * Tipos comuns aos três modelos (BT, Poisson V1, Poisson V2).
 *
 * Cada modelo expõe um Adapter que sabe simular um GRUPO de 4 times e um
 * JOGO ELIMINATÓRIO. A montagem da Copa (chaveamento, agregação Monte Carlo,
 * "Simular 1 Copa detalhada") fica em `models/cup.ts` e é genérica.
 */

import type { LambdaArrays } from '../poisson/sampling';
import type { LambdaArraysV1 } from '../poisson/v1';

export type ModelId = 'bt' | 'poissonV1' | 'poissonV2';

// Metadados visíveis para a UI (toggle, tooltip, badges).
export interface ModelMeta {
  id: ModelId;
  label: string;
  short: string;
  tooltip: string;
  hasScores: boolean; // se exibimos placar nos jogos (V1, V2 sim; BT não)
}

export const MODEL_META: Record<ModelId, ModelMeta> = {
  bt: {
    id: 'bt',
    label: 'Bradley-Terry',
    short: 'BT',
    tooltip: 'P(A vence B) = F_A / (F_A + F_B). Compara forças, sem modelar gols.',
    hasScores: false,
  },
  poissonV1: {
    id: 'poissonV1',
    label: 'Poisson V1 (Histórico)',
    short: 'V1',
    tooltip: 'Λ = (λ_a(A) + λ_d(B)) / 2 a partir de médias históricas de gols.',
    hasScores: true,
  },
  poissonV2: {
    id: 'poissonV2',
    label: 'Poisson V2 (Forças)',
    short: 'V2',
    tooltip: 'Λ = λ_atk(A) × λ_def(B) / μ, lambdas derivados da força BT.',
    hasScores: true,
  },
};

// ------------------------------------------------------------------ Grupos

export interface GroupStanding {
  teamIndex: number;
  points: number;
  goalsFor: number;     // 0 em BT (não modela gols)
  goalsAgainst: number; // 0 em BT
}

export interface GroupMatch {
  teamA: number;
  teamB: number;
  pointsA: number;
  pointsB: number;
  goalsA?: number; // apenas Poisson
  goalsB?: number;
}

export interface GroupResult {
  standings: GroupStanding[];   // 4 times, ordenados
  matches: GroupMatch[];        // 6 jogos
  first: number;
  second: number;
  third: number;
  thirdPoints: number;
  thirdGD: number; // 0 em BT
  thirdGF: number; // 0 em BT
}

// ------------------------------------------------------------------ Mata-mata

export interface KnockoutMatchOutcome {
  teamA: number;
  teamB: number;
  winner: number;
  goalsA?: number;
  goalsB?: number;
  decidedByPens?: boolean;
}

export interface KnockoutResult {
  r32: KnockoutMatchOutcome[]; // 16 jogos
  r16: KnockoutMatchOutcome[]; // 8 jogos
  qf: KnockoutMatchOutcome[];  // 4 jogos
  sf: KnockoutMatchOutcome[];  // 2 jogos
  final: KnockoutMatchOutcome;
  champion: number;
}

// ------------------------------------------------------------------ Saídas

export interface SingleCupResult {
  groupResults: GroupResult[];
  qualifiers: number[];     // 32
  top2Set: Set<number>;     // 24 garantidos
  knockout: KnockoutResult;
}

export interface UnifiedStats {
  top2: number[];      // %
  qualified: number[]; // %
  r16: number[];       // % (chegou às oitavas — venceu R32)
  qf: number[];        // % (chegou às quartas)
  sf: number[];        // % (chegou à semi)
  final: number[];     // % (chegou à final)
  champion: number[];  // %

  // Estatísticas extras (sempre populadas; em BT ficam neutras)
  meanGoalsPerMatch: number;
  scoreDist: { score: string; pct: number; count: number }[];
  totalMatchesSimulated: number;
}

// ------------------------------------------------------------------ Adapter

export interface GroupSimOutput {
  result: GroupResult;
  goalsTotal: number;
  scoreTallies: Map<string, number>;
}

export interface ModelAdapter {
  id: ModelId;
  // Simula um grupo (4 índices em ordem A,B,C,D do grupo) e devolve standings + jogos.
  simulateGroup(indices: number[]): GroupSimOutput;
  // Simula um jogo eliminatório (90 min + prorrogação + pênaltis).
  simulateKnockoutMatch(aIdx: number, bIdx: number): KnockoutMatchOutcome;
}

// ---------------------------------------------------------- Mensagens worker

export type WorkerCustomParams =
  | { modelId: 'bt'; forces?: number[] }
  | { modelId: 'poissonV1'; lambdas?: LambdaArraysV1 }
  | { modelId: 'poissonV2'; lambdas?: LambdaArrays };

export interface SimWorkerRequest {
  numCups: number;
  params: WorkerCustomParams;
}

export type SimWorkerResponse =
  | { type: 'progress'; pct: number }
  | { type: 'done'; stats: UnifiedStats };
