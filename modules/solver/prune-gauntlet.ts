// Shared admissible-pruning gauntlet for a move already applied to search state — used by both
// dfsFromGate (search.ts) and takePly (repair-search.ts). Extracted because the two callers had
// carried near-identical copies of this same ordered check list, which meant every new prune (or
// bug fix to an existing one) had to be manually mirrored in both places, remembering which
// differences were deliberate.
//
// Both callers already apply the candidate move themselves (applyMove) before calling this, and
// undo it themselves (undoMove) afterward based on the verdict — this function only evaluates,
// it never mutates search state or touches the undo stack, so it stays agnostic to DFS's
// stack-frame bookkeeping vs. repair's flat-candidate-list bookkeeping.
//
// runConnectivity lets each caller opt in on its own terms: DFS checks its own throttled
// schedule (`rSteps <= 10 || nodesExpanded % 64 === 0`) and passes the result in; repair-search
// always passes false (see repair-search.ts's file-level comment on why it omits isConnected —
// a speed/thoroughness tradeoff, never a soundness concern, since isConnected only ever prunes).
import { getDistanceFromArray } from './distance.js';
import { popcount } from './encoding.js';
import { adjTurnLowerBound, mustCrossForcedNeighborDeadlocked, mustCrossLowerBound, mustCrossNeighborBudgetDeadlocked, mustPassLowerBound, mustTurnDeadlocked, surroundLowerBound } from './lower-bounds.js';
import { isSolutionState } from './solution.js';
import { isConnected } from './topology.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, PrepLevel, SolverSearchState } from './types.js';

/** Verdict for a single already-applied candidate move against the shared prune gauntlet.
 *  'solution': `next` is the goal and the full win condition holds — caller should accept
 *              immediately (both callers treat this as a short-circuiting success).
 *  'reject':   some prune fired (or `next` is the goal but the win condition doesn't hold) —
 *              caller should undo the move and move on.
 *  'pass':     the move survives every enabled prune and is eligible to continue/expand. */
export type PruneVerdict = 'solution' | 'reject' | 'pass';

/** Stable names used by the test-only prune diagnostics seam.  They deliberately match
 * AblationConfig keys, so a fixture can enable/disable and observe a rule by one name. */
export type PruneId =
    | 'PRUNE_MC_FORCED_FIRST_MOVE' | 'PRUNE_MC_CEILING' | 'PRUNE_DISTANCE_BOUND' | 'PRUNE_PARITY'
    | 'PRUNE_PORTAL_PARITY_ENVELOPE' | 'PRUNE_MUST_PASS_LB' | 'PRUNE_MUST_CROSS_LB'
    | 'PRUNE_SURROUND_LB' | 'PRUNE_ADJ_TURN_LB' | 'PRUNE_MUST_TURN_DEADLOCK'
    | 'PRUNE_MC_FORCED_NEIGHBOR' | 'PRUNE_MC_NEIGHBOR_BUDGET'
    | 'PRUNE_INTERSECTION_DEFICIT' | 'PRUNE_CONNECTIVITY';

/** Caller-owned counters for tests.  Production callers omit this argument, which keeps the
 * hot path allocation-free. `reached` distinguishes a genuinely exercised rule from a fixture
 * rejected by an earlier gauntlet member; `rejected` records the first (and only) firing rule. */
export interface PruneDiagnostics {
    reached: Partial<Record<PruneId, number>>;
    rejected: Partial<Record<PruneId, number>>;
}

/** Per-call policy for the shared gauntlet. Keeping caller participation separate from
 * diagnostics prevents observation-only refactors from silently changing pruning semantics. */
export interface PruneEvaluationOptions {
    allowNeighborBudgetPrune?: boolean;
    diagnostics?: PruneDiagnostics;
}

function reached(diagnostics: PruneDiagnostics | undefined, id: PruneId): void {
    if (diagnostics) diagnostics.reached[id] = (diagnostics.reached[id] ?? 0) + 1;
}

function reject(diagnostics: PruneDiagnostics | undefined, id: PruneId): PruneVerdict {
    if (diagnostics) diagnostics.rejected[id] = (diagnostics.rejected[id] ?? 0) + 1;
    return 'reject';
}

