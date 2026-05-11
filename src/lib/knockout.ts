import { simulateMatch } from './bradleyTerry';

export interface KnockoutMatch {
  teamA: number;
  teamB: number;
  winner: number;
}

export interface KnockoutResult {
  r32: KnockoutMatch[];   // 16 jogos — rodada de 32 (16-avos)
  r16: KnockoutMatch[];   // 8 jogos — oitavas de final
  qf: KnockoutMatch[];    // 4 jogos — quartas de final
  sf: KnockoutMatch[];    // 2 jogos — semifinais
  final: KnockoutMatch;   // jogo final
  champion: number;
}

// Monta os 16 jogos da rodada de 32 conforme o chaveamento simplificado:
// Grupos são emparelhados: (A,B), (C,D), (E,F), (G,H), (I,J), (K,L)
// M1-M6:  1º Grupo X vs 2º Grupo Y  (par seguinte)
// M7-M12: 1º Grupo Y vs 2º Grupo X
// M13-M16: 4 jogos entre os 8 melhores 3ºs colocados
//
// qualifiers[0..23] = top-2 de cada grupo na ordem A,B,C,...,L (par de grupo = par A,B = [0,1])
// qualifiers[24..31] = 8 melhores terceiros
function buildR32Bracket(qualifiers: number[]): [number, number][] {
  // índices dentro de qualifiers para cada posição de grupo
  // grupo g: 1º = qualifiers[g*2], 2º = qualifiers[g*2+1]
  const first = (g: number) => qualifiers[g * 2];
  const second = (g: number) => qualifiers[g * 2 + 1];

  const pares: [number, number][] = [
    // Quarter 1: grupos A(0) e B(1)
    [first(0), second(1)],  // M1: 1A × 2B
    [first(2), second(3)],  // M2: 1C × 2D
    [first(1), second(0)],  // M3: 1B × 2A
    [first(3), second(2)],  // M4: 1D × 2C
    // Quarter 2: grupos E(4) e F(5)
    [first(4), second(5)],  // M5: 1E × 2F
    [first(6), second(7)],  // M6: 1G × 2H
    [first(5), second(4)],  // M7: 1F × 2E
    [first(7), second(6)],  // M8: 1H × 2G
    // Quarter 3: grupos I(8) e J(9)
    [first(8), second(9)],  // M9:  1I × 2J
    [first(10), second(11)],// M10: 1K × 2L
    [first(9), second(8)],  // M11: 1J × 2I
    [first(11), second(10)],// M12: 1L × 2K
    // Quarter 4: 8 melhores terceiros (wildcards)
    [qualifiers[24], qualifiers[25]], // M13
    [qualifiers[26], qualifiers[27]], // M14
    [qualifiers[28], qualifiers[29]], // M15
    [qualifiers[30], qualifiers[31]], // M16
  ];

  return pares;
}

function simulateRound(pairs: [number, number][]): KnockoutMatch[] {
  return pairs.map(([a, b]) => {
    const winner = simulateMatch(a, b);
    return { teamA: a, teamB: b, winner };
  });
}

function nextRoundPairs(matches: KnockoutMatch[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push([matches[i].winner, matches[i + 1].winner]);
  }
  return pairs;
}

export function simulateKnockout(qualifiers: number[]): KnockoutResult {
  const r32Pairs = buildR32Bracket(qualifiers);
  const r32 = simulateRound(r32Pairs);
  const r16 = simulateRound(nextRoundPairs(r32));
  const qf = simulateRound(nextRoundPairs(r16));
  const sfMatches = simulateRound(nextRoundPairs(qf));
  const finalMatch = simulateRound(nextRoundPairs(sfMatches));

  return {
    r32,
    r16,
    qf,
    sf: sfMatches,
    final: finalMatch[0],
    champion: finalMatch[0].winner,
  };
}
