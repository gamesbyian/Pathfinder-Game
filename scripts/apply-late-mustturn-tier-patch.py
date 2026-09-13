from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    'modules/solver/attempts.ts',
    "const repairMustTurnBiasedAttempt = (): AttemptConfig => ({ scoringProfileId: 'repair', orderingBias: null, repair: true, repairMustTurnBiased: true });",
    "export const repairMustTurnBiasedAttempt = (): AttemptConfig => ({ scoringProfileId: 'repair', orderingBias: null, repair: true, repairMustTurnBiased: true });",
)

replace_once(
    'modules/solver/ablation-config.ts',
    "    STRATEGY_REPAIR_MUSTTURN_BIAS: 'Second, exit-guidance-biased repair attempt on must-turn levels',\n",
    "    STRATEGY_REPAIR_MUSTTURN_BIAS: 'Second, exit-guidance-biased repair attempt on must-turn levels',\n"
    "    STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY: 'Production default-OFF experiment: after the ordinary late-repair-search has failed on a must-turn level with no configured repair fallback, grant one fresh additive 7M-node repair attempt using the exact must-turn-biased guidance primitive. Evidence: reports/2026-09-13-must-turn-biased-repair-dose-pilot-001.md.',\n",
)
replace_once(
    'modules/solver/ablation-config.ts',
    "    'STRATEGY_REPAIR_TURN_BIAS',\n",
    "    'STRATEGY_REPAIR_TURN_BIAS',\n    'STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY',\n",
)

p = Path('modules/solver/stage-id-normalization.mjs')
text = p.read_text()
old = "'late-repair-search', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry'"
if text.count(old) != 2:
    raise SystemExit(f"stage-id-normalization: expected two list occurrences, found {text.count(old)}")
p.write_text(text.replace(old, "'late-repair-search', 'late-repair-must-turn-biased-retry', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry'"))

replace_once(
    'modules/solver/stage-policy.ts',
    "    ['late-repair-search', 120, 'production-default', 'retry', 'late repair probe enabled', 'configured-repair', 'fixed-node-cap', 'late-repair-search'],\n",
    "    ['late-repair-search', 120, 'production-default', 'retry', 'late repair probe enabled', 'configured-repair', 'fixed-node-cap', 'late-repair-search'],\n"
    "    ['late-repair-must-turn-biased-retry', 122, 'opt-in', 'retry', 'ordinary late repair participated and failed; must-turn present; experiment flag enabled', 'configured-repair', 'fixed-node-cap', 'late-repair-must-turn-biased-retry'],\n",
)

replace_once(
    'modules/solver/stage-budget-core.ts',
    "export const REPAIR_LATE_PROBE_NODE_BUDGET = 5_000_000;\n",
    "export const REPAIR_LATE_PROBE_NODE_BUDGET = 5_000_000;\n\n"
    "/** Default-off integration-test dose for the additive must-turn-biased retry immediately\n"
    " * after late-repair-search. 7M is the smallest matched-node dose that reproduced both\n"
    " * R02768 (1,179,294) and R02180 (6,206,072) while same-dose standard repair failed.\n"
    " * Keep separate from REPAIR_LATE_PROBE_NODE_BUDGET until population economics earn promotion. */\n"
    "export const REPAIR_LATE_MUSTTURN_BIASED_RETRY_NODE_BUDGET = 7_000_000;\n",
)

replace_once(
    'modules/solver/orchestration-additive-retry-tiers.ts',
    "import { GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS, repairAttempt } from './attempts.js';",
    "import { GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS, repairAttempt, repairMustTurnBiasedAttempt } from './attempts.js';",
)
replace_once(
    'modules/solver/orchestration-additive-retry-tiers.ts',
    "import type { StageBudgetPlan } from './stage-budget.js';\nimport type { computeShrinkRecoveryBudget } from './stage-budget.js';",
    "import { REPAIR_LATE_MUSTTURN_BIASED_RETRY_NODE_BUDGET } from './stage-budget.js';\nimport type { StageBudgetPlan, computeShrinkRecoveryBudget } from './stage-budget.js';",
)

marker = "\n    // Last-resort SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE retry pass (GOAL_ATTRACTION_GUIDANCE_"
block = r'''

    // Default-off additive must-turn-guidance retry. The ordinary 5M late-repair attempt must have
    // actually participated first; eligibility alone is insufficient because a depleted outer
    // ceiling could otherwise let the child treatment leapfrog the control. This stage does not
    // borrow or withhold work/nodes from any earlier tier: it gets a separate 7M stage-local cap and
    // fresh work scope only after the plain attempt has failed.
    if (!result.solution
        && repairLateProbeTierWillRun
        && cfg?.STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY === true
        && repairConfigs.length === 0
        && (level.mustPassTurnDirs?.size ?? 0) > 0
        && result.attempts.some(attempt => attempt.stageId === 'late-repair-search')) {
        const lateMustTurnConfig = repairMustTurnBiasedAttempt();
        const stageEntryNodes = prep._metrics!.nodesExpanded;
        const stageStart = Date.now();
        const stageWorkBudget = scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK);
        await withWorkCapScope(prep, prep._workMeter.units + stageWorkBudget, async () => {
            for (let gi = 0; gi < activeGates.length; gi++) {
                const ownBudgetRemaining = REPAIR_LATE_MUSTTURN_BIASED_RETRY_NODE_BUDGET
                    - (prep._metrics!.nodesExpanded - stageEntryNodes);
                if (ownBudgetRemaining <= 0) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - stageStart;
                const gatesLeft = activeGates.length - gi;
                const retryBudget = Math.floor((timeBudgetMs - elapsed) / gatesLeft);
                if (retryBudget < 50) break;
                const r = await runAttempt(
                    gateKey, level, prep, lateMustTurnConfig, retryBudget, Date.now(), yieldFn,
                    ownBudgetRemaining,
                );
                result.attempts.push(withSolverStage(r.attempt, 'late-repair-must-turn-biased-retry'));
                if (r.path) { result.solution = r.path; break; }
            }
        });
    }
'''
p = Path('modules/solver/orchestration-additive-retry-tiers.ts')
text = p.read_text()
if text.count(marker) != 1:
    raise SystemExit(f"orchestration marker count {text.count(marker)}")
p.write_text(text.replace(marker, block + marker, 1))

Path('scripts/late-mustturn-tier-unit-tests.mjs').write_text(r'''import { describe, expect, it } from 'vitest';
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
''')
