import assert from 'node:assert/strict';

import {
  canonicalResearchValue,
  researchSemanticHash,
} from './research-semantic-identity-lib.mjs';

assert.equal(
  researchSemanticHash({ b: 2, a: 1 }),
  researchSemanticHash({ a: 1, b: 2 }),
  'object key order must not affect research semantic identity',
);
assert.notEqual(
  researchSemanticHash({ values: ['a', 'b'] }),
  researchSemanticHash({ values: ['b', 'a'] }),
  'array order remains semantic unless the owning domain explicitly canonicalizes it first',
);
assert.deepEqual(
  canonicalResearchValue({ z: { b: 2, a: 1 }, a: 0 }),
  { a: 0, z: { a: 1, b: 2 } },
);
assert.match(researchSemanticHash(null), /^sha256:[0-9a-f]{64}$/u);

console.log('research semantic identity tests passed');
