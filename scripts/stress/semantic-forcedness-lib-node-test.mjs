import assert from 'node:assert/strict';
import { classifySemanticForcedness, summarizeSemanticForcedness, selectSemanticForcednessCaptureGroups, countedPathSteps } from './semantic-forcedness-lib.mjs';

assert.deepEqual(classifySemanticForcedness(['live','dead','dead']), {
    classification: 'semantically-forced', live: 1, dead: 2, unknown: 0,
});
assert.equal(classifySemanticForcedness(['live','live']).classification, 'genuinely-branching');
assert.equal(classifySemanticForcedness(['dead','dead']).classification, 'semantically-dead');
assert.equal(classifySemanticForcedness(['live','timeout/abstain']).classification, 'unresolved');

const summary = summarizeSemanticForcedness([
    { levelId:'A', classification:'semantically-forced', parentExpansionWork:20 },
    { levelId:'A', classification:'genuinely-branching', parentExpansionWork:30 },
    { levelId:'B', classification:'semantically-dead', parentExpansionWork:10 },
    { levelId:'B', classification:'unresolved', parentExpansionWork:999 },
]);
assert.equal(summary.resolvedStates, 3);
assert.equal(summary.semanticallyForcedStates, 1);
assert.equal(summary.genuinelyBranchingStates, 1);
assert.equal(summary.semanticallyDeadStates, 1);
assert.equal(summary.semanticallyForcedResolvedRate, 1/3);
assert.equal(summary.semanticallyForcedWorkShare, 20/60);
assert.equal(summary.semanticallyDeadWorkShare, 10/60);
assert.equal(summary.forcedParents, 1);
const eligible = [
    { id:'early', depth:0 }, { id:'mid-a', depth:17 },
    { id:'deep-first', depth:36 }, { id:'mid-b', depth:17 },
    { id:'deep-second', depth:36 },
];
assert.deepEqual(selectSemanticForcednessCaptureGroups(eligible,2).map(x=>x.id), ['early','mid-a']);
assert.deepEqual(selectSemanticForcednessCaptureGroups(eligible,2,'deepest').map(x=>x.id), ['deep-first','deep-second']);
assert.deepEqual(selectSemanticForcednessCaptureGroups(eligible,2,'first').map(x=>x.id), ['early','mid-a']);
assert.throws(()=>selectSemanticForcednessCaptureGroups(eligible,2,'most-dead'),/selection mode/);
assert.throws(()=>selectSemanticForcednessCaptureGroups(eligible,0,'deepest'),/positive maxStates/);
// Prefix: cardinal 0→1, portal 1→3 zero-cost, cardinal 3→4.
const portalMap=new Map([[1,{dest:3}],[3,{dest:9}]]);
assert.deepEqual(countedPathSteps([0,1,3,4],portalMap),{countedSteps:2,portalJumps:1});
assert.deepEqual(countedPathSteps([0,1,3,9],portalMap),{countedSteps:2,portalJumps:1},
    'arrival via portal cannot chain a second portal jump');
const medium=[
 {id:'near-start',parentPath:[0,1],depth:1},
 {id:'middle',parentPath:[0,1,3,4,5,6],depth:5},
 {id:'late',parentPath:[0,1,3,4,5,6,7,8,9,10,11],depth:10},
 {id:'middle-tie',parentPath:[0,1,3,4,5,6],depth:5},
];
assert.deepEqual(selectSemanticForcednessCaptureGroups(medium,2,'middle-counted',
 {requiredLength:8,portalMap}).map(x=>x.id),['middle','middle-tie']);
assert.equal(selectSemanticForcednessCaptureGroups(medium,2,'middle-counted',
 {requiredLength:8,portalMap})[0].remainingCountedSteps,4);
assert.deepEqual(selectSemanticForcednessCaptureGroups([medium[0]],2,'middle-counted',
 {requiredLength:8,portalMap}),[], 'no fallback to trivial start');
assert.throws(()=>selectSemanticForcednessCaptureGroups(medium,2,'middle-counted'),/current requiredLength/);
console.log('semantic forcedness lib tests passed');
