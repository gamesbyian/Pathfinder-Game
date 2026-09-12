import assert from 'node:assert/strict';
import { selectGapFillIds } from './select-highbudget-gap-fill-ids.mjs';

const frozen = ['R00001', 'R00002', 'R00003'];

assert.deepEqual(selectGapFillIds(frozen, ''), frozen, 'blank override runs the full frozen cohort');
assert.deepEqual(selectGapFillIds(frozen, undefined), frozen);
assert.deepEqual(selectGapFillIds(frozen, 'R00002'), ['R00002']);
assert.deepEqual(selectGapFillIds(frozen, 'R00002,R00001\nR00002'), ['R00002', 'R00001'], 'dedupes but preserves override order');
assert.throws(
  () => selectGapFillIds(frozen, 'R00002,R09999'),
  /outside the frozen cohort: R09999/,
);

console.log('select highbudget gap fill ids tests passed');
