import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile } from './types.js';
import { repairSearchFromGate } from './repair-search.js';

export interface RepairArmResult {
    solved: boolean;
    /** Canonical `prep._workMeter` delta actually consumed by this arm (sum across every seed it
     *  ran, not just the last one). */
    workSpent: number;
    nodesExpanded: number;
    seedSalts: number[];
}

export interface RestartVsContinuationResult {
    workBudget: number;
    continuation: RepairArmResult;
    restart: RepairArmResult;
}

/** Runs one fixed repair action/config/gate under the two equal-`workSpent`-envelope schedules
 *  docs/reports/2026-08-24-restart-continuation-value-audit.md's execution-readiness gate calls
 *  for: seed 0 continued to `workBudget` canonical work units, versus seed 0 to `workBudget / 2`
 *  then — only if seed 0 did not solve — a genuinely fresh seed 1 capped at the remaining budget.
 *
 *  The existing `repairLateProbeNodeBudgetOverride`-style knobs cap raw node counts, which the
 *  audit shows is the wrong currency: node-equated arms can still consume different canonical
 *  work because their trajectories invoke different amounts of scoring/topology/pruning/repair
 *  work. `repairSearchFromGate` already terminates on `prep._workCap` (see repair-search.ts's own
 *  budget check), so the missing piece is purely this sequencing, not a new production mechanism.
 *
 *  Both arms of the restart schedule share one `prep` (`_workMeter`/`_workCap` bookkeeping only —
 *  `repairSearchFromGate`'s own elites/nogood cache/PRNG streams are local to each call, so seed 1
 *  is a genuinely fresh trajectory regardless), following the identical "extend, don't share the
 *  depleted pool" `prep._workCap` sequencing orchestration.ts's own production multi-seed retry
 *  tier already uses. Failed seed-0 work is charged and summed into the restart arm's `workSpent`
 *  rather than discarded, so a caller cannot mistake "last seed's work" for "total work spent".
 *
 *  This is an offline/research harness only: it does not read or write any production scheduling
 *  state, and `makePrep` gives the caller full control of the level/prep construction (real corpus
 *  level, ablation config, research seed, etc). */
export async function runRepairRestartVsContinuation(
    gateKey: number,
    level: NormalizedLevel,
    makePrep: () => PrepLevel,
    profile: ScoringProfile,
    workBudget: number,
    opts: { budgetMs?: number; nodeBudget?: number } = {},
): Promise<RestartVsContinuationResult> {
    if (!(workBudget > 0)) throw new Error(`workBudget must be a positive number of canonical work units, got ${workBudget}`);
    const budgetMs = opts.budgetMs ?? 60_000;
    const nodeBudget = opts.nodeBudget ?? Infinity;

    async function runArm(prep: PrepLevel, seedSalt: number, workCap: number): Promise<{ solved: boolean; workSpentDelta: number; nodesExpandedDelta: number }> {
        const workBefore = prep._workMeter.units;
        const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
        prep._workCap = workCap;
        const out: { nodesExpanded?: number } = {};
        const solution = await repairSearchFromGate(gateKey, level, prep, profile, budgetMs, Date.now(), null, null, false, nodeBudget, out, seedSalt);
        return {
            solved: solution !== null,
            workSpentDelta: prep._workMeter.units - workBefore,
            nodesExpandedDelta: (prep._metrics ? prep._metrics.nodesExpanded : nodesBefore) - nodesBefore,
        };
    }

    const continuationPrep = makePrep();
    if (!continuationPrep._metrics) continuationPrep._metrics = { nodesExpanded: 0 };
    const continuationArm = await runArm(continuationPrep, 0, continuationPrep._workMeter.units + workBudget);
    const continuation: RepairArmResult = {
        solved: continuationArm.solved, workSpent: continuationArm.workSpentDelta,
        nodesExpanded: continuationArm.nodesExpandedDelta, seedSalts: [0],
    };

    const restartPrep = makePrep();
    if (!restartPrep._metrics) restartPrep._metrics = { nodesExpanded: 0 };
    const half = Math.floor(workBudget / 2);
    const seed0 = await runArm(restartPrep, 0, restartPrep._workMeter.units + half);
    const restart: RepairArmResult = seed0.solved
        ? { solved: true, workSpent: seed0.workSpentDelta, nodesExpanded: seed0.nodesExpandedDelta, seedSalts: [0] }
        : await (async () => {
            const remaining = Math.max(0, workBudget - seed0.workSpentDelta);
            const seed1 = await runArm(restartPrep, 1, restartPrep._workMeter.units + remaining);
            return {
                solved: seed1.solved,
                workSpent: seed0.workSpentDelta + seed1.workSpentDelta,
                nodesExpanded: seed0.nodesExpandedDelta + seed1.nodesExpandedDelta,
                seedSalts: [0, 1],
            };
        })();

    return { workBudget, continuation, restart };
}
