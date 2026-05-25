import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ValidationResult } from '../../lib/custom/types';

interface Props {
  validation: ValidationResult;
}

// Exibe erros (vermelho, bloqueantes) e warnings (amarelo, informativos) do
// torneio. Quando não há nada, mostra badge verde "Pronto para simular".
export function TournamentValidation({ validation }: Props) {
  const { errors, warnings } = validation;

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2 text-sm text-emerald-800">
        <CheckCircle2 className="w-4 h-4" />
        <span className="font-semibold">Torneio válido — pronto para simular.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-red-800">
            <XCircle className="w-4 h-4" />
            {errors.length} erro{errors.length > 1 ? 's' : ''} a corrigir
          </div>
          <ul className="text-xs text-red-700 space-y-0.5 list-disc list-inside">
            {errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            {warnings.length} aviso{warnings.length > 1 ? 's' : ''}
          </div>
          <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
