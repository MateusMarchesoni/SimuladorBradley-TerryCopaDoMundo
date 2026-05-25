/**
 * Worker do Torneio Customizado.
 *
 * Wrapper fino sobre runCustomCupSimulations. Recebe o torneio completo no
 * payload (sem singleton para popular), roda Monte Carlo e devolve as stats
 * agregadas.
 */

import { runCustomCupSimulations } from '../lib/custom/engine';
import type {
  CustomSimWorkerRequest,
  CustomSimWorkerResponse,
} from '../lib/custom/types';

self.onmessage = (e: MessageEvent<CustomSimWorkerRequest>) => {
  const { numCups, tournament } = e.data;
  const stats = runCustomCupSimulations(tournament, numCups, pct => {
    const msg: CustomSimWorkerResponse = { type: 'progress', pct };
    self.postMessage(msg);
  });
  const done: CustomSimWorkerResponse = { type: 'done', stats };
  self.postMessage(done);
};
