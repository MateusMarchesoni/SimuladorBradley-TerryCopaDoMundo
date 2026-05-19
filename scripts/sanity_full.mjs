// Sanity check completo usando a arquitetura unificada (lib/models/cup.ts).
// Roda 10 000 Copas para BT, V1 e V2 e mostra top-10.

import { runCupSimulations } from '../src/lib/models/cup.ts';
import { TEAMS } from '../src/data/teams.ts';

function top10(stats, label) {
  console.log(`\n=== ${label} — top 10 % campeão ===`);
  const rows = TEAMS.map((t, i) => ({ name: t.name, champion: stats.champion[i] }))
    .sort((a, b) => b.champion - a.champion)
    .slice(0, 10);
  for (const r of rows) {
    console.log(`${r.name.padEnd(20)} ${r.champion.toFixed(2)}%`);
  }
  const totalChampion = stats.champion.reduce((s, v) => s + v, 0);
  console.log(`Soma % campeão: ${totalChampion.toFixed(2)}% (esperado 100±0,5)`);
  if (stats.meanGoalsPerMatch > 0) {
    console.log(`Média gols/jogo: ${stats.meanGoalsPerMatch.toFixed(3)}`);
  }
}

const N = 10_000;
console.log(`Rodando ${N} Copas para cada modelo…\n`);

for (const id of ['bt', 'poissonV1', 'poissonV2']) {
  const t0 = Date.now();
  const stats = runCupSimulations(id, N);
  const dt = Date.now() - t0;
  console.log(`[${id}] ${dt} ms`);
  top10(stats, id);
}
