import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { TEAMS } from '../data/teams';
import { GROUPS } from '../data/groups';
import type {
  SingleCupResult,
  KnockoutMatchOutcome,
  GroupResult,
} from '../lib/models/types';

interface Props {
  result: SingleCupResult;
  // Quando true, mostra placar dos jogos (Poisson V1/V2). BT exibe só vencedor.
  showScores: boolean;
}

function teamName(idx: number): string {
  return `${TEAMS[idx].flag} ${TEAMS[idx].name}`;
}

// Linha de um jogo do mata-mata. Mostra placar quando disponível e marca
// pênaltis com sufixo "(pen)".
function MatchRow({
  match,
  showScores,
}: {
  match: KnockoutMatchOutcome;
  showScores: boolean;
}) {
  const isAWinner = match.winner === match.teamA;
  const isBWinner = match.winner === match.teamB;
  const hasScore = showScores && match.goalsA !== undefined && match.goalsB !== undefined;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div
        className={`flex items-center justify-between px-3 py-1.5 rounded-lg gap-2 ${
          isAWinner
            ? 'bg-emerald-100 text-emerald-900 font-semibold'
            : 'bg-red-50 text-red-400 line-through'
        }`}
      >
        <span className="truncate">{teamName(match.teamA)}</span>
        <span className="flex items-center gap-1.5">
          {hasScore && (
            <span className="font-mono text-xs px-1.5 py-0.5 bg-white/60 rounded">
              {match.goalsA}
            </span>
          )}
          {isAWinner && <span className="text-xs">✓</span>}
        </span>
      </div>
      <div
        className={`flex items-center justify-between px-3 py-1.5 rounded-lg gap-2 ${
          isBWinner
            ? 'bg-emerald-100 text-emerald-900 font-semibold'
            : 'bg-red-50 text-red-400 line-through'
        }`}
      >
        <span className="truncate">{teamName(match.teamB)}</span>
        <span className="flex items-center gap-1.5">
          {hasScore && (
            <span className="font-mono text-xs px-1.5 py-0.5 bg-white/60 rounded">
              {match.goalsB}
            </span>
          )}
          {isBWinner && <span className="text-xs">✓</span>}
        </span>
      </div>
      {match.decidedByPens && (
        <p className="text-[10px] text-amber-700 text-center font-semibold uppercase tracking-wide">
          Decidido nos pênaltis
        </p>
      )}
    </div>
  );
}

function RoundSection({
  title,
  matches,
  showScores,
}: {
  title: string;
  matches: KnockoutMatchOutcome[];
  showScores: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 font-bold text-copa-dark"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matches.map((m, i) => (
            <MatchRow key={i} match={m} showScores={showScores} />
          ))}
        </div>
      )}
    </div>
  );
}

// Card de um grupo: cabeçalho com os 2 classificados + tabela completa (pts/SG/GP).
function GroupSection({
  groupName,
  result,
  showScores,
}: {
  groupName: string;
  result: GroupResult;
  showScores: boolean;
}) {
  const [open, setOpen] = useState(false);
  const groupTeams = GROUPS[groupName];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 font-semibold text-sm text-copa-dark"
      >
        <span>Grupo {groupName}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-3 pb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1">Time</th>
                <th className="text-right py-1 px-1">Pts</th>
                {showScores && (
                  <>
                    <th className="text-right py-1 px-1">GP</th>
                    <th className="text-right py-1 px-1">GC</th>
                    <th className="text-right py-1 px-1">SG</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {result.standings.map((s, pos) => (
                <tr
                  key={s.teamIndex}
                  className={`border-b border-gray-50 ${
                    pos < 2 ? 'font-semibold text-emerald-700' : 'text-gray-400'
                  }`}
                >
                  <td className="py-1">
                    {pos + 1}. {TEAMS[s.teamIndex].flag} {TEAMS[s.teamIndex].name}
                  </td>
                  <td className="text-right py-1 px-1">{s.points}</td>
                  {showScores && (
                    <>
                      <td className="text-right py-1 px-1">{s.goalsFor}</td>
                      <td className="text-right py-1 px-1">{s.goalsAgainst}</td>
                      <td className="text-right py-1 px-1">
                        {s.goalsFor - s.goalsAgainst > 0 ? '+' : ''}
                        {s.goalsFor - s.goalsAgainst}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {showScores && result.matches.length > 0 && (
            <details className="mt-2 text-[11px]">
              <summary className="cursor-pointer text-gray-500 hover:text-copa-dark">
                Ver jogos do grupo
              </summary>
              <div className="mt-1 space-y-0.5">
                {result.matches.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-gray-600">
                    <span className="truncate">{TEAMS[m.teamA].name}</span>
                    <span className="font-mono text-copa-dark font-semibold mx-2">
                      {m.goalsA} × {m.goalsB}
                    </span>
                    <span className="truncate text-right">{TEAMS[m.teamB].name}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      {!open && (
        <div className="px-3 pb-2 text-xs text-gray-500">
          {groupTeams.slice(0, 2).join(' · ')} classificados
        </div>
      )}
    </div>
  );
}

export function SingleBracket({ result, showScores }: Props) {
  const groupNames = Object.keys(GROUPS);
  const champion = result.knockout.champion;

  return (
    <div className="flex flex-col gap-5">
      {/* Campeão destaque */}
      <div className="bg-gradient-to-r from-copa-gold to-yellow-400 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
        <Trophy className="w-10 h-10 text-white drop-shadow-md flex-shrink-0" strokeWidth={2.5} />
        <div>
          <p className="text-white/80 font-semibold text-sm uppercase tracking-wide">
            Campeão desta Copa
          </p>
          <p className="text-white font-extrabold text-2xl">
            {TEAMS[champion].flag} {TEAMS[champion].name}
          </p>
        </div>
      </div>

      {/* Fase de grupos */}
      <div>
        <h3 className="text-base font-bold text-copa-dark mb-2">Fase de Grupos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {groupNames.map((g, i) => (
            <GroupSection
              key={g}
              groupName={g}
              result={result.groupResults[i]}
              showScores={showScores}
            />
          ))}
        </div>
      </div>

      {/* Mata-mata */}
      <RoundSection
        title="Rodada de 32 (16-avos de Final)"
        matches={result.knockout.r32}
        showScores={showScores}
      />
      <RoundSection
        title="Oitavas de Final"
        matches={result.knockout.r16}
        showScores={showScores}
      />
      <RoundSection
        title="Quartas de Final"
        matches={result.knockout.qf}
        showScores={showScores}
      />
      <RoundSection
        title="Semifinais"
        matches={result.knockout.sf}
        showScores={showScores}
      />
      <RoundSection
        title="Final"
        matches={[result.knockout.final]}
        showScores={showScores}
      />
    </div>
  );
}
