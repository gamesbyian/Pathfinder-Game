import assert from 'node:assert/strict';
import { buildActionBoundaryDataset, applyFrozenLegalSignalModel } from './analyze-action-selection-legal-signals.mjs';

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
assert.equal(result.capturedPreWinnerWorkShare,3000000/5000000);
assert.equal(result.endangeredWinnerLevels,0);
assert.equal(result.diagnostics.nominatedSameStageContinuationWorkShare,1);
assert.equal(result.diagnostics.nominatedByPriorOutcome[0].key,'censored');
console.log('apply-action-selection-legal-signal-model: ok');
