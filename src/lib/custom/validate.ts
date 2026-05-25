/**
 * Validação pura de um CustomTournament. Devolve listas de erros (bloqueiam
 * simulação) e warnings (avisos não-bloqueantes).
 */

import {
  log2IntIfPow2,
  type CustomTournament,
  type ValidationResult,
} from './types';

export function validateTournament(t: CustomTournament): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // ---------------------------------------------------- Times
  if (t.teams.length < 2) {
    errors.push({ message: 'Adicione pelo menos 2 times.' });
  }

  const seenTeamIds = new Set<string>();
  const seenTeamNames = new Set<string>();
  for (let i = 0; i < t.teams.length; i++) {
    const team = t.teams[i];
    if (!team.id) errors.push({ message: `Time #${i + 1} sem id interno.`, field: `teams[${i}].id` });
    if (seenTeamIds.has(team.id)) {
      errors.push({ message: `Id duplicado em times.`, field: `teams[${i}].id` });
    }
    seenTeamIds.add(team.id);

    if (!team.name.trim()) {
      errors.push({ message: `Time #${i + 1} sem nome.`, field: `teams[${i}].name` });
    } else if (seenTeamNames.has(team.name.trim().toLowerCase())) {
      warnings.push({ message: `Nome de time repetido: "${team.name}".`, field: `teams[${i}].name` });
    }
    seenTeamNames.add(team.name.trim().toLowerCase());

    // Cheques por modelo.
    if (t.modelId === 'bt') {
      if (!(team.force > 0)) {
        errors.push({ message: `Força inválida para ${team.name || '(sem nome)'}.`, field: `teams[${i}].force` });
      }
    } else {
      // V1 ou V2 — precisam de lambdas válidos.
      if (!(team.lambdaAtk > 0)) {
        errors.push({ message: `λ_atk inválido para ${team.name || '(sem nome)'}.`, field: `teams[${i}].lambdaAtk` });
      }
      if (!(team.lambdaDef > 0)) {
        errors.push({ message: `λ_def inválido para ${team.name || '(sem nome)'}.`, field: `teams[${i}].lambdaDef` });
      }
    }
  }

  // ---------------------------------------------------- Grupos
  if (t.groups.length < 2) {
    errors.push({ message: 'Crie pelo menos 2 grupos.' });
  }

  const teamIdSet = new Set(t.teams.map(t => t.id));
  const teamToGroup = new Map<string, string>();
  const groupSizes = new Set<number>();

  for (let g = 0; g < t.groups.length; g++) {
    const grp = t.groups[g];
    if (!grp.name.trim()) {
      warnings.push({ message: `Grupo #${g + 1} sem nome.`, field: `groups[${g}].name` });
    }
    if (grp.teamIds.length < 2) {
      errors.push({ message: `Grupo "${grp.name}" tem menos de 2 times.`, field: `groups[${g}]` });
    }
    groupSizes.add(grp.teamIds.length);

    for (const id of grp.teamIds) {
      if (!teamIdSet.has(id)) {
        errors.push({ message: `Grupo "${grp.name}" referencia time inexistente.`, field: `groups[${g}]` });
      } else if (teamToGroup.has(id)) {
        const teamName = t.teams.find(x => x.id === id)?.name ?? '(?)';
        errors.push({
          message: `"${teamName}" está em dois grupos (${teamToGroup.get(id)} e ${grp.name}).`,
          field: `groups[${g}]`,
        });
      } else {
        teamToGroup.set(id, grp.name);
      }
    }
  }

  if (groupSizes.size > 1) {
    errors.push({
      message: `Todos os grupos precisam ter o mesmo tamanho. Encontrados tamanhos: ${[...groupSizes].sort().join(', ')}.`,
    });
  }

  // Times sem grupo (warning).
  const orphans = t.teams.filter(team => !teamToGroup.has(team.id));
  if (orphans.length > 0) {
    warnings.push({
      message: `${orphans.length} time(s) fora de qualquer grupo: ${orphans.map(o => o.name).join(', ')}.`,
    });
  }

  // ---------------------------------------------------- Mata-mata
  const K = t.knockout.advancePerGroup;
  if (![1, 2, 3, 4].includes(K)) {
    errors.push({ message: `advancePerGroup deve ser 1, 2, 3 ou 4.` });
  }
  const groupSize = t.groups[0]?.teamIds.length ?? 0;
  if (groupSize > 0 && K > groupSize) {
    errors.push({
      message: `Classificação top-${K} por grupo, mas grupos têm só ${groupSize} times.`,
    });
  }

  const extraThirds =
    t.knockout.thirdPolicy.kind === 'bestN' ? t.knockout.thirdPolicy.howMany : 0;
  if (extraThirds < 0) {
    errors.push({ message: 'Número de terceiros classificados não pode ser negativo.' });
  }
  if (extraThirds > t.groups.length) {
    errors.push({
      message: `Não pode haver mais "melhores terceiros" (${extraThirds}) que grupos (${t.groups.length}).`,
    });
  }

  const totalQualifiers = K * t.groups.length + extraThirds;
  if (totalQualifiers >= 2) {
    const n = log2IntIfPow2(totalQualifiers);
    if (!Number.isFinite(n)) {
      errors.push({
        message: `Total de classificados (${totalQualifiers}) precisa ser potência de 2 (2, 4, 8, 16, 32, 64…).`,
      });
    }
  } else {
    errors.push({ message: `Total de classificados (${totalQualifiers}) precisa ser ≥ 2.` });
  }

  return { errors, warnings };
}
