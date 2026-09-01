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

const capability = {
    levels: [
        {
            corpus: 'corpus2', levelId: 'R1',
            frozenT1SupportClass: 'frozen-t1-thin-boundary',
            solverCount: 1, singleton: true, doubleton: false,
        },
        {
            corpus: 'corpus2', levelId: 'R2',
            frozenT1SupportClass: 'production-miss-frozen-t1-solvable',
            solverCount: 3, singleton: false, doubleton: false,
        },
    ],
};

const result = analyzeEqualWorkProductionReach(equalWork, [production], {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(result.decisionBearing, true);
assert.deepEqual(result.blockers, []);
assert.equal(result.equalWork.techniques, 2);
assert.equal(result.production.matchedAttempts, 2);
assert.equal(result.production.rowsWithLifecycle, 2);
assert.equal(result.levelHeadroom.summary.levels, 2);
assert.equal(result.levelHeadroom.summary.ew1SolvableLevels, 1);
assert.equal(result.levelHeadroom.summary.productionMissEw1SolvableLevels, 1);
const r1 = result.levelHeadroom.levels.find(row => row.levelId === 'R1');
assert.equal(r1.pricingComparison, 'ew1-solver-offered-below-solve-work');
assert.equal(r1.ew1SolvedActions[0].ew1SolveWork, 100);
assert.equal(r1.ew1SolvedActions[0].productionMaxAttemptWork, 30);
assert.equal(r1.frozenCapability.frozenT1SupportClass, 'frozen-t1-thin-boundary');

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

const wrappedProduction = {
    summary: {
        commit: 'abc123',
        corpus: 'data/stress/stress-levels-random.json',
        lifecycleTelemetry: true,
    },
    levels: JSON.parse(JSON.stringify(production.levels)),
};
const wrappedResult = analyzeEqualWorkProductionReach(equalWork, [wrappedProduction], {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(wrappedResult.decisionBearing, true,
    'authentic level-blind sweep wrapper must be accepted without flattening');
assert.deepEqual(wrappedResult.production.commits, ['abc123']);
assert.deepEqual(wrappedResult.production.corpora, ['corpus2']);
assert.equal(wrappedResult.production.missingCommitDocuments, 0);
assert.equal(wrappedResult.production.rowsWithUnknownCorpus, 0);

const partiallyUnproven = [
    wrappedProduction,
    { levels: JSON.parse(JSON.stringify(production.levels)) },
];
const blockedMissingDocumentProvenance = analyzeEqualWorkProductionReach(equalWork, partiallyUnproven, {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(blockedMissingDocumentProvenance.decisionBearing, false);
assert.ok(blockedMissingDocumentProvenance.blockers.some(value => value.includes('without a solver commit')));
assert.ok(blockedMissingDocumentProvenance.blockers.some(value => value.includes('missing corpus identity')));

const missingWork = JSON.parse(JSON.stringify(production));
delete missingWork.levels[0].attempts[0].workSpent;
const blockedWork = analyzeEqualWorkProductionReach(equalWork, [missingWork], {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(blockedWork.decisionBearing, false);
assert.ok(blockedWork.blockers.some(value => value.includes('missing per-attempt workSpent')));

const missingLifecycle = JSON.parse(JSON.stringify(production));
missingLifecycle.levels[1].stageLifecycle = null;
const blockedLifecycle = analyzeEqualWorkProductionReach(equalWork, [missingLifecycle], {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(blockedLifecycle.decisionBearing, false);
assert.ok(blockedLifecycle.blockers.some(value => value.includes('missing stageLifecycle')));

const staleCommit = analyzeEqualWorkProductionReach(equalWork, [production], {
    currentHead: 'different',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(staleCommit.decisionBearing, false);
assert.ok(staleCommit.blockers.some(value => value.includes('does not match current HEAD')));

const summary = renderEqualWorkProductionReachSummary(result);
assert.match(summary, /Decision-bearing integration status: \*\*READY\*\*/u);
assert.match(summary, /beam\|score=intersectionHarvest/u);
assert.match(summary, /Level-local EW1 pricing headroom/u);
assert.match(summary, /ew1-solver-offered-below-solve-work/u);
assert.match(summary, /historical development evidence/u);

const incompleteProduction = JSON.parse(JSON.stringify(production));
incompleteProduction.levels = incompleteProduction.levels.filter(row => row.id !== 'R2');
const missingProduction = analyzeEqualWorkProductionReach(equalWork, [incompleteProduction], {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: capability,
});
assert.equal(missingProduction.decisionBearing, false);
assert.ok(missingProduction.blockers.some(value => value.includes('production evidence is missing 1 EW1 level')));

const missingCapability = analyzeEqualWorkProductionReach(equalWork, [production], {
    currentHead: 'abc123',
    requireCurrentHead: true,
    capabilityDocument: { levels: [capability.levels[0]] },
});
assert.equal(missingCapability.decisionBearing, false);
assert.ok(missingCapability.blockers.some(value => value.includes('capability input is missing 1 EW1 level')));

console.log('equal-work production reach join tests passed');
