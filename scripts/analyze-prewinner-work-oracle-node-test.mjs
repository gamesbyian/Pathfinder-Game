import assert from 'node:assert/strict';
import { analyzePrewinnerWorkDocuments, analyzeZeroWinActionShadow } from './analyze-prewinner-work-oracle.mjs';

const result = analyzePrewinnerWorkDocuments([{ source: 'fixture', document: { levels: [
  { id:'A', ok:true, attempts:[
    { outcome:'failed', workSpent:30, stageId:'early' },
    { outcome:'success', ok:true, workSpent:10, stageId:'late', actionKey:'winner' },
  ]},
  { id:'B', status:'success', attempts:[
    { outcome:'success', ok:true, workSpent:20, stageId:'early', actionKey:'first' },
  ]},
  { id:'C', ok:false, attempts:[{ outcome:'failed', workSpent:100 }]},
]}}]);

assert.equal(result.summary.solvedLevels, 2);
assert.equal(result.summary.winnerWasFirstAttempt, 1);
assert.equal(result.summary.winnerWasLaterAttempt, 1);
assert.equal(result.summary.totalAttemptWork, 60);
assert.equal(result.summary.preWinnerWork, 30);
assert.equal(result.summary.preWinnerWorkShare, .5);
assert.equal(result.levels.find(r => r.levelId === 'A').winnerIndex, 1);
assert.equal(result.byWinningStage.find(r => r.winningStage === 'late').preWinnerWork, 30);
assert.equal(result.predecessorWinningStagePairs[0].predecessorStage, 'early');
assert.equal(result.predecessorWinningStagePairs[0].winningStage, 'late');
assert.equal(result.predecessorWinningStagePairs[0].preWinnerWork, 30);

const shadow = analyzeZeroWinActionShadow({ levels: [
  { id:'A', ok:false, attempts:[{ outcome:'failed', actionKey:'rare', workSpent:10 }] },
  { id:'B', ok:true, attempts:[{ outcome:'success', ok:true, actionKey:'common', workSpent:5 }] },
  { id:'C', ok:true, attempts:[
    { outcome:'failed', actionKey:'common', workSpent:20 },
    { outcome:'success', ok:true, actionKey:'rare', workSpent:5 },
  ]},
]}, { minAttemptThresholds:[1] });
assert.equal(shadow.developmentLevels, 2);
assert.equal(shadow.validationLevels, 1);
assert.equal(shadow.policies[0].validationSolvedLevels, 1);
assert.equal(shadow.policies[0].lostWinners, 1);
assert.equal(shadow.policies[0].capturedPreWinnerWorkShare, 0);
console.log('analyze-prewinner-work-oracle: ok');
