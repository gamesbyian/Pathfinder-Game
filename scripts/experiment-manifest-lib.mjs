import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

/** Canonical git-state capture for a family evaluation run manifest's `solver` field — one shared
 *  implementation for every producer, so "which commit/ref produced this evidence" is never
 *  reconstructed ad hoc per tool. `commit` is required by validateFamilyEvaluationRunManifest (a
 *  producer that can't resolve HEAD has nothing trustworthy to record and should fail loudly, not
 *  write a manifest with a fabricated/null commit); `ref` and `dirty` are best-effort — `dirty:
 *  null` still satisfies the schema (see validateFamilyEvaluationRunManifest) for an environment
 *  where `git status` itself is unavailable, which `commit` alone never is if HEAD resolves.
 *  Deliberately does NOT refuse to proceed on a dirty worktree (unlike solver-experiment-
 *  preflight.mjs's stricter one-shot gate) — a batch/shard producer records what it ran against
 *  rather than blocking a long-running job over local dev noise; a CI checkout is always clean. */
export function captureSolverGitState() {
    const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
    const commit = git('rev-parse', 'HEAD');
    let ref = null, dirty = null;
    try { ref = git('rev-parse', '--abbrev-ref', 'HEAD'); } catch { /* detached/unavailable */ }
    try { dirty = git('status', '--porcelain').length > 0; } catch { /* git unavailable beyond rev-parse */ }
    return { commit, ref, dirty };
}

/** Assembles + validates one family evaluation run manifest from a producer's own tracked run
 *  state — the ONE canonical shape every current/future family/variant solver-evaluation producer
 *  (family-wide-trove-shard-run.mjs today) should build through, instead of each hand-assembling
 *  the FAMILY_RUN_REQUIRED object shape itself. `solver` defaults to captureSolverGitState() (a
 *  producer overrides it only for testing — see this module's own node-test). Throws (via
 *  validateFamilyEvaluationRunManifest) before returning anything a caller could write to disk, so
 *  an invalid producer input never reaches a manifest file. */
export function buildFamilyEvaluationRunManifest({
    runId, tool, workflow, corpora, families, trove, solverPolicy, budgets, seeds,
    shardCount, shardIndex, startedAt, completedAt, outputArtifacts, sourceGenerationArtifacts,
    solver = captureSolverGitState(),
}) {
    return validateFamilyEvaluationRunManifest({
        schemaVersion: 1, runId, solver,
        invocation: { tool, workflow },
        selection: { corpora, families },
        trove, solverPolicy, budgets, seeds,
        shard: { count: shardCount, index: shardIndex },
        startedAt, completedAt, outputArtifacts, sourceGenerationArtifacts,
    });
}

const REQUIRED = ['schemaVersion', 'experimentId', 'runId', 'solverRef', 'corpus', 'levelIds',
    'arm', 'solverFlags', 'workflow', 'workflowInputs', 'seeds', 'canonicalWorkBudget', 'wallDeadlineMs', 'profile',
    'instrumentation', 'output'];

export const EXPERIMENT_BUDGET_PROTOCOLS = Object.freeze([
    'production-additive',
    'strict-total-work',
    'technique-local-work',
]);

const WORKFLOW_REQUIRED_INPUTS = {
    'solver-stress-refresh': [
        'corpus2_budget_ms', 'corpus2_node_budget', 'corpus2_workers', 'enable_flags', 'disable_flags',
        'main_loop_late_reserve_fraction', 'main_loop_late_reserve_config_count', 'persist_hints',
        'corpus1_budget_ms', 'corpus1_node_budget', 'corpus1_workers', 'deterministic',
    ],
};

export const levelSelectionHash = levelIds => createHash('sha256').update(levelIds.join('\n')).digest('hex');
const stableObject = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));

