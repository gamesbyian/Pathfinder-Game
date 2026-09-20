import assert from 'node:assert/strict';

import {
  canonicalizeResearchIdentities,
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

console.log('research population identity tests passed');
