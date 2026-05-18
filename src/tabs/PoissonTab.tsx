import { useEffect, useMemo, useState } from 'react';
import { Settings, Swords, Trophy } from 'lucide-react';
import { MatchMode } from '../components/poisson/MatchMode';
import { CupMode } from '../components/poisson/CupMode';
import { LambdaEditor } from '../components/poisson/LambdaEditor';
import {
  getDefaultLambdas,
  setCustomLambdas,
  type LambdaArrays,
} from '../lib/poisson/sampling';

type Mode = 'match' | 'cup';

export function PoissonTab() {
  const [mode, setMode] = useState<Mode>('match');
  const [lambdas, setLambdas] = useState<LambdaArrays>(() => getDefaultLambdas());
  const [showEditor, setShowEditor] = useState(false);

  // Sincroniza o singleton (lido pelo MatchMode no thread principal).
  useEffect(() => {
    setCustomLambdas(lambdas);
  }, [lambdas]);

  const hasCustom = useMemo(() => {
    const def = getDefaultLambdas();
    for (let i = 0; i < def.gf.length; i++) {
      if (Math.abs(lambdas.gf[i] - def.gf[i]) > 1e-6) return true;
      if (Math.abs(lambdas.ga[i] - def.ga[i]) > 1e-6) return true;
    }
    return false;
  }, [lambdas]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-bold text-copa-dark mb-1">Modelo de Poisson</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          Cada time tem λ médio de gols feitos e sofridos. Para um confronto, os gols são amostrados de
          distribuições de Poisson independentes:
          <span className="font-mono bg-copa-bg px-1.5 ml-1 rounded">
            λ_A = (A.gf + B.ga) / 2
          </span>
          .
        </p>

        <div
          role="tablist"
          className="inline-flex p-1 bg-copa-bg rounded-xl border border-gray-200"
        >
          <button
            role="tab"
            aria-selected={mode === 'match'}
            onClick={() => setMode('match')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'match'
                ? 'bg-copa-dark text-white shadow'
                : 'text-copa-dark hover:bg-white'
            }`}
          >
            <Swords className="w-4 h-4" />
            Partida única
          </button>
          <button
            role="tab"
            aria-selected={mode === 'cup'}
            onClick={() => setMode('cup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'cup'
                ? 'bg-copa-dark text-white shadow'
                : 'text-copa-dark hover:bg-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Copa inteira
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowEditor(true)}
        className={`flex items-center gap-2 self-start px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
          hasCustom
            ? 'bg-copa-gold text-white'
            : 'bg-white text-copa-dark border border-gray-200 hover:border-copa-dark'
        }`}
      >
        <Settings className="w-4 h-4" />
        {hasCustom ? 'Lambdas Personalizados (ativos)' : 'Editar Lambdas dos Times'}
      </button>

      <div className={mode === 'match' ? '' : 'hidden'}>
        <MatchMode />
      </div>
      <div className={mode === 'cup' ? '' : 'hidden'}>
        <CupMode customLambdas={hasCustom ? lambdas : undefined} />
      </div>

      {showEditor && (
        <LambdaEditor
          lambdas={lambdas}
          onLambdasChange={setLambdas}
          onClose={() => setShowEditor(false)}
        />
      )}
    </main>
  );
}
