import assert from 'node:assert/strict';
import { analyzeLegalSignalCapture, buildActionBoundaryDataset } from './analyze-action-selection-legal-signals.mjs';

// L0/L1/L2 hash into development under the analyzer's frozen split.
// L11 hashes into validation. The "rare" stage never wins in development
// but is the held-out winner on L11, so an unsafe zero-win rule must expose it.
const levels=[
  {id:'L0',ok:true,attempts:[
    {outcome:'failed',stageId:'probe',actionKey:'probe|dfs|score=x',workSpent:100},
    {outcome:'failed',stageId:'rare',actionKey:'rare|beam|score=y',workSpent:20},
    {outcome:'success',ok:true,stageId:'main',actionKey:'main|beam|score=z',workSpent:30},
  ]},
  {id:'L1',ok:true,attempts:[
    {outcome:'failed',stageId:'probe',actionKey:'probe|dfs|score=x',workSpent:110},
    {outcome:'failed',stageId:'rare',actionKey:'rare|beam|score=y',workSpent:25},
    {outcome:'success',ok:true,stageId:'main',actionKey:'main|beam|score=z',workSpent:35},
  ]},
  {id:'L2',ok:true,attempts:[
    {outcome:'failed',stageId:'probe',actionKey:'probe|dfs|score=x',workSpent:120},
    {outcome:'failed',stageId:'rare',actionKey:'rare|beam|score=y',workSpent:30},
    {outcome:'success',ok:true,stageId:'main',actionKey:'main|beam|score=z',workSpent:40},
  ]},
  {id:'L11',ok:true,attempts:[
    {outcome:'failed',stageId:'probe',actionKey:'probe|dfs|score=x',workSpent:130},
    {outcome:'success',ok:true,stageId:'rare',actionKey:'rare|beam|score=y',workSpent:15},
    {outcome:'failed',stageId:'main',actionKey:'main|beam|score=z',workSpent:45},
  ]},
];

const ds=buildActionBoundaryDataset({levels},{source:'fixture'});
assert.equal(ds.rows.length,11);
assert.equal(ds.rows[0].priorOutcome,'start');
assert.equal(ds.rows[1].priorStage,'probe');
assert.equal(ds.rows[1].priorOutcome,'failed');
assert.equal(ds.rows[2].cumulativeWorkBand,'<100k');

const result=analyzeLegalSignalCapture(ds,{minSupports:[1]});
assert.equal(result.kind,'pathfinder-action-selection-legal-signal-shadow');
assert.equal(result.population.developmentRows,9);
assert.equal(result.population.validationRows,2);
assert.equal(result.families.length,4);

const stage=result.families.find(f=>f.family==='next-stage').thresholds[0];
assert.equal(stage.validationSolvedLevels,1);
assert.equal(stage.endangeredWinnerLevels,1);
assert.equal(stage.endangeredWinnerRate,1);

const contextual=result.families.find(f=>f.family==='prior-response+next-stage').thresholds[0];
assert.equal(contextual.endangeredWinnerLevels,1);
assert.ok(contextual.preWinnerWork>0);
assert.ok(contextual.diagnostics);
assert.equal(contextual.diagnostics.nominatedByPriorOutcome[0].key,'failed');
assert.equal(contextual.diagnostics.topSignatures[0].developmentWins,0);
assert.ok(contextual.diagnostics.nominatedSameStageContinuationWorkShare >= 0);
console.log('analyze-action-selection-legal-signals: ok');
