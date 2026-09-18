import assert from 'node:assert/strict';

import {
    SEARCH_LOSS_CAPTURE_KIND,
    createSearchLossCollector,
    dedupeSearchLossCapsules,
    decisionObservationToSearchLossCapsule,
    searchLossCapsuleIdentity,
    summarizeSearchLossCapture,
    validateSearchLossCapsule,
    validateSearchLossCapture,
} from './solver-search-loss-evidence-lib.mjs';

const PROTOCOL_HASH = `sha256:${'a'.repeat(64)}`;
const CONFIG_HASH = `sha256:${'b'.repeat(64)}`;
const POPULATION_IDENTITY = `sha256:${'c'.repeat(64)}`;

function baseCapsuleFields(overrides = {}) {
    return {
        parentId: 'R00046',
        levelRevision: 'v2:abc123',
        runId: 'run-1',
        solverRef: 'beam-v3',
        protocolHash: PROTOCOL_HASH,
        attemptIndex: 0,
        stageId: 'score-width-culled',
        eventKind: 'score-width-cull',
        captureReason: 'near-cutoff-culled',
        workSpent: 12000,
        nodeProgress: 4200,
        depth: 5,
        stateIdentity: null,
        pathIdentity: 'score-width-culled@5#0',
        disposition: 'culled',
        selection: { selectorId: 'score-width-cull', observedAtSelection: 8, retainedAtSelection: 3, truncated: true },
        stateSummary: { endpoint: [3, 4] },
        context: { beamWidth: 8 },
        replayBasis: 'identity-only',
        ...overrides,
    };
}

function buildCapsule(overrides = {}) {
    const withoutId = baseCapsuleFields(overrides);
    return { ...withoutId, capsuleId: searchLossCapsuleIdentity(withoutId) };
}

function buildCapture(capsules) {
    return {
        schemaVersion: 1,
        kind: SEARCH_LOSS_CAPTURE_KIND,
        researchEnrichmentKind: 'observation',
        run: {
            runId: 'run-1',
            solverRef: 'beam-v3',
            resolvedSha: 'a'.repeat(40),
            producer: 'test-producer',
            protocolHash: PROTOCOL_HASH,
            configurationHash: CONFIG_HASH,
            levelBlind: true,
        },
        population: { source: 'frozen-population.json', populationIdentity: POPULATION_IDENTITY, parentCount: 20 },
        capture: {
            captureProfileId: 'search-loss-v1',
            observerParityVerified: true,
            selectorSummaries: { 'score-width-cull': { observed: 8, retained: capsules.length, truncated: capsules.length < 8 } },
        },
        capsules,
    };
}

// --- Pure contract ---

const capsule = buildCapsule();
assert.equal(validateSearchLossCapsule(capsule), capsule, 'valid minimal capsule accepted');
assert.match(capsule.capsuleId, /^sha256:[0-9a-f]{64}$/u);

const capture = buildCapture([capsule]);
assert.equal(validateSearchLossCapture(capture), capture, 'valid minimal capture accepted');

assert.throws(() => validateSearchLossCapsule({ ...capsule, parentId: '' }), /parentId/, 'rejects malformed required identity');
assert.throws(() => validateSearchLossCapsule({ ...capsule, workSpent: -1 }), /workSpent/, 'rejects invalid work');
assert.throws(() => validateSearchLossCapsule({ ...capsule, workSpent: Number.NaN }), /workSpent/);

const unknownCapsule = buildCapsule({ eventKind: 'best-progress-transition', captureReason: 'best-progress', workSpent: null });
assert.throws(() => validateSearchLossCapsule(unknownCapsule), /workSpent/, 'UNKNOWN-shaped rows still require workSpent, never a fabricated number');

assert.throws(() => validateSearchLossCapture(buildCapture([capsule, capsule])), /duplicate/, 'rejects duplicate capsule identity within one capture');

const emptyCapture = buildCapture([]);
assert.equal(validateSearchLossCapture(emptyCapture), emptyCapture,
    'a capture with zero observed capsules and no annotation envelope remains valid: absence is UNKNOWN, never a forced label');

const roundTripped = JSON.parse(JSON.stringify(capture));
assert.deepEqual(roundTripped, capture, 'capture survives a JSON round trip unchanged');
assert.equal(validateSearchLossCapture(roundTripped), roundTripped);

const dedupInput = [capsule, { ...capsule }, buildCapsule({ attemptIndex: 1 })];
const deduped = dedupeSearchLossCapsules(dedupInput);
assert.equal(deduped.capsules.length, 2, 'semantic dedup collapses identical capsuleId rows');
assert.equal(deduped.duplicates, 1);

// --- Selector behavior ---

const collector = createSearchLossCollector({ captureProfileId: 'search-loss-v1', selectorLimits: { 'score-width-cull': 2 } });
const distinctCulled = [0, 1, 2, 3].map(attemptIndex => buildCapsule({ attemptIndex }));
for (const row of distinctCulled) collector.observe(row);
collector.observe(distinctCulled[0]); // semantic duplicate: must not double count retained
const snapshot = collector.snapshot();
assert.equal(snapshot.selectorSummaries['score-width-cull'].observed, 5, 'observed counts every call, including the duplicate');
assert.equal(snapshot.selectorSummaries['score-width-cull'].retained, 2, 'retained respects the fixed selector limit');
assert.equal(snapshot.selectorSummaries['score-width-cull'].truncated, true);
assert.equal(snapshot.capsules.length, 2, 'retained set is exactly the selector cap');

