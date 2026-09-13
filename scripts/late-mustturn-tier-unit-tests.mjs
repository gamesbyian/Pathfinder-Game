import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../modules/solver/ablation-config.js';
import { repairMustTurnBiasedAttempt } from '../modules/solver/attempts.js';
import { formatAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { SOLVER_STAGE_IDS, normalizeSolverStageId } from '../modules/solver/stage-id-normalization.mjs';
import { solverStageSpec } from '../modules/solver/stage-policy.js';
import { REPAIR_LATE_MUSTTURN_BIASED_RETRY_NODE_BUDGET } from '../modules/solver/stage-budget.js';

describe('late must-turn-biased repair integration contract', () => {
    it('stays default-off at a 7M stage-local dose', () => {
        expect(defaultConfig().STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY).toBe(false);
        expect(REPAIR_LATE_MUSTTURN_BIASED_RETRY_NODE_BUDGET).toBe(7_000_000);
    });

    it('dispatches the exact canonical isolated technique', () => {
        expect(formatAttemptIdentityKey(repairMustTurnBiasedAttempt()))
            .toBe('repair|score=repair|guidance=must-turn-biased');
    });

    it('is a canonical opt-in stage immediately after plain late repair', () => {
        const id = 'late-repair-must-turn-biased-retry';
        expect(normalizeSolverStageId(id)).toBe(id);
        expect(SOLVER_STAGE_IDS).toContain(id);
        expect(solverStageSpec(id).disposition).toBe('opt-in');
        expect(solverStageSpec('late-repair-search').order).toBeLessThan(solverStageSpec(id).order);
        expect(solverStageSpec(id).order).toBeLessThan(solverStageSpec('guidance-goal-distance-retry').order);
    });
});
