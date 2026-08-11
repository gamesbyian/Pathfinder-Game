import { createHash } from 'node:crypto';

const REQUIRED = ['schemaVersion', 'experimentId', 'runId', 'solverRef', 'corpus', 'levelIds',
    'arm', 'solverFlags', 'seeds', 'canonicalWorkBudget', 'wallDeadlineMs', 'profile',
    'instrumentation', 'output'];

export const levelSelectionHash = levelIds => createHash('sha256').update(levelIds.join('\n')).digest('hex');
const stableObject = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));

export function validateExperimentManifest(manifest) {
    for (const field of REQUIRED) if (!(field in manifest)) throw new Error(`experiment manifest missing ${field}`);
    if (manifest.schemaVersion !== 1) throw new Error(`unsupported experiment manifest schema ${manifest.schemaVersion}`);
    if (!['control', 'treatment'].includes(manifest.arm)) throw new Error(`invalid experiment arm ${manifest.arm}`);
    if (!Array.isArray(manifest.levelIds) || manifest.levelIds.length === 0) throw new Error('levelIds must be non-empty');
    if (new Set(manifest.levelIds).size !== manifest.levelIds.length) throw new Error('levelIds contains duplicates');
    if (manifest.levelSelectionHash !== levelSelectionHash(manifest.levelIds)) throw new Error('level selection hash mismatch');
    if (!(manifest.canonicalWorkBudget > 0) || !(manifest.wallDeadlineMs > 0)) throw new Error('work/deadline must be positive');
    if (!Array.isArray(manifest.seeds) || manifest.seeds.some(x => !Number.isFinite(x))) throw new Error('seeds must be finite numbers');
    return manifest;
}

/** Reject every unexpected A/B mismatch. Only arm, run/output identity, and the named target flag
 * may differ; callers must explicitly name that flag instead of accepting arbitrary config drift. */
export function compareExperimentArms(control, treatment, targetFlag) {
    validateExperimentManifest(control); validateExperimentManifest(treatment);
    if (control.arm !== 'control' || treatment.arm !== 'treatment') throw new Error('expected control then treatment manifests');
    if (control.runId === treatment.runId) throw new Error('control and treatment runId must differ');
    if (control.output === treatment.output) throw new Error('control and treatment output must differ');
    const ignored = new Set(['arm', 'runId', 'output', 'solverFlags', 'createdAt']);
    const keys = new Set([...Object.keys(control), ...Object.keys(treatment)]);
    const mismatches = [...keys].filter(key => !ignored.has(key) && JSON.stringify(control[key]) !== JSON.stringify(treatment[key]));
    const controlFlags = { ...control.solverFlags }, treatmentFlags = { ...treatment.solverFlags };
    delete controlFlags[targetFlag]; delete treatmentFlags[targetFlag];
    if (stableObject(controlFlags) !== stableObject(treatmentFlags)) mismatches.push('solverFlags(non-target)');
    if (control.solverFlags[targetFlag] !== false || treatment.solverFlags[targetFlag] !== true) {
        mismatches.push(`solverFlags.${targetFlag}(expected false→true)`);
    }
    if (mismatches.length) throw new Error(`experiment arms mismatch: ${[...new Set(mismatches)].join(', ')}`);
    return { matched: true, targetFlag, levels: control.levelIds.length };
}
