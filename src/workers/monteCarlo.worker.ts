import { TEAMS } from '../data/teams';
import { setCustomForces } from '../lib/bradleyTerry';
import { runSimulations } from '../lib/monteCarlo';
import type { SimStats } from '../lib/monteCarlo';

interface WorkerRequest {
  n: number;
  customForces?: number[]; // se presente, substitui as forças padrão
}

interface WorkerProgress {
  type: 'progress';
  pct: number;
}

interface WorkerDone {
  type: 'done';
  stats: SimStats;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { n, customForces } = e.data;

  // Aplica forças customizadas se fornecidas
  if (customForces && customForces.length === TEAMS.length) {
    setCustomForces(customForces);
  } else {
    // Restaura forças originais
    setCustomForces(TEAMS.map(t => t.force));
  }

  const stats = runSimulations(n, (pct) => {
    const msg: WorkerProgress = { type: 'progress', pct };
    self.postMessage(msg);
  });

  const msg: WorkerDone = { type: 'done', stats };
  self.postMessage(msg);
};
