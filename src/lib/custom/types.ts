/**
 * Tipos do "Torneio Customizado".
 *
 * O motor (engine.ts) consome times POR VALOR — nenhum array global é tocado.
 * Permite simular Copas com qualquer formato (Nº times, Nº grupos, mata-mata
 * R32/R16/QF→Final), sem regressão na Copa 2026 fixa.
 *
 * Versionamento de schema (SCHEMA_VERSION) protege import de JSON antigo.
 */

import type {
  GroupResult,
  KnockoutMatchOutcome,
  ModelId,
} from '../models/types';

export const SCHEMA_VERSION = 1 as const;

export interface CustomTeam {
  id: string;              // uuid estável (sobrevive a renomear)
  name: string;
  flag: string;            // emoji; aceita vazio
  force: number;           // BT
  lambdaAtk: number;       // V1 e V2
  lambdaDef: number;       // V1 e V2
  // Marcas de origem (badge informativo no editor).
  derivedFromForce?: boolean;
  derivedFromLambdas?: boolean;
}

export interface CustomGroup {
  id: string;              // uuid
  name: string;            // "A", "B", livre
  teamIds: string[];       // ids de CustomTeam
}

export type ThirdPolicy =
  | { kind: 'none' }
  | { kind: 'bestN'; howMany: number };

export interface KnockoutConfig {
  // Quantos times classificam diretamente por grupo (top-K).
  advancePerGroup: 1 | 2 | 3 | 4;
  // Política para classificados adicionais (melhores terceiros etc.).
  thirdPolicy: ThirdPolicy;
  // Estratégia de chaveamento do round 1. Só "serpentine" implementada por agora
  // (1º grupo A × 2º grupo B, 1º C × 2º D, …).
  pairingStrategy: 'serpentine';
}

export interface CustomTournament {
  id: string;
  schemaVersion: typeof SCHEMA_VERSION;
  name: string;
  modelId: ModelId;
  teams: CustomTeam[];
  groups: CustomGroup[];
  knockout: KnockoutConfig;
  // Permite override dos parâmetros V2 (default = constantes globais).
  v2Params?: { alpha: number; mu: number };
}

// --------------------------------------------------------------- Resultados

export interface CustomKnockoutResult {
  // rounds[0] = primeira rodada do mata-mata (varia: R32, R16, QF…).
  // rounds[last] = final (1 jogo).
  rounds: KnockoutMatchOutcome[][];
  champion: number; // índice local em CustomTournament.teams
}

export interface CustomSingleResult {
  groupResults: GroupResult[];
  qualifiers: number[];   // 32, 16, 8… índices locais
  knockout: CustomKnockoutResult;
}

export interface CustomUnifiedStats {
  // % de ter ficado em 1º do grupo.
  top1: number[];
  // % de classificar para o mata-mata (incl. terceiros, se houver).
  qualified: number[];
  // perRound[r][i] = % de chegar à rodada r+1 (i.e. venceu rodada r).
  // perRound.length = numRounds (5 para 32 quals, 4 para 16, …).
  // Último item de perRound é o campeão (mesmo número que `champion`).
  perRound: number[][];
  champion: number[];

  // Extras agregados (Poisson; em BT permanecem zerados).
  meanGoalsPerMatch: number;
  scoreDist: { score: string; pct: number; count: number }[];
  totalMatchesSimulated: number;

  // Metadados do bracket simulado (para construir labels na UI).
  numRounds: number;
  totalQualifiers: number;
  numGroups: number;
}

// View "leve" de um time, usada pelos componentes adaptados (SingleBracket,
// ResultsTable, ChartsSection) para renderizar flag + nome a partir de
// qualquer fonte (TEAMS global ou CustomTournament.teams).
export interface TeamView {
  name: string;
  flag: string;
}

// --------------------------------------------------------------- Worker

export interface CustomSimWorkerRequest {
  numCups: number;
  tournament: CustomTournament;
}

export type CustomSimWorkerResponse =
  | { type: 'progress'; pct: number }
  | { type: 'done'; stats: CustomUnifiedStats };

// --------------------------------------------------------------- Validação

export interface ValidationIssue {
  message: string;
  field?: string;        // ex. "teams[3].force"
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// --------------------------------------------------------------- Utilitários

// Gera um id curto e estável. Usa crypto.randomUUID quando disponível
// (browser moderno + Node 19+); caso contrário, fallback aleatório.
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// Helper: log2 inteiro se n for potência de 2; caso contrário, NaN.
export function log2IntIfPow2(n: number): number {
  if (n < 2 || !Number.isInteger(n) || (n & (n - 1)) !== 0) return NaN;
  return Math.log2(n);
}
