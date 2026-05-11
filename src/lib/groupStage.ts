import { GROUPS } from '../data/groups';
import { TEAM_INDEX_MAP } from '../data/teams';
import { simulateMatch, getForceArray } from './bradleyTerry';

export interface GroupStanding {
  teamIndex: number;
  points: number;
}

export interface GroupResult {
  standings: GroupStanding[];
  // índices dos classificados diretamente (1º e 2º)
  first: number;
  second: number;
  // 3º colocado e suas stats para desempate entre grupos
  third: number;
  thirdPoints: number;
  thirdForce: number;
}

// Simula um grupo de 4 times (round-robin: 6 jogos, 3 pts por vitória)
function simulateGroup(indices: number[]): GroupResult {
  const points = [0, 0, 0, 0];

  // Round-robin: todos contra todos
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const winner = simulateMatch(indices[i], indices[j]);
      if (winner === indices[i]) points[i] += 3;
      else points[j] += 3;
    }
  }

  // Ordena por pontos desc, desempate por força desc
  const forceArr = getForceArray();
  const order = [0, 1, 2, 3].sort((a, b) => {
    if (points[b] !== points[a]) return points[b] - points[a];
    return forceArr[indices[b]] - forceArr[indices[a]];
  });

  const standings: GroupStanding[] = order.map(pos => ({
    teamIndex: indices[pos],
    points: points[pos],
  }));

  return {
    standings,
    first: standings[0].teamIndex,
    second: standings[1].teamIndex,
    third: standings[2].teamIndex,
    thirdPoints: standings[2].points,
    thirdForce: forceArr[standings[2].teamIndex],
  };
}

export interface GroupStageResult {
  // Resultados de cada grupo (A=0, B=1, ..., L=11)
  groupResults: GroupResult[];
  // Os 32 classificados: primeiros 24 são top-2 de cada grupo,
  // últimos 8 são os melhores terceiros
  qualifiers: number[];
  // Quais times terminaram top-2 no grupo (garantidos)
  top2Set: Set<number>;
}

// Pré-computa os índices dos times de cada grupo uma única vez
const GROUP_INDICES: number[][] = Object.values(GROUPS).map(names =>
  names.map(name => {
    const idx = TEAM_INDEX_MAP.get(name);
    if (idx === undefined) throw new Error(`Time não encontrado: ${name}`);
    return idx;
  })
);

// Simula a fase de grupos completa e retorna os 32 classificados
export function simulateGroupStage(): GroupStageResult {
  const groupResults: GroupResult[] = GROUP_INDICES.map(simulateGroup);

  // Top-2 de cada grupo (24 garantidos)
  const qualifiers: number[] = [];
  const top2Set = new Set<number>();
  for (const gr of groupResults) {
    qualifiers.push(gr.first, gr.second);
    top2Set.add(gr.first);
    top2Set.add(gr.second);
  }

  // Os 12 terceiros colocados, ordenados por pontos desc depois força desc
  const thirds = groupResults
    .map(gr => ({ team: gr.third, pts: gr.thirdPoints, force: gr.thirdForce }))
    .sort((a, b) => b.pts - a.pts || b.force - a.force);

  // Os 8 melhores terceiros classificam
  for (let i = 0; i < 8; i++) {
    qualifiers.push(thirds[i].team);
  }

  return { groupResults, qualifiers, top2Set };
}

export { GROUP_INDICES };
