/**
 * Import/Export JSON de torneios customizados.
 *
 * Schema v1:
 *   {
 *     "schemaVersion": 1,
 *     "id": "uuid",
 *     "name": "Copa do Mundo 2002",
 *     "modelId": "bt" | "poissonV1" | "poissonV2",
 *     "teams":  [{ "id", "name", "flag", "force", "lambdaAtk", "lambdaDef",
 *                  "derivedFromForce"?, "derivedFromLambdas"? }],
 *     "groups": [{ "id", "name", "teamIds": [...] }],
 *     "knockout": {
 *       "advancePerGroup": 1|2|3|4,
 *       "thirdPolicy": { "kind": "none" } | { "kind": "bestN", "howMany": N },
 *       "pairingStrategy": "serpentine"
 *     },
 *     "v2Params"?: { "alpha": number, "mu": number }
 *   }
 */

import {
  SCHEMA_VERSION,
  type CustomTournament,
} from './types';

export function serializeTournament(t: CustomTournament): string {
  return JSON.stringify(t, null, 2);
}

// Faz parse + valida shape. Throw com mensagens em PT-BR para a UI exibir.
export function deserializeTournament(json: string): CustomTournament {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error('JSON inválido (não foi possível interpretar): ' + (e as Error).message);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('JSON inválido: a raiz precisa ser um objeto.');
  }

  const r = raw as Record<string, unknown>;

  if (r.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Versão de schema incompatível (esperada ${SCHEMA_VERSION}, encontrada ${String(r.schemaVersion)}).`
    );
  }
  if (typeof r.id !== 'string' || !r.id) throw new Error('Campo "id" ausente ou inválido.');
  if (typeof r.name !== 'string') throw new Error('Campo "name" ausente.');
  if (r.modelId !== 'bt' && r.modelId !== 'poissonV1' && r.modelId !== 'poissonV2') {
    throw new Error(`"modelId" inválido: ${String(r.modelId)}.`);
  }

  if (!Array.isArray(r.teams)) throw new Error('Campo "teams" ausente ou não é array.');
  const teams = r.teams.map((t, i) => {
    if (typeof t !== 'object' || t === null) throw new Error(`teams[${i}] não é objeto.`);
    const tt = t as Record<string, unknown>;
    if (typeof tt.id !== 'string') throw new Error(`teams[${i}].id ausente.`);
    if (typeof tt.name !== 'string') throw new Error(`teams[${i}].name ausente.`);
    if (typeof tt.flag !== 'string') throw new Error(`teams[${i}].flag ausente.`);
    if (typeof tt.force !== 'number') throw new Error(`teams[${i}].force precisa ser número.`);
    if (typeof tt.lambdaAtk !== 'number') throw new Error(`teams[${i}].lambdaAtk precisa ser número.`);
    if (typeof tt.lambdaDef !== 'number') throw new Error(`teams[${i}].lambdaDef precisa ser número.`);
    return {
      id: tt.id,
      name: tt.name,
      flag: tt.flag,
      force: tt.force,
      lambdaAtk: tt.lambdaAtk,
      lambdaDef: tt.lambdaDef,
      derivedFromForce: typeof tt.derivedFromForce === 'boolean' ? tt.derivedFromForce : undefined,
      derivedFromLambdas: typeof tt.derivedFromLambdas === 'boolean' ? tt.derivedFromLambdas : undefined,
    };
  });

  if (!Array.isArray(r.groups)) throw new Error('Campo "groups" ausente ou não é array.');
  const groups = r.groups.map((g, i) => {
    if (typeof g !== 'object' || g === null) throw new Error(`groups[${i}] não é objeto.`);
    const gg = g as Record<string, unknown>;
    if (typeof gg.id !== 'string') throw new Error(`groups[${i}].id ausente.`);
    if (typeof gg.name !== 'string') throw new Error(`groups[${i}].name ausente.`);
    if (!Array.isArray(gg.teamIds)) throw new Error(`groups[${i}].teamIds precisa ser array.`);
    return {
      id: gg.id,
      name: gg.name,
      teamIds: gg.teamIds.map((tid, j) => {
        if (typeof tid !== 'string') throw new Error(`groups[${i}].teamIds[${j}] precisa ser string.`);
        return tid;
      }),
    };
  });

  if (typeof r.knockout !== 'object' || r.knockout === null) {
    throw new Error('Campo "knockout" ausente.');
  }
  const k = r.knockout as Record<string, unknown>;
  const advance = k.advancePerGroup;
  if (advance !== 1 && advance !== 2 && advance !== 3 && advance !== 4) {
    throw new Error(`knockout.advancePerGroup inválido: ${String(advance)}.`);
  }
  let thirdPolicy: CustomTournament['knockout']['thirdPolicy'];
  const tp = k.thirdPolicy;
  if (typeof tp !== 'object' || tp === null) {
    throw new Error('knockout.thirdPolicy ausente.');
  }
  const tpRec = tp as Record<string, unknown>;
  if (tpRec.kind === 'none') {
    thirdPolicy = { kind: 'none' };
  } else if (tpRec.kind === 'bestN') {
    if (typeof tpRec.howMany !== 'number') throw new Error('thirdPolicy.howMany ausente.');
    thirdPolicy = { kind: 'bestN', howMany: tpRec.howMany };
  } else {
    throw new Error(`knockout.thirdPolicy.kind inválido: ${String(tpRec.kind)}.`);
  }

  if (k.pairingStrategy !== 'serpentine') {
    throw new Error('knockout.pairingStrategy precisa ser "serpentine".');
  }

  let v2Params: CustomTournament['v2Params'];
  if (r.v2Params !== undefined) {
    if (typeof r.v2Params !== 'object' || r.v2Params === null) {
      throw new Error('v2Params inválido.');
    }
    const vp = r.v2Params as Record<string, unknown>;
    if (typeof vp.alpha !== 'number' || typeof vp.mu !== 'number') {
      throw new Error('v2Params precisa de alpha e mu numéricos.');
    }
    v2Params = { alpha: vp.alpha, mu: vp.mu };
  }

  return {
    id: r.id,
    schemaVersion: SCHEMA_VERSION,
    name: r.name,
    modelId: r.modelId,
    teams,
    groups,
    knockout: {
      advancePerGroup: advance,
      thirdPolicy,
      pairingStrategy: 'serpentine',
    },
    v2Params,
  };
}
