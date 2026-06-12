import { Play, Eye, Loader2 } from 'lucide-react';

interface Props {
  numSims: number;
  onNumSimsChange: (n: number) => void;
  isRunning: boolean;
  progress: number;
  onMonteCarlo: () => void;
  onSingle: () => void;
  // Opções configuráveis por modelo (BT vai até 50k, Poisson até 25k).
  simOptions: readonly number[];
}

export function SimulationControls({
  numSims,
  onNumSimsChange,
  isRunning,
  progress,
  onMonteCarlo,
  onSingle,
  simOptions,
}: Props) {
  return (
    <div className="card-fest p-5 flex flex-col gap-4">
      {/* Seletor de quantidade */}
      <div>
        <p className="text-sm font-bold text-copa-dark mb-2 flex items-center gap-1.5">
          🎲 Número de simulações
        </p>
        <div className="flex gap-2 flex-wrap">
          {simOptions.map(n => (
            <button
              key={n}
              onClick={() => onNumSimsChange(n)}
              disabled={isRunning}
              className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                numSims === n
                  ? 'bg-gradient-to-r from-copa-blue to-copa-purple text-white border-transparent shadow-md scale-[1.04]'
                  : 'bg-white/80 text-copa-dark border-copa-dark/15 hover:border-copa-blue hover:scale-[1.03]'
              } disabled:opacity-50`}
            >
              {n.toLocaleString('pt-BR')}
            </button>
          ))}
        </div>
      </div>

      {/* Botões principais */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onMonteCarlo}
          disabled={isRunning}
          className="btn-fest-red flex-1 flex items-center justify-center gap-2 text-lg py-4 min-h-[56px]"
        >
          {isRunning ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Play className="w-6 h-6" fill="white" />
          )}
          {isRunning
            ? `Simulando… ${Math.round(progress * 100)}%`
            : `Simular ${numSims.toLocaleString('pt-BR')} Copas ⚽`}
        </button>

        <button
          onClick={onSingle}
          disabled={isRunning}
          className="btn-fest-green flex items-center justify-center gap-2 text-base px-5 py-4 min-h-[56px]"
        >
          <Eye className="w-5 h-5" />
          Ver 1 Copa 🏆
        </button>
      </div>

      {/* Barra de progresso */}
      {isRunning && (
        <div className="progress-track h-3">
          <div
            className="progress-fill h-3 transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
