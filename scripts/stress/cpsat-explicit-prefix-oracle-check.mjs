import assert from 'node:assert/strict';
import { classifyProbeProcess, extractExplicitPrefixCases, normalizeCoordinate, parseEmittedPath, unpackPackedCell } from './cpsat-explicit-prefix-oracle-lib.mjs';

const K = (x, y) => x | (y << 16);
assert.deepEqual(unpackPackedCell(K(3, 7)), [3, 7]);
assert.deepEqual(normalizeCoordinate({ x: 4, y: 9 }), [4, 9]);

const atlas = {
    levelsFile: 'corpus.json',
    levels: [{ levelId: 'R1', branches: [
        { depth: 2, prefix: [K(1, 1), K(2, 1), K(2, 2)], child: K(3, 2), label: 'oracle-abstain' },
        { depth: 2, prefix: [K(1, 1), K(2, 1), K(2, 2)], child: K(2, 3), label: 'known-valid-continuation' },
    ] }],
};
const atlasCases = extractExplicitPrefixCases(atlas, { format: 'atlas-abstain' });
assert.equal(atlasCases.length, 1);
assert.equal(atlasCases[0].levelId, 'R1');
assert.equal(atlasCases[0].corpus, 'corpus.json');
assert.deepEqual(atlasCases[0].prefix, [[1, 1], [2, 1], [2, 2], [3, 2]]);

const generic = extractExplicitPrefixCases({ corpus: 'c2.json', cases: [
    { id: 'a', levelId: 'R2', prefix: [[1, 1], [1, 2]] },
    { id: 'b', levelId: 'R3', prefix: [K(2, 2)], child: { x: 3, y: 2 } },
] });
assert.deepEqual(generic.map(x => x.prefix), [[[1, 1], [1, 2]], [[2, 2], [3, 2]]]);

assert.deepEqual(classifyProbeProcess({ stdout: 'R1: ... -> OPTIMAL in 1.0s\nPATH [[1,1],[2,1]]', exitCode: 0 }),
    { label: 'live', reason: 'optimal', status: 'OPTIMAL' });
assert.deepEqual(classifyProbeProcess({ stdout: 'R1: ... -> INFEASIBLE in 1.0s', exitCode: 0 }),
    { label: 'dead', reason: 'infeasible', status: 'INFEASIBLE' });
assert.deepEqual(classifyProbeProcess({ stdout: 'R1: ... -> UNKNOWN in 60.0s', exitCode: 0 }),
    { label: 'timeout/abstain', reason: 'oracle-unknown', status: 'UNKNOWN' });
assert.deepEqual(classifyProbeProcess({ stdout: 'R1: SKIPPED (filters/flipping filters not encoded yet)', exitCode: 3 }),
    { label: 'timeout/abstain', reason: 'unsupported-mechanics' });
assert.deepEqual(parseEmittedPath('x\nPATH [[1,2],[2,2]]\n'), [[1, 2], [2, 2]]);
assert.equal(parseEmittedPath('no path'), null);

console.log('cpsat explicit-prefix oracle helper tests passed');
