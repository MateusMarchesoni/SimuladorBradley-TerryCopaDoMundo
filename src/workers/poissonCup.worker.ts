import { runPoissonCupSimulations } from '../lib/poisson/cupSimulator';
import { setCustomLambdas, type LambdaArrays } from '../lib/poisson/sampling';
import type { PoissonCupStats } from '../lib/poisson/cupSimulator';

interface WorkerRequest {
  numCups: number;
  customLambdas?: LambdaArrays;
}

interface WorkerProgress {
  type: 'progress';
  pct: number;
}

interface WorkerDone {
  type: 'done';
  stats: PoissonCupStats;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { numCups, customLambdas } = e.data;
  setCustomLambdas(customLambdas);
  const stats = runPoissonCupSimulations(numCups, pct => {
    const msg: WorkerProgress = { type: 'progress', pct };
    self.postMessage(msg);
  });
  const msg: WorkerDone = { type: 'done', stats };
  self.postMessage(msg);
};
