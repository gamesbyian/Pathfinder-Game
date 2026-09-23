import { buildResearchPopulationIntegrity, classifyResearchObservationOutcome, researchObservationIdentity } from './research-observation-integrity-lib.mjs';
import { canonicalizeResearchIdentities, hashResearchPopulation, parseResearchIdentityLines } from './research-population-identity-lib.mjs';
import { researchQuestionContractIssues } from './research-question-contract-lib.mjs';
import { researchSemanticHash } from './research-semantic-identity-lib.mjs';
import { classifyReproducibilityMode } from '../modules/solver/reproducibility-mode.mjs';

export const EXPERIMENT_SCHEMA_VERSION = 3;
export const EXPERIMENT_RESULT_KIND = 'pathfinder-solver-experiment-result';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/iu;
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/iu;

export const stableHash = researchSemanticHash;

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

export const parseIdentityLines = parseResearchIdentityLines;
export const canonicalizeIdentities = canonicalizeResearchIdentities;
export const hashPopulation = hashResearchPopulation;

export function hashConfiguration(configuration) {
  return stableHash(configuration ?? {});
}

/**
 * Canonical execution-protocol identity for experiment evidence.
 *
 * Configuration identity is deliberately only one component. Two runs can carry the same
 * experiment.configurationHash while differing in execution mode, reproducibility contract,
 * historical-input policy, or resource/deadline semantics. Those are protocol differences even
 * when the experiment's own configured treatment is unchanged.
 *
 * Solver revision and source-run identity stay separate: this answers "were these observations
 * executed under the same semantic protocol?", not "did they come from the same code/run?".
 *
 * `backend` (direct/webWorker/raced/external -- modules/solver/reproducibility-mode.mjs) is an
 * optional caller-supplied dimension, not part of `contract.execution`'s own schema-validated shape:
 * no current contract-building producer records a backend concept yet (plan section 3.3/K's
 * "TypeScript to plain-Node bridge audit" follow-up), so it defaults to `null`, which
 * classifyReproducibilityMode() honestly reports as 'unknown' rather than assuming determinism.
 * schemaVersion bumped 1 -> 2 for this hash-input change; no real production evidence recorded a v1
 * protocolHash before this bump (hashExecutionProtocol was introduced this same implementation phase).
 */
export function hashExecutionProtocol(contract, { arm = null, backend = null } = {}) {
  const execution = contract?.execution ?? {};
  const limits = contract?.limits ?? {};
  return stableHash({
    schemaVersion: 2,
    configurationHash: contract?.experiment?.configurationHash ?? null,
    arm: arm ?? null,
    execution: {
      levelBlind: execution.levelBlind ?? null,
      historyAware: execution.historyAware ?? null,
      historicalInputs: execution.historicalInputs ?? [],
      reproducibilityExpected: execution.reproducibilityExpected ?? null,
      producerFamily: execution.producerFamily ?? null,
      schedulerMode: execution.schedulerMode ?? null,
      backend: backend ?? null,
      reproducibilityMode: classifyReproducibilityMode({ schedulerMode: execution.schedulerMode ?? null, backend }),
    },
    limits: {
      cumulativeNodeCeiling: limits.cumulativeNodeCeiling ?? null,
      initialWorkAllocation: limits.initialWorkAllocation ?? null,
      totalWorkCeiling: limits.totalWorkCeiling ?? null,
      wallSafetyDeadlineMs: limits.wallSafetyDeadlineMs ?? null,
      wallDeadlineBinding: limits.wallDeadlineBinding ?? null,
    },
  });
}

function resolvedSolverRefForContract(contract, arm) {
  if (arm != null) return contract?.experiment?.arms?.[arm]?.resolvedSha ?? null;
  return contract?.experiment?.resolvedSha ?? null;
}

/**
 * Canonical bounded source-run binding for solver research evidence.
 *
 * This is intentionally identity glue rather than a telemetry envelope. Specialist artifacts keep
 * their own rich process/failure data; this projection gives them one shared way to name the run,
 * immutable solver revision, protocol/request-era configuration identity, population and lineage.
 *
 * @param {object} contract decision-grade experiment contract
 * @param {object} options
 */
export function sourceRunBindingFromContract(contract, {
  runId,
  runAttempt = null,
  contractRef = null,
  arm = null,
  backend = null,
} = {}) {
  const issues = decisionContractIssues(contract);
  if (issues.length) {
    throw new Error(`experiment contract is not decision-grade: ${issues.join(', ')}`);
  }
  if (!isNonEmptyString(runId)) throw new Error('source-run binding requires runId');
  if (runAttempt != null && !isNonEmptyString(String(runAttempt))) {
    throw new Error('source-run binding runAttempt must be null or non-empty');
  }
  if (arm != null && !contract?.experiment?.arms?.[arm]) {
    throw new Error(`unknown experiment arm: ${arm}`);
  }

  const solverRef = resolvedSolverRefForContract(contract, arm);
  if (!isImmutableCommitSha(solverRef)) {
    throw new Error('source-run binding requires one immutable solver ref');
  }

  return {
    schemaVersion: 1,
    kind: 'pathfinder-solver-source-run-binding',
    runId: String(runId),
    runAttempt: runAttempt == null ? null : String(runAttempt),
    contractRef: contractRef ?? null,
    workflowFamily: contract.experiment.workflowFamily,
    producer: contract.experiment.producer,
    entrypoint: contract.experiment.entrypoint,
    solverRef,
    configurationHash: contract.experiment.configurationHash,
    protocolHash: hashExecutionProtocol(contract, { arm, backend }),
    populationIdentity: contract.population.identityHash,
    corpusIdentity: contract.population.corpusIdentity ?? null,
    arm: arm ?? null,
    sourceRuns: [...(contract.experiment.sourceRuns ?? [])],
  };
}

