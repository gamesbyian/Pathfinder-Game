import { createHash } from 'node:crypto';

const REQUIRED = ['schemaVersion', 'experimentId', 'runId', 'solverRef', 'corpus', 'levelIds',
    'arm', 'solverFlags', 'workflow', 'workflowInputs', 'seeds', 'canonicalWorkBudget', 'wallDeadlineMs', 'profile',
    'instrumentation', 'output'];

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
