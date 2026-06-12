import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { TEAMS } from '../data/teams';
import { GROUPS } from '../data/groups';
import { Confetti } from './fx/Confetti';
import type {
  KnockoutMatchOutcome,
  GroupResult,
} from '../lib/models/types';
import type { TeamView } from '../lib/custom/types';

interface Props {
  // Estrutura genérica do bracket — qualquer torneio (Copa 2026 ou customizado)
  // converte para esses três campos no callsite.
  groupResults: GroupResult[];
  rounds: KnockoutMatchOutcome[][];   // rounds[last] = [final] (1 jogo)
  champion: number;                   // índice no universo de times (teamsByIndex ?? TEAMS)
  roundNames: string[];               // mesmo length que rounds
  // Mostra placares dos jogos quando o modelo suporta gols (V1/V2).
  showScores: boolean;
  // Override para custom: lista plana de times indexada por id usado em
  // teamA/teamB/winner. Default = TEAMS global (Copa 2026).
  teamsByIndex?: TeamView[];
  // Override para custom: nomes dos grupos (A, B, …). Default = chaves de GROUPS.
  groupNames?: string[];
  // Override para custom: mapa nome→lista de nomes de times (para fallback do
  // resumo "X e Y classificados" quando o grupo está colapsado).
  groupTeamLabels?: Record<string, string[]>;
}

function teamName(idx: number, teamsByIndex: TeamView[]): string {
  const t = teamsByIndex[idx];
  return t ? `${t.flag} ${t.name}` : `#${idx}`;
}

function MatchRow({
  match,
  showScores,
  teamsByIndex,
}: {
  match: KnockoutMatchOutcome;
  showScores: boolean;
  teamsByIndex: TeamView[];
}) {
  const isAWinner = match.winner === match.teamA;
  const isBWinner = match.winner === match.teamB;
  const hasScore = showScores && match.goalsA !== undefined && match.goalsB !== undefined;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div
        className={`flex items-center justify-between px-3 py-1.5 rounded-lg gap-2 ${
          isAWinner
            ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-900 font-bold border-l-4 border-copa-green'
            : 'bg-rose-50 text-rose-400 line-through'
        }`}
      >
        <span className="truncate">{teamName(match.teamA, teamsByIndex)}</span>
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
            ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-900 font-bold border-l-4 border-copa-green'
            : 'bg-rose-50 text-rose-400 line-through'
        }`}
      >
        <span className="truncate">{teamName(match.teamB, teamsByIndex)}</span>
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
  teamsByIndex,
}: {
  title: string;
  matches: KnockoutMatchOutcome[];
  showScores: boolean;
  teamsByIndex: TeamView[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card-fest">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 font-display tracking-wide text-copa-dark"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matches.map((m, i) => (
            <MatchRow key={i} match={m} showScores={showScores} teamsByIndex={teamsByIndex} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSection({
  groupName,
  result,
  showScores,
  teamsByIndex,
  fallbackTeamLabels,
}: {
  groupName: string;
  result: GroupResult;
  showScores: boolean;
  teamsByIndex: TeamView[];
  fallbackTeamLabels: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-md border-2 border-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 font-bold text-sm text-copa-dark"
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
                    {pos + 1}. {teamName(s.teamIndex, teamsByIndex)}
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
                    <span className="truncate">{teamsByIndex[m.teamA]?.name ?? `#${m.teamA}`}</span>
                    <span className="font-mono text-copa-dark font-semibold mx-2">
                      {m.goalsA} × {m.goalsB}
                    </span>
                    <span className="truncate text-right">
                      {teamsByIndex[m.teamB]?.name ?? `#${m.teamB}`}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      {!open && (
        <div className="px-3 pb-2 text-xs text-gray-500">
          {fallbackTeamLabels.slice(0, 2).join(' · ')} classificados
        </div>
      )}
    </div>
  );
}

export function SingleBracket({
  groupResults,
  rounds,
  champion,
  roundNames,
  showScores,
  teamsByIndex,
  groupNames,
  groupTeamLabels,
}: Props) {
  // Fallback para Copa 2026: TEAMS global + nomes de grupos do GROUPS.
  const resolvedTeams: TeamView[] = teamsByIndex ?? TEAMS;
  const resolvedGroupNames: string[] = groupNames ?? Object.keys(GROUPS);
  const resolvedTeamLabels = (gn: string) =>
    groupTeamLabels?.[gn] ?? GROUPS[gn] ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Campeão destaque */}
      <div className="relative overflow-hidden bg-gradient-to-r from-copa-gold via-amber-400 to-orange-400 bg-[length:250%_250%] animate-gradient-x rounded-3xl p-6 flex items-center gap-4 shadow-xl animate-pop-in">
        <Confetti count={20} distance="160px" />
        <span aria-hidden className="absolute -right-4 -bottom-6 text-7xl opacity-25 animate-wiggle select-none">
          🏆
        </span>
        <div className="relative w-14 h-14 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center shadow-md animate-bounce-soft flex-shrink-0">
          <Trophy className="w-9 h-9 text-white drop-shadow-md" strokeWidth={2.5} />
        </div>
        <div className="relative">
          <p className="text-white/90 font-bold text-sm uppercase tracking-widest">
            🎉 Campeão desta Copa 🎉
          </p>
          <p className="text-white font-display text-3xl tracking-wide drop-shadow-md">
            {teamName(champion, resolvedTeams)}
          </p>
        </div>
      </div>

      {/* Fase de grupos */}
      <div>
        <h3 className="font-display text-lg tracking-wide text-copa-dark mb-2">⚽ Fase de Grupos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {resolvedGroupNames.map((g, i) => (
            <GroupSection
              key={g}
              groupName={g}
              result={groupResults[i]}
              showScores={showScores}
              teamsByIndex={resolvedTeams}
              fallbackTeamLabels={resolvedTeamLabels(g)}
            />
          ))}
        </div>
      </div>

      {/* Mata-mata: rodadas dinâmicas */}
      {rounds.map((matches, idx) => (
        <RoundSection
          key={idx}
          title={roundNames[idx] ?? `Rodada ${idx + 1}`}
          matches={matches}
          showScores={showScores}
          teamsByIndex={resolvedTeams}
        />
      ))}
    </div>
  );
}

// Nomes "longos" usados pela Copa 2026 (compatibilidade com a UI antiga).
export const COPA_2026_ROUND_NAMES = [
  'Rodada de 32 (16-avos de Final)',
  'Oitavas de Final',
  'Quartas de Final',
  'Semifinais',
  'Final',
];
