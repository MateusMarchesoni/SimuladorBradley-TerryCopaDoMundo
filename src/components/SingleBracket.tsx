import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { TEAMS } from '../data/teams';
import { GROUPS } from '../data/groups';
import type { SingleSimResult } from '../lib/monteCarlo';
import type { KnockoutMatch } from '../lib/knockout';

interface Props {
  result: SingleSimResult;
}

function teamName(idx: number): string {
  return `${TEAMS[idx].flag} ${TEAMS[idx].name}`;
}

function MatchRow({ match, highlight }: { match: KnockoutMatch; highlight?: boolean }) {
  const isChamp = highlight && match.winner === match.teamA || match.winner === match.teamB;
  void isChamp;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div
        className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${
          match.winner === match.teamA
            ? 'bg-emerald-100 text-emerald-900 font-semibold'
            : 'bg-red-50 text-red-400 line-through'
        }`}
      >
        <span>{teamName(match.teamA)}</span>
        {match.winner === match.teamA && <span className="text-xs ml-2">✓</span>}
      </div>
      <div
        className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${
          match.winner === match.teamB
            ? 'bg-emerald-100 text-emerald-900 font-semibold'
            : 'bg-red-50 text-red-400 line-through'
        }`}
      >
        <span>{teamName(match.teamB)}</span>
        {match.winner === match.teamB && <span className="text-xs ml-2">✓</span>}
      </div>
    </div>
  );
}

function RoundSection({ title, matches, highlight }: { title: string; matches: KnockoutMatch[]; highlight?: boolean }) {
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
            <MatchRow key={i} match={m} highlight={highlight} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSection({ groupName, result }: { groupName: string; result: SingleSimResult['groupResults'][0] }) {
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
                <th className="text-right py-1">Pts</th>
              </tr>
            </thead>
            <tbody>
              {result.standings.map((s, pos) => (
                <tr
                  key={s.teamIndex}
                  className={`border-b border-gray-50 ${pos < 2 ? 'font-semibold text-emerald-700' : 'text-gray-400'}`}
                >
                  <td className="py-1">
                    {pos + 1}. {TEAMS[s.teamIndex].flag} {TEAMS[s.teamIndex].name}
                  </td>
                  <td className="text-right py-1">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

export function SingleBracket({ result }: Props) {
  const groupNames = Object.keys(GROUPS);
  const champion = result.knockout.champion;

  return (
    <div className="flex flex-col gap-5">
      {/* Campeão destaque */}
      <div className="bg-gradient-to-r from-copa-gold to-yellow-400 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
        <Trophy className="w-10 h-10 text-white drop-shadow-md flex-shrink-0" strokeWidth={2.5} />
        <div>
          <p className="text-white/80 font-semibold text-sm uppercase tracking-wide">Campeão desta Copa</p>
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
            <GroupSection key={g} groupName={g} result={result.groupResults[i]} />
          ))}
        </div>
      </div>

      {/* Mata-mata */}
      <RoundSection title="Rodada de 32 (16-avos de Final)" matches={result.knockout.r32} />
      <RoundSection title="Oitavas de Final" matches={result.knockout.r16} />
      <RoundSection title="Quartas de Final" matches={result.knockout.qf} />
      <RoundSection title="Semifinais" matches={result.knockout.sf} />
      <RoundSection title="Final" matches={[result.knockout.final]} highlight />
    </div>
  );
}
