import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { deriveLaneAC0Cases } from './lane-a-c0-population-lib.mjs';

const population = JSON.parse(readFileSync('reports/stress/lane-a-frozen-prefix-population-2026-09-18.json', 'utf8'));
const geometry = JSON.parse(readFileSync('reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json', 'utf8'));
const projection = JSON.parse(readFileSync('reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json', 'utf8'));

const derived = deriveLaneAC0Cases(population, geometry);
assert.equal(derived.cases.length, 581, 'retained inputs must reproduce the frozen 581-case C0 population');
assert.equal(new Set(derived.cases.map(row => row.id)).size, 581, 'derived case ids must remain unique');
assert.equal(derived.corpus, 'data/stress/stress-levels-random.json');

const caseOrderText = `${derived.cases.map(row => String(row.id)).join('\n')}\n`;
const caseOrderHash = `sha256:${createHash('sha256').update(caseOrderText).digest('hex')}`;
assert.equal(caseOrderHash, projection.caseOrderHash,
    'retained-input derivation must reproduce the exact historical case ordering sealed by the label projection');

for (const row of derived.cases) {
    assert.ok(Array.isArray(row.prefix) && row.prefix.length > 0);
    assert.equal(typeof row.source?.cutSignature, 'string');
    assert.equal(typeof row.source?.interfaceTarget, 'string');
    assert.ok(Number.isFinite(Number(row.source?.interfaceTargetKey)));
}

console.log('Lane A C0 retained population derivation: 581 cases and historical order hash reproduced.');
