import assert from 'node:assert/strict';
import { createKnownPrefixOracleSetManifest, validateKnownPrefixOracleSetManifest } from './known-prefix-oracle-set-manifest.mjs';

const input = { producer: { id: 'fixture-prefix-producer', version: '1.0.0' }, oracles: [
  { oracleId: 'child', path: [[0, 0], [1, 0]], ancestry: { sourceKind: 'replay', sourceIdentity: 'run:1', parentOracleIds: ['root'], dependenceGroupId: 'family:a' } },
  { oracleId: 'root', path: [[0, 0], [0, 1]], ancestry: { sourceKind: 'human-witness', parentOracleIds: [], dependenceGroupId: 'family:a' } },
], conditioningOracleIds: ['root'] };
const manifest = createKnownPrefixOracleSetManifest(input);
assert.deepEqual(validateKnownPrefixOracleSetManifest(manifest), []);
const reordered = createKnownPrefixOracleSetManifest({ ...input, oracles: [...input.oracles].reverse() });
assert.equal(manifest.pathSetIdentity, reordered.pathSetIdentity);
assert.equal(manifest.manifestIdentity, reordered.manifestIdentity);
const pathChanged = createKnownPrefixOracleSetManifest({ ...input, oracles: input.oracles.map(row => row.oracleId === 'root' ? { ...row, path: [[0, 0], [1, 1]] } : row) });
assert.notEqual(manifest.pathSetIdentity, pathChanged.pathSetIdentity);
assert.notEqual(manifest.manifestIdentity, pathChanged.manifestIdentity);
const conditioningChanged = createKnownPrefixOracleSetManifest({ ...input, conditioningOracleIds: ['child'] });
assert.notEqual(manifest.conditioningPathSetIdentity, conditioningChanged.conditioningPathSetIdentity);
assert.notEqual(manifest.scientificConditioningIdentity, conditioningChanged.scientificConditioningIdentity);
assert.notEqual(manifest.manifestIdentity, conditioningChanged.manifestIdentity);
const ancestryChanged = createKnownPrefixOracleSetManifest({ ...input, oracles: input.oracles.map(row => row.oracleId === 'child'
  ? { ...row, ancestry: { ...row.ancestry, dependenceGroupId: 'family:b' } } : row) });
assert.equal(manifest.pathSetIdentity, ancestryChanged.pathSetIdentity);
assert.notEqual(manifest.oracleSetIdentity, ancestryChanged.oracleSetIdentity);
assert.notEqual(manifest.scientificConditioningIdentity, ancestryChanged.scientificConditioningIdentity);
assert.notEqual(manifest.manifestIdentity, ancestryChanged.manifestIdentity);
for (const changedAncestry of [
  { ...input.oracles[0].ancestry, sourceIdentity: 'run:2' },
  { ...input.oracles[0].ancestry, parentOracleIds: [] },
]) {
  const changed = createKnownPrefixOracleSetManifest({ ...input, oracles: input.oracles.map(row => row.oracleId === 'child'
    ? { ...row, ancestry: changedAncestry } : row) });
  assert.equal(manifest.pathSetIdentity, changed.pathSetIdentity);
  assert.notEqual(manifest.manifestIdentity, changed.manifestIdentity);
}
assert.throws(() => createKnownPrefixOracleSetManifest({ ...input, conditioningOracleIds: ['missing'] }), /conditioningOracleIds/u);
assert.match(validateKnownPrefixOracleSetManifest({ ...manifest, producer: { id: '', version: '' } }).join(','), /producer/u);
assert.match(validateKnownPrefixOracleSetManifest({ ...manifest, oracles: manifest.oracles.map(row => ({ ...row,
  ancestry: { ...row.ancestry, parentOracleIds: row.oracleId === 'root' ? ['child'] : row.ancestry.parentOracleIds } })) }).join(','), /ancestryCycle/u);
console.log('known-prefix oracle-set manifest tests passed');
