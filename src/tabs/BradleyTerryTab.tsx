import { useState, useRef, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { SimulationControls } from '../components/SimulationControls';
import { ResultsTable } from '../components/ResultsTable';
import { ChartsSection } from '../components/ChartsSection';
import { SingleBracket } from '../components/SingleBracket';
import { ForceEditor } from '../components/ForceEditor';
import { TEAMS } from '../data/teams';
import { setCustomForces } from '../lib/bradleyTerry';
import { simulateOneCup } from '../lib/monteCarlo';
import type { SimStats, SingleSimResult } from '../lib/monteCarlo';

type WorkerMsg =
  | { type: 'progress'; pct: number }
  | { type: 'done'; stats: SimStats };

export function BradleyTerryTab() {
  const [numSims, setNumSims] = useState(10_000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mcStats, setMcStats] = useState<SimStats | null>(null);
  const [singleResult, setSingleResult] = useState<SingleSimResult | null>(null);
  const [showBracket, setShowBracket] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [forces, setForces] = useState<number[]>(TEAMS.map(t => t.force));

  const workerRef = useRef<Worker | null>(null);

  const handleForcesChange = useCallback((newForces: number[]) => {
    setForces(newForces);
    setCustomForces(newForces);
  }, []);

  const handleMonteCarlo = useCallback(() => {
    if (isRunning) return;
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../workers/monteCarlo.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    setIsRunning(true);
    setProgress(0);
    setMcStats(null);
    setShowBracket(false);

    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      if (e.data.type === 'progress') {
        setProgress(e.data.pct);
      } else {
        setMcStats(e.data.stats);
        setProgress(1);
        setIsRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage({
      n: numSims,
      customForces: forces,
    });
  }, [isRunning, numSims, forces]);

  const handleSingle = useCallback(() => {
    const result = simulateOneCup();
    setSingleResult(result);
    setShowBracket(true);
    setMcStats(null);
  }, []);

  const hasCustomForces = forces.some((f, i) => Math.abs(f - TEAMS[i].force) > 0.001);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-bold text-copa-dark mb-1">Modelo Bradley-Terry</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Calcula a probabilidade direta de vitória entre dois times:
          <span className="font-mono bg-copa-bg px-1.5 ml-1 rounded">
            P(A×B) = F_A / (F_A + F_B)
          </span>
          . Empates não são modelados aqui — o vencedor de cada jogo é sorteado pela razão de forças.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SimulationControls
          numSims={numSims}
          onNumSimsChange={setNumSims}
          isRunning={isRunning}
          progress={progress}
          onMonteCarlo={handleMonteCarlo}
          onSingle={handleSingle}
        />

        <button
          onClick={() => setShowEditor(true)}
          className={`flex items-center gap-2 self-start px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
            hasCustomForces
              ? 'bg-copa-gold text-white'
              : 'bg-white text-copa-dark border border-gray-200 hover:border-copa-dark'
          }`}
        >
          <Settings className="w-4 h-4" />
          {hasCustomForces ? 'Forças Personalizadas (ativas)' : 'Editar Forças dos Times'}
        </button>
      </div>

      {mcStats && (
        <>
          <ChartsSection stats={mcStats} />
          <ResultsTable stats={mcStats} />
        </>
      )}

      {showBracket && singleResult && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-copa-dark">Uma Copa Simulada</h2>
            <button
              onClick={() => setShowBracket(false)}
              className="text-sm text-gray-500 hover:text-copa-dark underline"
            >
              Fechar
            </button>
          </div>
          <SingleBracket result={singleResult} />
        </div>
      )}

      {!mcStats && !showBracket && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-4">⚽</p>
          <p className="text-lg font-medium">
            Clique em <strong className="text-copa-red">"Simular Copas"</strong> para ver os resultados
          </p>
          <p className="text-sm mt-1">
            ou <strong className="text-copa-green">"Ver 1 Copa"</strong> para o chaveamento completo
          </p>
        </div>
      )}

      {showEditor && (
        <ForceEditor
          forces={forces}
          onForcesChange={handleForcesChange}
          onClose={() => setShowEditor(false)}
        />
      )}
    </main>
  );
}
