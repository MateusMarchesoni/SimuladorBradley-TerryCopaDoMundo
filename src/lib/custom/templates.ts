/**
 * Templates de torneio prontos para usar.
 *
 * - copa2002: 32 seleções com forças fornecidas pelo usuário. Modelo BT.
 *   λ_atk/λ_def derivados via fórmula V2 (mesma constantes globais do projeto)
 *   para que V2 funcione "out of the box". V1 fica disponível mas com warning
 *   (lambdas derivados não são "históricos verdadeiros").
 * - copa2010: 32 seleções com nomes e grupos históricos. Forças placeholder
 *   (1.0); usuário precisa preencher antes de simular.
 * - blank32 / blank16: esqueletos genéricos.
 *
 * Todos os templates regeneram ids a cada chamada (uuid via newId), para que
 * duas instâncias do mesmo template não conflitem.
 */

import { deriveLambdasFromForces } from './derivations';
import {
  SCHEMA_VERSION,
  newId,
  type CustomTeam,
  type CustomTournament,
} from './types';

// Linhas históricas Copa 2002: [nome, bandeira, força, grupo].
// Forças fornecidas pelo usuário; alocação de grupos é a oficial da FIFA.
const COPA_2002_RAW: Array<[string, string, number, string]> = [
  ['Brasil',          '🇧🇷', 91.2, 'C'],
  ['França',          '🇫🇷', 85.2, 'A'],
  ['Itália',          '🇮🇹', 76.3, 'G'],
  ['Argentina',       '🇦🇷', 74.2, 'F'],
  ['Inglaterra',      '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 63.9, 'F'],
  ['Portugal',        '🇵🇹', 49.2, 'D'],
  ['Espanha',         '🇪🇸', 49.0, 'B'],
  ['Alemanha',        '🇩🇪', 47.3, 'E'],
  ['Uruguai',         '🇺🇾', 40.6, 'A'],
  ['México',          '🇲🇽', 39.4, 'G'],
  ['Bélgica',         '🇧🇪', 39.0, 'H'],
  ['Suécia',          '🇸🇪', 33.2, 'F'],
  ['Dinamarca',       '🇩🇰', 28.0, 'A'],
  ['Irlanda',         '🇮🇪', 24.6, 'E'],
  ['Turquia',         '🇹🇷', 20.6, 'C'],
  ['Estados Unidos',  '🇺🇸', 18.0, 'D'],
  ['Nigéria',         '🇳🇬', 16.2, 'F'],
  ['Paraguai',        '🇵🇾', 15.0, 'B'],
  ['Rússia',          '🇷🇺', 15.0, 'H'],
  ['Croácia',         '🇭🇷',  9.4, 'G'],
  ['Japão',           '🇯🇵',  8.2, 'H'],
  ['Camarões',        '🇨🇲',  8.0, 'E'],
  ['Polônia',         '🇵🇱',  7.8, 'D'],
  ['Costa Rica',      '🇨🇷',  7.8, 'C'],
  ['Eslovênia',       '🇸🇮',  6.6, 'B'],
  ['Tunísia',         '🇹🇳',  6.0, 'H'],
  ['Equador',         '🇪🇨',  5.8, 'G'],
  ['Coreia do Sul',   '🇰🇷',  5.4, 'D'],
  ['China',           '🇨🇳',  4.8, 'C'],
  ['África do Sul',   '🇿🇦',  4.6, 'B'],
  ['Senegal',         '🇸🇳',  4.2, 'A'],
  ['Arábia Saudita',  '🇸🇦',  3.8, 'E'],
];

// Linhas Copa 2010: [nome, bandeira, grupo]. Sem forças; usuário preenche.
const COPA_2010_RAW: Array<[string, string, string]> = [
  // Grupo A
  ['África do Sul',     '🇿🇦', 'A'],
  ['México',            '🇲🇽', 'A'],
  ['Uruguai',           '🇺🇾', 'A'],
  ['França',            '🇫🇷', 'A'],
  // Grupo B
  ['Argentina',         '🇦🇷', 'B'],
  ['Nigéria',           '🇳🇬', 'B'],
  ['Coreia do Sul',     '🇰🇷', 'B'],
  ['Grécia',            '🇬🇷', 'B'],
  // Grupo C
  ['Inglaterra',        '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'C'],
  ['Estados Unidos',    '🇺🇸', 'C'],
  ['Argélia',           '🇩🇿', 'C'],
  ['Eslovênia',         '🇸🇮', 'C'],
  // Grupo D
  ['Alemanha',          '🇩🇪', 'D'],
  ['Austrália',         '🇦🇺', 'D'],
  ['Sérvia',            '🇷🇸', 'D'],
  ['Gana',              '🇬🇭', 'D'],
  // Grupo E
  ['Holanda',           '🇳🇱', 'E'],
  ['Dinamarca',         '🇩🇰', 'E'],
  ['Japão',             '🇯🇵', 'E'],
  ['Camarões',          '🇨🇲', 'E'],
  // Grupo F
  ['Itália',            '🇮🇹', 'F'],
  ['Paraguai',          '🇵🇾', 'F'],
  ['Nova Zelândia',     '🇳🇿', 'F'],
  ['Eslováquia',        '🇸🇰', 'F'],
  // Grupo G
  ['Brasil',            '🇧🇷', 'G'],
  ['Coreia do Norte',   '🇰🇵', 'G'],
  ['Costa do Marfim',   '🇨🇮', 'G'],
  ['Portugal',          '🇵🇹', 'G'],
  // Grupo H
  ['Espanha',           '🇪🇸', 'H'],
  ['Suíça',             '🇨🇭', 'H'],
  ['Honduras',          '🇭🇳', 'H'],
  ['Chile',             '🇨🇱', 'H'],
];

// Constrói um torneio a partir de uma lista de linhas [nome, bandeira, força].
// As linhas devem vir agrupadas por nome do grupo (4ª coluna).
function buildFromRows(
  name: string,
  rows: Array<[string, string, number, string]>
): CustomTournament {
  // Lambdas neutros iniciais; serão preenchidos abaixo via derivação.
  const teams: CustomTeam[] = rows.map(([n, flag, force]) => ({
    id: newId(),
    name: n,
    flag,
    force,
    lambdaAtk: 1.3, // neutro; sobrescrito pela derivação V2 logo abaixo
    lambdaDef: 1.0,
  }));

  // Deriva λ_atk/λ_def via V2 a partir das forças (auto-consistente com F_ref
  // local do torneio). Marca como derivedFromForce.
  const enrichedTeams = deriveLambdasFromForces(teams);

  // Agrupa por nome de grupo, preservando ordem de criação dos times.
  const groupNames = [...new Set(rows.map(r => r[3]))];
  const groups = groupNames.map(gn => ({
    id: newId(),
    name: gn,
    teamIds: rows
      .map((r, i) => (r[3] === gn ? enrichedTeams[i].id : null))
      .filter((id): id is string => id !== null),
  }));

  return {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    name,
    modelId: 'bt',
    teams: enrichedTeams,
    groups,
    knockout: {
      advancePerGroup: 2,
      thirdPolicy: { kind: 'none' },
      pairingStrategy: 'serpentine',
    },
  };
}

export function buildCopa2002Template(): CustomTournament {
  return buildFromRows('Copa do Mundo 2002', COPA_2002_RAW);
}

export function buildCopa2010Template(): CustomTournament {
  // Força 1.0 placeholder para todos; usuário precisa editar antes de simular.
  const rows: Array<[string, string, number, string]> = COPA_2010_RAW.map(
    ([n, flag, group]) => [n, flag, 1.0, group]
  );
  const t = buildFromRows('Copa do Mundo 2010', rows);
  // Não derivar lambdas com forças todas iguais (resultado degenerado).
  // Deixa lambdas neutros e usuário decide.
  t.teams = t.teams.map(team => ({
    ...team,
    lambdaAtk: 1.3,
    lambdaDef: 1.0,
    derivedFromForce: false,
  }));
  return t;
}

// Torneio "em branco" com N times sem nome. Default 32 times, 8 grupos de 4.
export function buildBlankTemplate(numTeams: 16 | 32): CustomTournament {
  const groupsCount = numTeams === 32 ? 8 : 4;
  const teamsPerGroup = 4;
  const teams: CustomTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    id: newId(),
    name: `Time ${i + 1}`,
    flag: '🏳️',
    force: 50,
    lambdaAtk: 1.3,
    lambdaDef: 1.0,
  }));
  const groups = Array.from({ length: groupsCount }, (_, gi) => ({
    id: newId(),
    name: String.fromCharCode(65 + gi), // A, B, C, ...
    teamIds: teams.slice(gi * teamsPerGroup, (gi + 1) * teamsPerGroup).map(t => t.id),
  }));
  return {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    name: `Torneio em branco (${numTeams})`,
    modelId: 'bt',
    teams,
    groups,
    knockout: {
      advancePerGroup: 2,
      thirdPolicy: { kind: 'none' },
      pairingStrategy: 'serpentine',
    },
  };
}

export const TEMPLATES = {
  copa2002: { label: 'Copa do Mundo 2002', build: buildCopa2002Template },
  copa2010: { label: 'Copa do Mundo 2010', build: buildCopa2010Template },
  blank32:  { label: 'Em branco (32 times)', build: () => buildBlankTemplate(32) },
  blank16:  { label: 'Em branco (16 times)', build: () => buildBlankTemplate(16) },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;
