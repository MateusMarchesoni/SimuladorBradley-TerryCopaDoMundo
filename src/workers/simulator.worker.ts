/**
 * Worker único — roda Monte Carlo para qualquer um dos três modelos.
 *
 * Recebe um SimWorkerRequest com modelId + parâmetros customizados (forças BT,
 * lambdas V1 ou V2). Aplica os parâmetros no singleton local do worker e roda
 * o Monte Carlo via runCupSimulations.
 *
 * Reporta progresso em chunks (~500 sims, definido em models/cup.ts) e envia
 * UnifiedStats no fim.
 */

import { setCustomForces } from '../lib/bradleyTerry';
import { setCustomLambdas } from '../lib/poisson/sampling';
import { setCustomLambdasV1 } from '../lib/poisson/v1';
import { runCupSimulations } from '../lib/models/cup';
import { TEAMS } from '../data/teams';
import type {
  SimWorkerRequest,
  SimWorkerResponse,
} from '../lib/models/types';

self.onmessage = (e: MessageEvent<SimWorkerRequest>) => {
  const { numCups, params } = e.data;

  // Aplica parâmetros customizados antes da simulação. Quando não vêm, cada
  // setter restaura defaults (passando undefined).
  switch (params.modelId) {
    case 'bt': {
      const forces = params.forces && params.forces.length === TEAMS.length
        ? params.forces
        : TEAMS.map(t => t.force);
      setCustomForces(forces);
      break;
    }
    case 'poissonV1':
      setCustomLambdasV1(params.lambdas);
      break;
    case 'poissonV2':
      setCustomLambdas(params.lambdas);
      break;
  }

  const stats = runCupSimulations(params.modelId, numCups, pct => {
    const msg: SimWorkerResponse = { type: 'progress', pct };
    self.postMessage(msg);
  });

  const done: SimWorkerResponse = { type: 'done', stats };
  self.postMessage(done);
};