const emptyCollector = createSearchLossCollector({ captureProfileId: 'search-loss-v1' });
const emptySnapshot = emptyCollector.snapshot();
assert.deepEqual(emptySnapshot.selectorSummaries, {}, 'a selector with zero opportunities reports nothing, not a fabricated zero row');

const twoSelectorCollector = createSearchLossCollector({ captureProfileId: 'search-loss-v1', selectorLimits: { a: 1, b: 1 } });
twoSelectorCollector.observe(buildCapsule({ attemptIndex: 10, eventKind: 'ints-bucket-cull', stageId: 'ints-bucket-culled', selection: { selectorId: 'a', observedAtSelection: 1, retainedAtSelection: 1, truncated: false } }));
twoSelectorCollector.observe(buildCapsule({ attemptIndex: 11, eventKind: 'ints-bucket-cull', stageId: 'ints-bucket-culled', selection: { selectorId: 'a', observedAtSelection: 1, retainedAtSelection: 1, truncated: false } }));
twoSelectorCollector.observe(buildCapsule({ attemptIndex: 12, eventKind: 'mechanic-bucket-cull', stageId: 'mechanic-bucket-culled', selection: { selectorId: 'b', observedAtSelection: 1, retainedAtSelection: 1, truncated: false } }));
const twoSelectorSnapshot = twoSelectorCollector.snapshot();
assert.equal(twoSelectorSnapshot.selectorSummaries.a.retained, 1, 'selector a is capped independently of selector b');
assert.equal(twoSelectorSnapshot.selectorSummaries.b.retained, 1, 'selector b is not silently sharing selector a\'s cap');

// --- Decision adapter ---

const decisionObservation = {
    decisionId: 'score-width-culled@5#0',
    parentId: 'R00046',
    stageId: 'score-width-culled',
    candidateIds: ['p1', 'p2', 'p3'],
    orderedCandidateIds: ['p1', 'p2', 'p3'],
    retainedCandidateIds: ['p1'],
    workSpentBefore: 11000,
    workSpentAfter: 12000,
    context: { depth: 5, nodeProgress: 4200, beamWidth: 8, cutoffScore: 0.4 },
};
const adaptedCapsule = decisionObservationToSearchLossCapsule(decisionObservation, {
    levelRevision: 'v2:abc123',
    runId: 'run-1',
    solverRef: 'beam-v3',
    protocolHash: PROTOCOL_HASH,
    captureReason: 'near-cutoff-culled',
    disposition: 'culled',
});
assert.equal(adaptedCapsule.eventKind, 'score-width-cull');
assert.equal(adaptedCapsule.selection.retainedAtSelection, 1);
assert.equal(adaptedCapsule.selection.observedAtSelection, 3);
assert.equal(adaptedCapsule.selection.truncated, true, 'adapter preserves retained/culled truth from the shared decision observation');
validateSearchLossCapsule(adaptedCapsule);

const mechanicObservation = { ...decisionObservation, decisionId: 'mechanic-bucket-culled@5#0', stageId: 'mechanic-bucket-culled' };
assert.equal(decisionObservationToSearchLossCapsule(mechanicObservation, {
    levelRevision: 'v2:abc123', runId: 'run-1', solverRef: 'beam-v3', protocolHash: PROTOCOL_HASH,
    captureReason: 'near-cutoff-culled', disposition: 'culled',
}).eventKind, 'mechanic-bucket-cull');

const intsObservation = { ...decisionObservation, decisionId: 'ints-bucket-culled@5#0', stageId: 'ints-bucket-culled' };
assert.equal(decisionObservationToSearchLossCapsule(intsObservation, {
    levelRevision: 'v2:abc123', runId: 'run-1', solverRef: 'beam-v3', protocolHash: PROTOCOL_HASH,
    captureReason: 'near-cutoff-culled', disposition: 'culled',
}).eventKind, 'ints-bucket-cull');

const unsupportedStage = { ...decisionObservation, stageId: 'admissible-order-expand' };
assert.equal(decisionObservationToSearchLossCapsule(unsupportedStage, {
    levelRevision: 'v2:abc123', runId: 'run-1', solverRef: 'beam-v3', protocolHash: PROTOCOL_HASH,
    captureReason: 'near-cutoff-culled', disposition: 'culled',
}), null, 'unsupported stage refuses conversion rather than guessing');

const legacyMissingWork = { ...decisionObservation, workSpentAfter: null };
assert.throws(() => decisionObservationToSearchLossCapsule(legacyMissingWork, {
    levelRevision: 'v2:abc123', runId: 'run-1', solverRef: 'beam-v3', protocolHash: PROTOCOL_HASH,
    captureReason: 'near-cutoff-culled', disposition: 'culled',
}), /workSpentBefore\/workSpentAfter/, 'legacy record missing workSpent refuses conversion');

// --- Summary ---

const summary = summarizeSearchLossCapture(buildCapture([capsule, buildCapsule({ attemptIndex: 99, parentId: 'R09999' })]));
assert.equal(summary.capsules, 2);
assert.equal(summary.independentParentsObserved, 2);
assert.equal(summary.byEventKind['score-width-cull'], 2);
assert.equal(summary.byReplayBasis['identity-only'], 2);

console.log('solver search-loss evidence lib tests passed');
