// Serial and interleaved main-search attempt scheduling: divides a level's shared work/node/ms
// budget across (gate, attemptConfig) pairs and runs them via orchestration-run-attempt.ts's
// runAttempt. See orchestration.ts's header for the split this file is part of.
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig } from './types.js';
import { runAttempt } from './orchestration-run-attempt.js';
import { MIN_ATTEMPT_WORK } from './orchestration-contracts.js';
import type { Attempt, SearchResult, YieldFn } from './orchestration-contracts.js';

/** Many-gate levels (≥ this) dilute budget across configs×gates faster than genuinely
 *  infeasible gates get pruned out (16 configs × 4 gates = 64 even slices on a 4-gate
 *  level — stress-corpus finding: S118). Deliberately 4, not 3: nodesExpanded is a noisy
 *  proxy (a structurally bushier dead-end gate can out-expand a constrained correct one),
 *  and a 3-gate A/B (S142) regressed solved→timeout under this weighting — so it's scoped
 *  to the population it was verified on. No published level has more than 3 gates, so this
 *  threshold means the published corpus is provably untouched by this code path. */
const ADAPTIVE_GATE_THRESHOLD = 4;
/** Floor on the per-gate weight multiplier once adaptive weighting kicks in: even a gate
 *  that shows little search activity keeps this fraction of its flat even-split share, so
 *  an efficiently-pruned-but-actually-correct gate is never starved to near zero. */
const ADAPTIVE_GATE_WEIGHT_FLOOR = 0.35;

/** Weight for `gateKey`'s next budget share, based on nodesExpanded accumulated so far
 *  (a proxy for "this gate has live search activity" vs. "attempts here prune out fast").
 *  Returns 1 (no skew) until every gate has contributed at least one data point. */
/** The solver's SINGLE attempt-budget allocation point — both attempt loops below route through it.
 *
 *  `attBudget = minBudgetFraction > 0 ? max(floor(minFloorBase * minBudgetFraction), evenShare)
 *                                     : evenShare`, where `evenShare = floor(remaining / unitsLeft)`.
 *  The two loops differ ONLY in what they pass as `minFloorBase` (the interleaved loop floors
 *  against a whole gate's share; the sequential loop against the gate's own remaining budget), which
 *  is exactly the difference that was easy to get wrong while the arithmetic lived inline twice.
 *
 *  DELIBERATELY CURRENCY-AGNOSTIC: nothing here is milliseconds. It divides a remainder of *some*
 *  budget among the units still to be served. Today every caller passes milliseconds, which is the
 *  root of the solver's run-to-run non-determinism — `remaining` is then derived from wall clock, so
 *  machine speed resizes every attempt and compounds across the ladder (84.2% of genuine repeat runs
 *  fail to reproduce their node count; see docs/solver-budget-determinism.md). Switching the
 *  currency to nodes is that document's Phase 2 and changes this function's two call sites, not this
 *  function. Extracting it is Phase 1, and is a strict no-op: the formula is unchanged.
 *
 *  Not the only budget arithmetic in the file — the repair fallback, the goal-attraction-disabled-retry pass
 *  and the admissible-order-fallback tier each scale `timeBudgetMs` by their own FRACTION rather than
 *  dividing a remainder, so they are a separate (and currency-agnostic-by-construction) concern. */

/** The ms-to-work calibration lives in budget-units.ts so every compatibility boundary shares one
 * committed value. Allocation determinism comes from explicit work budgets, not from that rate. */

export function attemptBudgetShare(remaining: number, unitsLeft: number, minFloorBase: number, minBudgetFraction: number): number {
    const evenShare = Math.floor(remaining / unitsLeft);
    return minBudgetFraction > 0
        ? Math.max(Math.floor(minFloorBase * minBudgetFraction), evenShare)
        : evenShare;
}

function adaptiveGateWeight(gateKey: number, gateProgress: Map<number, number>): number {
    const total = [...gateProgress.values()].reduce((a, b) => a + b, 0);
    if (total <= 0) return 1;
    const n = gateProgress.size;
    const share = (gateProgress.get(gateKey) ?? 0) / total;
    return Math.max(ADAPTIVE_GATE_WEIGHT_FLOOR, (share * n) ** 2);
}

