import assert from 'node:assert/strict';
import { compareProducerPopulations, enumerateKnownPrefixBranches, mineResidualInterfaces, rollbackCensus } from './research-analysis-lib.mjs';

assert.equal(compareProducerPopulations([{ path: [1, 2], metrics: { x: 1 } }], [{ path: [1, 2], metrics: { x: 1 } }]).exactPrefixOverlap, 1);
const mined = mineResidualInterfaces([{ id: 'a', path: [1, 2, 4], futureStates: [null, null, 's'] }, { id: 'b', path: [1, 3, 4], futureStates: [null, null, 's'] }]);
assert.equal(mined.candidatePairs, 1); assert.equal(mined.exactStatePreservingSubstitutions, 1);
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
console.log('research-analysis-lib unit tests passed');
