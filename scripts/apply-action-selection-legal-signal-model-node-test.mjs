import assert from 'node:assert/strict';
import { actionBoundaryDigest, attemptWorkCoverage, buildActionBoundaryDataset, applyFrozenLegalSignalModel } from './analyze-action-selection-legal-signals.mjs';

const doc={levels:[
  {id:'L11',ok:true,attempts:[
    {outcome:'timed-out',timedOut:true,stageId:'retry',actionKey:'retry|beam|score=x',workSpent:2000000},
    {outcome:'failed',stageId:'retry',actionKey:'retry|beam|score=x',workSpent:3000000},
    {outcome:'success',ok:true,stageId:'main',actionKey:'main|dfs|score=y',workSpent:5},
  ]},
]};
const ds=buildActionBoundaryDataset(doc,{source:'fixture'});
const model={
  kind:'pathfinder-action-selection-legal-signal-frozen-model',
  family:'prior-response+work+next-stage',
  minDevelopmentSupport:100,
  signatures:[{signature:['retry','censored','1m-10m','1m-10m','retry']}],
};
const result=applyFrozenLegalSignalModel(ds,model);
assert.equal(result.validationSolvedLevels,1);
assert.equal(result.nominatedPreWinnerWork,3000000);
assert.equal(result.nominatedPreWinnerLevels,1);
assert.equal(result.capturedPreWinnerWorkShare,3000000/5000000);
assert.equal(result.diagnostics.maxNominatedParentWorkShare,1);
assert.deepEqual(result.diagnostics.nominatedByLevel,[{
  key:'L11',work:3000000,workShare:1,attempts:1,levels:1,
}]);
assert.equal(result.endangeredWinnerLevels,0);
assert.equal(result.diagnostics.nominatedSameStageContinuationWorkShare,1);
assert.equal(result.diagnostics.nominatedByPriorOutcome[0].key,'censored');
const digest=actionBoundaryDigest(ds);
assert.match(digest,/^sha256:[0-9a-f]{64}$/);
assert.equal(digest,actionBoundaryDigest(buildActionBoundaryDataset(JSON.parse(JSON.stringify(doc)),{source:'different-path'})));

// Instrument validity: attempts without workSpent must be reported, not silently scored as zero work.
const full=attemptWorkCoverage(doc);
assert.deepEqual(full,{reachableAttempts:3,attemptsWithWork:3,share:1,complete:true});
const stripped={levels:doc.levels.map(l=>({...l,attempts:l.attempts.map(({workSpent:_w,...a})=>({...a,workSpent:null}))}))};
const missing=attemptWorkCoverage(stripped);
assert.equal(missing.complete,false);
assert.equal(missing.attemptsWithWork,0);
assert.equal(missing.share,0);
// Attempts after the recorded winner are unreachable and must not count against coverage.
const trailing={levels:[{id:'L12',attempts:[{outcome:'success',ok:true,workSpent:5},{outcome:'failed'}]}]};
assert.equal(attemptWorkCoverage(trailing).complete,true);
assert.equal(attemptWorkCoverage({levels:[]}).complete,false);
console.log('apply-action-selection-legal-signal-model: ok');
