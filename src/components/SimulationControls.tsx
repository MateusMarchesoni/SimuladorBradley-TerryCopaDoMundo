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
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
      {/* Seletor de quantidade */}
      <div>
        <p className="text-sm font-semibold text-copa-dark mb-2">
          Número de simulações
        </p>
        <div className="flex gap-2 flex-wrap">
          {simOptions.map(n => (
            <button
              key={n}
              onClick={() => onNumSimsChange(n)}
              disabled={isRunning}
              className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                numSims === n
                  ? 'bg-copa-dark text-white border-copa-dark'
                  : 'bg-white text-copa-dark border-gray-300 hover:border-copa-dark'
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
          className="flex-1 flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 text-white font-extrabold text-lg rounded-2xl py-4 shadow-md transition-colors disabled:opacity-60 min-h-[56px]"
        >
          {isRunning ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Play className="w-6 h-6" fill="white" />
          )}
          {isRunning
            ? `Simulando… ${Math.round(progress * 100)}%`
            : `Simular ${numSims.toLocaleString('pt-BR')} Copas`}
        </button>

        <button
          onClick={onSingle}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 bg-copa-green hover:bg-emerald-700 text-white font-bold text-base rounded-2xl px-5 py-4 shadow-md transition-colors disabled:opacity-60 min-h-[56px]"
        >
          <Eye className="w-5 h-5" />
          Ver 1 Copa
        </button>
      </div>

      {/* Barra de progresso */}
      {isRunning && (
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-copa-gold rounded-full transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
