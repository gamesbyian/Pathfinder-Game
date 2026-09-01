#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  findDerivedIdentityHits,
  hasExecutableToken,
  isLikelyTestOrNamingGuard,
} from './naming-cleanup-phase15i-closeout-lib.mjs';

// Plural/derived forms must not evade an exact-token-only scanner.
assert.deepEqual(
  findDerivedIdentityHits('const oracleLabels = []; const atlasDirs = [];', ['oracleLabel','atlasDir']).sort(),
  ['atlasDir','oracleLabel'],
);

// Simple masked property/string construction must still reconstruct the retired identity.
assert.deepEqual(
  findDerivedIdentityHits("const x = row['oracle' + 'Label'];", ['oracleLabel']),
  ['oracleLabel'],
);

// A comment mentioning a legacy token is not evidence that a compatibility reader exists.
assert.equal(hasExecutableToken('// --trove-root is historical\nconst canonical = true;', '--trove-root'), false);
assert.equal(hasExecutableToken("const legacyPrefix = '--trove-root=';", '--trove-root'), true);

// Runtime ownership scans must not promote tests or naming guards into implementation consumers.
assert.equal(isLikelyTestOrNamingGuard('modules/solver/example.test.ts'), true);
assert.equal(isLikelyTestOrNamingGuard('scripts/check-naming-current-authorities.mjs'), true);
assert.equal(isLikelyTestOrNamingGuard('modules/solver/orchestration.ts'), false);

// Raw-string mixed-era grouping is intentionally different; the resumption gate must normalize
// before joining. This negative fixture makes the failure mode explicit.
const raw = new Map([
  ['repair-probe', 1],
  ['early-repair-search', 1],
]);
assert.equal(raw.size, 2, 'raw mixed-era stage IDs split one logical group');
const normalized = new Map();
for (const [key,count] of raw) {
  const canonical = key === 'repair-probe' ? 'early-repair-search' : key;
  normalized.set(canonical, (normalized.get(canonical) ?? 0) + count);
}
assert.deepEqual([...normalized.entries()], [['early-repair-search', 2]]);

console.log('Phase-15I hostile guard negative fixtures passed: derived/plural, masked property, comment-only compatibility, and raw mixed-era grouping are exposed.');
