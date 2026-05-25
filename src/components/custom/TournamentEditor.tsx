/**
 * Editor inline de um CustomTournament. Quatro seções:
 *   1. Metadata (nome, modelo)
 *   2. Times (tabela com bandeira/nome/força/λ_atk/λ_def)
 *   3. Grupos (montagem com select de times)
 *   4. Mata-mata (advancePerGroup, terceiros, preview do bracket)
 *
 * O estado vive no componente pai (CustomTournamentTab); recebe o torneio
 * via prop e propaga mudanças via onChange. Validação é re-executada a cada
 * mudança e exibida abaixo.
 */

import { useMemo } from 'react';
import {
  PlayCircle,
  Plus,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { MODEL_META, type ModelId } from '../../lib/models/types';
import {
  deriveForceFromLambdas,
  deriveLambdasFromForces,
} from '../../lib/custom/derivations';
import { validateTournament } from '../../lib/custom/validate';
import { newId, type CustomTournament } from '../../lib/custom/types';
import { TournamentValidation } from './TournamentValidation';

interface Props {
  tournament: CustomTournament;
  onChange: (t: CustomTournament) => void;
  onSimulate: () => void;
  onCancel: () => void;
}

export function TournamentEditor({ tournament, onChange, onSimulate, onCancel }: Props) {
  const t = tournament;
  const validation = useMemo(() => validateTournament(t), [t]);
  const canSimulate = validation.errors.length === 0;

  const update = (patch: Partial<CustomTournament>) => onChange({ ...t, ...patch });

  // -------- Times
  const addTeam = () => {
    update({
      teams: [
        ...t.teams,
        {
          id: newId(),
          name: `Time ${t.teams.length + 1}`,
          flag: '🏳️',
          force: 50,
          lambdaAtk: 1.3,
          lambdaDef: 1.0,
        },
      ],
    });
  };
  const removeTeam = (id: string) => {
    update({
      teams: t.teams.filter(team => team.id !== id),
      groups: t.groups.map(g => ({
        ...g,
        teamIds: g.teamIds.filter(tid => tid !== id),
      })),
    });
  };
  const updateTeam = (id: string, patch: Partial<CustomTournament['teams'][number]>) => {
    update({
      teams: t.teams.map(team => (team.id === id ? { ...team, ...patch } : team)),
    });
  };

  const handleDeriveLambdas = () => {
    update({ teams: deriveLambdasFromForces(t.teams) });
  };
  const handleDeriveForces = () => {
    update({ teams: deriveForceFromLambdas(t.teams) });
  };

  // -------- Grupos
  const addGroup = () => {
    const nextLetter = String.fromCharCode(65 + t.groups.length);
    update({
      groups: [...t.groups, { id: newId(), name: nextLetter, teamIds: [] }],
    });
  };
  const removeGroup = (id: string) => {
    update({ groups: t.groups.filter(g => g.id !== id) });
  };
  const updateGroup = (id: string, patch: Partial<CustomTournament['groups'][number]>) => {
    update({
      groups: t.groups.map(g => (g.id === id ? { ...g, ...patch } : g)),
    });
  };

  // Tenta distribuir os times nos grupos existentes (uniforme). Útil para
  // templates "em branco" e correção rápida.
  const handleAutoDistribute = () => {
    if (t.groups.length === 0) return;
    const newGroups = t.groups.map(g => ({ ...g, teamIds: [] as string[] }));
    t.teams.forEach((team, i) => {
      newGroups[i % newGroups.length].teamIds.push(team.id);
    });
    update({ groups: newGroups });
  };

  // -------- Mata-mata
  const setAdvance = (k: 1 | 2 | 3 | 4) => {
    update({
      knockout: { ...t.knockout, advancePerGroup: k },
    });
  };
  const setThirds = (kind: 'none' | 'bestN', howMany = 0) => {
    update({
      knockout: {
        ...t.knockout,
        thirdPolicy: kind === 'none' ? { kind: 'none' } : { kind: 'bestN', howMany },
      },
    });
  };

  const totalQualifiers =
    t.knockout.advancePerGroup * t.groups.length +
    (t.knockout.thirdPolicy.kind === 'bestN' ? t.knockout.thirdPolicy.howMany : 0);

  // Times sem grupo (para o painel "órfãos")
  const allocatedIds = new Set(t.groups.flatMap(g => g.teamIds));
  const orphans = t.teams.filter(team => !allocatedIds.has(team.id));

  const groupSize = t.groups[0]?.teamIds.length ?? 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-copa-dark font-semibold underline"
        >
          ← Voltar à lista
        </button>
        <div className="flex gap-2">
          <button
            onClick={onSimulate}
            disabled={!canSimulate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-copa-red hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            Salvar e Simular
          </button>
        </div>
      </div>

      {/* 1. Metadata */}
      <section className="bg-white rounded-2xl shadow-md p-5">
        <h2 className="text-lg font-bold text-copa-dark mb-3">1 · Informações do Torneio</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
            <input
              type="text"
              value={t.name}
              onChange={e => update({ name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-copa-dark outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Modelo</label>
            <div className="inline-flex p-1 bg-copa-bg rounded-xl border border-gray-200">
              {(['bt', 'poissonV1', 'poissonV2'] as ModelId[]).map(id => (
                <button
                  key={id}
                  onClick={() => update({ modelId: id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    t.modelId === id
                      ? 'bg-copa-dark text-white shadow'
                      : 'text-copa-dark hover:bg-white'
                  }`}
                >
                  {MODEL_META[id].short}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">{MODEL_META[t.modelId].tooltip}</p>
      </section>

      {/* 2. Times */}
      <section className="bg-white rounded-2xl shadow-md p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-lg font-bold text-copa-dark">
            2 · Times ({t.teams.length})
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDeriveLambdas}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-copa-bg text-copa-dark hover:bg-gray-100 font-semibold"
              title="Calcula λ_atk e λ_def a partir das forças (fórmula V2)"
            >
              <Wand2 className="w-3.5 h-3.5" /> Derivar λ
            </button>
            <button
              onClick={handleDeriveForces}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-copa-bg text-copa-dark hover:bg-gray-100 font-semibold"
              title="Aproxima forças a partir dos λ"
            >
              <Sparkles className="w-3.5 h-3.5" /> Derivar força
            </button>
            <button
              onClick={addTeam}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-copa-green text-white hover:bg-emerald-700 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Time
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100">
                <th className="text-left py-1.5 px-1">Bandeira</th>
                <th className="text-left py-1.5 px-1">Nome</th>
                <th className="text-right py-1.5 px-1">Força</th>
                <th className="text-right py-1.5 px-1">λ_atk</th>
                <th className="text-right py-1.5 px-1">λ_def</th>
                <th className="py-1.5 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {t.teams.map(team => (
                <tr key={team.id} className="border-b border-gray-50">
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={team.flag}
                      onChange={e => updateTeam(team.id, { flag: e.target.value })}
                      className="w-12 px-1 py-1 text-center rounded border border-gray-200"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={team.name}
                      onChange={e => updateTeam(team.id, { name: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-gray-200"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      step="0.1"
                      value={team.force}
                      onChange={e =>
                        updateTeam(team.id, {
                          force: Number(e.target.value),
                          derivedFromForce: false,
                          derivedFromLambdas: false,
                        })
                      }
                      className="w-20 px-1 py-1 text-right rounded border border-gray-200 font-mono"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      step="0.01"
                      value={team.lambdaAtk}
                      onChange={e =>
                        updateTeam(team.id, {
                          lambdaAtk: Number(e.target.value),
                          derivedFromForce: false,
                          derivedFromLambdas: false,
                        })
                      }
                      className={`w-20 px-1 py-1 text-right rounded border border-gray-200 font-mono ${
                        team.derivedFromForce ? 'bg-amber-50' : ''
                      }`}
                      title={team.derivedFromForce ? 'Derivado das forças' : ''}
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      step="0.01"
                      value={team.lambdaDef}
                      onChange={e =>
                        updateTeam(team.id, {
                          lambdaDef: Number(e.target.value),
                          derivedFromForce: false,
                          derivedFromLambdas: false,
                        })
                      }
                      className={`w-20 px-1 py-1 text-right rounded border border-gray-200 font-mono ${
                        team.derivedFromForce ? 'bg-amber-50' : ''
                      }`}
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <button
                      onClick={() => removeTeam(team.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Remover time"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Grupos */}
      <section className="bg-white rounded-2xl shadow-md p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-lg font-bold text-copa-dark">
            3 · Grupos ({t.groups.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleAutoDistribute}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-copa-bg text-copa-dark hover:bg-gray-100 font-semibold"
              title="Distribui os times nos grupos atuais (em ordem)"
            >
              <RotateCw className="w-3.5 h-3.5" /> Auto-distribuir
            </button>
            <button
              onClick={addGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-copa-green text-white hover:bg-emerald-700 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Grupo
            </button>
          </div>
        </div>

        {orphans.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-800">
            Sem grupo: {orphans.map(o => `${o.flag} ${o.name}`).join(' · ')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {t.groups.map(g => {
            const teamsInGroup = g.teamIds
              .map(id => t.teams.find(x => x.id === id))
              .filter((x): x is NonNullable<typeof x> => Boolean(x));
            return (
              <div key={g.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={g.name}
                    onChange={e => updateGroup(g.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 rounded border border-gray-200 font-bold text-sm"
                  />
                  <button
                    onClick={() => removeGroup(g.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Remover grupo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {teamsInGroup.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between text-xs bg-copa-bg rounded px-2 py-1"
                    >
                      <span className="truncate">
                        {team.flag} {team.name}
                      </span>
                      <button
                        onClick={() =>
                          updateGroup(g.id, {
                            teamIds: g.teamIds.filter(id => id !== team.id),
                          })
                        }
                        className="text-gray-400 hover:text-red-600 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return;
                    updateGroup(g.id, { teamIds: [...g.teamIds, e.target.value] });
                  }}
                  className="w-full mt-2 px-2 py-1.5 text-xs rounded border border-gray-200"
                >
                  <option value="">+ Adicionar time…</option>
                  {orphans.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.flag} {team.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Mata-mata */}
      <section className="bg-white rounded-2xl shadow-md p-5">
        <h2 className="text-lg font-bold text-copa-dark mb-3">4 · Mata-mata</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Classificam por grupo (top-K)
            </label>
            <div className="inline-flex p-1 bg-copa-bg rounded-xl border border-gray-200">
              {([1, 2, 3, 4] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setAdvance(k)}
                  disabled={k > groupSize && groupSize > 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    t.knockout.advancePerGroup === k
                      ? 'bg-copa-dark text-white shadow'
                      : 'text-copa-dark hover:bg-white'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  Top {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1">
              <input
                type="checkbox"
                checked={t.knockout.thirdPolicy.kind === 'bestN'}
                onChange={e =>
                  setThirds(
                    e.target.checked ? 'bestN' : 'none',
                    e.target.checked ? Math.min(8, t.groups.length) : 0
                  )
                }
              />
              Incluir melhores terceiros
            </label>
            {t.knockout.thirdPolicy.kind === 'bestN' && (
              <input
                type="number"
                min={0}
                max={t.groups.length}
                value={t.knockout.thirdPolicy.howMany}
                onChange={e => setThirds('bestN', Number(e.target.value))}
                className="w-24 px-2 py-1 rounded border border-gray-200 font-mono text-sm"
              />
            )}
          </div>

          <div className="bg-copa-bg rounded-xl p-3 text-xs text-gray-600">
            <p>
              Total de classificados:{' '}
              <span className="font-bold text-copa-dark font-mono">{totalQualifiers}</span>
              {totalQualifiers >= 2 && (totalQualifiers & (totalQualifiers - 1)) === 0 ? (
                <>
                  {' '}
                  → {Math.log2(totalQualifiers)} rodadas eliminatórias
                </>
              ) : (
                <span className="text-red-600"> (precisa ser potência de 2)</span>
              )}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Chaveamento: serpentine (1º grupo A × 2º grupo B, etc.)
            </p>
          </div>
        </div>
      </section>

      {/* Validação */}
      <TournamentValidation validation={validation} />

      <div className="flex justify-end gap-2">
        <button
          onClick={onSimulate}
          disabled={!canSimulate}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-white bg-copa-red hover:bg-red-700 disabled:opacity-50 shadow-md"
        >
          <Save className="w-4 h-4" />
          Salvar e Simular
        </button>
      </div>
    </main>
  );
}
