import { Trophy } from 'lucide-react';
import { Confetti } from './fx/Confetti';

export function Header() {
  return (
    <header className="relative overflow-hidden text-white shadow-xl bg-gradient-to-r from-copa-green via-copa-blue to-copa-purple bg-[length:300%_300%] animate-gradient-x">
      <Confetti count={26} distance="260px" />

      {/* Decorações flutuantes */}
      <span aria-hidden className="absolute -right-8 -bottom-12 text-[10rem] opacity-15 animate-spin-slow select-none">
        ⚽
      </span>
      <span aria-hidden className="absolute right-28 top-3 text-4xl opacity-40 animate-float select-none">
        🎉
      </span>
      <span aria-hidden className="absolute left-[55%] top-2 text-3xl opacity-30 animate-float-slow select-none">
        ⭐
      </span>
      <span aria-hidden className="absolute left-[35%] bottom-2 text-3xl opacity-25 animate-float select-none">
        🥅
      </span>

      <div className="relative max-w-6xl mx-auto px-4 py-7">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg rotate-3 animate-bounce-soft flex-shrink-0">
            <Trophy className="w-9 h-9 text-copa-gold drop-shadow-md" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide leading-tight drop-shadow-md">
                Simulador Copa do Mundo
              </h1>
              <span className="font-display text-xl px-3 py-0.5 rounded-full bg-copa-gold text-copa-dark shadow-md animate-pulse-glow">
                2026
              </span>
              <span className="text-2xl drop-shadow" aria-label="Países-sede">
                🇺🇸 🇲🇽 🇨🇦
              </span>
            </div>
            <p className="text-base sm:text-lg font-semibold opacity-95 mt-0.5">
              Bradley-Terry, Poisson V1 & V2 — Monte Carlo ⚡
            </p>
          </div>
        </div>
        <div className="mt-4 px-1">
          <p className="text-sm sm:text-base opacity-90 leading-snug max-w-4xl">
            Três modelos probabilísticos para simular a Copa: <strong>Bradley-Terry</strong> compara
            forças relativas; <strong>Poisson V1</strong> usa médias históricas de gols; e{' '}
            <strong>Poisson V2</strong> deriva os lambdas a partir das forças BT. Rodamos{' '}
            <strong>milhares de Copas virtuais</strong> para estimar as probabilidades. 🏟️
          </p>
        </div>
      </div>

      {/* Faixa multicolorida no rodapé do header */}
      <div className="relative h-2 fest-stripe" />
    </header>
  );
}
