import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

const temp = mkdtempSync(path.join(os.tmpdir(), 'gap-fill-identities-'));
const commaId = 'R00046:131081,196618::frontier-4758';
const frozenFile = path.join(temp, 'frozen.txt');
const outFile = path.join(temp, 'selected.txt');
writeFileSync(frozenFile, `${commaId}\nR00002\n`);
execFileSync(process.execPath, [
  'scripts/select-highbudget-gap-fill-ids.mjs',
  `--frozen-ids-file=${frozenFile}`,
  `--override=${commaId}`,
  `--out=${outFile}`,
], { encoding: 'utf8' });
assert.equal(readFileSync(outFile, 'utf8').trim(), commaId,
  'comma-bearing frozen cohort identity must remain one id even though CLI override syntax permits commas');

console.log('select highbudget gap fill ids tests passed');
