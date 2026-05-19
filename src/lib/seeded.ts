// PRNG seedado (mulberry32) — usado pela tela "Minuto a Minuto" para permitir
// "Repetir" simulações com o mesmo resultado.
//
// Não substitui Math.random nas outras telas. É um gerador local cuja seed o
// componente armazena, permitindo reproduzir a mesma sequência de gols/minutos.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sampler de Poisson (método de Knuth) usando um RNG arbitrário. Para λ < ~30
// continua sendo eficiente — em nossas Copas λ raramente passa de 5.
export function poissonSampleWith(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

// Seed inteira a partir de Date.now() — usada quando o usuário inicia uma
// "Nova simulação". Conserva 32 bits em uma faixa segura para mulberry32.
export function randomSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
