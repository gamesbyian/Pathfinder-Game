#!/usr/bin/env node
/**
 * Regression coverage for early-repair-search-badness-report.mjs's stage-id matching: it used to
 * compare `a.stageId === 'early-repair-search'` directly (with a null-stageId legacy-boolean
 * fallback), so a historical row carrying the literal legacy stageId string `'repair-probe'`
 * (not null, but the OLD string) matched neither branch and was silently dropped instead of being
 * recognized as the canonical early-repair-search stage. Fixed by routing every non-null stageId
 * through normalizeSolverStageId().
 */
import assert from 'node:assert/strict';
import { isEarlyRepairSearchAttempt, levelBadnessInfo } from './early-repair-search-badness-report.mjs';

assert.equal(isEarlyRepairSearchAttempt({ stageId: 'early-repair-search' }), true);
assert.equal(isEarlyRepairSearchAttempt({ stageId: 'repair-probe' }), true,
    'the legacy stageId string must normalize to early-repair-search, not be silently dropped');
assert.equal(isEarlyRepairSearchAttempt({ stageId: 'main-search' }), false);
assert.equal(isEarlyRepairSearchAttempt({ stageId: null, earlyRepairSearch: true }), true);
assert.equal(isEarlyRepairSearchAttempt({ stageId: null, repairProbe: true }), true);
assert.equal(isEarlyRepairSearchAttempt({ stageId: null }), false);

const row = {
    id: 'R00042', ok: true,
    attempts: [
        // Legacy stageId string -- must still be recognized as the ordinary early-repair-search tier.
        { stageId: 'repair-probe', repair: true, bestBadness: 7, ok: false },
        { stageId: 'repair-probe', repair: true, repairMustTurnBiased: true, bestBadness: 2, ok: true, nodesExpanded: 500 },
    ],
};
const info = levelBadnessInfo(row);
assert.equal(info.ordinaryBestBadness, 7, 'the legacy-stageId ordinary attempt must be counted');
assert.equal(info.hasBiasedTier, true);
assert.equal(info.biasedSolved, true);
assert.equal(info.biasedBestBadness, 2);
assert.equal(info.biasedNodes, 500);

console.log('early-repair-search-badness-report: all tests passed');