export const RECOVERY_RECONCILIATION_KINDS = Object.freeze([
  'recombine-only',
  'reanalyze-only',
  'retry-missing-acquisition',
]);

export function recoveryProvenanceIssues(experiment) {
  const issues = [];
  const sourceRuns = experiment?.sourceRuns;
  if (sourceRuns != null && (!Array.isArray(sourceRuns)
      || sourceRuns.some(value => typeof value !== 'string' || !value.trim())
      || new Set(sourceRuns).size !== sourceRuns.length)) {
    issues.push('experiment.sourceRuns');
  }

  const reconciliation = experiment?.reconciliationRun;
  if (reconciliation == null) return issues;
  if (!reconciliation || typeof reconciliation !== 'object' || Array.isArray(reconciliation)) {
    issues.push('experiment.reconciliationRun');
    return issues;
  }
  if (!RECOVERY_RECONCILIATION_KINDS.includes(reconciliation.kind)) {
    issues.push('experiment.reconciliationRun.kind');
  }
  if (typeof reconciliation.preservesExperimentIdentity !== 'boolean') {
    issues.push('experiment.reconciliationRun.preservesExperimentIdentity');
  }
  if (typeof reconciliation.acquisitionRecomputed !== 'boolean') {
    issues.push('experiment.reconciliationRun.acquisitionRecomputed');
  }
  if (!Array.isArray(reconciliation.sourceRuns) || reconciliation.sourceRuns.length === 0
      || reconciliation.sourceRuns.some(value => typeof value !== 'string' || !value.trim())
      || new Set(reconciliation.sourceRuns).size !== reconciliation.sourceRuns.length) {
    issues.push('experiment.reconciliationRun.sourceRuns');
  }
  if (Array.isArray(sourceRuns) && Array.isArray(reconciliation.sourceRuns)
      && reconciliation.sourceRuns.some(value => !sourceRuns.includes(value))) {
    issues.push('experiment.reconciliationRun.sourceRuns(not-in-experiment-sourceRuns)');
  }
  if (['recombine-only', 'reanalyze-only'].includes(reconciliation.kind)
      && reconciliation.acquisitionRecomputed !== false) {
    issues.push('experiment.reconciliationRun.acquisitionRecomputed');
  }
  if (reconciliation.kind === 'retry-missing-acquisition'
      && reconciliation.acquisitionRecomputed !== true) {
    issues.push('experiment.reconciliationRun.acquisitionRecomputed');
  }
  return [...new Set(issues)];
}

export function decisionContractIssues(contract) {
  const issues = [];
  const experiment = contract?.experiment;
  const population = contract?.population;
  const execution = contract?.execution;
  const limits = contract?.limits;
  const sideEffects = contract?.sideEffects;

  issues.push(...researchQuestionContractIssues(contract?.researchQuestion));
  issues.push(...recoveryProvenanceIssues(experiment));

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
  if (population?.researchBlock != null && isNonEmptyString(population?.independentUnit) &&
      population.independentUnit !== population?.researchBlock?.independentUnit) {
    issues.push('population.independentUnit(researchBlock-mismatch)');
  }

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

export function decisionBearingExperimentResultIssues(result) {
  const issues = [];
  if (result?.schemaVersion !== EXPERIMENT_SCHEMA_VERSION) issues.push('schemaVersion');
  if (result?.kind !== EXPERIMENT_RESULT_KIND) issues.push('kind');
  if (result?.status !== 'published') issues.push('status');

  const emittedContractIssues = result?.decisionContractIssues;
  if (!Array.isArray(emittedContractIssues)) issues.push('decisionContractIssues');
  else if (emittedContractIssues.length > 0) issues.push('decisionContractIssues(non-empty)');

  for (const issue of decisionContractIssues(result)) issues.push(`contract:${issue}`);

  const integrity = result?.populationIntegrity ?? result?.coverage?.populationIntegrity ?? null;
  if (!integrity || typeof integrity !== 'object') {
    issues.push('populationIntegrity');
  } else {
    if (integrity.decisionValidComplete !== true) issues.push('populationIntegrity.decisionValidComplete');
    if (integrity.inferredExpectedPopulation === true) issues.push('populationIntegrity.inferredExpectedPopulation');
  }

  if (!['completed-positive', 'completed-negative'].includes(result?.researchOutcome?.outcome)) {
    issues.push('researchOutcome.outcome');
  }

  const populationHash = result?.population?.identityHash ?? null;
  if (result?.populationIdentityHash != null && result.populationIdentityHash !== populationHash) {
    issues.push('populationIdentityHash(population-mismatch)');
  }
  if (integrity?.populationIdentityHash != null && integrity.populationIdentityHash !== populationHash) {
    issues.push('populationIntegrity.populationIdentityHash(population-mismatch)');
  }

  return [...new Set(issues)];
}

export function isDecisionBearingExperimentResult(result) {
  return decisionBearingExperimentResultIssues(result).length === 0;
}

export const rowIdentity = researchObservationIdentity;
export const classifyRow = classifyResearchObservationOutcome;
export const buildPopulationIntegrity = buildResearchPopulationIntegrity;

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