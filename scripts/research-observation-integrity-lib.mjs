import { canonicalizeResearchIdentities } from './research-population-identity-lib.mjs';

export function researchObservationIdentity(row) {
  return row?.id ?? row?.levelId ?? row?.cellId ?? row?.level ?? null;
}

export function classifyResearchObservationOutcome(row) {
  if (!row || typeof row !== 'object' || researchObservationIdentity(row) == null) return 'malformed';
  if (row.ok === true) return 'solved';
  const status = String(row.status ?? row.outcome ?? row.stopReason ?? '').toLowerCase();
  if (/malformed|invalid[-_ ]?output/.test(status)) return 'malformed';
  if (/harness|infrastructure|error|crash|exception/.test(status) || row.error) return 'harnessError';
  if (/deadline|timeout|timed[-_ ]?out|wall[-_ ]?limit/.test(status)) return 'deadlineTruncated';
  if (/work[-_ ]?(limit|budget|exhaust)/.test(status)) return 'workLimited';
  if (/node[-_ ]?(limit|budget|exhaust)/.test(status)) return 'nodeLimited';
  if (/exhaust|unsat|infeasible|valid[-_ ]?negative/.test(status)) return 'exhaustedNegative';
  return 'unknown';
}


export function groupResearchObservationsByUnit(rows, unitOf) {
  if (!Array.isArray(rows)) throw new Error('research observations must be an array');
  if (typeof unitOf !== 'function') throw new Error('unitOf must be a function');
  const groups = new Map();
  const missingRows = [];
  rows.forEach((row, index) => {
    const raw = unitOf(row, index);
    if (raw == null || String(raw).trim() === '') {
      missingRows.push(index);
      return;
    }
    const unitId = String(raw);
    const group = groups.get(unitId) ?? [];
    group.push(row);
    groups.set(unitId, group);
  });
  return {
    groups,
    unitIds: [...groups.keys()].sort(),
    missingRowIndexes: missingRows,
    repeatedUnitIds: [...groups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([unitId]) => unitId)
      .sort(),
  };
}

export function buildResearchPopulationIntegrity(expectedIds, rows) {
  const expected = canonicalizeResearchIdentities(expectedIds).identities;
  const actualRaw = (rows ?? []).map(researchObservationIdentity).filter(id => id != null).map(String);
  const actual = canonicalizeResearchIdentities(actualRaw, { rejectDuplicates: false });
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual.identities);
  const missingIds = expected.filter(id => !actualSet.has(id));
  const unexpectedIds = actual.identities.filter(id => !expectedSet.has(id));
  const malformedRows = (rows ?? []).filter(row => researchObservationIdentity(row) == null).length;
  const outcomes = {
    solved: 0,
    exhaustedNegative: 0,
    nodeLimited: 0,
    workLimited: 0,
    deadlineTruncated: 0,
    harnessError: 0,
    malformed: malformedRows,
    missing: missingIds.length,
    unknown: 0,
  };
  for (const row of rows ?? []) outcomes[classifyResearchObservationOutcome(row)] += 1;

  const coverageComplete = missingIds.length === 0 && unexpectedIds.length === 0
    && actual.duplicates.length === 0 && outcomes.malformed === 0;
  const decisionValidComplete = coverageComplete
    && outcomes.deadlineTruncated === 0
    && outcomes.harnessError === 0
    && outcomes.unknown === 0;

  return {
    expectedIds: expected,
    expectedCount: expected.length,
    observedCount: (rows ?? []).length,
    duplicateIds: actual.duplicates,
    unexpectedIds,
    missingIds,
    coverageComplete,
    decisionValidComplete,
    complete: coverageComplete,
    outcomes,
  };
}
