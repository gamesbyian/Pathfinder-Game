import assert from 'node:assert/strict';
import { analyzeLegalSignalCapture, buildActionBoundaryDataset } from './analyze-action-selection-legal-signals.mjs';

const levels=[];
for(let i=0;i<60;i++){
  const id=`L${i}`;
  const rareWinner=i%11===0;
  levels.push({id,ok:true,attempts:[
    {outcome:'failed',stageId:'probe',actionKey:'probe|dfs|score=x',workSpent:100},
    rareWinner
      ? {outcome:'success',ok:true,stageId:'rare',actionKey:'rare|beam|score=y',workSpent:20}
      : {outcome:'failed',stageId:'rare',actionKey:'rare|beam|score=y',workSpent:20},
    rareWinner
      ? {outcome:'failed',stageId:'main',actionKey:'main|beam|score=z',workSpent:30}
      : {outcome:'success',ok:true,stageId:'main',actionKey:'main|beam|score=z',workSpent:30},
  ]});
}
const ds=buildActionBoundaryDataset({levels},{source:'fixture'});
assert.equal(ds.rows.length,180);
assert.equal(ds.rows[0].priorOutcome,'start');
assert.equal(ds.rows[1].priorStage,'probe');
assert.equal(ds.rows[1].priorOutcome,'failed');
assert.equal(ds.rows[2].cumulativeWorkBand,'<100k');

const result=analyzeLegalSignalCapture(ds,{minSupports:[1]});
assert.equal(result.kind,'pathfinder-action-selection-legal-signal-shadow');
assert.equal(result.families.length,4);
for(const f of result.families){
  assert.equal(f.thresholds.length,1);
  assert.ok(f.thresholds[0].validationSolvedLevels>0);
  assert.ok(f.thresholds[0].preWinnerWork>=0);
}
const stage=result.families.find(f=>f.family==='next-stage').thresholds[0];
assert.ok(stage.endangeredWinnerLevels>0,'stage-only zero-win development signatures must expose held-out rare-winner risk in fixture');
console.log('analyze-action-selection-legal-signals: ok');
