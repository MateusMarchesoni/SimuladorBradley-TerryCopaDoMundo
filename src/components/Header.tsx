import { Trophy } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-copa-green via-emerald-600 to-copa-gold text-white py-6 px-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <Trophy className="w-9 h-9 text-white drop-shadow-md flex-shrink-0" strokeWidth={2.5} />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Simulador Bradley-Terry
          </h1>
          <p className="text-base sm:text-lg font-semibold opacity-90">
            Copa do Mundo 2026 — Monte Carlo
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-3 px-1">
        <p className="text-sm sm:text-base opacity-85 leading-snug">
          O modelo <strong>Bradley-Terry</strong> calcula a chance de cada time vencer:{' '}
          <span className="font-mono bg-white/20 px-1 rounded">P(A×B) = Força_A ÷ (Força_A + Força_B)</span>.
          Rodamos <strong>milhares de Copas virtuais</strong> para estimar as probabilidades reais.
        </p>
      </div>
    </header>
  );
}
