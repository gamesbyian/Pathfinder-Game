// Iterated-local-search repair fallback — a genuinely different search paradigm from
// DFS/beam (see stress/README.md's batch-B cluster writeup), added after three independent
// admissible-bound-tightening attempts each moved zero cluster levels: the witness-trace
// finding was that DFS/beam's *deterministic* best-first ordering accumulates a large
// cumulative discrepancy (22–59) on these levels even though each individual step's local
// ranking is good — no bound short of an order-of-magnitude tightening can shrink that
// enough to exhaust in budget. This strategy instead explores via randomized restarts and
// splice-repair (ruin-and-recreate / ILS), which doesn't need to get the whole path right
// in one deterministic sweep.
//
// SOUNDNESS: this file adds no new game-mechanics logic. Every move goes through the exact
// same applyMove/getNeighbors/isSolutionState primitives DFS and beam already use, so
// legality is guaranteed by construction — this strategy can only ever return a path that
// already passes isSolutionState (checked directly below), giving it the same correctness
// guarantee as the rest of the search core. The only things "local search" about it are (a)
// which legal move is picked at each step (randomized, not deterministic-greedy) and (b) that
// it restarts from a splice point in the best-so-far near-miss instead of always from the gate.
//
// Deliberately omitted vs. dfsFromGate's pruning gauntlet: the isConnected BFS. Skipping it
// is a pure speed/thoroughness tradeoff (dead ends are still caught, just one ply later, when
// a cell's candidate list empties out) — never a soundness risk, since isConnected only ever
// prunes, it never permits an otherwise-illegal move.
import { popcount } from './encoding.js';
import { getDistanceFromArray } from './distance.js';
import { adjTurnLowerBound, mustCrossLowerBound, mustPassLowerBound, surroundLowerBound } from './lower-bounds.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { scoreMove } from './scoring.js';
import { getRealLengthFromState, isSolutionState } from './solution.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile, StructuralTemplate, SolverSearchState, UndoToken } from './types.js';

type YieldFn = (() => Promise<void>) | null;

