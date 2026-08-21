import assert from 'node:assert/strict';
import { classifyProbeProcess, extractExplicitPrefixCases, parseEmittedPath } from './cpsat-explicit-prefix-oracle-lib.mjs';
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
    scoreAndSort: children => children.sort((a, b) => b - a), POLICY_PROFILES: { default: {} },
};
const atlas = enumerateKnownPrefixBranches({ api, level: { portalMap: new Map(), reqLen: 3, reqInt: 1 }, prep: {}, depths: [1],
    knownSolutions: [{ id: 'a', path: [1, 2, 3], provenance: 'x' }, { id: 'b', path: [1, 2, 3], provenance: 'y' }] });
assert.equal(atlas.length, 2, 'shared known prefixes are enumerated once, not once per solution');
assert.equal(atlas.find(row => row.child === 3).label, 'known-valid-continuation');
assert.equal(atlas.find(row => row.child === 4).neutral.intersections, 1, 'neutral facts describe the child state');

// Explicit-prefix CP-SAT seam: packed solver cells are 0-based internally and MUST be shifted to
// raw/witness 1-based coordinates before cpsat-full-probe.py sees them. Explicit coordinate pairs
// are already in that raw convention.
const K = (x, y) => x | (y << 16);
const explicit = extractExplicitPrefixCases({ levelsFile: 'c.json', levels: [{ levelId: 'R1', branches: [
    { depth: 1, prefix: [K(1, 1), K(2, 1)], child: K(2, 2), label: 'oracle-abstain' },
    { depth: 1, prefix: [K(1, 1), K(2, 1)], child: K(3, 1), label: 'known-valid-continuation' },
] }] }, { format: 'atlas-abstain' });
assert.equal(explicit.length, 1);
assert.deepEqual(explicit[0].prefix, [[2, 2], [3, 2], [3, 3]], 'packed 0-based cells become raw 1-based coordinates');
const rawCoordinates = extractExplicitPrefixCases({ corpus: 'c.json', cases: [
    { levelId: 'R1', prefix: [[1, 1], [2, 1]], child: [2, 2] },
] });
assert.deepEqual(rawCoordinates[0].prefix, [[1, 1], [2, 1], [2, 2]], 'explicit coordinate pairs remain raw/1-based');
assert.equal(classifyProbeProcess({ stdout: 'R1: x -> INFEASIBLE in 1.0s', exitCode: 0 }).label, 'dead');
assert.equal(classifyProbeProcess({ stdout: 'R1: x -> UNKNOWN in 60.0s', exitCode: 0 }).label, 'timeout/abstain');
assert.deepEqual(parseEmittedPath('PATH [[1,1],[2,1]]\n'), [[1, 1], [2, 1]]);

console.log('research-analysis-lib unit tests passed');
