import assert from 'node:assert/strict';
import { classifyProbeProcess, extractExplicitPrefixCases, normalizeExplicitPrefixCaseFormat, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';
import { classifyScoreWidthExtinction, compareProducerPopulations, enumerateKnownPrefixBranches, mineResidualInterfaces, rollbackCensus } from './research-analysis-lib.mjs';

assert.equal(compareProducerPopulations([{ path: [1, 2], metrics: { x: 1 } }], [{ path: [1, 2], metrics: { x: 1 } }]).exactPrefixOverlap, 1);
assert.equal(classifyScoreWidthExtinction({ margin: 20, tied: false, stableOrderAdmission: false,
    poolSize: 240, beamWidth: 100, bestRank: 160 }), 'A-clearly-mis-ranked', 'crowding must not hide material mis-ranking');
assert.equal(classifyScoreWidthExtinction({ margin: 3, tied: false, stableOrderAdmission: false,
    poolSize: 240, beamWidth: 100, bestRank: 109 }), 'D-diversity-width-saturation');
assert.equal(classifyScoreWidthExtinction({ margin: 0, tied: true, stableOrderAdmission: true,
    poolSize: 101, beamWidth: 100, bestRank: 101 }), 'C-exact-score-tie-stable-order');
const mined = mineResidualInterfaces([{ id: 'a', path: [1, 2, 4], futureStates: [null, null, 's'] }, { id: 'b', path: [1, 3, 4], futureStates: [null, null, 's'] }]);
assert.equal(mined.candidatePairs, 1); assert.equal(mined.exactStatePreservingSubstitutions, 1);
assert.equal(mined.uniqueExactSubstitutionSignatures, 1);
const translated = mineResidualInterfaces([{ id: 'c', path: [10, 11, 13], futureStates: [null, null, 't'] },
    { id: 'd', path: [10, 12, 13], futureStates: [null, null, 't'] }]);
assert.equal(translated.exactSignatures[0].signature, mined.exactSignatures[0].signature,
    'substitution signatures recur across translated local geometry');
const commuting = mineResidualInterfaces([
    { id: 'a', path: [1, 2, 3, 4], obligations: [null, 'mp:0', 'mc:0', null] },
    { id: 'b', path: [1, 5, 6, 4], obligations: [null, 'mc:0', 'mp:0', null] },
]);
assert.equal(commuting.commutingCandidates, 1);
assert.equal(rollbackCensus([{ id: 'm', path: [1, 2, 9] }], [{ id: 's', path: [1, 2, 3, 4] }], 3).rows[0].rollbackSteps, 1);
const api = {
    createState: start => ({ path: [start], ints: 0, mpVisitedMask: 0, mustCrossMask: 1, mustTurnMask: 0,
        surroundMask: 0, adjTurnMask: 0, flipperUsedMask: 0, lastWasPortalJump: false }),
    getNeighbors: pos => pos === 1 ? [2] : [3, 4],
    applyMove: (child, state) => { state.path.push(child); state.ints += child === 4 ? 1 : 0; },
    scoreAndSort: children => children.sort((a, b) => b - a), SCORING_PROFILES: { default: {} },
};
const atlas = enumerateKnownPrefixBranches({ api, level: { portalMap: new Map(), requiredLength: 3, requiredIntersections: 1 }, prep: {}, depths: [1],
    knownSolutions: [{ id: 'a', path: [1, 2, 3], provenance: 'x' }, { id: 'b', path: [1, 2, 3], provenance: 'y' }] });
assert.equal(atlas.length, 2, 'shared known prefixes are enumerated once, not once per solution');
assert.ok(atlas.every(row => row.schemaVersion === 2), 'new known-prefix branch rows write schemaVersion 2');
assert.equal(atlas.find(row => row.child === 3).label, 'known-valid-continuation');
assert.equal(atlas.find(row => row.child === 4).label, 'reference-abstain');
assert.equal(atlas.find(row => row.child === 4).neutral.intersections, 1, 'neutral facts describe the child state');

// Explicit-prefix CP-SAT seam: packed solver cells are 0-based internally and MUST be shifted to
// raw/witness 1-based coordinates before cpsat-reference-probe.py sees them. Explicit coordinate pairs
// are already in that raw convention. The permanent v1 reader and canonical v2 reader normalize to
// one current sourceLabel and either external format spelling selects the same population.
const K = (x, y) => x | (y << 16);
const legacySource = { schemaVersion: 1, levelsFile: 'c.json', levels: [{ levelId: 'R1', branches: [
    { schemaVersion: 1, depth: 1, prefix: [K(1, 1), K(2, 1)], child: K(2, 2), label: 'oracle-abstain' },
    { schemaVersion: 1, depth: 1, prefix: [K(1, 1), K(2, 1)], child: K(3, 1), label: 'known-valid-continuation' },
] }] };
const canonicalSource = { schemaVersion: 2, levelsFile: 'c.json', levels: [{ levelId: 'R1', branches: [
    { schemaVersion: 2, depth: 1, prefix: [K(1, 1), K(2, 1)], child: K(2, 2), label: 'reference-abstain' },
    { schemaVersion: 2, depth: 1, prefix: [K(1, 1), K(2, 1)], child: K(3, 1), label: 'known-valid-continuation' },
] }] };
assert.throws(
    () => normalizeExplicitPrefixCaseFormat('atlas-abstain'),
    /unsupported explicit-prefix case format/u,
    'Phase 15J retires the external atlas-abstain input spelling',
);
assert.equal(normalizeExplicitPrefixCaseFormat('reference-abstain'), 'reference-abstain');
assert.equal(normalizeExplicitPrefixCaseFormat('cases'), 'cases');
assert.throws(() => normalizeExplicitPrefixCaseFormat('unknown-format'), /unsupported explicit-prefix case format/u);
const legacyCases = extractExplicitPrefixCases(legacySource, { format: 'reference-abstain' });
const canonicalCases = extractExplicitPrefixCases(canonicalSource, { format: 'reference-abstain' });
assert.deepEqual(legacyCases, canonicalCases, 'v1 and v2 known-prefix source schemas normalize identically through the canonical format');
assert.equal(legacyCases.length, 1);
assert.equal(legacyCases[0].sourceLabel, 'reference-abstain');
assert.deepEqual(legacyCases[0].prefix, [[2, 2], [3, 2], [3, 3]], 'packed 0-based cells become raw 1-based coordinates');
const rawCoordinates = extractExplicitPrefixCases({ corpus: 'c.json', cases: [
    { levelId: 'R1', prefix: [[1, 1], [2, 1]], child: [2, 2] },
] });
assert.deepEqual(rawCoordinates[0].prefix, [[1, 1], [2, 1], [2, 2]], 'explicit coordinate pairs remain raw/1-based');
assert.equal(classifyProbeProcess({ stdout: 'R1: x -> INFEASIBLE in 1.0s', exitCode: 0 }).label, 'dead');
const unknown = classifyProbeProcess({ stdout: 'R1: x -> UNKNOWN in 60.0s', exitCode: 0 });
assert.equal(unknown.label, 'timeout/abstain');
assert.equal(unknown.reason, 'reference-unknown');
assert.deepEqual(parseEmittedPath('PATH [[1,1],[2,1]]\n'), [[1, 1], [2, 1]]);

console.log('research-analysis-lib unit tests passed');
