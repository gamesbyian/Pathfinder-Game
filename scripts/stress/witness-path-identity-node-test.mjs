#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    buildWitnessIdentity,
    selectReplayWitness,
    witnessPathSha256,
} from './witness-path-identity.mjs';

const pathA = [1, 2, 3, 4];
const pathB = [1, 9, 3, 4];

assert.equal(witnessPathSha256(pathA), witnessPathSha256([...pathA]));
assert.notEqual(witnessPathSha256(pathA), witnessPathSha256(pathB));

const identityA = buildWitnessIdentity(pathA);
assert.equal(identityA.version, 1);
assert.equal(identityA.algorithm, 'sha256-json-cell-key-path-v1');
assert.equal(identityA.pathSha256, witnessPathSha256(pathA));
assert.equal(identityA.pathLength, pathA.length);

const reorderedHints = [{ path: pathB }, { path: pathA }];
const matched = selectReplayWitness(reorderedHints, identityA);
assert.deepEqual(matched.path, pathA);
assert.equal(matched.verified, true);
assert.equal(matched.source, 'artifact-witness-identity');

assert.throws(
    () => selectReplayWitness([{ path: pathB }], identityA),
    /no current stored hint matches prune-gap witness/,
);

assert.throws(
    () => selectReplayWitness(reorderedHints, null),
    /prune-gap artifact has no witness identity/,
);

const legacy = selectReplayWitness(reorderedHints, null, { allowUnverifiedLegacy: true });
assert.deepEqual(legacy.path, pathB);
assert.equal(legacy.verified, false);
assert.equal(legacy.source, 'legacy-first-hint');

assert.throws(
    () => selectReplayWitness(reorderedHints, { ...identityA, version: 99 }),
    /unsupported prune-gap witness identity version/,
);

console.log('witness-path-identity-node-test: ok');
