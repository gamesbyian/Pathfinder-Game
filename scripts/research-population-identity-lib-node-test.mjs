import assert from 'node:assert/strict';

import {
  canonicalizeResearchIdentities,
  compareResearchIdentitySets,
  encodeResearchScopedIdentity,
  hashResearchPopulation,
  parseResearchIdentityLines,
} from './research-population-identity-lib.mjs';

assert.deepEqual(
  parseResearchIdentityLines('scope:a,b::case\n切断群:ケース 1\n'),
  ['scope:a,b::case', '切断群:ケース 1'],
);
assert.deepEqual(
  canonicalizeResearchIdentities(['b', 'a']).identities,
  ['a', 'b'],
);
assert.throws(
  () => canonicalizeResearchIdentities(['a', 'a']),
  /duplicate population identities/u,
);
assert.equal(encodeResearchScopedIdentity('scope:a', 'b'), '["scope:a","b"]');
assert.equal(encodeResearchScopedIdentity('scope', 'a:b'), '["scope","a:b"]');
assert.notEqual(
  encodeResearchScopedIdentity('scope:a', 'b'),
  encodeResearchScopedIdentity('scope', 'a:b'),
);
assert.notEqual(
  encodeResearchScopedIdentity('cut,group', 'case:1'),
  encodeResearchScopedIdentity('cut', 'group,case:1'),
);

const a = hashResearchPopulation({
  kind: 'explicit-ids',
  identityBasis: 'stable-id',
  identities: ['b', 'a'],
});
const b = hashResearchPopulation({
  kind: 'explicit-ids',
  identityBasis: 'stable-id',
  identities: ['a', 'b'],
});
assert.equal(a.identityHash, b.identityHash);

const coded = hashResearchPopulation({
  kind: 'explicit-ids',
  identityBasis: 'stable-id',
  identities: ['a', 'b'],
  identityCodec: 'json-tuple-v1',
});
assert.notEqual(coded.identityHash, a.identityHash);

const equalSets = compareResearchIdentitySets(['b', 'a'], ['a', 'b']);
assert.equal(equalSets.relation, 'equal');
assert.deepEqual(equalSets.intersection, ['a', 'b']);
assert.equal(equalSets.counts.union, 2);

const subset = compareResearchIdentitySets(['a'], ['a', 'b']);
assert.equal(subset.relation, 'left-proper-subset');
assert.deepEqual(subset.rightOnly, ['b']);

const superset = compareResearchIdentitySets(['a', 'b'], ['a']);
assert.equal(superset.relation, 'left-proper-superset');
assert.deepEqual(superset.leftOnly, ['b']);

const overlap = compareResearchIdentitySets(['a', 'b'], ['b', 'c']);
assert.equal(overlap.relation, 'overlap');
assert.deepEqual(overlap.intersection, ['b']);
assert.equal(overlap.counts.union, 3);

const disjoint = compareResearchIdentitySets(['a'], ['b']);
assert.equal(disjoint.relation, 'disjoint');
assert.deepEqual(disjoint.intersection, []);

assert.throws(
  () => compareResearchIdentitySets(['a', 'a'], ['a']),
  /duplicate population identities/u,
);

console.log('research population identity tests passed');
