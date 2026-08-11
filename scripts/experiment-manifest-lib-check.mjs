import assert from 'node:assert/strict';
import { compareExperimentArms, levelSelectionHash, validateExperimentManifest } from './experiment-manifest-lib.mjs';

const base = { schemaVersion: 2, experimentId: 'e', solverRef: 'abc', corpus: 'c.json', levelIds: ['a', 'b'],
    levelSelectionHash: levelSelectionHash(['a', 'b']), seeds: [1], canonicalWorkBudget: 10, wallDeadlineMs: 100,
    profile: 'default', instrumentation: 'off', workflowInputs: {
        deterministic: 'true', persist_hints: 'false', prime_winner: 'false', corpus2_workers: '2', enable_flags: '',
    } };
const control = { ...base, runId: 'c', arm: 'control', solverFlags: { TARGET: false, OTHER: true }, output: 'c.json' };
const treatment = { ...base, runId: 't', arm: 'treatment', solverFlags: { TARGET: true, OTHER: true }, output: 't.json' };
assert.equal(validateExperimentManifest(control), control);
assert.deepEqual(compareExperimentArms(control, treatment, 'TARGET'), {
    matched: true, targetFlag: 'TARGET', levels: 2, allowedWorkflowInputDifferences: [],
});
assert.throws(() => compareExperimentArms(control, { ...treatment, canonicalWorkBudget: 11 }, 'TARGET'), /canonicalWorkBudget/);
for (const [field, value] of [['corpus', 'other.json'], ['levelIds', ['b', 'a']], ['wallDeadlineMs', 101],
    ['profile', 'other'], ['seeds', [2]], ['instrumentation', 'on']]) {
    const changed = { ...treatment, [field]: value };
    if (field === 'levelIds') changed.levelSelectionHash = levelSelectionHash(value);
    assert.throws(() => compareExperimentArms(control, changed, 'TARGET'), new RegExp(field === 'levelIds' ? 'levelIds|levelSelectionHash' : field));
}
assert.throws(() => compareExperimentArms(control, { ...treatment, solverFlags: { TARGET: true, OTHER: false } }, 'TARGET'), /non-target/);
assert.throws(() => compareExperimentArms(control, { ...treatment, runId: control.runId }, 'TARGET'), /runId must differ/);
assert.throws(() => compareExperimentArms(control, { ...treatment, output: control.output }, 'TARGET'), /output must differ/);
assert.throws(() => compareExperimentArms({ ...control, solverFlags: { TARGET: true, OTHER: true } },
    { ...treatment, solverFlags: { TARGET: false, OTHER: true } }, 'TARGET'), /expected false→true/);
assert.throws(() => validateExperimentManifest({ ...control, levelIds: ['a'] }), /hash mismatch/);
assert.throws(() => validateExperimentManifest({ ...control, levelIds: ['a', 'a'], levelSelectionHash: levelSelectionHash(['a', 'a']) }), /duplicates/);
assert.throws(() => validateExperimentManifest({ ...control, workflowInputs: [] }), /workflowInputs/);

// Workflow-level dispatch settings are part of experiment identity, independent of solver flags.
assert.throws(() => compareExperimentArms(control, {
    ...treatment, workflowInputs: { ...treatment.workflowInputs, prime_winner: 'true' },
}, 'TARGET'), /workflowInputs\.prime_winner/);
assert.throws(() => compareExperimentArms(control, {
    ...treatment, workflowInputs: { ...treatment.workflowInputs, corpus2_workers: '1' },
}, 'TARGET'), /workflowInputs\.corpus2_workers/);

// Explicit treatment dimensions may differ, but must exist in both manifests.
const reserveControl = { ...control, workflowInputs: {
    ...control.workflowInputs, enable_flags: '', main_loop_late_reserve_fraction: '', main_loop_late_reserve_config_count: '4',
} };
const reserveTreatment = { ...treatment, workflowInputs: {
    ...treatment.workflowInputs, enable_flags: 'STRATEGY_MAIN_LOOP_LATE_RESERVE', main_loop_late_reserve_fraction: '0.10', main_loop_late_reserve_config_count: '4',
} };
assert.deepEqual(compareExperimentArms(reserveControl, reserveTreatment, 'TARGET', {
    allowedWorkflowInputDifferences: ['enable_flags', 'main_loop_late_reserve_fraction'],
}), {
    matched: true, targetFlag: 'TARGET', levels: 2,
    allowedWorkflowInputDifferences: ['enable_flags', 'main_loop_late_reserve_fraction'],
});
assert.throws(() => compareExperimentArms(reserveControl, {
    ...reserveTreatment, workflowInputs: { ...reserveTreatment.workflowInputs, main_loop_late_reserve_config_count: '5' },
}, 'TARGET', { allowedWorkflowInputDifferences: ['enable_flags', 'main_loop_late_reserve_fraction'] }), /workflowInputs\.main_loop_late_reserve_config_count/);
assert.throws(() => compareExperimentArms(reserveControl, {
    ...reserveTreatment, workflowInputs: Object.fromEntries(Object.entries(reserveTreatment.workflowInputs).filter(([key]) => key !== 'main_loop_late_reserve_fraction')),
}, 'TARGET', { allowedWorkflowInputDifferences: ['enable_flags', 'main_loop_late_reserve_fraction'] }), /declared treatment dimension missing/);

console.log('experiment manifest unit tests passed');
