import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

import { deriveLaneAC0Cases } from './lane-a-c0-population-lib.mjs';

const syntheticPopulation = {
    summary: { corpus: 'synthetic.json' },
    crossingRows: [
        { levelId: 'A', caseId: 'p1', interfaceTarget: 'goal', interfaceTargetKey: 9, prefix: [1, 2] },
        { levelId: 'A', caseId: 'p1', interfaceTarget: 'mustPass', interfaceTargetKey: 10, prefix: [1, 2] },
        { levelId: 'A', caseId: 'p2', interfaceTarget: 'goal', interfaceTargetKey: 9, prefix: [3, 4] },
        { levelId: 'B', caseId: 'solo', interfaceTarget: 'goal', interfaceTargetKey: 19, prefix: [5, 6] },
    ],
};
const syntheticGeometry = {
    levels: [
        { id: 'A', interfaces: [
            { target: 'goal', targetKey: 9, cutCells: [7, 3] },
            { target: 'mustPass', targetKey: 10, cutCells: [3, 7] },
        ] },
        { id: 'B', interfaces: [{ target: 'goal', targetKey: 19, cutCells: [12] }] },
    ],
};
const synthetic = deriveLaneAC0Cases(syntheticPopulation, syntheticGeometry);
assert.equal(synthetic.cases.length, 2, 'single-member cuts are excluded and duplicate target labels share one case');
assert.deepEqual(synthetic.cases.map(row => row.id), ['A:3,7::p1', 'A:3,7::p2']);
assert.equal(synthetic.cases[0].source.cutSignature, 'A:3,7');
assert.equal(synthetic.corpus, 'synthetic.json');

// Fast-gate intentionally sparse-checks out heavy reports/stress assets. When the retained data
// tree is materialized (full checkout/research environment), additionally seal the exact historical
// 581-case ordering against the compact label projection.
const populationPath = 'reports/stress/lane-a-frozen-prefix-population-2026-09-18.json';
const geometryPath = 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json';
const projectionPath = 'reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json';
if ([populationPath, geometryPath, projectionPath].every(existsSync)) {
    const population = JSON.parse(readFileSync(populationPath, 'utf8'));
    const geometry = JSON.parse(readFileSync(geometryPath, 'utf8'));
    const projection = JSON.parse(readFileSync(projectionPath, 'utf8'));
    const derived = deriveLaneAC0Cases(population, geometry);
    assert.equal(derived.cases.length, 581, 'retained inputs must reproduce the frozen 581-case C0 population');
    assert.equal(new Set(derived.cases.map(row => row.id)).size, 581, 'derived case ids must remain unique');
    const caseOrderText = `${derived.cases.map(row => String(row.id)).join('\n')}\n`;
    const caseOrderHash = `sha256:${createHash('sha256').update(caseOrderText).digest('hex')}`;
    assert.equal(caseOrderHash, projection.caseOrderHash,
        'retained-input derivation must reproduce the historical case ordering sealed by the label projection');
    console.log('Lane A C0 retained population derivation: 581 cases and historical order hash reproduced.');
} else {
    console.log('Lane A C0 retained population derivation: synthetic contract passed; historical seal skipped in sparse checkout.');
}
