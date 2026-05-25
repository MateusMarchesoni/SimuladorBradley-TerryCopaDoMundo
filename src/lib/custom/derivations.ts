/**
 * Conversões entre força BT e lambdas Poisson para o Torneio Customizado.
 *
 * Útil quando o usuário carrega um template "força-only" (Copa 2002) e quer
 * usar Poisson V2 ou V1 — clica "Derivar λ" e o sistema preenche os campos
 * automaticamente. O caminho inverso (forças a partir de λ) também é útil
 * para quem editou direto os lambdas e quer experimentar BT.
 */

import { ALPHA, MU_BASELINE } from '../poisson/sampling';
import type { CustomTeam } from './types';

// Média geométrica das forças positivas.
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

// Aplica fórmula V2: λ_atk = μ × (F/F_ref)^α ; λ_def = μ × (F_ref/F)^α.
// F_ref = média geométrica das forças DO TORNEIO (auto-consistente com o engine).
// Times com force <= 0 são deixados intactos (validação acusa o erro).
export function deriveLambdasFromForces(
  teams: CustomTeam[],
  params?: { alpha?: number; mu?: number }
): CustomTeam[] {
  const alpha = params?.alpha ?? ALPHA;
  const mu = params?.mu ?? MU_BASELINE;
  const fRef = geomeanForces(teams);

  return teams.map(t => {
    if (t.force <= 0) return { ...t };
    return {
      ...t,
      lambdaAtk: mu * Math.pow(t.force / fRef, alpha),
      lambdaDef: mu * Math.pow(fRef / t.force, alpha),
      derivedFromForce: true,
      derivedFromLambdas: false,
    };
  });
}

// Aproximação inversa: F ∝ √(λ_atk × λ_def), reescalado para que a média
// geométrica das novas forças seja 1 (pivô neutro). Útil só como ponto de
// partida — V2 puro não tem inverso fechado.
export function deriveForceFromLambdas(teams: CustomTeam[]): CustomTeam[] {
  // raw_i = sqrt(λ_atk × λ_def)
  const raw = teams.map(t =>
    t.lambdaAtk > 0 && t.lambdaDef > 0 ? Math.sqrt(t.lambdaAtk * t.lambdaDef) : 0
  );

  // Re-escala para média geométrica = 1 (assim forças ficam em torno da unidade).
  let sumLog = 0;
  let n = 0;
  for (const r of raw) {
    if (r > 0) { sumLog += Math.log(r); n++; }
  }
  const geom = n > 0 ? Math.exp(sumLog / n) : 1;

  return teams.map((t, i) => {
    if (raw[i] <= 0) return { ...t };
    return {
      ...t,
      force: raw[i] / geom,
      derivedFromForce: false,
      derivedFromLambdas: true,
    };
  });
}