export async function runInterleavedAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity, workBudget = Infinity, workStart = 0,
    earlyConfigNodeBudget = nodeBudget, lateConfigStart = baseConfigs.length,
    earlyConfigWorkBudget = workBudget,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    let pairsLeft = baseConfigs.length * activeGates.length;
    let earlyNodeBudgetReached = false;
    let earlyWorkBudgetReached = false;
    const lateConfigCount = baseConfigs.length - lateConfigStart;
    const latePairCount = lateConfigCount * activeGates.length;

    // Adaptive gate weighting only engages on genuinely dilution-prone levels, and only
    // from the second full config round onward — round 0 always runs at the flat even
    // split so every gate contributes at least one real signal before any skew applies.
    // Ablation: STRATEGY_ADAPTIVE_GATE_BUDGET forces the flat even split at any gate count.
    const cfg = prep._cfg;
    const adaptive = (!cfg || cfg.STRATEGY_ADAPTIVE_GATE_BUDGET) && activeGates.length >= ADAPTIVE_GATE_THRESHOLD;
    const gateProgress = adaptive ? new Map(activeGates.map(g => [g, 0])) : null;

    configLoop: for (let ci = 0; ci < baseConfigs.length; ci++) {
        for (let gi = 0; gi < activeGates.length; gi++) {
            const gateKey = activeGates[gi];
            const elapsed = Date.now() - levelStartTime;
            const latePairIndex = ci >= lateConfigStart
                ? (ci - lateConfigStart) * activeGates.length + gi
                : -1;
            // Give every beneficiary pair its own cumulative slice. Merely exposing the whole
            // reserve to the suffix would let its first config/gate consume everything and recreate
            // the same starvation one position later.
            const configNodeBudget = latePairIndex >= 0
                ? earlyConfigNodeBudget + Math.floor((nodeBudget - earlyConfigNodeBudget) * (latePairIndex + 1) / latePairCount)
                : earlyConfigNodeBudget;
            const nodesSpent = prep._metrics ? prep._metrics.nodesExpanded : 0;
            if (elapsed >= timeBudgetMs) return { solution: null, attempts };
            if (nodesSpent >= configNodeBudget) {
                if (earlyConfigNodeBudget < nodeBudget && ci < lateConfigStart) {
                    earlyNodeBudgetReached = true;
                    pairsLeft = (baseConfigs.length - lateConfigStart) * activeGates.length;
                    ci = lateConfigStart - 1;
                    continue configLoop;
                }
                if (latePairIndex + 1 < latePairCount) { pairsLeft--; continue; }
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            // WORK-side mirror of the node-side check just above (2026-08-26 fix for the
            // confirm-residual-001 gap — see solveLevel's mainSearchLateWorkReserveEligible comment for
            // the full rationale). Before this, the only work-budget stop condition in this loop was
            // the flat check that used to live where budgetLeft is now computed below
            // (`workSpent >= workBudget`), with no reserve carve-out at all: a work-expensive early
            // config population could exhaust workBudget long before ever reaching the reserve-
            // protected late suffix, even while the NODE dimension above still had headroom. Same
            // escalating-slice-per-late-pair shape as configNodeBudget, keyed off workBudget instead
            // of nodeBudget.
            const configWorkBudget = latePairIndex >= 0
                ? earlyConfigWorkBudget + Math.floor((workBudget - earlyConfigWorkBudget) * (latePairIndex + 1) / latePairCount)
                : earlyConfigWorkBudget;
            const workSpent = prep._workMeter.units - workStart;
            if (workSpent >= configWorkBudget) {
                if (earlyConfigWorkBudget < workBudget && ci < lateConfigStart) {
                    earlyWorkBudgetReached = true;
                    pairsLeft = (baseConfigs.length - lateConfigStart) * activeGates.length;
                    ci = lateConfigStart - 1;
                    continue configLoop;
                }
                if (latePairIndex + 1 < latePairCount) { pairsLeft--; continue; }
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR gates the per-attempt-config minimum
            // budget-share floor (long-multigate perimeter beams, must-cross diverse-beam
            // threads) — disabling it falls back to the flat even split for every config.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            // The remainder being divided is WORK, never wall clock — that is what makes the whole
            // schedule a function of (level, workBudget) alone. See work-meter.ts. Divided out of
            // configWorkBudget (the late-reserve-aware ceiling computed above), not the flat
            // workBudget, so a late-window config's own attempt allocation stays capped at its own
            // escalating slice too — mirroring remainingNodeBudget's identical use of configNodeBudget
            // (rather than the flat nodeBudget) below.
            const budgetLeft = configWorkBudget - workSpent;
            let attBudget = attemptBudgetShare(budgetLeft, pairsLeft, budgetLeft / activeGates.length, minFrac);
            if (gateProgress && ci >= 1) {
                // adaptiveGateWeight is unbounded above ((share*n)**2 for a gate that has been
                // getting more than its "fair" 1/n share of progress) — every OTHER path through
                // attemptBudgetShare above (the plain even split, and the minBudgetFraction floor,
                // which is itself bounded by budgetLeft/activeGates.length) already keeps attBudget
                // <= budgetLeft by construction, so this clamp preserves that same invariant rather
                // than changing the weighting's own (validated, S142-scoped) relative aggressiveness.
                // Without it, a single heavily-weighted attempt could claim several times budgetLeft,
                // overspending this tier's declared workBudget before the outer `workSpent >= configWorkBudget`
                // check on the NEXT iteration ever gets a chance to stop it.
                attBudget = Math.min(budgetLeft, Math.max(MIN_ATTEMPT_WORK, Math.floor(attBudget * adaptiveGateWeight(gateKey, gateProgress))));
            }
            if (attBudget < MIN_ATTEMPT_WORK) return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            prep._workCap = Math.min(prep._workMeter.units + attBudget, prep._strictWorkCap ?? Infinity);

            // Remaining GLOBAL node budget, recomputed fresh before each attempt (same pattern as the
            // repair fallback below): beam/DFS count nodes LOCAL to the call, so the remainder makes a
            // single attempt stop mid-search when the cumulative budget is hit, instead of only being
            // caught by the between-attempts check above after it has already run its full time slice.
            const remainingNodeBudget = configNodeBudget === Infinity ? Infinity : Math.max(0, configNodeBudget - (prep._metrics ? prep._metrics.nodesExpanded : 0));
            // The attempt's ms figure is the DEADLINE's remainder, not a share — it can truncate
            // the attempt but never sized it. prep._workCap (above) is what actually bounds it.
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], timeBudgetMs - elapsed, Date.now(), yieldFn, remainingNodeBudget);
            if (ci >= lateConfigStart) result.attempt.mainSearchLateReserve = true;
            if (ci < lateConfigStart && (prep._metrics ? prep._metrics.nodesExpanded : 0) >= earlyConfigNodeBudget) {
                earlyNodeBudgetReached = earlyConfigNodeBudget < nodeBudget;
            }
            if (ci < lateConfigStart && (prep._workMeter.units - workStart) >= earlyConfigWorkBudget) {
                earlyWorkBudgetReached = earlyConfigWorkBudget < workBudget;
            }
            if (gateProgress) {
                gateProgress.set(gateKey, (gateProgress.get(gateKey) ?? 0) + (result.attempt.nodesExpanded ?? 0));
            }
            attempts.push(result.attempt);
            pairsLeft--;
            if (result.path) return { solution: result.path, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
        }
    }
    return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
}