export function evaluatePrunedMove(
    next: number,
    realLen: number,
    state: SolverSearchState,
    level: NormalizedLevel,
    prep: PrepLevel,
    cfg: AblationConfig | null | undefined,
    runConnectivity: boolean,
    options: PruneEvaluationOptions = {},
): PruneVerdict {
    const diagnostics = options.diagnostics;
    // Over-length prune (fundamental — always on)
    if (realLen > level.reqLen) return 'reject';

    // Over-intersection prune (fundamental — always on)
    if (state.ints > level.reqInt) return 'reject';

    // Intersection ceiling: ints + remaining_MC_crossings must not exceed reqInt.
    // Each pending MC cell will contribute exactly 1 intersection (its 2nd-axis visit).
    // If current ints + guaranteed future MC ints already exceeds reqInt, prune.
    // This eliminates paths with non-MC crossings on levels where all intersections
    // must come from MC cells (e.g. mc=3, reqInt=3 → zero non-MC crossings allowed).
    if ((!cfg || cfg.PRUNE_MC_CEILING) && state.mustCrossMask !== 0 && level.mustCrossKeys.length > 0) {
        reached(diagnostics, 'PRUNE_MC_CEILING');
        const mcRemaining = popcount(state.mustCrossMask);
        if (state.ints + mcRemaining > level.reqInt) return reject(diagnostics, 'PRUNE_MC_CEILING');
    }

    // Solution check (only when at goal)
    if (next === level.goalKey) {
        return isSolutionState(state, level) ? 'solution' : 'reject';
    }

    const rSteps = level.reqLen - realLen;

    // Distance bound: min steps from next to goal must fit in remaining steps
    if (!cfg || cfg.PRUNE_DISTANCE_BOUND) {
        reached(diagnostics, 'PRUNE_DISTANCE_BOUND');
        const goalDist = getDistanceFromArray(prep.goalDistArr, next, prep.gridW);
        if (!Number.isFinite(goalDist) || goalDist > rSteps) return reject(diagnostics, 'PRUNE_DISTANCE_BOUND');
    }

    // Parity pruning: on a portal-free grid every step flips (x+y)%2.
    // Always apply at depth 1 (catches globally infeasible gates of the wrong parity).
    // Apply deep parity (full DFS) only for corridor-rich levels (≥10 blocks): these
    // levels have tightly constrained paths where parity cuts many dead-end corridors.
    // For open levels with few blocks, deep parity changes search order adversely.
    if ((!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
        reached(diagnostics, 'PRUNE_PARITY');
        const posP  = keyParity(next);
        const goalP = keyParity(level.goalKey);
        const firstStep = (realLen === 1);
        if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
            return reject(diagnostics, 'PRUNE_PARITY');
        }
    }

    // Portal-parity envelope: extends the parity idea above to portal levels carrying >=1
    // "twist" portal pair (prep.parityPortalDistMaps -- terminals of MISMATCHED cell parity; a
    // same-parity "twist=0" portal can't fix a parity mismatch at all, see prep.ts's own comment,
    // and isn't in this list). A twist portal's free jump injects exactly one extra parity flip,
    // so as long as >=1 twist pair remains UNCONSUMED, both parities stay achievable and a naive
    // mismatch must not be rejected -- only once every twist pair has actually been jumped does
    // the plain portal-free invariant apply again. Existence-only (no reachability/budget check):
    // this can only ever under-prune relative to a tighter version that also verified a pair
    // fits in the remaining budget, never mis-prune, by construction.
    //
    // Skips entirely whenever `next` is itself ANY portal cell (about to be force-jumped, or just
    // landed on one) -- both are transient snapshots where "already consumed" is ambiguous: a
    // pair's flip is only actually consumed by the JUMP, not by merely standing on a terminal, so
    // deriving "consumed" from raw state.visited right at that in-flight moment double-counts the
    // about-to-happen jump as already-happened. Once `next` is a stable (non-portal) cell, by
    // construction BOTH a pair's terminals are guaranteed visited if it was ever used (entering
    // either one forces landing at the other), so raw visited counts are then a safe, sufficient
    // "already consumed" signal. Same firstStep/blockSet.size gating as the plain-parity check
    // above (first-step always, otherwise only for corridor-rich levels) -- no independent
    // evidence yet that portal levels need a different search-order threshold, so reusing the
    // one already measured is the conservative choice. Opt-in (STRATEGY convention for a new,
    // not-yet-production-validated mechanism): see reports/2026-08-08-portal-parity-envelope.md
    // for the stored-solution census (0 violations, ~15,600 checkpoints across all 3 corpora)
    // this design is built from.
    if (cfg && cfg.PRUNE_PORTAL_PARITY_ENVELOPE === true && level.portalMap.size > 0 && !level.portalMap.has(next)) {
        reached(diagnostics, 'PRUNE_PORTAL_PARITY_ENVELOPE');
        const twistPairs = prep.parityPortalDistMaps;
        if (twistPairs && twistPairs.length > 0) {
            const posP  = keyParity(next);
            const goalP = keyParity(level.goalKey);
            const firstStep = (realLen === 1);
            if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
                let anyUnconsumed = false;
                for (const tp of twistPairs) {
                    if (state.visited[tp.a] === 0 || state.visited[tp.b] === 0) { anyUnconsumed = true; break; }
                }
                if (!anyUnconsumed) return reject(diagnostics, 'PRUNE_PORTAL_PARITY_ENVELOPE');
            }
        }
    }

    // Must-pass lower bound: dist(next→MP) + dist(MP→goal) ≤ rSteps
    if ((!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
        reached(diagnostics, 'PRUNE_MUST_PASS_LB');
        const mpLB = mustPassLowerBound(next, state, level, prep);
        if (!Number.isFinite(mpLB) || mpLB > rSteps) return reject(diagnostics, 'PRUNE_MUST_PASS_LB');
    }

    // Must-cross lower bound: dist(next→MC) + dist(MC→goal) ≤ rSteps
    if ((!cfg || cfg.PRUNE_MUST_CROSS_LB) && state.mustCrossMask !== 0) {
        reached(diagnostics, 'PRUNE_MUST_CROSS_LB');
        const mcLB = mustCrossLowerBound(next, state, level, prep);
        if (!Number.isFinite(mcLB) || mcLB > rSteps) return reject(diagnostics, 'PRUNE_MUST_CROSS_LB');
    }

    // Surround lower bound: all unvisited surround-cell neighbors must be reachable
    if ((!cfg || cfg.PRUNE_SURROUND_LB) && state.surroundMask !== 0) {
        reached(diagnostics, 'PRUNE_SURROUND_LB');
        const sLB = surroundLowerBound(next, state, level, prep);
        if (!Number.isFinite(sLB) || sLB > rSteps) return reject(diagnostics, 'PRUNE_SURROUND_LB');
    }

    // Adjacent-turn lower bound: must reach an adjacent cell of each pending adj-turn obj
    if ((!cfg || cfg.PRUNE_ADJ_TURN_LB) && state.adjTurnMask !== 0) {
        reached(diagnostics, 'PRUNE_ADJ_TURN_LB');
        const atLB = adjTurnLowerBound(next, state, level, prep);
        if (!Number.isFinite(atLB) || atLB > rSteps) return reject(diagnostics, 'PRUNE_ADJ_TURN_LB');
    }

    // Must-turn deadlock: a pending must-turn cell with both axis-usage bits already set
    // can never be entered again (edge-axis-reuse rule) — provably unsatisfiable from here.
    if ((!cfg || cfg.PRUNE_MUST_TURN_DEADLOCK) && state.mustTurnMask !== 0) {
        reached(diagnostics, 'PRUNE_MUST_TURN_DEADLOCK');
        if (mustTurnDeadlocked(state, prep)) return reject(diagnostics, 'PRUNE_MUST_TURN_DEADLOCK');
    }

    // Must-cross forced-neighbor deadlock: a pending must-cross cell's still-needed straight
    // pass requires BOTH of that axis's neighbors to remain enterable — if either has become a
    // hard wall (edgeUsage both bits spent, or an already-used flipper), that pass can never
    // happen. See lower-bounds.ts's mustCrossForcedNeighborDeadlocked for the derivation.
    if ((!cfg || cfg.PRUNE_MC_FORCED_NEIGHBOR) && state.mustCrossMask !== 0) {
        reached(diagnostics, 'PRUNE_MC_FORCED_NEIGHBOR');
        if (mustCrossForcedNeighborDeadlocked(next, state, level, prep)) return reject(diagnostics, 'PRUNE_MC_FORCED_NEIGHBOR');
    }

    // Must-cross neighbor-budget deadlock: a still-needed pass's required neighbor that is already
    // visited (soft, budget-constrained — not a hard wall) needs an unreserved intersection to
    // revisit; reject once the free budget can't cover every such neighbor. See lower-bounds.ts's
    // mustCrossNeighborBudgetDeadlocked for the derivation. Promoted to default-on 2026-08-12
    // (reports/2026-08-08-mc-neighbor-budget-propagation.md's population evidence: 0 regressions
    // on the published corpus, 0 on corpus-1, 59 gained / 5 lost net +54/1700 on corpus-2) — uses
    // the STANDARD `!cfg || cfg.FLAG` convention, matching every other non-opt-in rule in this
    // gauntlet, not the opt-in `cfg && cfg.FLAG === true` convention it used before promotion.
    // The stochastic repair survivor-selection loop deliberately opts out because removing a
    // candidate reindexes its seeded random draw. Deterministic DFS, beam, and repair subsearches
    // retain the default participation. This is independent of optional diagnostics.
    if (options.allowNeighborBudgetPrune !== false && (!cfg || cfg.PRUNE_MC_NEIGHBOR_BUDGET) && state.mustCrossMask !== 0) {
        reached(diagnostics, 'PRUNE_MC_NEIGHBOR_BUDGET');
        if (mustCrossNeighborBudgetDeadlocked(next, state, level, prep)) return reject(diagnostics, 'PRUNE_MC_NEIGHBOR_BUDGET');
    }

    // Intersection deficit: can't create more than rSteps intersections
    if (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) {
        reached(diagnostics, 'PRUNE_INTERSECTION_DEFICIT');
        const intNeeded = level.reqInt - state.ints;
        if (intNeeded > rSteps) return reject(diagnostics, 'PRUNE_INTERSECTION_DEFICIT');
    }

    // Connectivity + volume check — caller decides whether/how often to run this (see file doc).
    if (runConnectivity && (!cfg || cfg.PRUNE_CONNECTIVITY)) {
        reached(diagnostics, 'PRUNE_CONNECTIVITY');
        if (!isConnected(next, state, level, prep)) return reject(diagnostics, 'PRUNE_CONNECTIVITY');
    }

    return 'pass';
}
