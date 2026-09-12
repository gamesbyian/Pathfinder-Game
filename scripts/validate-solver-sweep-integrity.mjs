#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { buildPopulationIntegrity, hashPopulation } from './solver-experiment-contract.mjs';

function parseArgs(argv) {
  return new Map(argv.filter(arg => arg.startsWith('--')).map(arg => {
    const eq = arg.indexOf('=');
    return eq === -1 ? [arg.slice(2), 'true'] : [arg.slice(2, eq), arg.slice(eq + 1)];
  }));
}

export function readExpectedIds(file) {
  const ids = fs.readFileSync(file, 'utf8').split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
  if (!ids.length) throw new Error('expected id list is empty');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`expected id list contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
  return ids;
}

export function idOfRow(row) {
  return row?.id ?? row?.level ?? row?.levelId ?? row?.cellId ?? null;
}

export function diffPopulation(expectedIds, levels) {
  const actualIds = levels.map(idOfRow);
  const malformed = actualIds.some(id => typeof id !== 'string' || !id);
  const seen = new Set();
  const duplicateActual = new Set();
  for (const id of actualIds) seen.has(id) ? duplicateActual.add(id) : seen.add(id);
  const expected = new Set(expectedIds);
  const actual = new Set(actualIds);
  const missing = expectedIds.filter(id => !actual.has(id));
  const unexpected = [...actual].filter(id => !expected.has(id)).sort();
  return { malformed, duplicates: [...duplicateActual], missing, unexpected, actualCount: actualIds.length };
}

export function validateSweepIntegrity({ expectedIds, levels, requiredStage = null, minParticipatingLevels = 0, minParticipationRate = 0, allowIncomplete = false }) {
  if (!Array.isArray(levels)) throw new Error('result must contain a levels array');
  const idOf = idOfRow;
  if (!allowIncomplete && levels.some(row => typeof idOf(row) !== 'string' || !idOf(row))) throw new Error('one or more result rows lack a level id');

  const { duplicates: duplicateActual, missing, unexpected, actualCount } = diffPopulation(expectedIds, levels);

  if (!allowIncomplete && (duplicateActual.length || missing.length || unexpected.length)) {
    const parts = [];
    if (duplicateActual.length) parts.push(`duplicate results: ${duplicateActual.join(', ')}`);
    if (missing.length) parts.push(`missing results: ${missing.join(', ')}`);
    if (unexpected.length) parts.push(`unexpected results: ${unexpected.join(', ')}`);
    throw new Error(`solver sweep population mismatch (${actualCount}/${expectedIds.length} rows): ${parts.join('; ')}`);
  }

  let participation = null;
  if (requiredStage) {
    const participating = [];
    let attempts = 0;
    let work = 0;
    let nodes = 0;
    for (const row of levels) {
      let levelParticipated = false;
      for (const attempt of row?.attempts ?? []) {
        if (attempt?.stageId !== requiredStage) continue;
        attempts += 1;
        const attemptWork = Number(attempt?.workSpent) || 0;
        const attemptNodes = Number(attempt?.nodesExpanded) || 0;
        work += attemptWork;
        nodes += attemptNodes;
        if (attemptWork > 0 || attemptNodes > 0) levelParticipated = true;
      }
      if (levelParticipated) participating.push(idOf(row));
    }
    const participationRate = levels.length > 0 ? participating.length / levels.length : 0;
    participation = { stageId: requiredStage, participatingLevels: participating.length, participationRate, attempts, workSpent: work, nodesExpanded: nodes };
    if (participating.length < minParticipatingLevels) {
      throw new Error(`target stage ${requiredStage} participated on ${participating.length} level(s), below required minimum ${minParticipatingLevels}`);
    }
    if (participationRate < minParticipationRate) {
      throw new Error(`target stage ${requiredStage} participated on ${participating.length}/${levels.length} level(s) `
        + `(${(100 * participationRate).toFixed(2)}%), below required minimum rate ${(100 * minParticipationRate).toFixed(2)}%`);
    }
  }

  const normalized = buildPopulationIntegrity(expectedIds, levels);
  const population = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: expectedIds });
  return {
    complete: normalized.coverageComplete,
    coverageComplete: normalized.coverageComplete,
    decisionValidComplete: normalized.decisionValidComplete,
    expectedLevels: expectedIds.length,
    observedLevels: actualCount,
    participation,
    expectedCount: normalized.expectedCount,
    observedCount: normalized.observedCount,
    duplicateIds: normalized.duplicateIds,
    unexpectedIds: normalized.unexpectedIds,
    missingIds: normalized.missingIds,
    outcomes: normalized.outcomes,
    populationIdentityHash: population.identityHash,
    expectedIds: population.identities,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const expectedFile = args.get('expected-ids');
  const resultFile = args.get('result');
  if (!expectedFile || !resultFile) throw new Error('--expected-ids=<file> and --result=<file> are required');
  const expectedIds = readExpectedIds(expectedFile);
  const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  const rowsField = args.get('rows-field') || 'levels';
  const minParticipatingLevels = Number(args.get('min-participating-levels') ?? 0);
  if (!Number.isInteger(minParticipatingLevels) || minParticipatingLevels < 0) throw new Error('--min-participating-levels must be a non-negative integer');
  const minParticipationRate = Number(args.get('min-participation-rate') ?? 0);
  if (!Number.isFinite(minParticipationRate) || minParticipationRate < 0 || minParticipationRate > 1) throw new Error('--min-participation-rate must be a number in [0, 1]');
  const summary = validateSweepIntegrity({
    expectedIds,
    levels: result[rowsField],
    requiredStage: args.get('required-stage') || null,
    minParticipatingLevels,
    minParticipationRate,
    allowIncomplete: args.has('allow-incomplete'),
  });
  const integrityOut = args.get('integrity-out');
  if (integrityOut) fs.writeFileSync(integrityOut, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Sweep population coverage: ${summary.observedLevels}/${summary.expectedLevels} exact ids present (${summary.coverageComplete ? 'complete' : 'incomplete'}); decision-valid observations=${summary.decisionValidComplete ? 'complete' : 'incomplete'}.`);
  if (summary.participation) {
    const p = summary.participation;
    console.log(`Target participation: ${p.stageId}: ${p.participatingLevels}/${summary.observedLevels} level(s) (${(100 * p.participationRate).toFixed(2)}%), ${p.attempts} attempt(s), work=${p.workSpent}, nodes=${p.nodesExpanded}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(`validate-solver-sweep-integrity: ${error.message}`); process.exit(2); }
}
