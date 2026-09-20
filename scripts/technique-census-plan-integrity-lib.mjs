import { buildPopulationIntegrity } from './solver-experiment-contract.mjs';

const REQUIRED_JOIN_FIELDS = [
  'tier', 'corpus', 'levelPos', 'techniqueKeys', 'variantLabel', 'pairLabel',
  'flagExperiment', 'ablation', 'nodeBudget', 'workBudget',
  'perTechniqueWorkCap', 'perTechniqueWorkCapByKey',
];
const LEGACY_OPTIONAL_JOIN_FIELDS = ['levelId', 'budgetMs'];

function canonical(value) {
  return JSON.stringify(value ?? null);
}

export function validateTechniqueCensusPlanResults(plan, rows) {
  if (!Array.isArray(plan?.cells)) throw new Error('technique-census plan must contain cells[]');
  const planById = new Map();
  for (const cell of plan.cells) {
    if (!cell?.cellId) throw new Error('technique-census plan contains a cell without cellId');
    if (planById.has(cell.cellId)) throw new Error(`duplicate cellId in technique-census plan: ${cell.cellId}`);
    planById.set(cell.cellId, cell);
  }

  const seen = new Set();
  const unverified = [];
  for (const row of rows ?? []) {
    if (!row?.cellId) throw new Error('technique-census result is missing cellId');
    if (seen.has(row.cellId)) throw new Error(`duplicate technique-census result cellId: ${row.cellId}`);
    seen.add(row.cellId);
    const cell = planById.get(row.cellId);
    if (!cell) throw new Error(`unexpected technique-census result cellId not present in authored plan: ${row.cellId}`);

    for (const field of REQUIRED_JOIN_FIELDS) {
      if (canonical(row[field]) !== canonical(cell[field])) {
        throw new Error(
          `technique-census result ${row.cellId} disagrees with authored plan on ${field}: `
          + `observed=${canonical(row[field])} planned=${canonical(cell[field])}`,
        );
      }
    }
    for (const field of LEGACY_OPTIONAL_JOIN_FIELDS) {
      if (row[field] == null && cell[field] != null) {
        unverified.push({ cellId: row.cellId, field });
        continue;
      }
      if (canonical(row[field]) !== canonical(cell[field])) {
        throw new Error(
          `technique-census result ${row.cellId} disagrees with authored plan on ${field}: `
          + `observed=${canonical(row[field])} planned=${canonical(cell[field])}`,
        );
      }
    }
  }

  const integrity = buildPopulationIntegrity(
    plan.cells.map(cell => cell.cellId),
    (rows ?? []).map(row => ({ ...row, id: row.cellId })),
  );
  return {
    ...integrity,
    identityFullyVerified: unverified.length === 0,
    unverifiedJoinFields: unverified,
  };
}
