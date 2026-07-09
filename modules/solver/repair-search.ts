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
import { AXIS_H, AXIS_V, popcount } from './encoding.js';
import { getDistanceFromArray } from './distance.js';
import { adjTurnLowerBound, mustCrossLowerBound, mustPassLowerBound, mustTurnDeadlocked, surroundLowerBound } from './lower-bounds.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { scoreMove } from './scoring.js';
import { getRealLengthFromState, isSolutionState } from './solution.js';
import { keyParity } from '../domain/cell-key.js';
import { turnDirection } from '../domain/geometry.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile, StructuralTemplate, SolverSearchState, UndoToken } from './types.js';

type YieldFn = (() => Promise<void>) | null;

// Debug-only, env-gated instrumentation (mirrors search.ts's _LDS_DEBUG/_BEAM_DEBUG) — zero
// overhead when unset. Traces how bestBadness evolves over restarts, for diagnosing which
// deficit term (length/intersections/must-pass/must-cross/…) a stuck level plateaus on.
const _proc = (globalThis as any).process as { env?: Record<string, string | undefined> } | undefined;
const _REPAIR_DEBUG = !!(_proc && _proc.env && _proc.env.PF_REPAIR_DEBUG === '1');

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

// Debug-only breakdown of computeBadness's terms (see _REPAIR_DEBUG) — never called on the
// hot path, only when a restart's badness beats the previous best.
function debugBadnessBreakdown(state: SolverSearchState, level: NormalizedLevel): string {
    const lenDeficit = Math.abs(getRealLengthFromState(state) - level.reqLen);
    const intDeficit = Math.abs(state.ints - level.reqInt);
    const n = level.mustPassKeys.length;
    const mpFullMask = n > 0 ? ((1 << n) - 1) : 0;
    const mpDeficit = n - popcount(state.mpVisitedMask & mpFullMask);
    const mcDeficit = popcount(state.mustCrossMask);
    return `len=${lenDeficit} int=${intDeficit} mp=${mpDeficit}/${n} mc=${mcDeficit} `
         + `surroundMask=${state.surroundMask.toString(2)} mustTurnMask=${state.mustTurnMask.toString(2)} adjTurnMask=${state.adjTurnMask.toString(2)}`;
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
function takePly(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template: StructuralTemplate | null, rand: () => number, rand2: (() => number) | null, epsilon: number, liveUndo: UndoToken[]): PlyOutcome {
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

    // Identify (if any) the neighbor that is the correct-direction turn at a still-pending
    // must-turn cell — computed structurally from the untouched pre-move state (`pos` is the
    // path's current tip here, matching scoreMove's DFS/pre-apply convention, no ambiguity).
    // Used only to bias the random-exploration branch below via the independent `rand2` stream
    // (see EXIT_GUIDANCE_EPSILON_BOOST) — never the greedy ranking, and never `rand` itself.
    let preferredTurnTarget: number | null = null;
    if (rand2 !== null && ws.mustTurnMask !== 0 && prep.mustTurnCellIndex && ws.path.length >= 2) {
        const mtIdx = prep.mustTurnCellIndex.get(pos);
        if (mtIdx !== undefined && (ws.mustTurnMask & (1 << mtIdx)) !== 0) {
            const prevKey = ws.path[ws.path.length - 2];
            const px = prevKey & 0xFFFF, py = (prevKey >>> 16) & 0xFFFF;
            const posx = pos & 0xFFFF, posy = (pos >>> 16) & 0xFFFF;
            const dx = posx - px, dy = posy - py;
            if ((dx === 0) !== (dy === 0) && Math.abs(dx) + Math.abs(dy) === 1) {
                const entryAxis = dy === 0 ? AXIS_H : AXIS_V;
                const req = prep.mustTurnDirs?.[mtIdx];
                for (const cand of neighbors) {
                    const cy = (cand >>> 16) & 0xFFFF;
                    const moveAxis = cy === posy ? AXIS_H : AXIS_V;
                    if (entryAxis === moveAxis) continue;
                    const turnDir = req === 'either' ? 'either' : turnDirection(prevKey, pos, cand);
                    if (req === 'either' || turnDir === req) { preferredTurnTarget = cand; break; }
                }
            }
        }
    }

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
            if (ok && (!cfg || cfg.PRUNE_SURROUND_LB) && ws.surroundMask !== 0) {
                const lb = surroundLowerBound(next, ws, level, prep);
                if (!Number.isFinite(lb) || lb > rSteps) ok = false;
            }
            if (ok && (!cfg || cfg.PRUNE_ADJ_TURN_LB) && ws.adjTurnMask !== 0) {
                const lb = adjTurnLowerBound(next, ws, level, prep);
                if (!Number.isFinite(lb) || lb > rSteps) ok = false;
            }
            if (ok && (!cfg || cfg.PRUNE_MUST_TURN_DEADLOCK) && ws.mustTurnMask !== 0 && mustTurnDeadlocked(ws, prep)) ok = false;
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

    // Preserves the exact rand()-consumption shape of the original two-branch pick (0 calls when
    // there's only one survivor, 1 call for a greedy pick, 2 for an exploratory one) so that
    // `rand`'s own sequence — and therefore every OTHER restart's trajectory on this seed — is
    // bit-for-bit unaffected by whether the exit-guidance nudge below ever fires. Only the
    // independent `rand2` stream (see repairSearchFromGate) decides the nudge itself.
    let chosenIdx: number;
    if (survivors.length === 1) {
        chosenIdx = bestIdx;
    } else if (rand() >= epsilon) {
        chosenIdx = bestIdx;
    } else {
        chosenIdx = Math.floor(rand() * survivors.length);
        const preferredSurvivorIdx = preferredTurnTarget !== null ? survivors.indexOf(preferredTurnTarget) : -1;
        if (rand2 !== null && preferredSurvivorIdx !== -1 && rand2() < EXIT_GUIDANCE_EPSILON_BOOST) chosenIdx = preferredSurvivorIdx;
    }
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

/** Probability a restart splices from an elite near-miss instead of starting fresh from the
 *  gate. Fixed (not annealed): early iterations naturally have an empty elite pool (forced
 *  fresh start), so the ladder self-anneals from "always fresh" toward "usually splice" as
 *  soon as a first near-miss exists, without needing an explicit schedule. */
const SPLICE_PROBABILITY = 0.75;
/** Epsilon (random-vs-greedy selection probability) cycled across restarts so a single
 *  repair call samples a mix of near-deterministic and highly exploratory walks, rather
 *  than committing to one exploration level for the whole budget. */
const EPSILON_LADDER = [0.15, 0.35, 0.6];
/** Size of the near-miss elite pool spliced from (see repairSearchFromGate). A single
 *  best-so-far path was measured to cause premature convergence: on levels needing 5+
 *  must-pass visits, badness plateaus within ~2s and NEVER improves again even after 17M+
 *  further node expansions over 60s — splicing only ever re-explores variations of the one
 *  structural family that path belongs to. A small pool of the K best-but-DISTINCT near-misses
 *  found so far gives each restart a genuinely different structural jumping-off point instead. */
const ELITE_POOL_SIZE = 8;
/** Restarts without a new best-ever badness before forcing a burst of pure fresh-from-gate
 *  restarts (bypassing elite splicing entirely). Even an 8-wide elite pool was measured to
 *  plateau on some levels — all 8 members converge toward variations of the same second
 *  structural family once splicing dominates, since splicing itself can never introduce a
 *  move sequence unreachable by mutating an existing elite's suffix. A stagnation-triggered
 *  fresh-restart burst forces genuinely independent structural exploration instead. */
const STAGNATION_THRESHOLD = 6000;
/** Length of a stagnation-triggered fresh-restart burst (see STAGNATION_THRESHOLD). */
const STAGNATION_BURST_LEN = 800;
/** Probability, within takePly's exploratory (non-greedy) branch only and only when
 *  enableMustTurnBias is set (see repairSearchFromGate), of overriding a uniform survivor pick
 *  with the correct-direction turn at a still-pending must-turn cell (see takePly's
 *  preferredTurnTarget) — decided from the independent `rand2` stream, never `rand`.
 *
 *  History: S043's must-turn cell needs to actually be turned at (not just approached) for
 *  repair to ever reach a fully-satisfied state, but scoreMove's shared
 *  mustTurnExitGuidanceWeight can't help — raising it (even to its ordinary default of 1)
 *  regressed S030 from solved to a 120s timeout, a clean reproducible A/B (see policy.ts).
 *  Routing the decision through an independent `rand2` stream instead of `rand` ruled out one
 *  cause (a first version consumed an extra `rand()` call whenever a candidate turn merely
 *  *existed*, shifting every later draw even when the boost never fired) but NOT the whole
 *  problem: S030 still regressed at every nonzero boost tried (down to 0.05) even on the
 *  independent stream, meaning repair's greedy ranking for that level is load-bearing enough
 *  that even a rarely-taken different move anywhere in a must-turn cell's decision breaks its
 *  established convergence. Resolved by scope, not more tuning: this nudge now only runs inside
 *  a SEPARATE, later attempt (attempts.ts's repairMustTurnBiasedAttempt) that only executes
 *  after the ordinary (bias-free) repair attempt has already failed on every gate — S030/S035/
 *  S047 solve via the ordinary attempt and never reach this one, so the boost value here only
 *  needs to work for the levels that actually get to it. 0.5 (aggressive) is safe in that scope. */
const EXIT_GUIDANCE_EPSILON_BOOST = 0.5;

function pathsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

// Same public shape as dfsFromGateLDS/beamSearchFromGate (search.ts) so orchestration.ts's
// runAttempt can dispatch to it with no special-casing beyond the repair flag.
//
// enableMustTurnBias: off by default — the ordinary repair attempt (attempts.ts's
// repairAttempt) runs with this false, making it byte-for-byte identical to the pre-existing
// (pre-S043-fix) code path, since even a supposedly-inert version of the nudge measurably
// regressed S030 (see EXIT_GUIDANCE_EPSILON_BOOST). Only the separate, later
// repairMustTurnBiasedAttempt (which only ever runs after the ordinary attempt has already
// failed on every gate) passes true.
export async function repairSearchFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, budgetMs: number, startTime: number, template: StructuralTemplate | null, yieldFn: YieldFn = null, enableMustTurnBias = false): Promise<number[] | null> {
    const ws = createState(startKey, level, prep);
    const liveUndo: UndoToken[] = [];
    // Seeded from startKey alone: deterministic per gate, varies naturally across gates/levels.
    const rand = mulberry32((startKey * 2654435761) >>> 0);
    // A SECOND, independent stream (different constant) dedicated to the must-turn exit-guidance
    // nudge below (see EXIT_GUIDANCE_EPSILON_BOOST) — deliberately never drawn from `rand` itself,
    // and only ever created/consumed when enableMustTurnBias is true (the biased attempt).
    const rand2 = enableMustTurnBias ? mulberry32((startKey * 0x27220A95) >>> 0) : null;

    // Elite pool, sorted ascending by badness (elites[0] is the best-ever near-miss). See
    // ELITE_POOL_SIZE.
    const elites: { path: number[]; badness: number }[] = [];
    let bestBadnessEver = Infinity;
    let restartsSinceImprovement = 0;
    let forcedFreshRemaining = 0;
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

        if (forcedFreshRemaining > 0) forcedFreshRemaining--;
        const spliceFromElite = forcedFreshRemaining === 0 && elites.length > 0 && rand() < SPLICE_PROBABILITY;
        const elitePath = spliceFromElite ? elites[Math.floor(rand() * elites.length)].path : null;
        const targetPrefix = elitePath && elitePath.length > 1
            ? elitePath.slice(0, 1 + Math.floor(rand() * (elitePath.length - 1)))
            : [startKey];
        replayToPrefix(ws, liveUndo, targetPrefix, level, prep);

        let outcome: PlyOutcome = 'continue';
        while (outcome === 'continue') {
            outcome = takePly(ws, level, prep, profile, template, rand, rand2, epsilon, liveUndo);
            if (prep._metrics) prep._metrics.nodesExpanded++;
        }

        if (outcome === 'solved') return ws.path.slice();
        if (outcome === 'goalInvalid') {
            const b = computeBadness(ws, level);
            const worst = elites.length > 0 ? elites[elites.length - 1] : null;
            if (elites.length < ELITE_POOL_SIZE || (worst && b < worst.badness)) {
                const candidatePath = ws.path.slice();
                if (!elites.some(e => e.badness === b && pathsEqual(e.path, candidatePath))) {
                    if (elites.length >= ELITE_POOL_SIZE) elites.pop();
                    elites.push({ path: candidatePath, badness: b });
                    elites.sort((x, y) => x.badness - y.badness);
                }
            }
            if (b < bestBadnessEver) {
                bestBadnessEver = b;
                restartsSinceImprovement = 0;
                if (_REPAIR_DEBUG) console.error(`  [repair] gate=${startKey} restart=${restartCount} t=${Date.now() - startTime}ms bestBadness=${b} poolSize=${elites.length} (${debugBadnessBreakdown(ws, level)})`);
            } else {
                restartsSinceImprovement++;
            }
        } else {
            restartsSinceImprovement++;
        }

        if (restartsSinceImprovement >= STAGNATION_THRESHOLD && forcedFreshRemaining === 0) {
            forcedFreshRemaining = STAGNATION_BURST_LEN;
            restartsSinceImprovement = 0;
            if (_REPAIR_DEBUG) console.error(`  [repair] gate=${startKey} restart=${restartCount} t=${Date.now() - startTime}ms STAGNATION — forcing ${STAGNATION_BURST_LEN} fresh restarts`);
        }
    }
}
