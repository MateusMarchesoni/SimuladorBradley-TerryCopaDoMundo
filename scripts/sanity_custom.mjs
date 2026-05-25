// Sanity check da aba "Torneio Customizado" — usa o template Copa 2002
// (com forças fornecidas pelo usuário) e roda os 3 modelos.
//
// Critérios:
//  - soma % campeão ≈ 100% (±0,5)
//  - tempo razoável (~ segundos)
//  - Brasil entre os top-3 favoritos (força 91.2, a maior)

import {
  buildCopa2002Template,
} from '../src/lib/custom/templates.ts';
import {
  runCustomCupSimulations,
  simulateOneCustomCup,
} from '../src/lib/custom/engine.ts';
import { validateTournament } from '../src/lib/custom/validate.ts';

const N = 10_000;

function summarize(stats, t, label) {
  console.log(`\n=== ${label} — top 8 % campeão ===`);
  const rows = t.teams
    .map((team, i) => ({ name: team.name, flag: team.flag, c: stats.champion[i] }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 8);
  for (const r of rows) {
    console.log(`${r.flag} ${r.name.padEnd(20)} ${r.c.toFixed(2)}%`);
  }
  const total = stats.champion.reduce((s, v) => s + v, 0);
  console.log(`Soma % campeão: ${total.toFixed(2)}% (esperado 100±0,5)`);
  if (stats.meanGoalsPerMatch > 0) {
    console.log(`Média gols/jogo: ${stats.meanGoalsPerMatch.toFixed(3)}`);
  }
  console.log(
    `Bracket: ${stats.totalQualifiers} classificados em ${stats.numRounds} rodadas`
  );
}

const base = buildCopa2002Template();
console.log('Validação:', validateTournament(base));

for (const modelId of ['bt', 'poissonV2', 'poissonV1']) {
  const t = { ...base, modelId };
  const t0 = Date.now();
  const stats = runCustomCupSimulations(t, N);
  const dt = Date.now() - t0;
  console.log(`\n[${modelId}] ${dt} ms para ${N} sims`);
  summarize(stats, t, `Copa 2002 (${modelId})`);
}

// Smoke test do "Ver 1 Copa" no BT.
console.log('\n=== Ver 1 Copa (BT) — campeão sorteado ===');
const single = simulateOneCustomCup({ ...base, modelId: 'bt' });
const champ = base.teams[single.knockout.champion];
console.log(`${champ.flag} ${champ.name} ganhou a Copa.`);
console.log(`Rodadas: ${single.knockout.rounds.length}`);
console.log(`Última rodada: ${single.knockout.rounds.at(-1).length} jogo(s)`);
