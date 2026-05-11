import { TEAMS } from '../data/teams';

// Array de forças para acesso rápido por índice (evita lookups em objetos)
let FORCE_ARRAY: number[] = TEAMS.map(t => t.force);

// Atualiza o array de forças quando o usuário edita os valores
export function setCustomForces(forces: Float64Array | number[]): void {
  FORCE_ARRAY = Array.from(forces);
}

export function getForceArray(): number[] {
  return FORCE_ARRAY;
}

// Simula um jogo: retorna o índice do vencedor.
// P(A vence) = F_A / (F_A + F_B) — modelo Bradley-Terry
export function simulateMatch(indexA: number, indexB: number): number {
  const fa = FORCE_ARRAY[indexA];
  const fb = FORCE_ARRAY[indexB];
  return Math.random() < fa / (fa + fb) ? indexA : indexB;
}
