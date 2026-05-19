/**
 * Tela "Simular" — toggle de três modelos (BT, Poisson V1, Poisson V2) com
 * paridade total de funcionalidades: Monte Carlo agregado, "Ver 1 Copa"
 * (chaveamento detalhado) e, para os Poisson, "Simular 1 jogo".
 *
 * Cada modelo mantém seu próprio estado de parâmetros editáveis (forças BT,
 * lambdas V1, lambdas V2) — trocar de modelo preserva edições anteriores.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Settings, Swords } from 'lucide-react';
import { SimulationControls } from '../components/SimulationControls';
import { ResultsTable } from '../components/ResultsTable';
import { ChartsSection } from '../components/ChartsSection';
import { SingleBracket } from '../components/SingleBracket';
import { ForceEditor } from '../components/ForceEditor';
import { LambdaEditor } from '../components/poisson/LambdaEditor';
import { MatchMode } from '../components/poisson/MatchMode';
import { ValidationPanel } from '../components/ValidationPanel';
import { TEAMS } from '../data/teams';
import { setCustomForces } from '../lib/bradleyTerry';
import {
  getDefaultLambdas,
  setCustomLambdas,
  type LambdaArrays,
} from '../lib/poisson/sampling';
import {
  getDefaultLambdasV1,
  setCustomLambdasV1,
  type LambdaArraysV1,
} from '../lib/poisson/v1';
import { simulateOneCup } from '../lib/models/cup';
import {
  MODEL_META,
  type ModelId,
  type SingleCupResult,
  type SimWorkerResponse,
  type UnifiedStats,
  type WorkerCustomParams,
} from '../lib/models/types';

// Opções de N de simulações por modelo. BT é rápido (sem amostragem Poisson),
// por isso vai até 50k; V1 e V2 sobem até 25k por serem ~5× mais pesados.
const SIM_OPTIONS_BY_MODEL: Record<ModelId, readonly number[]> = {
  bt:        [1_000, 10_000, 50_000],
  poissonV1: [1_000, 10_000, 25_000],
  poissonV2: [1_000, 10_000, 25_000],
};

const DEFAULT_FORCES = TEAMS.map(t => t.force);

interface SimulateTabProps {
  // Notifica o App sobre mudança de modelo para coordenar com outras abas
  // (por ex. Minuto a Minuto).
  onModelChange?: (id: ModelId) => void;
}

export function SimulateTab({ onModelChange }: SimulateTabProps = {}) {
  const [modelId, setModelId] = useState<ModelId>('bt');

  // Parâmetros customizados por modelo (independentes — trocar de modelo
  // preserva edições no outro).
  const [forces, setForces] = useState<number[]>(DEFAULT_FORCES);
  const [lambdasV1, setLambdasV1] = useState<LambdaArraysV1>(() => getDefaultLambdasV1());
  const [lambdasV2, setLambdasV2] = useState<LambdaArrays>(() => getDefaultLambdas());

  const [numSims, setNumSims] = useState<number>(10_000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mcStats, setMcStats] = useState<UnifiedStats | null>(null);
  const [singleResult, setSingleResult] = useState<SingleCupResult | null>(null);
  const [showBracket, setShowBracket] = useState(false);
  const [showMatchMode, setShowMatchMode] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  const simOptions = SIM_OPTIONS_BY_MODEL[modelId];

  // Garante que o valor de numSims caia dentro do range do modelo escolhido.
  const safeNumSims = useMemo(() => {
    const max = simOptions[simOptions.length - 1];
    return Math.min(numSims, max);
  }, [numSims, simOptions]);

  // Detecta parâmetros customizados (para badge "Parâmetros Personalizados").
  const hasCustomParams = useMemo(() => {
    if (modelId === 'bt') {
      return forces.some((f, i) => Math.abs(f - DEFAULT_FORCES[i]) > 0.001);
    }
    const defaults =
      modelId === 'poissonV1' ? getDefaultLambdasV1() : getDefaultLambdas();
    const current = modelId === 'poissonV1' ? lambdasV1 : lambdasV2;
    for (let i = 0; i < defaults.atk.length; i++) {
      if (Math.abs(current.atk[i] - defaults.atk[i]) > 1e-6) return true;
      if (Math.abs(current.def[i] - defaults.def[i]) > 1e-6) return true;
    }
    return false;
  }, [modelId, forces, lambdasV1, lambdasV2]);

  // Mantém o singleton do modelo ativo sincronizado (importante para "Ver 1
  // Copa" e "Ver 1 Jogo", que rodam no thread principal).
  const syncSingleton = useCallback(() => {
    if (modelId === 'bt') {
      setCustomForces(forces);
    } else if (modelId === 'poissonV1') {
      setCustomLambdasV1(lambdasV1);
    } else {
      setCustomLambdas(lambdasV2);
    }
  }, [modelId, forces, lambdasV1, lambdasV2]);

  // Constrói o payload de parâmetros customizados para o worker.
  const buildWorkerParams = useCallback((): WorkerCustomParams => {
    if (modelId === 'bt')        return { modelId, forces };
    if (modelId === 'poissonV1') return { modelId, lambdas: lambdasV1 };
    return { modelId: 'poissonV2', lambdas: lambdasV2 };
  }, [modelId, forces, lambdasV1, lambdasV2]);

  const handleMonteCarlo = useCallback(() => {
    if (isRunning) return;
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../workers/simulator.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    setIsRunning(true);
    setProgress(0);
    setMcStats(null);
    setShowBracket(false);
    setShowMatchMode(false);

    worker.onmessage = (e: MessageEvent<SimWorkerResponse>) => {
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
      numCups: safeNumSims,
      params: buildWorkerParams(),
    });
  }, [isRunning, safeNumSims, buildWorkerParams]);

  const handleSingle = useCallback(() => {
    syncSingleton();
    const result = simulateOneCup(modelId);
    setSingleResult(result);
    setShowBracket(true);
    setShowMatchMode(false);
    setMcStats(null);
  }, [syncSingleton, modelId]);

  const handleMatchToggle = useCallback(() => {
    syncSingleton();
    setShowMatchMode(v => !v);
    setShowBracket(false);
    setMcStats(null);
  }, [syncSingleton]);

  const handleModelChange = (newId: ModelId) => {
    if (isRunning) return;
    setModelId(newId);
    onModelChange?.(newId);
    setMcStats(null);
    setShowBracket(false);
    setShowMatchMode(false);
    // Ajusta numSims se cair fora do range do novo modelo.
    const max = SIM_OPTIONS_BY_MODEL[newId][SIM_OPTIONS_BY_MODEL[newId].length - 1];
    if (numSims > max) setNumSims(10_000);
  };

  const meta = MODEL_META[modelId];
  const showScores = meta.hasScores;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <ModelToggle activeId={modelId} onChange={handleModelChange} disabled={isRunning} />

      {/* Cartão descritivo do modelo ativo */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-bold text-copa-dark mb-1">{meta.label}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">{meta.tooltip}</p>
      </div>

      {/* Controles principais */}
      <div className="flex flex-col gap-3">
        <SimulationControls
          numSims={safeNumSims}
          onNumSimsChange={setNumSims}
          isRunning={isRunning}
          progress={progress}
          onMonteCarlo={handleMonteCarlo}
          onSingle={handleSingle}
          simOptions={simOptions}
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowEditor(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
              hasCustomParams
                ? 'bg-copa-gold text-white'
                : 'bg-white text-copa-dark border border-gray-200 hover:border-copa-dark'
            }`}
          >
            <Settings className="w-4 h-4" />
            {modelId === 'bt'
              ? hasCustomParams
                ? 'Forças Personalizadas (ativas)'
                : 'Editar Forças dos Times'
              : hasCustomParams
                ? 'Lambdas Personalizados (ativos)'
                : 'Editar Lambdas dos Times'}
          </button>

          {meta.hasScores && (
            <button
              onClick={handleMatchToggle}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
                showMatchMode
                  ? 'bg-copa-dark text-white'
                  : 'bg-white text-copa-dark border border-gray-200 hover:border-copa-dark'
              }`}
            >
              <Swords className="w-4 h-4" />
              {showMatchMode ? 'Fechar simulação de jogo' : 'Simular 1 jogo'}
            </button>
          )}
        </div>
      </div>

      {showMatchMode && meta.hasScores && (
        <MatchMode modelId={modelId as 'poissonV1' | 'poissonV2'} />
      )}

      {mcStats && (
        <>
          <ChartsSection stats={mcStats} />
          <ResultsTable stats={mcStats} modelId={modelId} />
          {meta.hasScores && <ValidationPanel stats={mcStats} />}
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
          <SingleBracket result={singleResult} showScores={showScores} />
        </div>
      )}

      {!mcStats && !showBracket && !showMatchMode && (
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

      {showEditor && modelId === 'bt' && (
        <ForceEditor
          forces={forces}
          onForcesChange={f => { setForces(f); setCustomForces(f); }}
          onClose={() => setShowEditor(false)}
        />
      )}
      {showEditor && modelId === 'poissonV1' && (
        <LambdaEditor
          modelId="poissonV1"
          lambdas={lambdasV1}
          onLambdasChange={l => { setLambdasV1(l); setCustomLambdasV1(l); }}
          onClose={() => setShowEditor(false)}
        />
      )}
      {showEditor && modelId === 'poissonV2' && (
        <LambdaEditor
          modelId="poissonV2"
          lambdas={lambdasV2}
          onLambdasChange={l => { setLambdasV2(l); setCustomLambdas(l); }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </main>
  );
}

// Toggle dos três modelos. Mostra tooltip nativo (title) com a fórmula.
function ModelToggle({
  activeId,
  onChange,
  disabled,
}: {
  activeId: ModelId;
  onChange: (id: ModelId) => void;
  disabled: boolean;
}) {
  const ids: ModelId[] = ['bt', 'poissonV1', 'poissonV2'];
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap p-1 bg-white rounded-2xl shadow-sm border border-gray-200 gap-1 self-start"
    >
      {ids.map(id => {
        const m = MODEL_META[id];
        const active = id === activeId;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            title={m.tooltip}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              active
                ? 'bg-copa-dark text-white shadow'
                : 'text-copa-dark hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
