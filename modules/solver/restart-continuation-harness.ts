import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile } from './types.js';
import { repairSearchFromGate } from './repair-search.js';
import type { RepairStopReason } from './repair-search.js';

export interface RepairArmResult {
    solved: boolean;
    /** Canonical `prep._workMeter` delta actually consumed by this arm (sum across every seed it
     *  ran, not just the last one). */
    workSpent: number;
    nodesExpanded: number;
    seedSalts: number[];
    /** The BEST (lowest) `out.bestBadness` any seed in this arm reached — for the restart arm,
     *  the min across seed 0 and seed 1, since `repairSearchFromGate`'s own `bestBadnessEver` is
     *  local to each call and a seed 1 that never learns of seed 0's near-miss cannot be credited
     *  with recovering it. Diagnostic only: lets a caller tell "search made real progress but ran
     *  out of budget" apart from "search never moved," per the operating model's own rule to
     *  diagnose search-quality failure before prescribing more of the same search. `null` when
     *  solved (repairSearchFromGate does not report a badness for a success). */
    bestBadness: number | null;
    /** Why an unsolved arm stopped. `null` on success. A wall-clock stop means the requested
     * deterministic work envelope did not complete and the arm is invalid as equal-work evidence. */
    stopReason: RepairStopReason | null;
    /** Convenience projection for research callers that must fail closed on wall interference. */
    deadlineTruncated: boolean;
}

export interface RestartVsContinuationResult {
    workBudget: number;
    restartSplitFraction: number;
    continuation: RepairArmResult;
    restart: RepairArmResult;
}

/** Runs one fixed repair action/config/gate under the two equal-`workSpent`-envelope schedules
 *  docs/reports/2026-08-24-restart-continuation-value-audit.md's execution-readiness gate calls
 *  for: seed 0 continued to `workBudget` canonical work units, versus seed 0 to
 *  `workBudget * restartSplitFraction` (default 0.5, the audit's own primary 50/50 comparison)
 *  then — only if seed 0 did not solve — a genuinely fresh seed 1 capped at the remaining budget.
 *  A non-default `restartSplitFraction` is a DIFFERENT treatment from the audit's primary
 *  comparison (e.g. a small insurance tail for seed 1 rather than an even split) — see
 *  docs/reports/2026-08-26-restart-vs-continuation-near-miss-development-pilot.md's "what remains
 *  open" for why the 50/50 form being closed does not by itself rule out an unequal one.
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
    opts: { budgetMs?: number; nodeBudget?: number; restartSplitFraction?: number } = {},
): Promise<RestartVsContinuationResult> {
    if (!(workBudget > 0)) throw new Error(`workBudget must be a positive number of canonical work units, got ${workBudget}`);
    const budgetMs = opts.budgetMs ?? 60_000;
    const nodeBudget = opts.nodeBudget ?? Infinity;
    const restartSplitFraction = opts.restartSplitFraction ?? 0.5;
    if (!(restartSplitFraction > 0 && restartSplitFraction < 1)) throw new Error(`restartSplitFraction must be in (0, 1), got ${restartSplitFraction}`);

    async function runArm(prep: PrepLevel, seedSalt: number, workCap: number): Promise<{ solved: boolean; workSpentDelta: number; nodesExpandedDelta: number; bestBadness: number | null; stopReason: RepairStopReason | null }> {
        const workBefore = prep._workMeter.units;
        const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
        prep._workCap = workCap;
        const out: { nodesExpanded?: number; bestBadness?: number; stopReason?: RepairStopReason } = {};
        const solution = await repairSearchFromGate(gateKey, level, prep, profile, budgetMs, Date.now(), null, null, false, nodeBudget, out, seedSalt);
        return {
            solved: solution !== null,
            workSpentDelta: prep._workMeter.units - workBefore,
            nodesExpandedDelta: (prep._metrics ? prep._metrics.nodesExpanded : nodesBefore) - nodesBefore,
            bestBadness: solution !== null ? null : (out.bestBadness ?? null),
            stopReason: solution !== null ? null : (out.stopReason ?? null),
        };
    }

    const continuationPrep = makePrep();
    if (!continuationPrep._metrics) continuationPrep._metrics = { nodesExpanded: 0 };
    const continuationArm = await runArm(continuationPrep, 0, continuationPrep._workMeter.units + workBudget);
    const continuation: RepairArmResult = {
        solved: continuationArm.solved, workSpent: continuationArm.workSpentDelta,
        nodesExpanded: continuationArm.nodesExpandedDelta, seedSalts: [0], bestBadness: continuationArm.bestBadness,
        stopReason: continuationArm.stopReason,
        deadlineTruncated: continuationArm.stopReason === 'wall-clock',
    };

    const restartPrep = makePrep();
    if (!restartPrep._metrics) restartPrep._metrics = { nodesExpanded: 0 };
    const seed0Share = Math.floor(workBudget * restartSplitFraction);
    const seed0 = await runArm(restartPrep, 0, restartPrep._workMeter.units + seed0Share);
    const restart: RepairArmResult = seed0.solved
        ? {
            solved: true, workSpent: seed0.workSpentDelta, nodesExpanded: seed0.nodesExpandedDelta,
            seedSalts: [0], bestBadness: null, stopReason: null, deadlineTruncated: false,
        }
        : seed0.stopReason === 'wall-clock'
            // Do not "rescue" a right-censored first half by giving seed 1 the unspent work.
            // Once wall time prevents seed 0 from reaching its prescribed split, this arm is no
            // longer the requested treatment and must surface as invalid evidence immediately.
            ? {
                solved: false, workSpent: seed0.workSpentDelta, nodesExpanded: seed0.nodesExpandedDelta,
                seedSalts: [0], bestBadness: seed0.bestBadness, stopReason: 'wall-clock', deadlineTruncated: true,
            }
            : await (async () => {
                const remaining = Math.max(0, workBudget - seed0.workSpentDelta);
                const seed1 = await runArm(restartPrep, 1, restartPrep._workMeter.units + remaining);
                return {
                    solved: seed1.solved,
                    workSpent: seed0.workSpentDelta + seed1.workSpentDelta,
                    nodesExpanded: seed0.nodesExpandedDelta + seed1.nodesExpandedDelta,
                    seedSalts: [0, 1],
                    // The BEST of the two seeds, not just seed 1's own number: repairSearchFromGate's
                    // `bestBadnessEver` is local to each call (resets to Infinity per seed), so a naive
                    // "report the last seed's bestBadness" would understate the restart arm whenever
                    // seed 0 found a better near-miss before being abandoned — exactly the progress a
                    // fresh seed 1 has no way to know about or recover.
                    bestBadness: seed1.bestBadness == null ? seed0.bestBadness
                        : seed0.bestBadness == null ? seed1.bestBadness
                        : Math.min(seed0.bestBadness, seed1.bestBadness),
                    stopReason: seed1.stopReason,
                    deadlineTruncated: seed1.stopReason === 'wall-clock',
                };
            })();

    return { workBudget, restartSplitFraction, continuation, restart };
}
