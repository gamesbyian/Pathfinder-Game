import assert from 'node:assert/strict';
import { reconcileBroadEvidence } from './reconcile-broad-solver-evidence.mjs';

const equalWorkReach={
  decisionBearing:true,blockers:[],
  production:{commits:['abc'],currentHead:'abc',missingMatchedAttemptWork:0},
  techniques:[
    {attemptConfigIdentity:'dfs|score=a|bias=none',equalWork:{eligibleCells:60,solvedLevels:2,meanWork:9_000_000,workBudgetReached:58,naturallyExhausted:0},production:{reachedLevels:100,winningLevels:0,attempts:200,work:1000,meanAttemptWork:5,stages:[{stageId:'retry-a',attempts:200,successfulAttempts:0,work:1000}]}},
    {attemptConfigIdentity:'beam|score=b|bias=none|width=2000|retention=plain',equalWork:{eligibleCells:60,solvedLevels:0,meanWork:1_000_000,workBudgetReached:0,naturallyExhausted:60},production:{reachedLevels:80,winningLevels:5,attempts:80,work:500,meanAttemptWork:6.25,stages:[{stageId:'main-search',attempts:80,successfulAttempts:5,work:500}]}},
  ],
};
const censusAnalysis={
  isolatedTechniqueEconomics:[
    {technique:'dfs|score=a|bias=none',solved:3,meanAttemptNodes:100,unsharedWithCheaper:1,substitutionRate:2/3},
    {technique:'beam|score=b|bias=none|width=2000|retention=plain',solved:4,meanAttemptNodes:50,unsharedWithCheaper:4,substitutionRate:0},
  ],
  techniqueBudgetCurves:{populations:{productionUnsolved:{techniques:[
    {technique:'dfs|score=a|bias=none',fullBudgetSolves:3,fullObservedNodeSpend:1000,terminationCounts:{'node-budget-reached':2}},
    {technique:'beam|score=b|bias=none|width=2000|retention=plain',fullBudgetSolves:4,fullObservedNodeSpend:500,terminationCounts:{exhausted:60}},
  ]}}},
};
const result=reconcileBroadEvidence({equalWorkReach,censusAnalysis,productionSummary:{corpus1:{total:2,solved:1,work:10,nodes:9,commitSha:'abc'}},ws1Challenge:{actionBoundaryDigest:'sha256:x',combined:{capturedPreWinnerWorkShare:.08,endangeredWinnerLevels:0,validationSolvedLevels:10,diagnostics:{nominatedSameStageContinuationWorkShare:.95}}}});
assert.equal(result.summary.techniques,2);
assert.equal(result.summary.cheapMissCandidates,1);
assert.equal(result.summary.zeroWinProductionParticipants,1);
assert.equal(result.summary.deepCapabilityNoEw1SampleWin,1);
assert.equal(result.stages[0].stageId,'retry-a');
assert.equal(result.nominations.cheapMissCandidates[0].technique,'dfs|score=a|bias=none');
assert.equal(result.ws1.combined.endangeredWinnerLevels,0);
assert.ok(result.interpretation.forbidden.some(x=>x.includes('removable')));
console.log('reconcile-broad-solver-evidence: ok');
