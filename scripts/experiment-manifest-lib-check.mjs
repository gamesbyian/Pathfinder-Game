import assert from 'node:assert/strict';
import { compareExperimentArms, levelSelectionHash, validateExperimentManifest } from './experiment-manifest-lib.mjs';

const base = { schemaVersion: 1, experimentId: 'e', solverRef: 'abc', corpus: 'c.json', levelIds: ['a', 'b'],
    levelSelectionHash: levelSelectionHash(['a', 'b']), seeds: [1], canonicalWorkBudget: 10, wallDeadlineMs: 100,
    profile: 'default', instrumentation: 'off' };
const control = { ...base, runId: 'c', arm: 'control', solverFlags: { TARGET: false, OTHER: true }, output: 'c.json' };
const treatment = { ...base, runId: 't', arm: 'treatment', solverFlags: { TARGET: true, OTHER: true }, output: 't.json' };
assert.equal(validateExperimentManifest(control), control);
assert.deepEqual(compareExperimentArms(control, treatment, 'TARGET'), { matched: true, targetFlag: 'TARGET', levels: 2 });
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
console.log('experiment manifest unit tests passed');
