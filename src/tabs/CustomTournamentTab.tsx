/**
 * Aba "Torneio Customizado" — coordena três sub-views (lista, editor,
 * simulador). Os torneios vivem em useState (sem localStorage), conforme
 * decisão do produto.
 */

import { useCallback, useMemo, useState } from 'react';
import { TournamentList } from '../components/custom/TournamentList';
import { TournamentEditor } from '../components/custom/TournamentEditor';
import { CustomSimulator } from '../components/custom/CustomSimulator';
import { newId, type CustomTournament } from '../lib/custom/types';

type View =
  | { kind: 'list' }
  | { kind: 'editor'; id: string }
  | { kind: 'simulator'; id: string };

export function CustomTournamentTab() {
  const [tournaments, setTournaments] = useState<CustomTournament[]>([]);
  const [view, setView] = useState<View>({ kind: 'list' });

  const currentTournament = useMemo(() => {
    if (view.kind === 'list') return null;
    return tournaments.find(t => t.id === view.id) ?? null;
  }, [view, tournaments]);

  const upsert = useCallback((t: CustomTournament) => {
    setTournaments(prev => {
      const idx = prev.findIndex(x => x.id === t.id);
      if (idx === -1) return [...prev, t];
      const next = prev.slice();
      next[idx] = t;
      return next;
    });
  }, []);

  const handleCreateFromTemplate = useCallback((t: CustomTournament) => {
    upsert(t);
    setView({ kind: 'editor', id: t.id });
  }, [upsert]);

  const handleEdit = useCallback((id: string) => setView({ kind: 'editor', id }), []);
  const handleSimulate = useCallback((id: string) => setView({ kind: 'simulator', id }), []);

  const handleDuplicate = useCallback((id: string) => {
    setTournaments(prev => {
      const t = prev.find(x => x.id === id);
      if (!t) return prev;
      const dup: CustomTournament = {
        ...t,
        id: newId(),
        name: `${t.name} (cópia)`,
        // Times e grupos mantêm ids — não precisam ser únicos entre torneios.
      };
      return [...prev, dup];
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTournaments(prev => prev.filter(t => t.id !== id));
  }, []);

  if (view.kind === 'editor' && currentTournament) {
    return (
      <TournamentEditor
        tournament={currentTournament}
        onChange={upsert}
        onSimulate={() => setView({ kind: 'simulator', id: currentTournament.id })}
        onCancel={() => setView({ kind: 'list' })}
      />
    );
  }

  if (view.kind === 'simulator' && currentTournament) {
    return (
      <CustomSimulator
        tournament={currentTournament}
        onBack={() => setView({ kind: 'editor', id: currentTournament.id })}
      />
    );
  }

  return (
    <TournamentList
      tournaments={tournaments}
      onCreateFromTemplate={handleCreateFromTemplate}
      onEdit={handleEdit}
      onSimulate={handleSimulate}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );
}
