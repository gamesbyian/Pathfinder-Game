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

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalNonNegativeNumber(value) {
  return value === null || (Number.isFinite(value) && value >= 0);
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
 * Return the reasons a v3 contract is not strong enough to support a scientific decision.
 * Presence of the result schema alone is deliberately insufficient: decision-bearing evidence must
 * establish immutable execution identity, intended population identity, scientific execution
 * semantics, limits, and side-effect posture. Explicit null is allowed for numeric limit fields
 * where "there is no such ceiling" is meaningful; omission/undefined is not.
 */
export function decisionContractIssues(contract) {
  const issues = [];
  const experiment = contract?.experiment;
  const population = contract?.population;
  const execution = contract?.execution;
  const limits = contract?.limits;
  const sideEffects = contract?.sideEffects;

  for (const field of ['workflowFamily', 'producer', 'entrypoint']) {
    if (!isNonEmptyString(experiment?.[field])) issues.push(`experiment.${field}`);
  }
  if (!SHA256_RE.test(String(experiment?.configurationHash ?? ''))) issues.push('experiment.configurationHash');

  const arms = experiment?.arms;
  if (arms != null) {
    const entries = arms && typeof arms === 'object' && !Array.isArray(arms) ? Object.entries(arms) : [];
    if (entries.length < 2) issues.push('experiment.arms');
    if (experiment?.resolvedSha != null) issues.push('experiment.resolvedSha');
    for (const [name, arm] of entries) {
      if (!isImmutableCommitSha(arm?.resolvedSha)) issues.push(`experiment.arms.${name}.resolvedSha`);
    }
    const distinctShas = new Set(entries.map(([, arm]) => arm?.resolvedSha).filter(Boolean));
    if (distinctShas.size > 1 && !SHA256_RE.test(String(population?.corpusIdentity ?? ''))) {
      issues.push('population.corpusIdentity');
    }
  } else if (!isImmutableCommitSha(experiment?.resolvedSha)) {
    issues.push('experiment.resolvedSha');
  }

  for (const field of ['kind', 'identityBasis']) {
    if (!isNonEmptyString(population?.[field])) issues.push(`population.${field}`);
  }
  if (!SHA256_RE.test(String(population?.identityHash ?? ''))) issues.push('population.identityHash');

  for (const field of ['levelBlind', 'historyAware', 'reproducibilityExpected']) {
    if (typeof execution?.[field] !== 'boolean') issues.push(`execution.${field}`);
  }
  for (const field of ['producerFamily', 'schedulerMode']) {
    if (!isNonEmptyString(execution?.[field])) issues.push(`execution.${field}`);
  }
  if (!Array.isArray(execution?.historicalInputs) || execution.historicalInputs.some(value => !isNonEmptyString(value))) {
    issues.push('execution.historicalInputs');
  }

  for (const field of ['cumulativeNodeCeiling', 'initialWorkAllocation', 'totalWorkCeiling', 'wallSafetyDeadlineMs']) {
    if (!hasOwn(limits, field) || limits[field] === undefined || !isOptionalNonNegativeNumber(limits[field])) {
      issues.push(`limits.${field}`);
    }
  }
  if (!hasOwn(limits, 'wallDeadlineBinding') || typeof limits?.wallDeadlineBinding !== 'boolean') {
    issues.push('limits.wallDeadlineBinding');
  }

  for (const field of ['hints', 'canonicalBaseline', 'telemetry', 'reports']) {
    if (!isNonEmptyString(sideEffects?.[field]) || sideEffects[field] === 'unknown') issues.push(`sideEffects.${field}`);
  }

  return issues;
}

/**
 * Validate the producer's raw declaration before the publisher fills derived population identity or
 * normalizes absent optional-looking values to null. This prevents a forgotten field from becoming
 * indistinguishable from an explicit "none" declaration during publication.
 */
export function declaredDecisionContractIssues(contract) {
  const placeholderIdentity = `sha256:${'0'.repeat(64)}`;
  return decisionContractIssues({
    ...contract,
    population: { ...(contract?.population ?? {}), identityHash: placeholderIdentity },
  }).filter(issue => issue !== 'population.identityHash');
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