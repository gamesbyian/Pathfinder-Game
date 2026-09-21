import assert from 'node:assert/strict';

import { freezeResponseGuidedContrasts } from './freeze-response-guided-contrasts.mjs';

const base = {
    schemaVersion: 2,
    levels: [
        { levelId: 'A', solvingActions: ['left'], features: { portals: 1 } },
        { levelId: 'B', solvingActions: ['right'], features: { portals: 2 } },
        { levelId: 'C', solvingActions: ['left', 'right'], features: { portals: 3 } },
        { levelId: 'D', solvingActions: [], features: { portals: 4 } },
    ],
};

const frozen = freezeResponseGuidedContrasts(base, {
    sourcePath: 'fixture.json',
    sourceSha256: `sha256:${'a'.repeat(64)}`,
    pairs: [['left', 'right']],
});

assert.equal(frozen.kind, 'pathfinder-response-guided-contrast-population');
assert.equal(frozen.evidenceRole, 'development');
assert.equal(frozen.premiseUse, 'offline-premise-nomination-only');
assert.equal(frozen.source.path, 'fixture.json');
assert.equal(frozen.pairs.length, 1);
assert.deepEqual(frozen.pairs[0].counts, {
    leftOnly: 1,
    rightOnly: 1,
    both: 1,
    neither: 1,
});
assert.deepEqual(frozen.pairs[0].population, {
    identityBasis: 'levelId',
    leftOnlyIds: ['A'],
    rightOnlyIds: ['B'],
    bothIds: ['C'],
});
assert.match(frozen.interpretation.forbidden, /production solver feature/u);

console.log('freeze response-guided contrasts tests passed');