export function validateExperimentManifest(manifest) {
    for (const field of REQUIRED) if (!(field in manifest)) throw new Error(`experiment manifest missing ${field}`);
    if (manifest.schemaVersion !== 2) throw new Error(`unsupported experiment manifest schema ${manifest.schemaVersion}`);
    if (!['control', 'treatment'].includes(manifest.arm)) throw new Error(`invalid experiment arm ${manifest.arm}`);
    if (!Array.isArray(manifest.levelIds) || manifest.levelIds.length === 0) throw new Error('levelIds must be non-empty');
    if (new Set(manifest.levelIds).size !== manifest.levelIds.length) throw new Error('levelIds contains duplicates');
    if (manifest.levelSelectionHash !== levelSelectionHash(manifest.levelIds)) throw new Error('level selection hash mismatch');
    if (!(manifest.canonicalWorkBudget > 0) || !(manifest.wallDeadlineMs > 0)) throw new Error('work/deadline must be positive');
    if ('budgetProtocol' in manifest && !EXPERIMENT_BUDGET_PROTOCOLS.includes(manifest.budgetProtocol)) {
        throw new Error(`invalid budgetProtocol ${manifest.budgetProtocol}; expected one of ${EXPERIMENT_BUDGET_PROTOCOLS.join(', ')}`);
    }
    if (!Array.isArray(manifest.seeds) || manifest.seeds.some(x => !Number.isFinite(x))) throw new Error('seeds must be finite numbers');
    if (!manifest.workflowInputs || typeof manifest.workflowInputs !== 'object' || Array.isArray(manifest.workflowInputs)) {
        throw new Error('workflowInputs must be an object');
    }
    const invalidWorkflowInputs = Object.entries(manifest.workflowInputs).filter(([, value]) => typeof value !== 'string');
    if (invalidWorkflowInputs.length) throw new Error(`workflowInputs values must be strings: ${invalidWorkflowInputs.map(([key]) => key).join(', ')}`);
    const requiredWorkflowInputs = WORKFLOW_REQUIRED_INPUTS[manifest.workflow] ?? [];
    const missingWorkflowInputs = requiredWorkflowInputs.filter(key => !(key in manifest.workflowInputs));
    if (missingWorkflowInputs.length) throw new Error(`workflowInputs missing for ${manifest.workflow}: ${missingWorkflowInputs.join(', ')}`);
    return manifest;
}

const FAMILY_RUN_REQUIRED = ['schemaVersion', 'runId', 'solver', 'invocation', 'selection',
    'trove', 'solverPolicy', 'budgets', 'seeds', 'shard', 'startedAt', 'completedAt',
    'outputArtifacts', 'sourceGenerationArtifacts'];

/** Canonical provenance for new family/variant solver evaluations. Historical census artifacts
 * intentionally do not pass this validator and remain readable through the family index. */
export function validateFamilyEvaluationRunManifest(manifest) {
    for (const field of FAMILY_RUN_REQUIRED) if (!(field in manifest)) {
        throw new Error(`family evaluation run manifest missing ${field}`);
    }
    if (manifest.schemaVersion !== 1) throw new Error(`unsupported family evaluation run manifest schema ${manifest.schemaVersion}`);
    if (typeof manifest.runId !== 'string' || !manifest.runId) throw new Error('runId must be a non-empty string');
    if (!manifest.solver || typeof manifest.solver.commit !== 'string' || !manifest.solver.commit ||
        !('ref' in manifest.solver) || !('dirty' in manifest.solver) ||
        (manifest.solver.dirty !== null && typeof manifest.solver.dirty !== 'boolean')) {
        throw new Error('solver must record commit, ref, and boolean-or-null dirty state');
    }
    for (const field of ['tool', 'workflow']) if (!(field in manifest.invocation)) throw new Error(`invocation missing ${field}`);
    for (const field of ['corpora', 'families']) if (!Array.isArray(manifest.selection?.[field])) throw new Error(`selection.${field} must be an array`);
    for (const field of ['mode', 'profile', 'config', 'flags', 'strictTotalWorkBudget']) {
        if (!(field in manifest.solverPolicy)) throw new Error(`solverPolicy missing ${field}`);
    }
    for (const field of ['workUnits', 'nodeCeiling', 'wallDeadlineMs']) {
        const value = manifest.budgets?.[field];
        if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`budgets.${field} must be a non-negative number or null`);
    }
    if (!Array.isArray(manifest.seeds) || manifest.seeds.some(seed => !Number.isFinite(seed))) throw new Error('seeds must be finite numbers');
    if (!Number.isInteger(manifest.shard?.count) || manifest.shard.count < 1 ||
        !Number.isInteger(manifest.shard?.index) || manifest.shard.index < 1 || manifest.shard.index > manifest.shard.count) {
        throw new Error('shard must use a one-based index within count');
    }
    for (const field of ['outputArtifacts', 'sourceGenerationArtifacts']) {
        if (!Array.isArray(manifest[field]) || manifest[field].some(value => typeof value !== 'string')) throw new Error(`${field} must be a string array`);
    }
    for (const field of ['startedAt', 'completedAt']) {
        if (typeof manifest[field] !== 'string' || Number.isNaN(Date.parse(manifest[field]))) throw new Error(`${field} must be an ISO timestamp`);
    }
    if (Date.parse(manifest.completedAt) < Date.parse(manifest.startedAt)) throw new Error('completedAt precedes startedAt');
    return manifest;
}