// Deterministic PRNG (mulberry32) — reproducible given the same gate/level, matching this
// codebase's existing seeded-LCG convention (attempts.ts's shuffleAttemptConfigs) rather than
// Math.random(): repair's output must be stable across repeated solves of the same level for
// audits (solver:bench, hint-oracle) to be meaningfully comparable run to run.
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function (): number {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// How far a completed-but-invalid walk (reached goal, wrong length/intersections/objectives)
// is from an accepted solution. 0 iff it would pass isSolutionState. Every term is a small
// non-negative integer count, so no weighting is needed — they're all "how many more/fewer
// of this exact thing has to change," and none dominates the others by construction.
function computeBadness(state: SolverSearchState, level: NormalizedLevel): number {
    const lenDeficit = Math.abs(getRealLengthFromState(state) - level.reqLen);
    const intDeficit = Math.abs(state.ints - level.reqInt);
    const n = level.mustPassKeys.length;
    const mpFullMask = n > 0 ? ((1 << n) - 1) : 0;
    const mpDeficit = n - popcount(state.mpVisitedMask & mpFullMask);
    const mcDeficit = popcount(state.mustCrossMask);
    const surroundDeficit = popcount(state.surroundMask);
    const turnDeficit = popcount(state.mustTurnMask) + popcount(state.adjTurnMask);
    return lenDeficit + intDeficit + mpDeficit + mcDeficit + surroundDeficit + turnDeficit;
}

type PlyOutcome = 'solved' | 'continue' | 'deadend' | 'goalInvalid';

// Take one randomized step from ws's current position, mutating ws in place and pushing the
// applied move's undo token onto liveUndo (so a later diff/replay can unwind it). Mirrors
// dfsFromGate's per-child pruning gauntlet (search.ts) applied to a flat candidate list
// instead of a DFS stack frame, with epsilon-greedy selection among the survivors instead of
// always taking the top-ranked one — same admissible pruning, different exploration policy.
//
// A genuine win (next === goal && isSolutionState) always short-circuits immediately, exactly
// like DFS/beam — randomization must never risk skipping a real solution. A goal cell reached
// WITHOUT satisfying the win condition is not special-cased as an automatic walk-terminator;
// it's scored and placed in the candidate pool like any other neighbor, so the walk only ends
// there if it's actually selected — same as a real player choosing whether to step onto goal.
function takePly(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template: StructuralTemplate | null, rand: () => number, epsilon: number, liveUndo: UndoToken[]): PlyOutcome {
    const pos = ws.path[ws.path.length - 1];
    const cfg = prep._cfg;
    let neighbors = getNeighbors(pos, ws, level, prep);
    if (ws.path.length === 1 && prep._forcedFirstStepKey != null) {
        neighbors = neighbors.filter(k => k === prep._forcedFirstStepKey);
    }
    if (neighbors.length === 0) return 'deadend';

    const survivors: number[] = [];
    let bestIdx = -1, bestScore = -Infinity;
    const portalAtPos = level.portalMap.get(pos);

    for (const next of neighbors) {
        const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === next);
        const undo = applyMove(next, ws, level, prep, isJump);
        const realLen = getRealLengthFromState(ws);

        let ok = realLen <= level.reqLen && ws.ints <= level.reqInt; // fundamental, always on
        if (ok && (!cfg || cfg.PRUNE_MC_CEILING) && ws.mustCrossMask !== 0 && level.mustCrossKeys.length > 0) {
            if (ws.ints + popcount(ws.mustCrossMask) > level.reqInt) ok = false;
        }

        if (ok && next === level.goalKey && isSolutionState(ws, level)) {
            liveUndo.push(undo);
            return 'solved';
        }

        if (ok && next !== level.goalKey) {
            const rSteps = level.reqLen - realLen;
            if (!cfg || cfg.PRUNE_DISTANCE_BOUND) {
                const gd = getDistanceFromArray(prep.goalDistArr, next);
                if (!Number.isFinite(gd) || gd > rSteps) ok = false;
            }
            if (ok && (!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
                const pp = keyParity(next);
                const gp = keyParity(level.goalKey);
                if ((realLen === 1 || level.blockSet.size >= 10) && ((pp ^ gp ^ (rSteps & 1)) !== 0)) ok = false;
            }
            if (ok && (!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
                const lb = mustPassLowerBound(next, ws, level, prep);
                if (!Number.isFinite(lb) || lb > rSteps) ok = false;
            }
            if (ok && (!cfg || cfg.PRUNE_MUST_CROSS_LB) && ws.mustCrossMask !== 0) {
                const lb = mustCrossLowerBound(next, ws, level, prep);
                if (!Number.isFinite(lb) || lb > rSteps) ok = false;
            }
            if (ok && ws.surroundMask !== 0) {
                const lb = surroundLowerBound(next, ws, level, prep);
                if (!Number.isFinite(lb) || lb > rSteps) ok = false;
            }
            if (ok && ws.adjTurnMask !== 0) {
                const lb = adjTurnLowerBound(next, ws, level, prep);
                if (!Number.isFinite(lb) || lb > rSteps) ok = false;
            }
            if (ok && (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) && (level.reqInt - ws.ints) > rSteps) ok = false;
        }

        if (ok) {
            const rStepsForScore = level.reqLen - realLen;
            const sc = scoreMove(next, pos, ws, level, prep, profile, rStepsForScore, template);
            survivors.push(next);
            if (sc > bestScore) { bestScore = sc; bestIdx = survivors.length - 1; }
        }
        undoMove(undo, ws);
    }

    if (survivors.length === 0) return 'deadend';

    const chosenIdx = (survivors.length === 1 || rand() >= epsilon)
        ? bestIdx
        : Math.floor(rand() * survivors.length);
    const chosen = survivors[chosenIdx];
    const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === chosen);
    liveUndo.push(applyMove(chosen, ws, level, prep, isJump));
    // Entering goal is always terminal (matches the real game rule, and dfsFromGate/
    // beamSearchFromGate's identical behaviour) — even when chosen only because it scored
    // well relative to its (invalid) siblings, the walk must not continue past it.
    return chosen === level.goalKey ? 'goalInvalid' : 'continue';
}

// Diffs ws's current live path against `targetPrefix`, undoing the divergent suffix and
// applying only the new prefix — same technique as beamSearchFromGate's `_liveUndo` diffing
// (search.ts), reused here so repeated ILS restarts/splices never reallocate the KEY_SPACE-sized
// typed arrays inside createState (that per-call-allocation mistake was already made once this
// session, in topology.ts's flipper-aware connectivity — see stress/README.md — and cost a real
// regression there; ws is created exactly once per repairSearchFromGate call, not per iteration).
function replayToPrefix(ws: SolverSearchState, liveUndo: UndoToken[], targetPrefix: number[], level: NormalizedLevel, prep: PrepLevel): void {
    const curPath = ws.path;
    const minLen = Math.min(curPath.length, targetPrefix.length);
    let common = 1; // index 0 (the gate) always matches
    while (common < minLen && curPath[common] === targetPrefix[common]) common++;
    while (ws.path.length > common) undoMove(liveUndo.pop() as UndoToken, ws);
    for (let i = common; i < targetPrefix.length; i++) {
        const from = targetPrefix[i - 1], to = targetPrefix[i];
        const p = level.portalMap.get(from);
        const isJump = !!(p && !ws.lastWasPortalJump && p.dest === to);
        liveUndo.push(applyMove(to, ws, level, prep, isJump));
    }
}

/** Probability a restart splices from the best-so-far near-miss instead of starting fresh
 *  from the gate. Fixed (not annealed): early iterations naturally have no bestPath yet
 *  (forced fresh start), so the ladder self-anneals from "always fresh" toward "usually
 *  splice" as soon as a first near-miss exists, without needing an explicit schedule. */
const SPLICE_PROBABILITY = 0.75;
/** Epsilon (random-vs-greedy selection probability) cycled across restarts so a single
 *  repair call samples a mix of near-deterministic and highly exploratory walks, rather
 *  than committing to one exploration level for the whole budget. */
const EPSILON_LADDER = [0.15, 0.35, 0.6];

// Same public shape as dfsFromGateLDS/beamSearchFromGate (search.ts) so orchestration.ts's
// runAttempt can dispatch to it with no special-casing beyond the repair flag.
export async function repairSearchFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, budgetMs: number, startTime: number, template: StructuralTemplate | null, yieldFn: YieldFn = null): Promise<number[] | null> {
    const ws = createState(startKey, level, prep);
    const liveUndo: UndoToken[] = [];
    // Seeded from startKey alone: deterministic per gate, varies naturally across gates/levels.
    const rand = mulberry32((startKey * 2654435761) >>> 0);

    let bestPath: number[] | null = null;
    let bestBadness = Infinity;
    let restartCount = 0;
    let lastYield = startTime;

    while (true) {
        const now = Date.now();
        if (now - startTime >= budgetMs) return null;
        if (yieldFn && now - lastYield >= 16) {
            lastYield = now;
            await yieldFn(); // throws on cancellation
        }
        restartCount++;
        const epsilon = EPSILON_LADDER[restartCount % EPSILON_LADDER.length];

        const spliceFromBest = bestPath !== null && bestPath.length > 1 && rand() < SPLICE_PROBABILITY;
        const targetPrefix = spliceFromBest
            ? (bestPath as number[]).slice(0, 1 + Math.floor(rand() * ((bestPath as number[]).length - 1)))
            : [startKey];
        replayToPrefix(ws, liveUndo, targetPrefix, level, prep);

        let outcome: PlyOutcome = 'continue';
        while (outcome === 'continue') {
            outcome = takePly(ws, level, prep, profile, template, rand, epsilon, liveUndo);
            if (prep._metrics) prep._metrics.nodesExpanded++;
        }

        if (outcome === 'solved') return ws.path.slice();
        if (outcome === 'goalInvalid') {
            const b = computeBadness(ws, level);
            if (b < bestBadness) { bestBadness = b; bestPath = ws.path.slice(); }
        }
        // 'deadend': no legal continuation from a non-goal cell — nothing to score, just retry.
    }
}
