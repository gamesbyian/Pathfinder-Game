import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shared = JSON.parse(readFileSync('reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json', 'utf8'));
const class3 = JSON.parse(readFileSync('reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json', 'utf8'));
const controls = JSON.parse(readFileSync('reports/stress/failure-evidence/ws2-reconnaissance-solved-control-sample-2026-09-19.json', 'utf8'));

assert.equal(shared.kind, 'pathfinder-ws2-class3-shared-acquisition-population');
assert.deepEqual(shared.questions, ['WS2-FAILURE-RESPONSE-RECONNAISSANCE', 'WS2-CLASS3-DOSE-EXPOSURE']);
const expectedClass3 = class3.parents.map(row => row.parentId);
const expectedControls = controls.ids;
assert.equal(expectedClass3.length, 23);
assert.equal(expectedControls.length, 30);
assert.equal(new Set(expectedClass3).size, expectedClass3.length);
assert.equal(new Set(expectedControls).size, expectedControls.length);
assert.deepEqual(expectedClass3.filter(id => expectedControls.includes(id)), [], 'Class-3 residual and solved-control tranches must stay disjoint');

assert.equal(shared.tranches.length, 2);
assert.deepEqual(shared.tranches[0].ids, expectedClass3);
assert.deepEqual(shared.tranches[1].ids, expectedControls);
assert.deepEqual(shared.ids, [...expectedClass3, ...expectedControls]);
assert.equal(shared.ids.length, 53);
assert.equal(new Set(shared.ids).size, 53);
assert.equal(shared.sourceBoundary.totalParents, 53);
assert.equal(shared.executionContract.oneProtocolRequired, true);
assert.equal(shared.executionContract.oneSolverRefRequired, true);
assert.equal(shared.executionContract.exactPopulationRequired, true);
assert.equal(shared.executionContract.richDiagnostics, false);
assert.equal(shared.outcomeBlindness.solverSearchPerformed, false);
assert.equal(shared.outcomeBlindness.treatmentOutcomeInspected, false);

console.log('WS2/Class-3 shared acquisition population integrity passed');