/** Reject every unexpected A/B mismatch. Only arm, run/output identity, the named solver flag,
 * and explicitly declared workflow-input treatment dimensions may differ. Workflow-level inputs
 * are deliberately independent from solverFlags because GitHub Actions has decision-relevant
 * dispatch settings (deterministic mode, persistence, reserve fraction/config count, workers, etc.)
 * that can invalidate an A/B without changing the solver ablation map. Exact-level historical
 * priming is not a dispatch dimension: the capability workflow forbids it structurally. */
export function compareExperimentArms(control, treatment, targetFlag, { allowedWorkflowInputDifferences = [] } = {}) {
    validateExperimentManifest(control); validateExperimentManifest(treatment);
    if (control.arm !== 'control' || treatment.arm !== 'treatment') throw new Error('expected control then treatment manifests');
    if (control.runId === treatment.runId) throw new Error('control and treatment runId must differ');
    if (control.output === treatment.output) throw new Error('control and treatment output must differ');
    const ignored = new Set(['arm', 'runId', 'output', 'solverFlags', 'workflowInputs', 'createdAt']);
    const keys = new Set([...Object.keys(control), ...Object.keys(treatment)]);
    const mismatches = [...keys].filter(key => !ignored.has(key) && JSON.stringify(control[key]) !== JSON.stringify(treatment[key]));

    const controlFlags = { ...control.solverFlags }, treatmentFlags = { ...treatment.solverFlags };
    delete controlFlags[targetFlag]; delete treatmentFlags[targetFlag];
    if (stableObject(controlFlags) !== stableObject(treatmentFlags)) mismatches.push('solverFlags(non-target)');
    if (control.solverFlags[targetFlag] !== false || treatment.solverFlags[targetFlag] !== true) {
        mismatches.push(`solverFlags.${targetFlag}(expected false→true)`);
    }

    const allowedWorkflow = new Set(allowedWorkflowInputDifferences);
    const workflowKeys = new Set([...Object.keys(control.workflowInputs), ...Object.keys(treatment.workflowInputs)]);
    for (const key of workflowKeys) {
        if (allowedWorkflow.has(key)) continue;
        if (JSON.stringify(control.workflowInputs[key]) !== JSON.stringify(treatment.workflowInputs[key])) {
            mismatches.push(`workflowInputs.${key}`);
        }
    }
    for (const key of allowedWorkflow) {
        if (!(key in control.workflowInputs) || !(key in treatment.workflowInputs)) {
            mismatches.push(`workflowInputs.${key}(declared treatment dimension missing)`);
        }
    }

    if (mismatches.length) throw new Error(`experiment arms mismatch: ${[...new Set(mismatches)].join(', ')}`);
    return { matched: true, targetFlag, levels: control.levelIds.length, allowedWorkflowInputDifferences: [...allowedWorkflow] };
}
