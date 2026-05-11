import { TEAMS } from '../data/teams';
import { simulateGroupStage } from './groupStage';
import { simulateKnockout } from './knockout';
import type { GroupResult } from './groupStage';
import type { KnockoutResult } from './knockout';

const N = TEAMS.length; // 48

export interface SimStats {
  // Para cada time [0..47], probabilidade (0–100) de cada fase
  top2: number[];        // terminou top-2 no grupo (soma ≈ 24 × 100% / 48 times)
  qualified: number[];   // classificado entre os 32 (soma ≈ 32 × 100% / 48 times)
  r16: number[];         // venceu na rodada de 32 e chegou às oitavas
  qf: number[];          // chegou às quartas de final
  sf: number[];          // chegou à semifinal
  final: number[];       // chegou à final
  champion: number[];    // campeão
}

export interface SingleSimResult {
  groupResults: GroupResult[];
  qualifiers: number[];
  top2Set: Set<number>;
  knockout: KnockoutResult;
}

// Roda uma única simulação completa da Copa
export function simulateOneCup(): SingleSimResult {
  const { groupResults, qualifiers, top2Set } = simulateGroupStage();
  const knockout = simulateKnockout(qualifiers);
  return { groupResults, qualifiers, top2Set, knockout };
}

// Loop Monte Carlo: roda n simulações e agrega estatísticas.
// onProgress é chamado a cada 1000 simulações com o percentual 0–1.
export function runSimulations(
  n: number,
  onProgress?: (pct: number) => void
): SimStats {
  // Contadores absolutos por time por fase
  const cTop2 = new Int32Array(N);
  const cQualified = new Int32Array(N);
  const cR16 = new Int32Array(N);
  const cQF = new Int32Array(N);
  const cSF = new Int32Array(N);
  const cFinal = new Int32Array(N);
  const cChampion = new Int32Array(N);

  for (let s = 0; s < n; s++) {
    if (s % 1000 === 0 && onProgress) onProgress(s / n);

    const { groupResults, qualifiers, top2Set, knockout } = simulateOneCup();

    // Contabiliza fase de grupos
    for (const gr of groupResults) {
      cTop2[gr.first]++;
      cTop2[gr.second]++;
    }
    for (const t of qualifiers) {
      cQualified[t]++;
    }

    // Contabiliza fases do mata-mata
    // R32 → quem VENCEU chega às oitavas (R16)
    for (const m of knockout.r32) {
      cR16[m.winner]++;
    }
    for (const m of knockout.r16) {
      cQF[m.winner]++;
    }
    for (const m of knockout.qf) {
      cSF[m.winner]++;
    }
    for (const m of knockout.sf) {
      cFinal[m.winner]++;
    }
    cChampion[knockout.champion]++;

    // Suprimir warning de variável não usada no top2Set (usada em single sim)
    void top2Set;
  }

  // Converte contadores para percentuais (0–100)
  const pct = (arr: Int32Array) => Array.from(arr).map(v => (v / n) * 100);

  return {
    top2: pct(cTop2),
    qualified: pct(cQualified),
    r16: pct(cR16),
    qf: pct(cQF),
    sf: pct(cSF),
    final: pct(cFinal),
    champion: pct(cChampion),
  };
}
