import { createHash } from 'node:crypto';

export const EXPERIMENT_SCHEMA_VERSION = 3;
export const EXPERIMENT_RESULT_KIND = 'pathfinder-solver-experiment-result';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/iu;
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/iu;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

export function stableHash(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')}`;
}

export function isImmutableCommitSha(value) {
  return typeof value === 'string' && COMMIT_SHA_RE.test(value.trim());
}

function hasOwn(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

export function canonicalizeIdentities(ids, { rejectDuplicates = true } = {}) {
  if (!Array.isArray(ids)) throw new Error('population identities must be an array');
  const normalized = ids.map(id => String(id).trim());
  if (normalized.some(id => !id)) throw new Error('population identities must be non-empty');
  const seen = new Set();
  const duplicateSet = new Set();
  for (const id of normalized) {
    if (seen.has(id)) duplicateSet.add(id);
    else seen.add(id);
  }
  const duplicates = [...duplicateSet].sort();
  if (rejectDuplicates && duplicates.length) throw new Error(`duplicate population identities: ${duplicates.join(', ')}`);
  return { identities: [...new Set(normalized)].sort(), duplicates };
}

export function hashPopulation({ kind, identityBasis, identities, corpusIdentity = null, selection = null }) {
  if (!kind || !identityBasis) throw new Error('population kind and identityBasis are required');
  const canonical = canonicalizeIdentities(identities);
  return {
    identities: canonical.identities,
    identityHash: stableHash({ kind, identityBasis, corpusIdentity, selection, identities: canonical.identities }),
  };
}

export function hashConfiguration(configuration) {
  return stableHash(configuration ?? {});
}

/**
 * Return the reasons a normalized v3 contract is not strong enough to support a scientific
 * decision. Presence of a result schema alone is deliberately insufficient: decision-bearing
 * evidence must establish immutable execution identity, intended population identity, scientific
 * execution semantics, limits, and side-effect posture.
 */
export function decisionContractIssues(contract) {
  const issues = [];
  const experiment = contract?.experiment;
  const population = contract?.population;
  const execution = contract?.execution;
  const limits = contract?.limits;
  const sideEffects = contract?.sideEffects;

  for (const field of ['workflowFamily', 'producer', 'entrypoint']) {
    if (!experiment?.[field]) issues.push(`experiment.${field}`);
  }
  if (!SHA256_RE.test(String(experiment?.configurationHash ?? ''))) issues.push('experiment.configurationHash');

  const arms = experiment?.arms;
  if (arms != null) {
    const entries = arms && typeof arms === 'object' && !Array.isArray(arms) ? Object.entries(arms) : [];
    if (entries.length < 2) issues.push('experiment.arms');
    for (const [name, arm] of entries) {
      if (!isImmutableCommitSha(arm?.resolvedSha)) issues.push(`experiment.arms.${name}.resolvedSha`);
    }
  } else if (!isImmutableCommitSha(experiment?.resolvedSha)) {
    issues.push('experiment.resolvedSha');
  }

  for (const field of ['kind', 'identityBasis']) {
    if (!population?.[field]) issues.push(`population.${field}`);
  }
  if (!SHA256_RE.test(String(population?.identityHash ?? ''))) issues.push('population.identityHash');

  for (const field of ['levelBlind', 'historyAware', 'reproducibilityExpected', 'schedulerMode']) {
    if (!hasOwn(execution, field) || execution[field] == null) issues.push(`execution.${field}`);
  }
  if (!Array.isArray(execution?.historicalInputs)) issues.push('execution.historicalInputs');

  for (const field of ['cumulativeNodeCeiling', 'initialWorkAllocation', 'totalWorkCeiling', 'wallSafetyDeadlineMs', 'wallDeadlineBinding']) {
    if (!hasOwn(limits, field)) issues.push(`limits.${field}`);
  }

  for (const field of ['hints', 'canonicalBaseline', 'telemetry', 'reports']) {
    if (!sideEffects?.[field] || sideEffects[field] === 'unknown') issues.push(`sideEffects.${field}`);
  }

  return issues;
}

export function rowIdentity(row) {
  return row?.id ?? row?.levelId ?? row?.cellId ?? row?.level ?? null;
}

export function classifyRow(row) {
  if (!row || typeof row !== 'object' || rowIdentity(row) == null) return 'malformed';
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

export function buildPopulationIntegrity(expectedIds, rows) {
  const expected = canonicalizeIdentities(expectedIds).identities;
  const actualRaw = (rows ?? []).map(rowIdentity).filter(id => id != null).map(String);
  const actual = canonicalizeIdentities(actualRaw, { rejectDuplicates: false });
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual.identities);
  const missingIds = expected.filter(id => !actualSet.has(id));
  const unexpectedIds = actual.identities.filter(id => !expectedSet.has(id));
  const malformedRows = (rows ?? []).filter(row => rowIdentity(row) == null).length;
  const outcomes = {
    solved: 0, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0,
    deadlineTruncated: 0, harnessError: 0, malformed: malformedRows, missing: missingIds.length, unknown: 0,
  };
  for (const row of rows ?? []) outcomes[classifyRow(row)] += 1;

  // Coverage completeness answers only whether every intended subject has exactly one
  // structurally usable row. It deliberately says nothing about whether every row is
  // scientifically interpretable. Deadline truncation, harness errors, and unknown
  // statuses are present observations but remain indeterminate evidence.
  const coverageComplete = missingIds.length === 0 && unexpectedIds.length === 0
    && actual.duplicates.length === 0 && outcomes.malformed === 0;
  const decisionValidComplete = coverageComplete
    && outcomes.deadlineTruncated === 0
    && outcomes.harnessError === 0
    && outcomes.unknown === 0;

  return {
    expectedCount: expected.length,
    observedCount: (rows ?? []).length,
    duplicateIds: actual.duplicates,
    unexpectedIds,
    missingIds,
    coverageComplete,
    decisionValidComplete,
    // Compatibility alias for callers whose gate is exact population coverage. New
    // decision-bearing logic must use decisionValidComplete explicitly.
    complete: coverageComplete,
    outcomes,
  };
}

export function assertCompatibleExperiments(left, right, { paired = false } = {}) {
  const mismatches = [];
  for (const field of ['workflowFamily', 'producer', 'entrypoint']) {
    if (left?.experiment?.[field] !== right?.experiment?.[field]) mismatches.push(`experiment.${field}`);
  }
  if (!paired && left?.experiment?.configurationHash !== right?.experiment?.configurationHash) {
    mismatches.push('experiment.configurationHash');
  }
  for (const field of ['kind', 'identityBasis', 'corpusIdentity']) {
    if ((left?.population?.[field] ?? null) !== (right?.population?.[field] ?? null)) mismatches.push(`population.${field}`);
  }
  for (const field of ['levelBlind', 'historyAware', 'reproducibilityExpected', 'producerFamily', 'schedulerMode']) {
    if ((left?.execution?.[field] ?? null) !== (right?.execution?.[field] ?? null)) mismatches.push(`execution.${field}`);
  }
  if (stableHash(left?.execution?.historicalInputs ?? null) !== stableHash(right?.execution?.historicalInputs ?? null)) {
    mismatches.push('execution.historicalInputs');
  }
  for (const field of ['cumulativeNodeCeiling', 'initialWorkAllocation', 'totalWorkCeiling', 'wallSafetyDeadlineMs', 'wallDeadlineBinding']) {
    if ((left?.limits?.[field] ?? null) !== (right?.limits?.[field] ?? null)) mismatches.push(`limits.${field}`);
  }
  if (paired && left?.population?.identityHash !== right?.population?.identityHash) mismatches.push('population.identityHash');
  if (mismatches.length) throw new Error(`incompatible experiment contracts: ${mismatches.join(', ')}`);
  return true;
}
