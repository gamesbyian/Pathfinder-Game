import assert from 'node:assert/strict';
import { buildIndex } from './solver-evidence-integrity-audit.mjs';

const index = buildIndex();
assert.equal(index.schemaVersion, 1);
assert.equal(new Set(index.records.map(row => row.evidenceId)).size, index.records.length);
for (const row of index.records) {
  for (const key of ['evidenceId', 'sourcePaths', 'sourceRunIds', 'producer', 'population', 'execution', 'limits', 'outcomes', 'reliability', 'reconstructability', 'rerunDisposition', 'reasons']) assert.ok(key in row, `${row.evidenceId}: ${key}`);
}
const c1 = index.records.find(row => row.evidenceId === 'canonical-stress-refresh-corpus-1');
assert.equal(c1.population.expectedCount, 102);
assert.equal(c1.population.observedCount, 102);
assert.equal(c1.decisionBearing, true);
const high = index.records.find(row => row.evidenceId.includes('highbudget-unsolved') && row.evidenceId.includes('corpus-2'));
assert.ok(high.population.expectedCount > 0, 'frozen July 24 cohort must be recovered from the committed ID list');
assert.ok(high.sourcePaths.some(source => source.includes('corpus2-unsolved-highbudget-2026-07-24.txt')));
assert.equal(high.outcomes.solved, 165);
assert.notEqual(high.population.identityBasis, 'observed-level-ids-only');
console.log('solver evidence integrity audit tests passed');
