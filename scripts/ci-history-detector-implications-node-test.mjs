#!/usr/bin/env node
import assert from 'node:assert/strict';

import { analyzeDetectorImplications } from './ci-history-detector-implications.mjs';

const registry = {
  validators: {
    repo: ['check:a', 'check:b', 'check:c'],
  },
  nodeTests: {
    repo: ['test:d'],
  },
};

const signatures = {
  episodesRequested: 6,
  episodesWithSignatures: 6,
  gaps: [],
  commandTimingSummary: [
    { name: 'check:a', observedExecutions: 6, observedTotalSeconds: 12, medianSeconds: 2, p90Seconds: 2 },
  ],
  episodes: [
    { episodeId: '1', detectors: [{ kind: 'check', name: 'check:a' }, { kind: 'check', name: 'check:b' }] },
    { episodeId: '2', detectors: [{ kind: 'check', name: 'check:a' }, { kind: 'check', name: 'check:b' }] },
    { episodeId: '3', detectors: [{ kind: 'check', name: 'check:a' }, { kind: 'check', name: 'check:b' }] },
    { episodeId: '4', detectors: [{ kind: 'check', name: 'check:b' }] },
    { episodeId: '5', detectors: [{ kind: 'check', name: 'check:c' }, { kind: 'test', name: 'test:d' }] },
    { episodeId: '6', detectors: [{ kind: 'check', name: 'retired:old-check' }] },
  ],
};

const result = analyzeDetectorImplications(signatures, registry, { minEpisodes: 3 });

const aToB = result.implicationCandidates.find(row =>
  row.antecedent.name === 'check:a' && row.consequent.name === 'check:b');
assert.ok(aToB, 'A should observationally imply B');
assert.equal(aToB.antecedentEpisodes, 3);
assert.equal(aToB.consequentOnlyEpisodes, 1);

assert.equal(
  result.implicationCandidates.some(row =>
    row.antecedent.name === 'check:b' && row.consequent.name === 'check:a'),
  false,
  'B must not imply A because B has a B-only episode',
);

assert.equal(result.exactCoFailureCandidates.length, 0, 'minimum-frequency exact co-failure should not be invented');

const a = result.detectors.find(row => row.name === 'check:a');
assert.equal(a.uniqueRepresentativeEpisodes, 0);
assert.equal(a.observedTotalSeconds, 12);

assert.equal(
  result.detectors.some(row => row.name === 'retired:old-check'),
  false,
  'historical detectors absent from the current registry should not drive current redundancy candidates',
);

console.log('CI historical detector implication analysis tests passed.');
