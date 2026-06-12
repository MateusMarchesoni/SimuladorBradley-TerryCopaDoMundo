/**
 * Tela de listagem dos torneios customizados criados na sessão atual.
 *
 * Os torneios vivem apenas em memória (sem localStorage). O usuário usa
 * Exportar para baixar JSON e Importar para recarregar.
 */

import { useRef, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  FileUp,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  TEMPLATES,
  type TemplateKey,
} from '../../lib/custom/templates';
import {
  deserializeTournament,
  serializeTournament,
} from '../../lib/custom/serializer';
import {
  newId,
  type CustomTournament,
} from '../../lib/custom/types';

interface Props {
  tournaments: CustomTournament[];
  onCreateFromTemplate: (t: CustomTournament) => void;
  onEdit: (id: string) => void;
  onSimulate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TournamentList({
  tournaments,
  onCreateFromTemplate,
  onEdit,
  onSimulate,
  onDuplicate,
  onDelete,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplate = (key: TemplateKey) => {
    onCreateFromTemplate(TEMPLATES[key].build());
    setShowTemplates(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const t = deserializeTournament(ev.target?.result as string);
        // Renova o id para evitar colisão com torneios já em memória.
        onCreateFromTemplate({ ...t, id: newId() });
      } catch (err) {
        setImportError((err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = (t: CustomTournament) => {
    const blob = new Blob([serializeTournament(t)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.name.replace(/[^a-z0-9_\-]+/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="card-fest p-4 border-l-8 border-l-copa-gold">
        <h2 className="font-display text-xl tracking-wide text-copa-dark mb-1">🛠️ Torneio Customizado</h2>
        <p className="text-xs text-copa-dark/60 leading-relaxed">
          Monte sua própria Copa (Copa 2002, 2010 ou outro formato qualquer) escolhendo times,
          parâmetros e grupos. Os torneios vivem apenas nesta sessão — use{' '}
          <strong>Exportar JSON</strong> para guardar e <strong>Importar</strong> para recarregar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            handleTemplate('blank32');
          }}
          className="btn-fest-red flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" />
          Novo Torneio
        </button>

        <div className="relative">
          <button
            onClick={() => setShowTemplates(s => !s)}
            className="btn-fest-gold flex items-center gap-2 px-4 py-2.5"
          >
            <Sparkles className="w-4 h-4" />
            Templates ▾
          </button>
          {showTemplates && (
            <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px]">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => handleTemplate(k)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-copa-bg first:rounded-t-xl last:rounded-b-xl"
                >
                  {TEMPLATES[k].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-fest-ghost flex items-center gap-2 px-4 py-2.5"
        >
          <FileUp className="w-4 h-4" />
          Importar JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
          <strong>Erro ao importar:</strong> {importError}
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="card-fest text-center py-12 text-copa-dark/50 animate-pop-in">
          <p className="text-6xl mb-3 animate-bounce-soft inline-block">🛠️</p>
          <p className="text-base font-bold">
            Crie seu primeiro torneio: clique em{' '}
            <strong className="text-copa-red">Novo Torneio</strong> ou{' '}
            <strong className="text-copa-gold">Templates</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tournaments.map(t => (
            <article
              key={t.id}
              className="card-fest p-4 flex flex-col gap-2 border-t-4 border-t-copa-gold transition-transform hover:scale-[1.01]"
            >
              <h3 className="font-display text-lg tracking-wide text-copa-dark truncate">🏆 {t.name}</h3>
              <p className="text-xs text-copa-dark/60 font-mono">
                {t.modelId} · {t.teams.length} times · {t.groups.length} grupos
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <button
                  onClick={() => onSimulate(t.id)}
                  className="btn-fest-red flex items-center gap-1 px-3 py-1.5 text-xs !rounded-lg"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Simular
                </button>
                <button
                  onClick={() => onEdit(t.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-copa-bg text-copa-dark text-xs font-bold hover:bg-gray-100"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => onDuplicate(t.id)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-copa-bg text-copa-dark text-xs hover:bg-gray-100"
                  title="Duplicar"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExport(t)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-copa-bg text-copa-dark text-xs hover:bg-gray-100"
                  title="Exportar JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs hover:bg-red-100"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
