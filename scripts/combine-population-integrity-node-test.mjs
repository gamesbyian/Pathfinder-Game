import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { combinePopulationIntegrity, encodeScopedPopulationIdentity } from './combine-population-integrity.mjs';

const base = {
  complete: true,
  coverageComplete: true,
  decisionValidComplete: false,
  expectedCount: 2,
  observedCount: 2,
  expectedIds: ['a', 'b'],
  duplicateIds: [],
  unexpectedIds: [],
  missingIds: [],
  outcomes: { solved: 1, unknown: 1 },
};
const combined = combinePopulationIntegrity([
  { label: 'c1', integrity: base },
  { label: 'c2', integrity: { ...base, complete: false, coverageComplete: false, decisionValidComplete: false, observedCount: 1, missingIds: ['b'], outcomes: { solved: 1, missing: 1 } } },
], { kind: 'test-population' });
assert.equal('complete' in combined, false, 'current combined integrity must not re-emit the historical coverage mirror');
assert.equal(combined.coverageComplete, false);
assert.equal(combined.decisionValidComplete, false);
assert.equal(combined.expectedCount, 4);
assert.equal(combined.observedCount, 3);
assert.deepEqual(combined.missingIds, ['c2:b']);
assert.deepEqual(combined.canonicalMissingIds, ['["c2","b"]']);
assert.deepEqual(combined.canonicalDuplicateIds, []);
assert.deepEqual(combined.canonicalUnexpectedIds, []);
assert.deepEqual(combined.outcomes, { missing: 1, solved: 2, unknown: 1 });
assert.deepEqual(combined.expectedIds, ['c1:a', 'c1:b', 'c2:a', 'c2:b']);
assert.match(combined.populationIdentityHash, /^sha256:[0-9a-f]{64}$/);
assert.equal(combined.identityCodec, 'json-tuple-v1');
assert.deepEqual(combined.identityFields, {
  canonical: 'canonicalExpectedIds/canonicalDuplicateIds/canonicalUnexpectedIds/canonicalMissingIds',
  legacyDisplayOnly: 'expectedIds/duplicateIds/unexpectedIds/missingIds',
});
assert.deepEqual(combined.canonicalExpectedIds, [
  '["c1","a"]', '["c1","b"]', '["c2","a"]', '["c2","b"]',
]);

const delimiterLeft = encodeScopedPopulationIdentity('scope:a', 'b');
const delimiterRight = encodeScopedPopulationIdentity('scope', 'a:b');
assert.notEqual(delimiterLeft, delimiterRight, 'structured identities must not alias across delimiter placement');
assert.notEqual(
  encodeScopedPopulationIdentity('cut,group', 'case:1'),
  encodeScopedPopulationIdentity('cut', 'group,case:1'),
  'commas/colons inside components must remain unambiguous',
);
assert.equal(encodeScopedPopulationIdentity('切断群', 'ケース 1'), '["切断群","ケース 1"]');
const repeatedLocal = combinePopulationIntegrity([
  { label: 'parent-A', integrity: { ...base, expectedCount: 1, observedCount: 1, expectedIds: ['local-1'], outcomes: { solved: 1 } } },
  { label: 'parent-B', integrity: { ...base, expectedCount: 1, observedCount: 1, expectedIds: ['local-1'], outcomes: { solved: 1 } } },
]);
assert.deepEqual(repeatedLocal.canonicalExpectedIds, ['["parent-A","local-1"]', '["parent-B","local-1"]']);


const fullyValid = combinePopulationIntegrity([
  { label: 'c1', integrity: { ...base, decisionValidComplete: true, outcomes: { solved: 1, nodeLimited: 1 } } },
  { label: 'c2', integrity: { ...base, decisionValidComplete: true, outcomes: { solved: 2 } } },
]);
assert.equal(fullyValid.coverageComplete, true);
assert.equal(fullyValid.decisionValidComplete, true);

const legacyClean = {
  ...base,
  complete: true,
  coverageComplete: true,
  expectedCount: 2,
  observedCount: 2,
  outcomes: { solved: 2 },
};
delete legacyClean.decisionValidComplete;
const mixedModernLegacy = combinePopulationIntegrity([
  { label: 'modern', integrity: { ...legacyClean, decisionValidComplete: true } },
  { label: 'legacy', integrity: legacyClean },
]);
assert.equal(
  mixedModernLegacy.decisionValidComplete,
  false,
  'a clean legacy component must remain readable but cannot be upgraded into fresh decision authority by combination',
);
assert.equal(mixedModernLegacy.coverageComplete, true);

assert.throws(() => combinePopulationIntegrity([{ label: 'x', integrity: base }, { label: 'x', integrity: base }]), /unique/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'combine-population-integrity-cli-'));
try {
  const left = path.join(temp, 'left.json');
  const right = path.join(temp, 'right.json');
  const out = path.join(temp, 'combined.json');
  fs.writeFileSync(left, JSON.stringify(base));
  fs.writeFileSync(right, JSON.stringify({ ...base, outcomes: { solved: 2 } }));
  const cli = spawnSync(process.execPath, [
    'scripts/combine-population-integrity.mjs',
    `--input=left:${left}`,
    `--input=right:${right}`,
    '--kind=fixture-multi-population',
    '--identity-basis=fixture-label-and-id',
    `--out=${out}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  const written = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(written.expectedCount, 4);
  assert.equal(written.components.length, 2);
  assert.equal(written.coverageComplete, true);
  assert.match(written.populationIdentityHash, /^sha256:[0-9a-f]{64}$/u);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('combine population integrity tests passed');