export async function runGateSerialAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity, workBudget = Infinity, workStart = 0,
    earlyConfigNodeBudget = nodeBudget, lateConfigStart = baseConfigs.length,
    lateWorkReserveFraction = 0,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    const cfg = prep._cfg;
    let earlyNodeBudgetReached = false;
    let earlyWorkBudgetReached = false;
    const lateConfigCount = baseConfigs.length - lateConfigStart;
    const latePairCount = lateConfigCount * activeGates.length;

    for (let gi = 0; gi < activeGates.length; gi++) {
        const gateKey = activeGates[gi];
        const gateElapsed = Date.now() - levelStartTime;
        if (gateElapsed >= timeBudgetMs) return { solution: null, attempts };
        if ((prep._metrics ? prep._metrics.nodesExpanded : 0) >= nodeBudget) return { solution: null, attempts };

        // This gate's slice of the remaining WORK, and the mark it measures its own spend from.
        const gateStartUnits = prep._workMeter.units;
        const workSpent = prep._workMeter.units - workStart;
        if (workSpent >= workBudget) return { solution: null, attempts };
        const gatesLeft = activeGates.length - gi;
        const gateBudget = Math.floor((workBudget - workSpent) / gatesLeft);
        // WORK-side mirror of earlyConfigNodeBudget, sized fresh per gate (2026-08-26 fix for the
        // confirm-residual-001 gap — see runInterleavedAttempts's identical-purpose configWorkBudget,
        // and solveLevel's mainSearchLateWorkReserveEligible comment, for the full rationale). Unlike
        // the node dimension, work here is already divided into a fresh per-gate slice (gateBudget,
        // just above) rather than one shared global pool, so the reserve is carved as a FRACTION of
        // each gate's own slice rather than an absolute global ceiling threaded in from the caller.
        // `lateConfigCount === 0` (no reserve window at all) forces this to exactly gateBudget
        // regardless of the fraction, matching earlyConfigNodeBudget defaulting to nodeBudget
        // whenever the reserve is disabled.
        const earlyGateWorkBudget = lateConfigCount > 0
            ? gateBudget - Math.floor(gateBudget * lateWorkReserveFraction)
            : gateBudget;

        for (let ci = 0; ci < baseConfigs.length; ci++) {
            const latePairIndex = ci >= lateConfigStart
                ? gi * lateConfigCount + (ci - lateConfigStart)
                : -1;
            const configNodeBudget = latePairIndex >= 0
                ? earlyConfigNodeBudget + Math.floor((nodeBudget - earlyConfigNodeBudget) * (latePairIndex + 1) / latePairCount)
                : earlyConfigNodeBudget;
            if (earlyConfigNodeBudget < nodeBudget && (prep._metrics ? prep._metrics.nodesExpanded : 0) >= configNodeBudget) {
                if (ci < lateConfigStart) { earlyNodeBudgetReached = true; continue; }
                if (latePairIndex + 1 < latePairCount) continue;
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            const configWorkBudget = latePairIndex >= 0
                ? earlyGateWorkBudget + Math.floor((gateBudget - earlyGateWorkBudget) * (latePairIndex + 1) / latePairCount)
                : earlyGateWorkBudget;
            const elapsed = prep._workMeter.units - gateStartUnits;
            if (earlyGateWorkBudget < gateBudget && elapsed >= configWorkBudget) {
                if (ci < lateConfigStart) { earlyWorkBudgetReached = true; continue; }
                if (latePairIndex + 1 < latePairCount) continue;
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            if (elapsed >= gateBudget) break;

            const remaining = configWorkBudget - elapsed;
            const attemptsLeft = baseConfigs.length - ci;
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR — see runInterleavedAttempts's identical gate.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            const attBudget = attemptBudgetShare(remaining, attemptsLeft, remaining, minFrac);
            if (attBudget < MIN_ATTEMPT_WORK) break;
            prep._workCap = Math.min(prep._workMeter.units + attBudget, prep._strictWorkCap ?? Infinity);

            // Remaining GLOBAL node budget — see runInterleavedAttempts's identical recompute.
            const remainingNodeBudget = configNodeBudget === Infinity ? Infinity : Math.max(0, configNodeBudget - (prep._metrics ? prep._metrics.nodesExpanded : 0));
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], timeBudgetMs - (Date.now() - levelStartTime), Date.now(), yieldFn, remainingNodeBudget);
            if (ci >= lateConfigStart) result.attempt.mainSearchLateReserve = true;
            if (ci < lateConfigStart && (prep._metrics ? prep._metrics.nodesExpanded : 0) >= earlyConfigNodeBudget) {
                earlyNodeBudgetReached = earlyConfigNodeBudget < nodeBudget;
            }
            if (ci < lateConfigStart && (prep._workMeter.units - gateStartUnits) >= earlyGateWorkBudget) {
                earlyWorkBudgetReached = earlyGateWorkBudget < gateBudget;
            }
            attempts.push(result.attempt);
            if (result.path) return { solution: result.path, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
        }
    }
    return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
}
