import assert from 'node:assert/strict';
import { createKnownPrefixOracleSetManifest, validateKnownPrefixOracleSetManifest } from './known-prefix-oracle-set-manifest.mjs';

const input = { producer: { id: 'fixture-prefix-producer', version: '1.0.0' }, oracles: [
  { oracleId: 'child', path: [[0, 0], [1, 0]], ancestry: { sourceKind: 'replay', sourceIdentity: 'run:1', parentOracleIds: ['root'], dependenceGroupId: 'family:a' } },
  { oracleId: 'root', path: [[0, 0], [0, 1]], ancestry: { sourceKind: 'human-witness', parentOracleIds: [], dependenceGroupId: 'family:a' } },
], conditioningOracleIds: ['root'] };
const manifest = createKnownPrefixOracleSetManifest(input);
assert.deepEqual(validateKnownPrefixOracleSetManifest(manifest), []);
assert.equal(manifest.pathSetIdentity, createKnownPrefixOracleSetManifest({ ...input, oracles: [...input.oracles].reverse() }).pathSetIdentity);
assert.notEqual(manifest.pathSetIdentity, createKnownPrefixOracleSetManifest({ ...input, oracles: input.oracles.map(row => row.oracleId === 'root' ? { ...row, path: [[0, 0], [1, 1]] } : row) }).pathSetIdentity);
assert.throws(() => createKnownPrefixOracleSetManifest({ ...input, conditioningOracleIds: ['missing'] }), /conditioningOracleIds/u);
assert.match(validateKnownPrefixOracleSetManifest({ ...manifest, producer: { id: '', version: '' } }).join(','), /producer/u);
assert.match(validateKnownPrefixOracleSetManifest({ ...manifest, oracles: manifest.oracles.map(row => ({ ...row,
  ancestry: { ...row.ancestry, parentOracleIds: row.oracleId === 'root' ? ['child'] : row.ancestry.parentOracleIds } })) }).join(','), /ancestryCycle/u);
console.log('known-prefix oracle-set manifest tests passed');
