import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compareExperimentArms, levelSelectionHash, validateExperimentManifest } from './experiment-manifest-lib.mjs';

const workflowInputs = {
    corpus2_budget_ms: '86400000', corpus2_node_budget: '36000000', corpus2_workers: '2',
    enable_flags: '', disable_flags: '', main_loop_late_reserve_fraction: '', main_loop_late_reserve_config_count: '',
    prime_winner: 'false', persist_hints: 'false', corpus1_budget_ms: '86400000', corpus1_node_budget: '50000000',
    corpus1_workers: '2', deterministic: 'true',
};
const base = { schemaVersion: 2, experimentId: 'e', solverRef: 'abc', corpus: 'c.json', levelIds: ['a', 'b'],
    levelSelectionHash: levelSelectionHash(['a', 'b']), seeds: [1], canonicalWorkBudget: 10, wallDeadlineMs: 100,
    profile: 'default', instrumentation: 'off', workflow: 'solver-stress-refresh', workflowInputs };
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
assert.throws(() => validateExperimentManifest({ ...control, workflowInputs: { ...workflowInputs, deterministic: undefined } }), /workflowInputs/);
const missingDeterministic = { ...workflowInputs }; delete missingDeterministic.deterministic;
assert.throws(() => validateExperimentManifest({ ...control, workflowInputs: missingDeterministic }), /missing for solver-stress-refresh: deterministic/);

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
}, 'TARGET', { allowedWorkflowInputDifferences: ['enable_flags', 'main_loop_late_reserve_fraction'] }), /missing for solver-stress-refresh|declared treatment dimension missing/);

// The CLI also verifies that solverFlags and the stress workflow's enable/disable strings describe
// the same effective config. This closes the hole where enable_flags could be an allowed treatment
// difference while silently containing an extra flag not represented by the manifest's solver map.
const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-preflight-'));
const corpus = path.join(temp, 'corpus.json');
writeFileSync(corpus, JSON.stringify([{ id: 'L1' }]));
const workflowInputString = inputs => Object.entries(inputs).map(([key, value]) => `${key}=${value}`).join(',');
const runPreflight = ({ runId, flagValue, inputs }) => spawnSync(process.execPath, [
    'scripts/solver-experiment-preflight.mjs', '--experiment-id=cli-test', `--run-id=${runId}`, `--corpus=${corpus}`,
    '--arm=control', `--flags=PRUNE_MC_NEIGHBOR_BUDGET=${flagValue}`, '--workflow=solver-stress-refresh',
    `--workflow-inputs=${workflowInputString(inputs)}`, '--seeds=', '--work-budget=10', '--wall-deadline-ms=100',
    '--profile=default', '--instrumentation=off', `--output=${path.join(temp, `${runId}.json`)}`, '--allow-dirty',
], { encoding: 'utf8' });
assert.equal(runPreflight({ runId: 'off', flagValue: 'false', inputs: workflowInputs }).status, 0);
const inconsistent = runPreflight({ runId: 'bad-on', flagValue: 'true', inputs: workflowInputs });
assert.notEqual(inconsistent.status, 0);
assert.match(`${inconsistent.stdout}${inconsistent.stderr}`, /solverFlags disagree/);
assert.equal(runPreflight({ runId: 'on', flagValue: 'true', inputs: { ...workflowInputs, enable_flags: 'PRUNE_MC_NEIGHBOR_BUDGET' } }).status, 0);

console.log('experiment manifest unit tests passed');
