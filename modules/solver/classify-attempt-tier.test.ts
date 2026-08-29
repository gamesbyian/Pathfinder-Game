import assert from 'node:assert/strict';
import { test } from 'vitest';
import { classifyAttemptTier } from './orchestration.js';
import { SOLVER_STAGE_IDS } from './stage-policy.js';

test('classifyAttemptTier reads stageId first when present — legacy booleans never override it', () => {
    // stageId says one thing, every legacy boolean says another: stageId must win. This is the
    // shape a real Attempt can never actually have (withSolverStage sets both consistently), but
    // it proves the precedence, not just a coincidence of consistent fixtures.
    const conflicting = { stageId: 'admissible-order-fallback' as const, repairLateProbe: true, repair: true, admissibleOrder: false };
    assert.equal(classifyAttemptTier(conflicting), 'admissible-order-fallback');
});

test('classifyAttemptTier maps every canonical stageId to its own label (or the two documented renames), never the legacy fallthrough default', () => {
    // main-search and repair-shrink-recovery are the two stages whose label differs from their
    // own stageId — see STAGE_ID_TO_TIER_LABEL's own comment. Every other stageId is its own label.
    const renamed: Partial<Record<string, string>> = { 'main-search': 'main-ladder', 'repair-shrink-recovery': 'early-repair-search' };
    for (const stageId of SOLVER_STAGE_IDS) {
        if (stageId === 'explicit-prime' || stageId === 'legacy-latency-portfolio-pass' || stageId === 'legacy-latency-portfolio-fallback') continue;
        // Every legacy field is absent — if classifyAttemptTier ever silently fell through to the
        // legacy chain instead of reading a stageId it recognizes, non-main-loop stages would
        // misclassify as 'main-ladder', the legacy chain's own fallthrough default.
        const label = classifyAttemptTier({ stageId });
        assert.equal(label, renamed[stageId] ?? stageId, `${stageId} must map to its own canonical label`);
    }
});

test('classifyAttemptTier falls back to the legacy boolean chain ONLY when stageId is absent (compatibility for historical/duck-typed records)', () => {
    assert.equal(classifyAttemptTier({ repairLateProbe: true }), 'late-repair-search');
    assert.equal(classifyAttemptTier({ repair: true }), 'repair-fallback');
    assert.equal(classifyAttemptTier({}), 'main-ladder');
});
