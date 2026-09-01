#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
    analyzeEqualWorkProductionReach,
    renderEqualWorkProductionReachSummary,
} from './analyze-equal-work-production-reach.mjs';

const equalWork = {
    results: [
        {
            tier: 'EW1', corpus: 'corpus2', levelId: 'R1',
            techniqueKeys: ['beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'],
            ok: true, status: 'success', workSpent: 100, workBudget: 1000,
        },
        {
            tier: 'EW1', corpus: 'corpus2', levelId: 'R2',
            techniqueKeys: ['dfs:repair:repair'],
            ok: false, status: 'work-budget-reached', workSpent: 1000, workBudget: 1000,
        },
    ],
};

const production = {
    commitSha: 'abc123',
    corpus: 'data/stress/stress-levels-random.json',
    levels: [
        {
            id: 'R1',
            stageLifecycle: { 'main-search': { reached: true, actualWork: 30 } },
            attempts: [{
                stageId: 'main-loop',
                actionKey: 'main-loop|beam:intersectionHarvest@beam5000(diverse)',
                profile: 'intersectionHarvest',
                beamWidth: 5000,
                diverseBeam: true,
                workSpent: 30,
                ok: false,
            }],
        },
        {
            id: 'R2',
            stageLifecycle: { 'early-repair-search': { reached: true, actualWork: 40 } },
            attempts: [{
                stageId: 'repair-probe',
                actionKey: 'repair-probe|dfs:repair:repair|seedSalt=0',
                profile: 'repair',
                repair: true,
                workSpent: 40,
                ok: true,
            }],
        },
    ],
};

const result = analyzeEqualWorkProductionReach(equalWork, [production], {
    currentHead: 'abc123',
    requireCurrentHead: true,
});
assert.equal(result.decisionBearing, true);
assert.deepEqual(result.blockers, []);
assert.equal(result.equalWork.techniques, 2);
assert.equal(result.production.matchedAttempts, 2);
assert.equal(result.production.rowsWithLifecycle, 2);

const beam = result.techniques.find(row =>
    row.attemptConfigIdentity === 'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets');
assert.equal(beam.production.reachedLevels, 1);
assert.equal(beam.production.work, 30);
assert.deepEqual(beam.production.stages, [{
    stageId: 'main-search',
    attempts: 1,
    successfulAttempts: 0,
    work: 30,
    missingWorkAttempts: 0,
    actionKeys: ['main-search|beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'],
}]);

const repair = result.techniques.find(row =>
    row.attemptConfigIdentity === 'repair|score=repair|guidance=standard');
assert.equal(repair.equalWork.eligibleCells, 1,
    'legacy EW1 config identity must normalize before the join');
assert.equal(repair.production.winningLevels, 1);
assert.deepEqual(repair.production.stages[0].actionKeys,
    ['early-repair-search|repair|score=repair|guidance=standard|seedSalt=0']);

const missingWork = structuredClone(production);
delete missingWork.levels[0].attempts[0].workSpent;
const blockedWork = analyzeEqualWorkProductionReach(equalWork, [missingWork], {
    currentHead: 'abc123',
    requireCurrentHead: true,
});
assert.equal(blockedWork.decisionBearing, false);
assert.ok(blockedWork.blockers.some(value => value.includes('missing per-attempt workSpent')));

const missingLifecycle = structuredClone(production);
missingLifecycle.levels[1].stageLifecycle = null;
const blockedLifecycle = analyzeEqualWorkProductionReach(equalWork, [missingLifecycle], {
    currentHead: 'abc123',
    requireCurrentHead: true,
});
assert.equal(blockedLifecycle.decisionBearing, false);
assert.ok(blockedLifecycle.blockers.some(value => value.includes('missing stageLifecycle')));

const staleCommit = analyzeEqualWorkProductionReach(equalWork, [production], {
    currentHead: 'different',
    requireCurrentHead: true,
});
assert.equal(staleCommit.decisionBearing, false);
assert.ok(staleCommit.blockers.some(value => value.includes('does not match current HEAD')));

const summary = renderEqualWorkProductionReachSummary(result);
assert.match(summary, /Decision-bearing integration status: \*\*READY\*\*/u);
assert.match(summary, /beam\|score=intersectionHarvest/u);

console.log('equal-work production reach join tests passed');
