// Lambdas do Poisson V1 — médias históricas de gols por seleção
// (modelo aditivo: Λ_A = (λ_a(A) + λ_d(B)) / 2)
//
// Os valores são normalizados para média ponderada do conjunto = 2,8 gols/jogo.
// Times marcados como "estimate" têm amostra histórica insuficiente ou estimativa
// indireta (proxies). A UI sinaliza esses casos com badge.
//
// IMPORTANTE: a ordem e os nomes devem casar exatamente com src/data/teams.ts
// para permitir lookup por índice. Mantemos a grafia "Curaçau" para consistência
// com as outras tabelas (groups.ts, teams.ts).

import { TEAMS } from './teams';

export type LambdaSource = 'historical' | 'estimate';

export interface PoissonV1Team {
  name: string;
  lambda_atk: number;
  lambda_def: number;
  source: LambdaSource;
}

// Defaults conforme tabela aprovada (CLAUDE/MD do projeto + spec V1).
// Importante: RD do Congo λ_a foi ajustado de 0 → 0,30 para evitar Poisson(0)
// que zeraria o ataque. Marcado como "estimate".
export const POISSON_V1_DEFAULTS: ReadonlyArray<PoissonV1Team> = [
  { name: 'Inglaterra',       lambda_atk: 1.389947, lambda_def: 0.908812, source: 'historical' },
  { name: 'França',           lambda_atk: 1.842522, lambda_def: 1.151576, source: 'historical' },
  { name: 'Espanha',          lambda_atk: 1.594210, lambda_def: 1.107090, source: 'historical' },
  { name: 'Brasil',           lambda_atk: 2.056081, lambda_def: 0.936948, source: 'historical' },
  { name: 'Alemanha',         lambda_atk: 2.048644, lambda_def: 1.147947, source: 'historical' },
  { name: 'Argentina',        lambda_atk: 1.708274, lambda_def: 1.135103, source: 'historical' },
  { name: 'Portugal',         lambda_atk: 1.723687, lambda_def: 1.158544, source: 'historical' },
  { name: 'Holanda',          lambda_atk: 1.726256, lambda_def: 0.935055, source: 'historical' },
  { name: 'Bélgica',          lambda_atk: 1.338060, lambda_def: 1.435021, source: 'historical' },
  { name: 'Uruguai',          lambda_atk: 1.491883, lambda_def: 1.273967, source: 'historical' },
  { name: 'Marrocos',         lambda_atk: 0.860001, lambda_def: 1.161001, source: 'historical' },
  { name: 'Senegal',          lambda_atk: 1.318668, lambda_def: 1.401084, source: 'historical' },
  { name: 'Croácia',          lambda_atk: 1.417568, lambda_def: 1.087901, source: 'historical' },
  { name: 'Colômbia',         lambda_atk: 1.438547, lambda_def: 1.348637, source: 'historical' },
  { name: 'Estados Unidos',   lambda_atk: 1.069190, lambda_def: 1.764164, source: 'historical' },
  { name: 'Turquia',          lambda_atk: 1.978002, lambda_def: 1.681301, source: 'historical' },
  { name: 'Suíça',            lambda_atk: 1.326708, lambda_def: 1.760904, source: 'historical' },
  { name: 'Equador',          lambda_atk: 1.065078, lambda_def: 1.065078, source: 'historical' },
  { name: 'Japão',            lambda_atk: 0.989001, lambda_def: 1.305481, source: 'historical' },
  { name: 'Noruega',          lambda_atk: 0.865376, lambda_def: 0.989001, source: 'historical' },
  { name: 'México',           lambda_atk: 1.021967, lambda_def: 1.664818, source: 'historical' },
  { name: 'Áustria',          lambda_atk: 1.466449, lambda_def: 1.602863, source: 'historical' },
  { name: 'Costa do Marfim',  lambda_atk: 1.428557, lambda_def: 1.538446, source: 'historical' },
  { name: 'Argélia',          lambda_atk: 0.989001, lambda_def: 1.445463, source: 'historical' },
  { name: 'Coreia do Sul',    lambda_atk: 1.015027, lambda_def: 2.030054, source: 'historical' },
  { name: 'Suécia',           lambda_atk: 1.551374, lambda_def: 1.415629, source: 'historical' },
  { name: 'Irã',              lambda_atk: 0.714278, lambda_def: 1.703279, source: 'historical' },
  { name: 'Canadá',           lambda_atk: 0.329667, lambda_def: 1.978002, source: 'historical' },
  { name: 'Egito',            lambda_atk: 0.706429, lambda_def: 1.695430, source: 'historical' },
  { name: 'Austrália',        lambda_atk: 0.840651, lambda_def: 1.829651, source: 'historical' },
  { name: 'Panamá',           lambda_atk: 0.659334, lambda_def: 3.626336, source: 'historical' },
  { name: 'República Tcheca', lambda_atk: 1.408577, lambda_def: 1.468516, source: 'historical' },
  { name: 'Escócia',          lambda_atk: 1.075001, lambda_def: 1.763001, source: 'historical' },
  { name: 'Paraguai',         lambda_atk: 1.098890, lambda_def: 1.391927, source: 'historical' },
  // RD do Congo: λ_a original 0 → ajustado para 0,30 (evita Poisson(0))
  { name: 'RD do Congo',      lambda_atk: 0.30,     lambda_def: 4.615337, source: 'estimate'   },
  { name: 'Tunísia',          lambda_atk: 0.769223, lambda_def: 1.428557, source: 'historical' },
  { name: 'Uzbequistão',      lambda_atk: 0.55,     lambda_def: 1.85,     source: 'estimate'   },
  { name: 'Catar',            lambda_atk: 0.329667, lambda_def: 2.307668, source: 'estimate'   },
  { name: 'Iraque',           lambda_atk: 0.329667, lambda_def: 1.318668, source: 'estimate'   },
  { name: 'África do Sul',    lambda_atk: 1.208779, lambda_def: 1.758224, source: 'historical' },
  { name: 'Bósnia',           lambda_atk: 1.318668, lambda_def: 1.318668, source: 'estimate'   },
  { name: 'Arábia Saudita',   lambda_atk: 0.728737, lambda_def: 2.290318, source: 'historical' },
  { name: 'Jordânia',         lambda_atk: 1.10,     lambda_def: 1.40,     source: 'estimate'   },
  { name: 'Gana',             lambda_atk: 1.186801, lambda_def: 1.516468, source: 'historical' },
  { name: 'Cabo Verde',       lambda_atk: 0.85,     lambda_def: 2.63,     source: 'estimate'   },
  { name: 'Haiti',            lambda_atk: 0.659334, lambda_def: 4.615337, source: 'estimate'   },
  { name: 'Curaçau',          lambda_atk: 0.60,     lambda_def: 2.30,     source: 'estimate'   },
  { name: 'Nova Zelândia',    lambda_atk: 0.659334, lambda_def: 2.307668, source: 'historical' },
];

// Verificação em tempo de import: os nomes do V1 batem com TEAMS na ordem certa.
// Falha barulhentamente se alguém renomear um time em uma das tabelas sem
// atualizar a outra.
if (POISSON_V1_DEFAULTS.length !== TEAMS.length) {
  throw new Error(
    `Poisson V1: tamanho da tabela (${POISSON_V1_DEFAULTS.length}) difere de TEAMS (${TEAMS.length})`
  );
}
for (let i = 0; i < TEAMS.length; i++) {
  if (POISSON_V1_DEFAULTS[i].name !== TEAMS[i].name) {
    throw new Error(
      `Poisson V1: ordem dos times divergente em i=${i} — ` +
      `V1="${POISSON_V1_DEFAULTS[i].name}" vs TEAMS="${TEAMS[i].name}"`
    );
  }
}
