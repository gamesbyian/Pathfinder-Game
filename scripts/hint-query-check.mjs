#!/usr/bin/env node
import assert from 'node:assert/strict';
import { compactHintRecord, queryHintRecords, summarizeHintRecords } from './hint-query-lib.mjs';

const entry = ({ id = 'pathfinder-solver', technique = 'repair', usedExistingHints = false,
    hintGuided = false, isolatedTechnique = false, retryTier = null, workSpent = 100 } = {}) => ({
    solver: { id, technique, forcing: retryTier ? { retryTier } : null },
    search: { workSpent, nodesExpanded: workSpent * 2, elapsedMs: workSpent / 10, termination: 'solved', randomSeed: null },
    context: { usedExistingHints, hintGuided, isolatedTechnique },
});

const hints = [
    { path: [1, 2, 3], provenance: [entry({ technique: 'repair', retryTier: 'repair-late-probe', workSpent: 40 })] },
    { path: [4, 5], provenance: [entry({ technique: 'beam', usedExistingHints: true, workSpent: 80 })] },
    { path: [6, 7], provenance: [entry({ technique: 'dfs', isolatedTechnique: true, workSpent: 120 })] },
    { path: [8, 9], provenance: [] },
];

const strict = summarizeHintRecords(hints, { standard: 'strict' });
assert.equal(strict.hints, 4);
assert.equal(strict.coldHints, 1);
assert.equal(strict.hintGuidedHints, 1);
assert.equal(strict.isolatedTechniqueHints, 1);
assert.equal(strict.noProvenanceHints, 1);
assert.equal(strict.techniques.repair, 1);
assert.deepEqual(strict.cost.workSpent, { count: 3, min: 40, median: 80, max: 120 });

const narrow = summarizeHintRecords(hints, { standard: 'narrow' });
assert.equal(narrow.coldHints, 2);
assert.equal(narrow.hintGuidedHints, 0);

assert.deepEqual(queryHintRecords(hints, { className: 'cold-capability' }).map(x => x.compact.hintIndex), [1]);
assert.deepEqual(queryHintRecords(hints, { source: 'isolated-technique' }).map(x => x.compact.hintIndex), [3]);
assert.deepEqual(queryHintRecords(hints, { retryTier: 'repair-late-probe' }).map(x => x.compact.hintIndex), [1]);
assert.deepEqual(queryHintRecords(hints, { technique: 'rep' }).map(x => x.compact.hintIndex), [1]);
assert.equal(compactHintRecord(hints[0], 0).moves, 2);
assert.equal('path' in compactHintRecord(hints[0], 0), false);

console.log('hint query check passed');
