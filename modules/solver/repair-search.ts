// Iterated-local-search repair fallback — a genuinely different search paradigm from
// DFS/beam (see data/stress/README.md's batch-B cluster writeup), added after three independent
// admissible-bound-tightening attempts each moved zero cluster levels: the witness-trace
// finding was that DFS/beam's *deterministic* best-first ordering accumulates a large
// cumulative discrepancy (22–59) on these levels even though each individual step's local
// ranking is good — no bound short of an order-of-magnitude tightening can shrink that
// enough to exhaust in budget. This strategy instead explores via randomized restarts and
// splice-repair (ruin-and-recreate / ILS), which doesn't need to get the whole path right
// in one deterministic sweep.
//
// SOUNDNESS: this file adds no new game-mechanics logic. Every move goes through the exact
// same applyMove/getNeighbors/isSolutionState primitives DFS and beam already use (isSolutionState
// via the shared evaluatePrunedMove gauntlet, see prune-gauntlet.ts), so legality is guaranteed
// by construction — this strategy can only ever return a path that already passes
// isSolutionState, giving it the same correctness guarantee as the rest of the search core. The
// only things "local search" about it are (a) which legal move is picked at each step
// (randomized, not deterministic-greedy) and (b) that it restarts from a splice point in the
// best-so-far near-miss instead of always from the gate.
//
// Deliberately omitted vs. dfsFromGate's pruning gauntlet: the isConnected BFS (passed as
// runConnectivity=false to evaluatePrunedMove below). Skipping it is a pure speed/thoroughness
// tradeoff (dead ends are still caught, just one ply later, when a cell's candidate list empties
// out) — never a soundness risk, since isConnected only ever prunes, it never permits an
// otherwise-illegal move.
import { AXIS_H, AXIS_V, popcount } from './encoding.js';
import { STATE_BUF_REPAIR, applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { buildCurUrgencyContext, scoreAndSort, scoreMove } from './scoring.js';
import { computeBadness, getRealLengthFromState, structuralDeficit } from './solution.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import { createNogoodCache } from './nogood-cache.js';
import { beamSearchFromGate } from './search.js';
import { turnDirection } from '../domain/geometry.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, BeamResearchRecord, PrepLevel, ScoringProfile, StructuralTemplate, SolverSearchState, UndoToken } from './types.js';

type YieldFn = (() => Promise<void>) | null;

export type RepairStopReason = 'wall-clock' | 'node-budget' | 'work-budget';

// Debug-only, env-gated instrumentation (mirrors search.ts's _LDS_DEBUG/_BEAM_DEBUG) — zero
// overhead when unset. Traces how bestBadness evolves over restarts, for diagnosing which
// deficit term (length/intersections/must-pass/must-cross/…) a stuck level plateaus on.
const _proc = (globalThis as any).process as { env?: Record<string, string | undefined> } | undefined;
const _REPAIR_DEBUG = !!(_proc && _proc.env && _proc.env.PF_REPAIR_DEBUG === '1');
// Added 2026-07-18 to measure closeLengthGap's own invocation/success rate post-shipping (see
// reports/2026-07-18-length-gap-close-invocation-rate.md) — same env-gated, zero-overhead-when-
// unset convention as _REPAIR_DEBUG above, kept (not reverted) for future re-diagnosis of this
// operator.
const _LENGTH_GAP_DEBUG = !!(_proc && _proc.env && _proc.env.PF_LENGTH_GAP_DEBUG === '1');
// Stage-1 instrumentation for docs/repair-search-stagnation-escape-plan.md (env-gated,
// PF_REPAIR_SIGNATURE_DEBUG=1) — zero overhead when unset, same convention as the two flags
// above. Captures, per dead-ended restart, a SIGNED deficit signature plus a candidate set of
// structural features, so a harness can measure (a) how concentrated the frozen near-miss
// signature is during a plateau and (b) which structural features are overrepresented conditional
// on that signature vs. the global baseline. Deliberately does NOT reuse computeBadness's terms:
// those are Math.abs'd (see solution.ts), and the plan requires signed residuals — being two steps
// short and two steps long must not collapse into the same bucket.
const _SIG_DEBUG = !!(_proc && _proc.env && _proc.env.PF_REPAIR_SIGNATURE_DEBUG === '1');
// Stage 3-real diagnostics (PF_RELINK_DEBUG=1) — per relink call: how many recombinations were
// tried, the best intermediate's badness, and whether it beat the pool. Zero overhead when unset.
const _RELINK_DEBUG = !!(_proc && _proc.env && _proc.env.PF_RELINK_DEBUG === '1');
// Elite-prefix DFS repair diagnostics (PF_ELITE_PREFIX_DFS_DEBUG=1) — zero overhead when unset,
// same convention as the debug flags above.
const _ELITE_PREFIX_DFS_DEBUG = !!(_proc && _proc.env && _proc.env.PF_ELITE_PREFIX_DFS_DEBUG === '1');

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

// The exact uint32 seed repairSearchFromGate's primary PRNG (`rand`) is initialized with, as a pure
// function of (startKey, seedSalt). Exported so orchestration.ts can record it on a repair attempt's
// provenance without duplicating (and risking drift from) this formula — the one source of truth for
// "which seed produced this repair solve", which the sweep needs to reproduce a fast randomized find.
export function repairPrimarySeed(startKey: number, seedSalt = 0): number {
    return ((startKey * 2654435761) ^ (seedSalt * 0x9E3779B1)) >>> 0;
}

/** Research/test-only seed derivation for both independently consumed repair streams. */
export function repairStreamSeeds(startKey: number, seedSalt = 0, researchSeed?: number | null): { primary: number; mustTurn: number } {
    return researchSeed == null ? {
        primary: repairPrimarySeed(startKey, seedSalt),
        mustTurn: ((startKey * 0x27220A95) ^ (seedSalt * 0x85EBCA77)) >>> 0,
    } : { primary: researchSeed >>> 0, mustTurn: ((researchSeed >>> 0) ^ 0xA511E9B3) >>> 0 };
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

// Stage-1 instrumentation only (see _SIG_DEBUG). Builds the signed deficit signature + candidate
// structural-feature token list for one dead-ended restart's current state. Pure; never called on
// a non-instrumented run. The signature intentionally carries the full mustTurn/adjTurn/mustCross
// masks (not just their popcounts) because the frozen-signature diagnosis found the *specific*
// pending cell — not merely "N pending" — is what recurs (reports/2026-07-17-repair-stagnation-
// frozen-signature-diagnosis.md).
function deadEndSignatureRecord(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): { sigKey: string; features: string[] } {
    const lenResidual = getRealLengthFromState(ws) - level.reqLen; // SIGNED, not Math.abs'd
    const intResidual = ws.ints - level.reqInt;                    // SIGNED, not Math.abs'd
    const n = level.mustPassKeys.length;
    const mpFullMask = n > 0 ? ((1 << n) - 1) : 0;
    const mpDeficit = n - popcount(ws.mpVisitedMask & mpFullMask);
    const surroundDeficit = popcount(ws.surroundMask);
    const sigKey = `L${lenResidual}|I${intResidual}|mp${mpDeficit}|mc${ws.mustCrossMask.toString(16)}`
                 + `|sr${surroundDeficit}|mt${ws.mustTurnMask.toString(16)}|at${ws.adjTurnMask.toString(16)}`;

    // One pass over the path for visit multiplicities (portal terminals count as ordinary cells).
    const visits = new Map<number, number>();
    for (const k of ws.path) visits.set(k, (visits.get(k) ?? 0) + 1);

    const features: string[] = [];
    // Pending must-turn cells — visited-but-not-turned vs never-reached is the load-bearing
    // distinction from the diagnosis (a required-direction turn is a narrow, length-coupled target).
    for (let i = 0; i < prep.mustTurnKeys.length; i++) {
        if ((ws.mustTurnMask & (1 << i)) === 0) continue;
        features.push(visits.has(prep.mustTurnKeys[i]) ? `mtVisited:${i}` : `mtUnvisited:${i}`);
    }
    // Pending adjacent-turn objects (impassable — the turn must land on one of its neighbors).
    const adjTurnKeys = level.adjacentTurnKeys || [];
    for (let i = 0; i < adjTurnKeys.length; i++) {
        if ((ws.adjTurnMask & (1 << i)) === 0) continue;
        features.push(`atPending:${i}`);
    }
    // Pending must-cross cells with how many times the path has entered them so far (0 or 1 while
    // the bit is still set) — a partial 1st crossing is a different structural state than untouched.
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((ws.mustCrossMask & (1 << i)) === 0) continue;
        features.push(`mcPending:${i}:v${visits.get(level.mustCrossKeys[i]) ?? 0}`);
    }
    // Generic structure: where the walk dead-ended, and which cells it revisited.
    features.push(`tip:${ws.path[ws.path.length - 1]}`);
    for (const [k, c] of visits) if (c >= 2) features.push(`revisit:${k}`);
    return { sigKey, features };
}

// Stage-1 instrumentation only (see _SIG_DEBUG). Emits one JSON summary line per repairSearchFromGate
// call: signature concentration + per-feature overrepresentation (smoothed log-odds) conditional on
// the plateau (min-badness) signature vs. the global baseline across all this call's restarts.
function emitSignatureSummary(startKey: number, restarts: number, sigCounts: Map<string, number>, featGlobal: Map<string, number>, featBySig: Map<string, Map<string, number>>, sigBadness: Map<string, number>, bestBadnessEver: number): void {
    if (restarts === 0) { console.error(`[repair-sig] gate=${startKey} restarts=0 (no dead ends captured)`); return; }
    const bySigFreq = [...sigCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topSigs = bySigFreq.slice(0, 5).map(([sig, c]) => ({ sig, count: c, share: +(c / restarts).toFixed(4), minBadness: sigBadness.get(sig) }));
    // Plateau signature = the most frequent signature that achieves the global best-ever badness.
    const plateauCandidates = bySigFreq.filter(([sig]) => sigBadness.get(sig) === bestBadnessEver);
    const plateauSig = (plateauCandidates[0] ?? bySigFreq[0])[0];
    const N_sig = sigCounts.get(plateauSig) ?? 0;
    const sigFeat = featBySig.get(plateauSig) ?? new Map<string, number>();
    const A = 0.5; // Laplace smoothing
    const overrep = [...sigFeat.entries()].map(([f, cSig]) => {
        const cGlob = featGlobal.get(f) ?? 0;
        const loSig = Math.log((cSig + A) / (N_sig - cSig + A));
        const loGlob = Math.log((cGlob + A) / (restarts - cGlob + A));
        return { feature: f, inSig: cSig, sigRate: +(cSig / N_sig).toFixed(3), globalRate: +(cGlob / restarts).toFixed(3), logOdds: +(loSig - loGlob).toFixed(3) };
    }).sort((a, b) => b.logOdds - a.logOdds).slice(0, 12);
    console.error('[repair-sig] ' + JSON.stringify({
        gate: startKey, restarts, bestBadnessEver, distinctSignatures: sigCounts.size,
        topSignatureShare: topSigs.length ? topSigs[0].share : 0,
        plateauSignature: plateauSig, plateauCount: N_sig, plateauShare: +(N_sig / restarts).toFixed(4),
        topSignatures: topSigs, plateauFeatureOverrep: overrep,
    }));
}

// ── Stage 2 prototype: signature-conditioned soft feature memory ────────────────────────────────
// docs/repair-search-stagnation-escape-plan.md, Stage 2. Opt-in via repairSearchFromGate's
// enablePlateauPenalty param (OFF in every production path — this is an unproven experiment, and
// the ablation framework's default-true semantics can't express a default-off flag, see the plan's
// Stage 2 build note). Mechanism: when the existing stagnation detector fires, bias the greedy
// move ranking away from the specific cells that stuck restarts keep funneling through, via a
// FINITE, decaying penalty — never a hard prune, so isSolutionState stays the sole authority and no
// reachable solution can be dropped. Derived directly from Stage 1's finding that a plateau
// converges on a fixed set of overrepresented revisit/tip "attractor" cells conditional on the
// plateau *shape* (residual signs + structural masks), not the exact signed signature.

/** Pure: given per-shape and global attractor-cell appearance counts, return the penalty map for a
 *  plateau shape — cell → finite penalty, for cells whose smoothed log-odds overrepresentation in
 *  that shape (vs. the global baseline) clears `minLogOdds`. Exported for direct unit testing (the
 *  arithmetic is the part worth pinning down independent of any solver run). Penalty is graded by
 *  the capped log-odds so a barely-overrepresented cell is nudged gently and a near-universal
 *  attractor cell strongly, but always finitely. */
export function computePlateauPenaltyCells(shapeCellCounts: Map<number, number> | undefined, shapeTotal: number, globalCellCounts: Map<number, number>, globalTotal: number, minLogOdds: number, penaltyUnit: number, logOddsCap: number): Map<number, number> {
    const out = new Map<number, number>();
    if (!shapeCellCounts || shapeTotal <= 0 || globalTotal <= 0) return out;
    const A = 0.5; // Laplace smoothing, matching Stage 1's emitSignatureSummary
    for (const [cell, cSig] of shapeCellCounts) {
        const cGlob = globalCellCounts.get(cell) ?? 0;
        const loSig = Math.log((cSig + A) / (shapeTotal - cSig + A));
        const loGlob = Math.log((cGlob + A) / (globalTotal - cGlob + A));
        const logOdds = loSig - loGlob;
        if (logOdds >= minLogOdds) out.set(cell, penaltyUnit * Math.min(logOdds, logOddsCap));
    }
    return out;
}

/** The plateau *shape* key (residual signs + structural masks — Stage 1 finding 3: key on shape,
 *  not the exact length residual) and the attractor cells (dead-end tip + every revisited cell) for
 *  one restart's dead-ended state. Cells are deduped; the tip is always first. */
function plateauShapeAndCells(ws: SolverSearchState, level: NormalizedLevel): { shape: string; cells: number[] } {
    const lenSgn = Math.sign(getRealLengthFromState(ws) - level.reqLen);
    const intSgn = Math.sign(ws.ints - level.reqInt);
    const n = level.mustPassKeys.length;
    const mpFullMask = n > 0 ? ((1 << n) - 1) : 0;
    const mpDeficit = n - popcount(ws.mpVisitedMask & mpFullMask);
    const surroundDeficit = popcount(ws.surroundMask);
    const shape = `L${lenSgn}|I${intSgn}|mp${mpDeficit}|mc${ws.mustCrossMask.toString(16)}`
                + `|sr${surroundDeficit}|mt${ws.mustTurnMask.toString(16)}|at${ws.adjTurnMask.toString(16)}`;
    const visits = new Map<number, number>();
    for (const k of ws.path) visits.set(k, (visits.get(k) ?? 0) + 1);
    const tip = ws.path[ws.path.length - 1];
    const cells: number[] = [tip];
    for (const [k, c] of visits) if (c >= 2 && k !== tip) cells.push(k);
    return { shape, cells };
}

// ── Stage 3 prototype: scatter-search recombination (guide-biased construction) ─────────────────
// docs/repair-search-stagnation-escape-plan.md, Stage 3. This is the append-only-compatible
// APPROXIMATION the plan calls for, NOT true path relinking: repair's restarts can only extend a
// spliced prefix forward, never edit an existing path, so there are no reversible edit operators to
// walk a trajectory between two elites (designing/verifying those is flagged as separate work). What
// this does instead is scatter-search recombination — splice a "base" elite's prefix, then softly
// reward forward moves toward a structurally-distant "guide" elite's cells, so the construction
// recombines the base prefix with the guide's shape. Soft reward, never a filter → same soundness as
// Stage 2 (isSolutionState untouched, support preserved by the always-unbiased fresh restarts).

/** Per-elite pending-objective masks (bits still unsatisfied), for complementarity-based guide
 *  selection. Every mask is "1 = still pending": mp is the *un*-visited must-pass bits, the rest are
 *  the raw pending masks. */
export interface ElitePending { mp: number; mc: number; sr: number; mt: number; at: number; }

/** |A △ B| — size of the symmetric difference of two cell sets, the structural-distance tiebreak for
 *  guide selection (larger = the two elites route through more different cells). */
function symmetricDifferenceSize(a: Set<number>, b: Set<number>): number {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let inter = 0;
    for (const x of small) if (large.has(x)) inter++;
    return a.size + b.size - 2 * inter;
}

/** How many pending objective bits `base` has that `guide` has already satisfied — the plan's
 *  "complementary satisfied constraints" criterion (guide fixes what base is missing). */
function complementarity(base: ElitePending, guide: ElitePending): number {
    return popcount(base.mp & ~guide.mp) + popcount(base.mc & ~guide.mc) + popcount(base.sr & ~guide.sr)
         + popcount(base.mt & ~guide.mt) + popcount(base.at & ~guide.at);
}

/** Pick the guide elite's cell set for recombination: prefer the candidate that most *complements*
 *  the base (satisfies the most objectives base still lacks — the plan's primary criterion), breaking
 *  ties by largest structural distance. Skips the base itself (by cell-Set identity) and any candidate
 *  without cached cells. Returns null if there is no eligible guide. Exported for unit testing. */
export function selectGuideCells(base: { cells: Set<number> | null; pend: ElitePending | null }, candidates: { cells: Set<number> | null; pend: ElitePending | null }[]): Set<number> | null {
    if (!base.cells) return null;
    let best: Set<number> | null = null, bestComp = -1, bestDist = -1;
    for (const c of candidates) {
        if (!c.cells || c.cells === base.cells) continue;
        const comp = base.pend && c.pend ? complementarity(base.pend, c.pend) : 0;
        const dist = symmetricDifferenceSize(base.cells, c.cells);
        if (comp > bestComp || (comp === bestComp && dist > bestDist)) { bestComp = comp; bestDist = dist; best = c.cells; }
    }
    return best;
}

// ── Shared turn-aware selective biasing (Stage 2/3 successor) ────────────────────────────────────
// docs/repair-search-stagnation-escape-plan.md. Stage 1 found the dominant plateau (13/15) is a
// pending must-turn: the walk REACHES the must-turn cell but leaves it without making the required
// turn. So the load-bearing decision is the single move OUT of a pending must-turn cell — and the
// selective, turn-aware bias acts exactly there (reward the required-turn exit, penalize the others),
// only while a must-turn plateau is detected. This is the discriminating signal both flat-cell
// prototypes lacked: it targets HOW the must-turn cell is (mis)handled, not which cells are revisited.

/** The neighbor of `pos` that makes the required-direction turn, given the path arrived at `pos`
 *  from `prevKey`; null if none (or the arrival to `pos` wasn't a single orthogonal step). Pure —
 *  the turn-satisfying exit at a must-turn cell. Extracted from takePly so both the existing
 *  exit-guidance nudge and the turn-aware bias share one definition; exported for unit testing. */
export function preferredTurnExit(prevKey: number, pos: number, neighbors: number[], reqDir: string | undefined): number | null {
    const px = prevKey & 0xFFFF, py = (prevKey >>> 16) & 0xFFFF;
    const posx = pos & 0xFFFF, posy = (pos >>> 16) & 0xFFFF;
    const dx = posx - px, dy = posy - py;
    if (((dx === 0) === (dy === 0)) || Math.abs(dx) + Math.abs(dy) !== 1) return null;
    const entryAxis = dy === 0 ? AXIS_H : AXIS_V;
    for (const cand of neighbors) {
        const cy = (cand >>> 16) & 0xFFFF;
        const moveAxis = cy === posy ? AXIS_H : AXIS_V;
        if (entryAxis === moveAxis) continue; // same axis = straight through, not a turn
        const turnDir = reqDir === 'either' ? 'either' : turnDirection(prevKey, pos, cand);
        if (reqDir === 'either' || turnDir === reqDir) return cand;
    }
    return null;
}

type PlyOutcome = 'solved' | 'continue' | 'deadend' | 'goalInvalid';

// Take one randomized step from ws's current position, mutating ws in place and pushing the
// applied move's undo token onto liveUndo (so a later diff/replay can unwind it). Mirrors
// dfsFromGate's per-child pruning gauntlet (search.ts) applied to a flat candidate list
// instead of a DFS stack frame, with epsilon-greedy selection among the survivors instead of
// always taking the top-ranked one — same admissible pruning, different exploration policy.
//
// A genuine win (next === goal && isSolutionState) always short-circuits immediately, exactly
// like DFS/beam. A goal cell reached WITHOUT satisfying the win condition is rejected outright
// by the shared evaluatePrunedMove gauntlet (prune-gauntlet.ts) before it can ever reach the
// survivors list below — matching dfsFromGate/beamSearchFromGate's identical rule, and the real
// game rule that touching goal always ends the path (domain/move-rules.ts). A non-winning goal
// candidate therefore never becomes `chosen`; see the goalInvalid comment near the end of this
// function for why that branch is kept anyway (defense-in-depth) and what took over its old job.
// penaltyCells (Stage 2 prototype, null in every production run): when non-null, the FINITE
// per-cell score penalty for entering an overrepresented plateau attractor cell — subtracted from
// scoreMove's output before the greedy pick, so it only re-ranks candidates, never removes one.
// guideCells (Stage 3 prototype, null in every production run): when non-null, a flat GUIDE_REWARD
// ADDED for a move into a guide elite's cell — the recombination bias. Same soft, re-rank-only shape.
// turnBias (shared turn-aware bias, false in every production run): when true, at the move out of a
// pending must-turn cell, reward the required-turn exit and penalize the others (see preferredTurnExit).
function takePly(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template: StructuralTemplate | null, rand: () => number, rand2: (() => number) | null, epsilon: number, liveUndo: UndoToken[], penaltyCells: Map<number, number> | null = null, guideCells: Set<number> | null = null, turnBias = false): PlyOutcome {
    const pos = ws.path[ws.path.length - 1];
    const cfg = prep._cfg;
    let neighbors = getNeighbors(pos, ws, level, prep);
    if (ws.path.length === 1 && prep._forcedFirstStepKey != null) {
        neighbors = neighbors.filter(k => k === prep._forcedFirstStepKey);
    } else if (ws.path.length === 1 && (!cfg || cfg.PRUNE_MC_FORCED_FIRST_MOVE) && prep.gateForcedFirstStepKey.has(pos)) {
        const forced = prep.gateForcedFirstStepKey.get(pos);
        neighbors = neighbors.filter(k => k === forced);
    }
    if (neighbors.length === 0) return 'deadend';

    const survivors: number[] = [];
    let bestIdx = -1, bestScore = -Infinity;
    const portalAtPos = level.portalMap.get(pos);
    // ws is fixed for this whole batch — none of these candidates has been tentatively applied
    // yet (that happens per-candidate inside the loop below, then gets undone) — so `pos` and
    // everything CurUrgencyContext captures are stable for every sibling. See its doc comment.
    // includeMcAxisFix=false: repair specifically keeps the ORIGINAL (axis-timing-buggy but
    // apparently load-bearing for S043) must-cross computation — see buildCurUrgencyContext's
    // doc comment for the full story (a stress-corpus regression, not a hypothetical concern).
    const curCtx = buildCurUrgencyContext(pos, ws, level, prep, false, profile);

    // Identify (if any) the neighbor that is the correct-direction turn at a still-pending
    // must-turn cell — computed structurally from the untouched pre-move state (`pos` is the
    // path's current tip here, matching scoreMove's DFS/pre-apply convention, no ambiguity).
    // Used only to bias the random-exploration branch below via the independent `rand2` stream
    // (see EXIT_GUIDANCE_EPSILON_BOOST) — never the greedy ranking, and never `rand` itself.
    // Computed when either the exit-guidance nudge (rand2) or the turn-aware bias needs it.
    let preferredTurnTarget: number | null = null;
    let posIsPendingMustTurn = false;
    if ((rand2 !== null || turnBias) && ws.mustTurnMask !== 0 && ws.path.length >= 2) {
        const mtIdx = (prep.mustTurnCellIndex[pos] - 1);
        if (mtIdx !== -1 && (ws.mustTurnMask & (1 << mtIdx)) !== 0) {
            posIsPendingMustTurn = true;
            preferredTurnTarget = preferredTurnExit(ws.path[ws.path.length - 2], pos, neighbors, prep.mustTurnDirs?.[mtIdx]);
        }
    }

    for (const next of neighbors) {
        const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === next);
        const undo = applyMove(next, ws, level, prep, isJump);
        const realLen = getRealLengthFromState(ws);

        // runConnectivity=false: repair-search deliberately omits the isConnected prune — see
        // this file's top-of-file SOUNDNESS comment on why that's a pure speed tradeoff.
        // allowNeighborBudgetPrune=false: this loop picks its next move uniformly at random over
        // the surviving candidates below (`Math.floor(rand() * survivors.length)`) — shrinking
        // that candidate list here reindexes the same rand() draw onto a different move, silently
        // diverging the entire rest of this seeded walk (see prune-gauntlet.ts's own comment on
        // this parameter for the 2026-08-08 full-corpus evidence: 28 previously-repair-solved
        // levels lost). closeLengthGap/boundedDfsFromHere/relinkPaths below are all deterministic
        // (no rand()) and keep this check at its default (true) — pruning dead branches there can
        // only free more budget for live ones, same as dfsFromGate/beam.
        const verdict = evaluatePrunedMove(next, realLen, ws, level, prep, cfg, false,
            { allowNeighborBudgetPrune: false });

        if (verdict === 'solution') {
            liveUndo.push(undo);
            return 'solved';
        }

        if (verdict === 'pass') {
            const rStepsForScore = level.reqLen - realLen;
            let sc = scoreMove(next, pos, ws, level, prep, profile, rStepsForScore, template, curCtx);
            if (penaltyCells !== null) { const pen = penaltyCells.get(next); if (pen !== undefined) sc -= pen; }
            if (guideCells !== null && guideCells.has(next)) sc += GUIDE_REWARD;
            if (turnBias && posIsPendingMustTurn) sc += (next === preferredTurnTarget) ? TURN_BIAS_REWARD : -TURN_BIAS_PENALTY;
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
    const choiceResearch = prep._repairChoiceResearchObserver;
    let mode: 'only' | 'greedy' | 'explore' | 'must-turn-override' = 'only';
    let primaryDraws: number[] | null = null;
    let biasDraw: number | null = null;
    if (!choiceResearch) {
        if (survivors.length === 1) {
            chosenIdx = bestIdx;
        } else if (rand() >= epsilon) {
            chosenIdx = bestIdx;
        } else {
            chosenIdx = Math.floor(rand() * survivors.length);
            const preferredSurvivorIdx = preferredTurnTarget !== null ? survivors.indexOf(preferredTurnTarget) : -1;
            if ((!cfg || cfg.STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST) && rand2 !== null && preferredSurvivorIdx !== -1 && rand2() < EXIT_GUIDANCE_EPSILON_BOOST) chosenIdx = preferredSurvivorIdx;
        }
    } else if (survivors.length === 1) {
        chosenIdx = bestIdx;
    } else {
        primaryDraws = [];
        const branchDraw = rand(); primaryDraws.push(branchDraw);
        if (branchDraw >= epsilon) { chosenIdx = bestIdx; mode = 'greedy'; }
        else {
            const indexDraw = rand(); primaryDraws.push(indexDraw); mode = 'explore';
            chosenIdx = Math.floor(indexDraw * survivors.length);
        }
        const preferredSurvivorIdx = preferredTurnTarget !== null ? survivors.indexOf(preferredTurnTarget) : -1;
        if (mode === 'explore' && (!cfg || cfg.STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST) && rand2 !== null && preferredSurvivorIdx !== -1) {
            biasDraw = rand2();
            if (biasDraw < EXIT_GUIDANCE_EPSILON_BOOST) { chosenIdx = preferredSurvivorIdx; mode = 'must-turn-override'; }
        }
    }
    const chosen = survivors[chosenIdx];
    if (choiceResearch) choiceResearch.observe({ prefix: [...ws.path], survivors: [...survivors], chosenIndex: chosenIdx,
        chosen, mode, primaryDraws: primaryDraws ?? [], biasDraw });
    const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === chosen);
    liveUndo.push(applyMove(chosen, ws, level, prep, isJump));
    // `chosen === level.goalKey` is unreachable today: evaluatePrunedMove rejects a non-winning
    // goal-cell candidate outright (see this function's top comment), so it never reaches
    // `survivors`, and a winning one short-circuits via the 'solution' verdict above before
    // selection runs at all. Kept as a defense-in-depth terminal check anyway — same rationale
    // CLAUDE.md documents for the portal-destination guards in search-state.ts/move-rules.ts/
    // path-state.ts: don't read an invariant-enforcing check as dead weight to delete just
    // because the current callers already guarantee it holds elsewhere.
    return chosen === level.goalKey ? 'goalInvalid' : 'continue';
}

/** Direct seam for caller-policy regression tests. Production code uses the private function. */
export const __takePlyForTests = takePly;
export const __closeLengthGapForTests = closeLengthGap;

// Diffs ws's current live path against `targetPrefix`, undoing the divergent suffix and
// applying only the new prefix — same technique as beamSearchFromGate's `_liveUndo` diffing
// (search.ts), reused here so repeated ILS restarts/splices never reallocate the KEY_SPACE-sized
// typed arrays inside createState (that per-call-allocation mistake was already made once this
// session, in topology.ts's flipper-aware connectivity — see data/stress/README.md — and cost a real
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

/** Node budget for one closeLengthGap call (see below) — deliberately small: this is a quick,
 *  targeted look at the current dead end's own local neighborhood, not a second full search.
 *  Unmeasured/uncalibrated starting value — see the operator's own verification report before
 *  relying on this number meaning anything beyond "bounded." */
const LENGTH_GAP_CLOSE_NODE_BUDGET = 4000;

/** How much residual structuralDeficit closeLengthGap's near-miss trigger tolerates (see
 *  STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS below) — 1 covers the single-pending-object case
 *  found empirically to be common among the closest repair-close near-misses (e.g. one pending
 *  mustTurn cell alongside a length deficit of 1); see
 *  reports/2026-07-18-length-gap-close-invocation-rate.md for the measurement this is based on.
 *  Unmeasured/uncalibrated beyond that one data point — like LENGTH_GAP_CLOSE_NODE_BUDGET above,
 *  a starting value, not a tuned constant. */
const LENGTH_GAP_CLOSE_STRUCTURAL_SLACK = 1;

// Bounded backtracking DFS that tries to close a pure length/intersection deficit once every
// other objective (must-pass/must-cross/must-turn/adjacent-turn/surround) is already satisfied —
// see reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md and its generalization
// follow-up: repair's epsilon-greedy random walk converges fast to a near-miss whose ONLY
// remaining gap is hitting reqLen/reqInt exactly, then plateaus for the rest of the budget
// because a fresh/spliced random restart essentially never lands that exact integer target by
// chance. Once every other objective is clear, this stops being a hard combinatorial search:
// search-state.ts's applyMove only ever CLEARS a mustMask/mpVisitedMask/mustCrossMask/
// surroundMask/mustTurnMask/adjTurnMask bit, never re-sets one (undo is the only way any of them
// goes back to "pending" — see structuralDeficit's doc comment in solution.ts), so a small
// systematic backtrack from the dead end — trying alternate branches the way dfsFromGate already
// does instead of discarding all this progress and drawing a fresh random walk — is well suited
// to the residual "hit this exact length" problem.
//
// Only ever called on ws's CURRENT (already-deadended) state, and only ever backtracks within
// THIS restart's own suffix — never below `floor` (the elite-splice/fresh-start depth for this
// restart) — so it costs a small, capped amount of extra work per restart and never re-opens the
// (already-solved, by construction) combinatorial part of the path the random walk built to get
// here. On failure, ws/liveUndo are restored to the exact state they had on entry (via
// replayToPrefix) so the caller's existing near-miss bookkeeping is unaffected either way.
// Ablation: STRATEGY_REPAIR_LENGTH_GAP_CLOSE (see repairSearchFromGate's call site).
function closeLengthGap(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template: StructuralTemplate | null, cfg: AblationConfig | null | undefined, liveUndo: UndoToken[], floor: number, nodeBudget: number): { solved: boolean; nodes: number } {
    const originalPath = ws.path.slice();
    const suffixLen = originalPath.length - 1 - floor; // steps between floor and the dead end
    // The reconstruction below (rebuilding one DFS frame per already-taken step) costs roughly
    // one "node" per step of the existing suffix before any new exploration happens — if that
    // alone would exceed the budget, don't bother starting (see the reconstruction loop below).
    if (suffixLen >= nodeBudget) return { solved: false, nodes: 0 };

    const childLists: number[][] = [];
    const childIdx: number[] = [];
    let nodes = 0;

    const currentFrameChildren = (): number[] => {
        const pos = ws.path[ws.path.length - 1];
        const children = getNeighbors(pos, ws, level, prep);
        scoreAndSort(children, pos, ws, level, prep, profile, template);
        return children;
    };

    // Unwind to `floor`, then rebuild one DFS frame per step already taken by replaying
    // `originalPath` — each frame's children/childIdx position is set to exactly "the sibling
    // right after the one this restart already took here," the same invariant dfsFromGate's own
    // stack keeps natively as it descends fresh. This lets the loop below backtrack past any of
    // these positions and try a genuinely untried sibling, instead of only ever re-deriving the
    // exact same dead end.
    while (liveUndo.length > floor) undoMove(liveUndo.pop() as UndoToken, ws);
    for (let i = floor; i < originalPath.length - 1; i++) {
        nodes++;
        const children = currentFrameChildren();
        const nextKey = originalPath[i + 1];
        const idx = children.indexOf(nextKey);
        // idx === -1 should be unreachable — nextKey was legally applied to reach this exact
        // state originally, via the same getNeighbors/state this rebuild replays bit-for-bit —
        // but guarded rather than assumed (this codebase's own don't-trust-invariants-blindly
        // convention): bail out to "no rescue" rather than leave ws/liveUndo in a corrupt state.
        if (idx === -1) { replayToPrefix(ws, liveUndo, originalPath, level, prep); return { solved: false, nodes }; }
        childLists.push(children);
        childIdx.push(idx + 1);
        const pos = ws.path[ws.path.length - 1];
        const portalAtPos = level.portalMap.get(pos);
        const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === nextKey);
        liveUndo.push(applyMove(nextKey, ws, level, prep, isJump));
    }
    // Final frame: the dead-end position itself, fresh (childIdx 0) — re-derives the same
    // empty/fully-rejected candidate set takePly already found there (cheap, and needed so the
    // loop below has a frame to pop before backtracking into the reconstructed frames above).
    childLists.push(currentFrameChildren());
    childIdx.push(0);

    while (childLists.length > 0) {
        if (nodes >= nodeBudget) break;
        const d = childLists.length - 1;
        if (childIdx[d] >= childLists[d].length) {
            childLists.pop();
            childIdx.pop();
            if (liveUndo.length <= floor) break;
            undoMove(liveUndo.pop() as UndoToken, ws);
            continue;
        }
        nodes++;
        const pos = ws.path[ws.path.length - 1];
        const next = childLists[d][childIdx[d]++];
        const portalAtPos = level.portalMap.get(pos);
        const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === next);
        const undo = applyMove(next, ws, level, prep, isJump);
        const realLen = getRealLengthFromState(ws);
        // rSteps <= 10 mirrors dfsFromGate's own connectivity throttle (prune-gauntlet.ts's
        // caller-decides contract) — cheap early in the residual, thorough near the end where
        // it matters most.
        const rSteps = level.reqLen - realLen;
        const runConnectivity = rSteps <= 10 || (nodes & 63) === 0;
        const verdict = evaluatePrunedMove(next, realLen, ws, level, prep, cfg, runConnectivity);
        if (verdict === 'solution') {
            liveUndo.push(undo);
            return { solved: true, nodes };
        }
        if (verdict === 'pass') {
            liveUndo.push(undo);
            childLists.push(currentFrameChildren());
            childIdx.push(0);
        } else {
            undoMove(undo, ws);
        }
    }
    replayToPrefix(ws, liveUndo, originalPath, level, prep);
    return { solved: false, nodes };
}

// ── Elite-prefix DFS repair: bounded deterministic completion search from MULTIPLE points ────────
// scattered across the elite pool's best near-misses, not just the current restart's own dead end.
// docs/repair-search-stagnation-escape-plan.md's synthesis (reports/2026-07-22-repair-stagnation-
// investigation-synthesis.md) diagnosed the wall precisely: repair's search is append-only (extends
// a spliced prefix, never edits it), and the terminal residual of a stuck plateau needs
// prefix-level restructuring no bounded operator reaching only the CURRENT restart's own tip can
// supply — closeLengthGap (above) proved bounded deterministic DFS-from-a-point is a real, working
// technique (not just theory), but scoped it to exactly one point (this restart's own dead end);
// its own follow-up report found that single point's neighborhood "just rarely contains a rescue"
// (R02655: 6,727 triggers, 0 solves). This generalizes the SAME proven technique (deterministic,
// score-ordered, admissibly-pruned backtracking DFS — not random epsilon-greedy walking) to MANY
// points: several fractional depths along each of the top elite near-misses, hypothesizing that a
// residual inherited from an elite's already-good PARTIAL structure is a smaller, more tractable
// sub-problem for exhaustive best-first search than either (a) the full original problem (which is
// exactly dfs-plain's own exhaustion population — fresh-from-gate DFS already fails there) or (b)
// repair's randomized walk (which the synthesis found keeps re-deriving the same structural family
// regardless of where it splices from, never "trying harder" once it lands somewhere).
//
// SOUNDNESS: identical argument to every other operator in this file — every move goes through the
// same applyMove/evaluatePrunedMove/isSolutionState gate, so a returned path is solution-valid by
// construction regardless of which points were tried or in what order.

/** Deterministic, score-ordered, bounded backtracking DFS from ws's CURRENT state (already
 *  positioned by the caller, e.g. via replayToPrefix) toward a solution, never backtracking below
 *  `floor` (a liveUndo.length checkpoint). Shares its inner-loop shape with closeLengthGap's own
 *  tail loop (same evaluatePrunedMove gauntlet, same scoreAndSort ordering, same connectivity
 *  throttle) but starts completely fresh — no reconstruction of an already-taken suffix — since
 *  every caller here is starting from a genuinely NEW position (an elite's own earlier prefix, not
 *  this restart's own history), unlike closeLengthGap which resumes exactly where a restart's own
 *  walk just dead-ended. On success, ws holds the solved path and liveUndo reflects it (caller
 *  reads ws.path). On failure, ws/liveUndo end wherever the search's own backtracking left them —
 *  at or above `floor`, never below — so a caller MUST NOT assume ws is back at any particular
 *  state on failure; every caller here re-establishes its own position via replayToPrefix
 *  immediately after (elitePrefixDfsRepair's next attempt, or its final restore-to-startKey once
 *  every attempt is exhausted).
 *
 *  On failure, also reports the best (lowest-computeBadness) intermediate state reached along the
 *  way — mirroring relinkPaths' own "feed the best recombined intermediate back as search
 *  material" pattern, so a failed search's partial progress isn't simply discarded (this was a
 *  real gap in the operator's first version: without it, every one of potentially dozens of
 *  attempts per stagnation trigger threw away whatever partial progress it made, compounding
 *  nothing across firings — see reports/2026-08-07-repair-elite-prefix-dfs.md). Only checked when
 *  a NEW path-length record is set (not every node), since computeBadness isn't free and
 *  backtracking revisits shallower depths far more often than it sets new depth records. */
function boundedDfsFromHere(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template: StructuralTemplate | null, cfg: AblationConfig | null | undefined, liveUndo: UndoToken[], floor: number, nodeBudget: number): { solved: boolean; nodes: number; bestPath: number[] | null; bestBadness: number } {
    const childLists: number[][] = [];
    const childIdx: number[] = [];
    let nodes = 0;
    let deepestLen = ws.path.length;
    let bestBadness = Infinity;
    let bestPath: number[] | null = null;

    const currentFrameChildren = (): number[] => {
        const pos = ws.path[ws.path.length - 1];
        const children = getNeighbors(pos, ws, level, prep);
        scoreAndSort(children, pos, ws, level, prep, profile, template);
        return children;
    };
    childLists.push(currentFrameChildren());
    childIdx.push(0);

    while (childLists.length > 0) {
        if (nodes >= nodeBudget) break;
        const d = childLists.length - 1;
        if (childIdx[d] >= childLists[d].length) {
            childLists.pop();
            childIdx.pop();
            if (liveUndo.length <= floor) break;
            undoMove(liveUndo.pop() as UndoToken, ws);
            continue;
        }
        nodes++;
        const pos = ws.path[ws.path.length - 1];
        const next = childLists[d][childIdx[d]++];
        const portalAtPos = level.portalMap.get(pos);
        const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === next);
        const undo = applyMove(next, ws, level, prep, isJump);
        const realLen = getRealLengthFromState(ws);
        const rSteps = level.reqLen - realLen;
        const runConnectivity = rSteps <= 10 || (nodes & 63) === 0;
        const verdict = evaluatePrunedMove(next, realLen, ws, level, prep, cfg, runConnectivity);
        if (verdict === 'solution') {
            liveUndo.push(undo);
            return { solved: true, nodes, bestPath: null, bestBadness: 0 };
        }
        if (verdict === 'pass') {
            liveUndo.push(undo);
            if (ws.path.length > deepestLen) {
                deepestLen = ws.path.length;
                const b = computeBadness(ws, level);
                if (b < bestBadness) { bestBadness = b; bestPath = ws.path.slice(); }
            }
            childLists.push(currentFrameChildren());
            childIdx.push(0);
        } else {
            undoMove(undo, ws);
        }
    }
    return { solved: false, nodes, bestPath, bestBadness };
}

/** Top-N elites to try prefix-completion search from (see elitePrefixDfsRepair). */
const ELITE_PREFIX_DFS_ELITE_COUNT = 3;
/** Fractional destroy points along an elite's path to try. Deliberately back-half-and-later only:
 *  an earlier destroy point leaves a residual close to the size of the ORIGINAL problem, which
 *  fresh-from-gate DFS attempts already exhaust without success (this population overlaps
 *  dfs-plain's own exhaustion set) — the hypothesis this operator tests is specifically that a
 *  SMALLER residual, inherited from an elite's already-good partial structure, is more tractable
 *  for deterministic best-first search than the full problem is. Unmeasured/uncalibrated starting
 *  values, like every other constant in this file's Stage 2/3 prototypes — a hypothesis to
 *  calibrate by A/B, not a tuned number. */
const ELITE_PREFIX_DFS_FRACTIONS = [0.5, 0.65, 0.8, 0.9];
/** Node budget per (elite, destroy point) attempt — many small shots, not one large one, mirroring
 *  closeLengthGap's own "bounded, targeted look" philosophy. */
const ELITE_PREFIX_DFS_NODE_BUDGET_PER_ATTEMPT = 15000;
/** Total node budget across ALL (elite, destroy-point) attempts in one stagnation-triggered call —
 *  a ceiling independent of ELITE_PREFIX_DFS_NODE_BUDGET_PER_ATTEMPT × the attempt count, so a
 *  string of quick failures doesn't burn the full theoretical max every trigger. */
const ELITE_PREFIX_DFS_TOTAL_BUDGET = 90000;

/** Tries a bounded deterministic completion search from several points scattered across the top
 *  elites' own paths (see this section's header comment). Ablation: STRATEGY_REPAIR_ELITE_PREFIX_DFS
 *  (repairSearchFromGate's enableElitePrefixDfs param). On failure, ws/liveUndo are restored to
 *  [startKey] so the caller's own next-restart logic (which always repositions ws itself) starts
 *  from a known, documented state — matching relinkPaths' own end-of-call convention. Also returns
 *  the single best (lowest-badness) intermediate found across every attempt in this call (see
 *  boundedDfsFromHere) — the caller is expected to feed it back via considerElite, matching
 *  relinkPaths' own "best recombined intermediate becomes new search material" pattern. */
export function elitePrefixDfsRepair(ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template: StructuralTemplate | null, cfg: AblationConfig | null | undefined, liveUndo: UndoToken[], elites: { path: number[]; badness: number }[], startKey: number, totalNodeBudget: number): { solved: boolean; nodes: number; bestPath: number[] | null; bestBadness: number } {
    let totalNodes = 0;
    let bestBadness = Infinity, bestPath: number[] | null = null;
    const eliteCount = Math.min(elites.length, ELITE_PREFIX_DFS_ELITE_COUNT);
    for (let e = 0; e < eliteCount; e++) {
        const elitePath = elites[e].path;
        for (const frac of ELITE_PREFIX_DFS_FRACTIONS) {
            if (totalNodes >= totalNodeBudget) break;
            const destroyIdx = Math.max(1, Math.min(elitePath.length - 1, Math.floor(elitePath.length * frac)));
            const prefix = elitePath.slice(0, destroyIdx + 1);
            replayToPrefix(ws, liveUndo, prefix, level, prep);
            const floor = liveUndo.length;
            const remaining = Math.min(ELITE_PREFIX_DFS_NODE_BUDGET_PER_ATTEMPT, totalNodeBudget - totalNodes);
            if (remaining <= 0) break;
            const result = boundedDfsFromHere(ws, level, prep, profile, template, cfg, liveUndo, floor, remaining);
            totalNodes += result.nodes;
            if (result.solved) return { solved: true, nodes: totalNodes, bestPath: null, bestBadness: 0 };
            if (result.bestPath && result.bestBadness < bestBadness) { bestBadness = result.bestBadness; bestPath = result.bestPath; }
        }
        if (totalNodes >= totalNodeBudget) break;
    }
    replayToPrefix(ws, liveUndo, [startKey], level, prep);
    return { solved: false, nodes: totalNodes, bestPath, bestBadness };
}

/** The pending-objective masks (see ElitePending) for a state — one source of truth for both the
 *  main elite insertion and relinkPaths' intermediate capture (Stage 3). */
function elitePendFromState(ws: SolverSearchState, level: NormalizedLevel): ElitePending {
    const mpN = level.mustPassKeys.length;
    const mpFull = mpN > 0 ? ((1 << mpN) - 1) : 0;
    return { mp: (~ws.mpVisitedMask) & mpFull, mc: ws.mustCrossMask, sr: ws.surroundMask, mt: ws.mustTurnMask, at: ws.adjTurnMask };
}

/** Max anchor recombinations tried per relinkPaths call (Stage 3-real). Bounded — the anchors are
 *  tried longest-guide-suffix first, so a small cap still covers the most guide-like recombinations. */
const RELINK_MAX_ANCHORS = 12;
/** Node budget for one relinkPaths call. Bounded and infrequent (stagnation-triggered). */
const RELINK_NODE_BUDGET = 20000;

// Stage 3-real: reversible-operator path relinking (docs/repair-search-stagnation-escape-plan.md).
// This is the genuine recombination the plan flags as separate work, NOT Stage 3's soft
// guide-attraction: it COPIES the guide's exact move sequence rather than nudging toward its cells.
// The operator is an "anchor splice" — for a cell shared by base and guide (base[i] == guide[j], the
// anchor), build base[0..i] then replay guide[j+1..end] MOVE BY MOVE through the real
// applyMove/evaluatePrunedMove gauntlet. Because every copied move goes through the same legality
// primitives the rest of the search uses, an illegal recombination can never be returned as a
// solution (it dead-ends at the first illegal guide move) — that is the plan's "verify no illegal
// intermediate that only isSolutionState would catch" requirement, satisfied by construction rather
// than by a new proof. The set of anchors is the relinking trajectory between the two elites;
// callers run it bidirectionally. Deterministic (no rand). On a solution, ws holds it (caller reads
// ws.path); otherwise ws is restored to [startKey] and the caller may re-seed the elite pool with
// the returned bestPath (the best intermediate on the relinking trajectory — the whole point of
// relinking is that these intermediates become new search material, not that a single copy solves).
// liveUndo stays consistent throughout (only committed 'pass'/'solution' moves are pushed, exactly
// like takePly/closeLengthGap). Exported for direct unit testing of the operator.
export function relinkPaths(ws: SolverSearchState, base: number[], guide: number[], level: NormalizedLevel, prep: PrepLevel, cfg: AblationConfig | null | undefined, liveUndo: UndoToken[], startKey: number, nodeBudget: number): { solved: boolean; nodes: number; bestPath: number[] | null; bestBadness: number; bestPend: ElitePending | null } {
    // guide cell -> its earliest index (longest copyable suffix from that anchor).
    const guideIndex = new Map<number, number>();
    for (let j = guide.length - 1; j >= 1; j--) guideIndex.set(guide[j], j);

    // Anchors (i in base, j in guide) where the two paths share a cell, deduped by cell (first base
    // occurrence), tried longest-guide-suffix (smallest j) first so the most guide-like
    // recombinations come first under the cap.
    const seen = new Set<number>();
    const anchors: { i: number; j: number }[] = [];
    for (let i = 1; i < base.length; i++) {
        const c = base[i];
        if (seen.has(c)) continue;
        const j = guideIndex.get(c);
        if (j !== undefined && j < guide.length - 1) { anchors.push({ i, j }); seen.add(c); }
    }
    anchors.sort((a, b) => a.j - b.j);

    let nodes = 0, bestBadness = Infinity, bestPath: number[] | null = null, bestPend: ElitePending | null = null;
    for (let a = 0; a < anchors.length && a < RELINK_MAX_ANCHORS; a++) {
        if (nodes >= nodeBudget) break;
        const { i, j } = anchors[a];
        replayToPrefix(ws, liveUndo, base.slice(0, i + 1), level, prep); // ws tip is now the anchor cell
        let copied = 0;
        for (let k = j + 1; k < guide.length; k++) {
            if (nodes >= nodeBudget) break;
            nodes++;
            const pos = ws.path[ws.path.length - 1];
            const c = guide[k];
            const neighbors = getNeighbors(pos, ws, level, prep);
            if (!neighbors.includes(c)) break; // guide's suffix diverges illegally under base's state
            const portalAtPos = level.portalMap.get(pos);
            const isJump = !!(portalAtPos && !ws.lastWasPortalJump && portalAtPos.dest === c);
            const undo = applyMove(c, ws, level, prep, isJump);
            copied++;
            const realLen = getRealLengthFromState(ws);
            const runConnectivity = (level.reqLen - realLen) <= 10 || (nodes & 63) === 0;
            const verdict = evaluatePrunedMove(c, realLen, ws, level, prep, cfg, runConnectivity);
            if (verdict === 'solution') { liveUndo.push(undo); return { solved: true, nodes, bestPath: null, bestBadness: 0, bestPend: null }; }
            if (verdict === 'pass') { liveUndo.push(undo); continue; }
            undoMove(undo, ws); copied--; // illegal recombination step — abandon this anchor
            break;
        }
        // Record the best recombined intermediate (only if we actually spliced in some guide cells —
        // a zero-copy anchor is just the base prefix, no new structure).
        if (copied > 0) {
            const b = computeBadness(ws, level);
            if (b < bestBadness) { bestBadness = b; bestPath = ws.path.slice(); bestPend = elitePendFromState(ws, level); }
        }
    }
    replayToPrefix(ws, liveUndo, [startKey], level, prep);
    return { solved: false, nodes, bestPath, bestBadness, bestPend };
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
/** Counterfactual receptor experiment (see enableBeamSeed below): a small, cheap beam search run
 *  once before the restart loop begins, whose surviving frontier is validated through the real
 *  state transition machinery (replayToPrefix -> applyMove, the exact primitives every legal move
 *  in this file already goes through) and seeded into the initial elite pool via the SAME
 *  considerElite path every organically-discovered elite uses — no new consumption pathway, no
 *  new soundness surface (docs/solver-interoperability-and-cooperation-plan.md's "candidate
 *  interoperability" layer). Motivated by the 2026-08-13 stratified producer-population pilot
 *  (25 levels, zero exact-prefix / zero metric-projection overlap between beam survivors and
 *  repair's own elites — see reports/2026-08-11-beam-repair-producer-population-pilot.md's
 *  "Stratified follow-up" section): beam reliably reaches structural regions repair's randomized
 *  restarts do not independently sample. Deliberately SMALL and budget-charged against
 *  nodesExpandedLocal (the same counter the restart loop's own termination check reads), so the
 *  ordinary restart loop's own share shrinks by exactly this cost — the "protected native share"
 *  the interop plan's own soundness rules (§5.4) require, not a free extra pass. */
const BEAM_SEED_WIDTH = 20;
const BEAM_SEED_NODE_BUDGET = 3000;
/** How many of the seed beam's surviving frontier members to validate/insert — small on purpose:
 *  this is meant to test whether a FEW structurally-novel starting points help, not to replace the
 *  elite pool's own organic discovery. */
const BEAM_SEED_TOP_K = 3;
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

// Stage 2 prototype tunables (see computePlateauPenaltyCells / enablePlateauPenalty). All are
// UNMEASURED starting values — like LENGTH_GAP_CLOSE_NODE_BUDGET/_STRUCTURAL_SLACK, chosen to be
// "plausible and finite," to be calibrated (or discarded) by the Stage 2 A/B, not tuned yet. The
// penalty scale is deliberately in the same order as scoreMove's own terms (revisit −8, exit
// guidance +40) so it re-ranks without dominating.
/** Penalty per unit of (capped) log-odds overrepresentation of an attractor cell. */
const PLATEAU_PENALTY_UNIT = 4;
/** Only penalize cells at least this far (smoothed log-odds) above their global appearance rate. */
const PLATEAU_PENALTY_MIN_LOGODDS = 2.5;
/** Cap on counted log-odds, so the max per-cell penalty is UNIT × CAP (here 32). */
const PLATEAU_PENALTY_LOGODDS_CAP = 8;
/** Restarts a computed penalty map stays active before decaying to none. Re-armed on each stagnation
 *  trigger and reset on any best-ever improvement — so it tracks "the current plateau" without ever
 *  becoming permanent (a soundness rule from the plan). Equal to STAGNATION_THRESHOLD so a genuinely
 *  persistent plateau keeps the penalty continuously re-armed. */
const PLATEAU_PENALTY_WINDOW = STAGNATION_THRESHOLD;
/** 1-in-N restarts run fully unpenalized (pure epsilon-greedy) — the memory-blind fraction that
 *  preserves support: every construction reachable under the original policy stays reachable. */
const PLATEAU_MEMORY_BLIND_PERIOD = 4;
/** Require this many restarts already recorded in the plateau shape before computing a penalty from
 *  it — below this the conditional log-odds is too noisy to bias on. */
const PLATEAU_MIN_SHAPE_SAMPLE = 50;
/** Stage 3 prototype (scatter-search recombination, see enableRecombination): flat, finite reward
 *  for a forward move into a guide elite's cell during a base-elite splice restart. Same order as
 *  scoreMove's own terms (revisit −8, exit-guidance +40) so it re-ranks without dominating.
 *  Unmeasured starting value — a hypothesis to calibrate by A/B, not a tuned number. */
const GUIDE_REWARD = 12;
/** Shared turn-aware selective bias (see preferredTurnExit / enableTurnBias): while a must-turn
 *  plateau is active, at the move OUT of a pending must-turn cell, reward the required-turn exit and
 *  penalize the others. Same order as scoreMove's exit-guidance term (+40); reward > penalty so the
 *  turn is strongly preferred without flatly suppressing every alternative. Unmeasured starting
 *  values. Only active during a detected plateau, which is what keeps it from perturbing the levels
 *  that already solve (raw always-on exit guidance is documented-fragile — see EXIT_GUIDANCE_*). */
const TURN_BIAS_REWARD = 40;
const TURN_BIAS_PENALTY = 20;
/** Restarts a turn-bias arming stays active (re-armed each stagnation, reset on improvement). */
const TURN_BIAS_WINDOW = STAGNATION_THRESHOLD;
/** 1-in-N restarts run turn-bias-free (support preservation), matching the other soft mechanisms. */
const TURN_BIAS_MEMORY_BLIND_PERIOD = 4;

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
// nodeBudget: optional, in ADDITION to budgetMs (never a substitute for it) — a deterministic,
// machine-speed-independent cap used by runRepairProbe (orchestration.ts) so the early-probe
// win/loss decision depends on work done, not wall-clock luck under contention. Infinity
// (default) preserves the pre-existing ms-only behavior exactly. out.nodesExpanded, when
// provided, is set on every return path so the caller can track cumulative probe consumption
// across gates the same way it already tracks elapsed ms. out.bestBadness (failure only) is the
// lowest computeBadness score any restart ever reached — a "how close did this near-miss get"
// signal for external tooling (stress benchmark triage), read from the same internal bookkeeping
// the elite pool already uses, not a new computation. out.timedOut is always true on failure:
// unlike DFS/beam, this loop has no natural exhaustion state, it only ever stops via the
// budget/nodeBudget check below — recorded anyway so callers can treat all three search
// strategies' Attempt records uniformly.
// enablePlateauPenalty (Stage 2 prototype, docs/repair-search-stagnation-escape-plan.md): off by
// default — OFF makes this function byte-for-byte identical to the pre-Stage-2 code path (all its
// bookkeeping is gated behind the flag, and it never consumes `rand`/`rand2`, so the PRNG streams
// and therefore every trajectory are unchanged). ON activates signature-conditioned soft feature
// memory: a finite, decaying, memory-blind-sampled penalty that biases the greedy pick away from
// the plateau's overrepresented attractor cells. No production path passes true; only the Stage 2
// A/B tooling does.
// enableRecombination (Stage 3 prototype, same doc): off by default, same byte-identical-when-off
// guarantee (all its bookkeeping is gated, and guide selection consumes no `rand`/`rand2`). ON turns
// elite-splice restarts into scatter-search recombination — the base-elite splice is additionally
// biased toward a structurally-distant guide elite's cells (see GUIDE_REWARD). No production caller
// passes true.
// enableRelink (Stage 3-real, same doc): off by default, same byte-identical-when-off guarantee. ON
// runs bidirectional reversible-operator path relinking (see relinkPaths) between the best elite and
// its most-complementary partner on each stagnation trigger — copying guide suffixes through the real
// gauntlet, not the soft attraction of enableRecombination. No production caller passes true.
// enableTurnBias (shared turn-aware selective bias, same doc): off by default, same byte-identical-
// when-off guarantee (gated, consumes no rand). ON arms, on a must-turn stagnation, a turn-aware bias
// at the move out of a pending must-turn cell (reward the required-turn exit, penalize the others) —
// the selective successor to Stage 2/3's flat-cell biases. No production caller passes true.
export async function repairSearchFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, budgetMs: number, startTime: number, template: StructuralTemplate | null, yieldFn: YieldFn = null, enableMustTurnBias = false, nodeBudget = Infinity, out: { nodesExpanded?: number; timedOut?: boolean; bestBadness?: number; stopReason?: RepairStopReason } | null = null, seedSalt = 0, enablePlateauPenalty = false, enableRecombination = false, enableRelink = false, enableTurnBias = false, enableElitePrefixDfs = false, enableBeamSeed = false): Promise<number[] | null> {
    const cfg = prep._cfg;
    const eliteResearch = prep._repairEliteResearchObserver;
    const ws = createState(startKey, level, prep, STATE_BUF_REPAIR);
    const liveUndo: UndoToken[] = [];
    // Seeded from startKey alone: deterministic per gate, varies naturally across gates/levels.
    // seedSalt (default 0, XOR no-op) is additive-only: offline batch tooling (scripts/repair-
    // direct-probe.mjs's --races) is the only caller that ever passes a nonzero value, to run
    // several genuinely independent deterministic trajectories from the same gate in parallel.
    // No production/live caller passes this argument, so every existing call site is unaffected.
    const researchSeed = prep._repairResearchSeed;
    const streamSeeds = repairStreamSeeds(startKey, seedSalt, researchSeed);
    const rand = mulberry32(streamSeeds.primary);
    // A SECOND, independent stream (different constant) dedicated to the must-turn exit-guidance
    // nudge below (see EXIT_GUIDANCE_EPSILON_BOOST) — deliberately never drawn from `rand` itself,
    // and only ever created/consumed when enableMustTurnBias is true (the biased attempt).
    const rand2 = enableMustTurnBias ? mulberry32(streamSeeds.mustTurn) : null;

    // Nogood cache (see nogood-cache.ts) — one instance per repairSearchFromGate call, per its own
    // lifecycle rule. Ablation: STRATEGY_REPAIR_NOGOOD_CACHE, default-on (standard convention,
    // unlike the Stage 2/3 prototypes above and elitePrefixDfsRepair): this mechanism can only
    // ever SKIP already-proven-dead exploration, never add competing search effort, so it doesn't
    // carry the same "extra technique competing for a shared node budget" risk those do.
    const nogoodCache = (!cfg || cfg.STRATEGY_REPAIR_NOGOOD_CACHE) ? createNogoodCache() : null;

    // Elite pool, sorted ascending by badness (elites[0] is the best-ever near-miss). See
    // ELITE_POOL_SIZE. `cells`/`pend` (Stage 3): the path's visited-cell set and pending-objective
    // masks, built once at insert time only when recombination is enabled (null otherwise → zero cost
    // on the default path), used for complementarity + structural-distance guide selection.
    const elites: { path: number[]; badness: number; cells: Set<number> | null; pend: ElitePending | null }[] = [];
    // One elite-pool insertion path for both the per-restart near-miss and (Stage 3-real) relink
    // intermediates: keep the K best DISTINCT near-misses, storing `cells`/`pend` only when a Stage 3
    // mechanism needs them. `cells`/`pend` are passed in (the caller has the live state); a caller
    // that doesn't track structure passes null.
    const considerElite = (candidatePath: number[], bad: number, cells: Set<number> | null, pend: ElitePending | null): void => {
        const worst = elites.length > 0 ? elites[elites.length - 1] : null;
        if (!(elites.length < ELITE_POOL_SIZE || (worst && bad < worst.badness))) return;
        if (elites.some(e => e.badness === bad && pathsEqual(e.path, candidatePath))) return;
        if (elites.length >= ELITE_POOL_SIZE) elites.pop();
        elites.push({ path: candidatePath, badness: bad, cells, pend });
        elites.sort((x, y) => x.badness - y.badness);
        if (eliteResearch) eliteResearch.observe({ producer: 'repair', path: [...candidatePath], badness: bad,
            arrivalNodes: nodesExpandedLocal, restart: restartCount });
    };
    let bestBadnessEver = Infinity;
    let restartsSinceImprovement = 0;
    let forcedFreshRemaining = 0;
    let restartCount = 0;
    let lastYield = startTime;
    let nodesExpandedLocal = 0;

    // Counterfactual receptor experiment (see enableBeamSeed / BEAM_SEED_WIDTH's own comment) —
    // inert (zero cost, zero behavior change) when the flag is off, the default and only production
    // path. Runs ONCE, before any restart, and only ever adds candidates to the elite pool through
    // the exact same considerElite() every organically-discovered elite already goes through.
    if (enableBeamSeed) {
        const prevBeamObserver = prep._beamResearchObserver;
        let survivorPaths: number[][] = [];
        // 'post-diversity-selection' is the final retained frontier when diverse selection ran;
        // 'post-score-width-cull' is the equivalent boundary when it didn't (same convention
        // scripts/stress/producer-population-pilot.mjs's own offline pilot already uses). Only the
        // LAST record of either kind matters — each phase overwrites the previous one, so this ends
        // up holding the beam's final surviving frontier, not an intermediate one.
        prep._beamResearchObserver = { observe: (record: BeamResearchRecord) => {
            if (record.stage === 'post-diversity-selection' || record.stage === 'post-score-width-cull') survivorPaths = record.paths;
        } };
        const beamNodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
        await beamSearchFromGate(startKey, level, prep, profile, budgetMs, startTime, template, BEAM_SEED_WIDTH, yieldFn, false, null, BEAM_SEED_NODE_BUDGET);
        prep._beamResearchObserver = prevBeamObserver;
        // Charged against THIS call's own local counter — the same one the restart loop's own
        // termination check reads below — so the ordinary restart loop's share shrinks by exactly
        // this cost. Never a free extra pass.
        nodesExpandedLocal += (prep._metrics ? prep._metrics.nodesExpanded : 0) - beamNodesBefore;

        // Validate every survivor through the real state transition machinery (replayToPrefix ->
        // applyMove — the same primitives every legal move in this file already goes through, and
        // the exact mechanism relinkPaths/elitePrefixDfsRepair already use for their own candidate
        // intermediates) before trusting its badness, then seed only the best BEAM_SEED_TOP_K.
        const scored = survivorPaths
            .filter(p => p.length > 1)
            .map(p => { replayToPrefix(ws, liveUndo, p, level, prep); return { path: p.slice(), badness: computeBadness(ws, level) }; })
            .sort((a, b) => a.badness - b.badness);
        for (const { path, badness } of scored.slice(0, BEAM_SEED_TOP_K)) considerElite(path, badness, null, null);
        // Back to the gate: the restart loop's own first replayToPrefix diffs against whatever ws
        // currently holds, so this isn't strictly required for correctness (any starting path
        // diffs correctly), but keeps the state a known, debuggable baseline before restarts begin.
        replayToPrefix(ws, liveUndo, [startKey], level, prep);
    }

    // Stage-1 instrumentation only (see _SIG_DEBUG) — null and untouched on a normal run.
    const sigCounts = _SIG_DEBUG ? new Map<string, number>() : null;         // signature -> restarts landing there
    const featGlobal = _SIG_DEBUG ? new Map<string, number>() : null;       // feature -> restarts exhibiting it (any signature)
    const featBySig = _SIG_DEBUG ? new Map<string, Map<string, number>>() : null; // signature -> (feature -> count)
    const sigBadness = _SIG_DEBUG ? new Map<string, number>() : null;       // signature -> min computeBadness seen at it
    let sigRestarts = 0;

    // Stage 2 prototype (see enablePlateauPenalty) — null/inert on a normal run.
    const shapeTotal = enablePlateauPenalty ? new Map<string, number>() : null;            // shape -> restarts landing there
    const cellGlobal = enablePlateauPenalty ? new Map<number, number>() : null;            // attractor cell -> restarts exhibiting it (any shape)
    const cellByShape = enablePlateauPenalty ? new Map<string, Map<number, number>>() : null; // shape -> (attractor cell -> count)
    let plateauShape: string | null = null;              // shape of the current best-ever-badness restart
    let penaltyCells: Map<number, number> | null = null; // active penalty map, null when inactive
    let penaltyRemaining = 0;                             // restarts the current penalty map stays active
    let plateauRecorded = 0;                             // total restarts recorded into the tables above

    // Shared turn-aware selective bias (see enableTurnBias) — inert on a normal run.
    let turnBiasRemaining = 0;                    // restarts the turn bias stays active
    let bestHadPendingMustTurn = false;           // did the current best-ever restart still have a pending must-turn?

    while (true) {
        const now = Date.now();
        const workBudgetReached = prep._workMeter.units >= (prep._workCap ?? Infinity);
        const nodeBudgetReached = nodesExpandedLocal >= nodeBudget;
        const wallClockReached = now - startTime >= budgetMs;
        if (workBudgetReached || nodeBudgetReached || wallClockReached) {
            if (out) {
                out.nodesExpanded = nodesExpandedLocal;
                out.timedOut = true;
                out.bestBadness = bestBadnessEver;
                // Deterministic caps take precedence if more than one bound becomes true on the
                // same check. A call is "wall-clock" only when elapsed time stopped it BEFORE its
                // requested deterministic work/node envelope completed.
                out.stopReason = workBudgetReached ? 'work-budget'
                    : nodeBudgetReached ? 'node-budget'
                    : 'wall-clock';
            }
            if (_SIG_DEBUG) emitSignatureSummary(startKey, sigRestarts, sigCounts!, featGlobal!, featBySig!, sigBadness!, bestBadnessEver);
            return null;
        }
        if (yieldFn && now - lastYield >= 16) {
            lastYield = now;
            await yieldFn(); // throws on cancellation
        }
        restartCount++;
        const epsilon = EPSILON_LADDER[restartCount % EPSILON_LADDER.length];

        if (forcedFreshRemaining > 0) forcedFreshRemaining--;
        // Ablation: STRATEGY_REPAIR_ELITE_SPLICE — disabling forces every restart fresh-from-gate.
        const spliceFromElite = (!cfg || cfg.STRATEGY_REPAIR_ELITE_SPLICE)
            && forcedFreshRemaining === 0 && elites.length > 0 && rand() < SPLICE_PROBABILITY;
        const baseElite = spliceFromElite ? elites[Math.floor(rand() * elites.length)] : null;
        const elitePath = baseElite ? baseElite.path : null;
        const targetPrefix = elitePath && elitePath.length > 1
            ? elitePath.slice(0, 1 + Math.floor(rand() * (elitePath.length - 1)))
            : [startKey];
        replayToPrefix(ws, liveUndo, targetPrefix, level, prep);
        const spliceFloor = liveUndo.length;

        // Stage 3: on a base-elite splice, pick a structurally-distant guide and bias this restart's
        // forward construction toward its cells (scatter-search recombination). Fresh restarts (and
        // every restart when the pool has <2 members) stay unbiased, preserving support. Guide
        // selection is a deterministic argmax over the pool — no `rand`/`rand2` draw.
        let guideCells: Set<number> | null = null;
        if (enableRecombination && baseElite && baseElite.cells && elites.length >= 2) {
            guideCells = selectGuideCells(baseElite, elites);
        }

        // Stage 2: decide this restart's penalty. Memory-blind restarts (1-in-N) run fully
        // unpenalized so every originally-reachable construction stays reachable. Decrement the
        // window here so it decays even across a memory-blind restart. Purely deterministic state
        // (restartCount + accumulated tables) — no `rand`/`rand2` draw, so PRNG streams are unmoved.
        let activePenalty: Map<number, number> | null = null;
        if (enablePlateauPenalty) {
            const memoryBlind = (restartCount % PLATEAU_MEMORY_BLIND_PERIOD) === 0;
            if (penaltyCells !== null && penaltyRemaining > 0 && !memoryBlind) activePenalty = penaltyCells;
            if (penaltyRemaining > 0) penaltyRemaining--;
        }
        // Shared turn-aware bias: active while armed, except on the memory-blind fraction. Same
        // deterministic-state discipline as the penalty (no rand draw).
        let turnBiasActive = false;
        if (enableTurnBias) {
            turnBiasActive = turnBiasRemaining > 0 && (restartCount % TURN_BIAS_MEMORY_BLIND_PERIOD) !== 0;
            if (turnBiasRemaining > 0) turnBiasRemaining--;
        }

        let outcome: PlyOutcome = 'continue';
        while (outcome === 'continue') {
            outcome = takePly(ws, level, prep, profile, template, rand, rand2, epsilon, liveUndo, activePenalty, guideCells, turnBiasActive);
            if (prep._metrics) prep._metrics.nodesExpanded++;
            nodesExpandedLocal++;
            // Nogood cache (see nogood-cache.ts): checked once per COMMITTED step, not once per
            // candidate inside takePly — see that file's own header comment for why. A hit means
            // this exact state already dead-ended earlier in THIS repairSearchFromGate call under
            // takePly's own exploration — short-circuit immediately rather than re-walking the
            // rest of an already-known-fruitless subtree. Only ever converts 'continue' to
            // 'deadend', never touches 'solved' — cannot affect correctness, only speed.
            if (outcome === 'continue' && nogoodCache && nogoodCache.has(ws)) outcome = 'deadend';
        }

        if (outcome === 'solved') {
            if (out) out.nodesExpanded = nodesExpandedLocal;
            return ws.path.slice();
        }
        nogoodCache?.recordDead(ws);

        // Ablation: STRATEGY_REPAIR_LENGTH_GAP_CLOSE — see closeLengthGap's doc comment above.
        // Base trigger fires once every non-length/non-intersection objective is already
        // satisfied (structuralDeficit === 0); a monotone property of this walk, so this
        // reliably targets exactly the frozen-signature population without needing to know WHEN
        // it became true. Ablation: STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS additionally
        // allows a small residual structuralDeficit (see LENGTH_GAP_CLOSE_STRUCTURAL_SLACK) —
        // NOT a "will stay true forever" guarantee like the ===0 case (a backtrack inside
        // closeLengthGap's own bounded search can re-open an already-cleared structural bit), but
        // that's fine for correctness: closeLengthGap only ever returns solved=true via the same
        // isSolutionState() check the rest of this file relies on, so a returned path is sound
        // regardless of what triggered the attempt. This just widens WHEN the (cheap, bounded)
        // attempt is worth making — see reports/2026-07-18-length-gap-close-invocation-rate.md
        // for the empirical case this targets (near-miss levels whose best-ever badness is stuck
        // on "length off by 1, one pending mustTurn cell" — structuralDeficit=1, so the base
        // trigger never even attempts them despite being extremely close).
        const deficit = structuralDeficit(ws, level);
        const slack = (!cfg || cfg.STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS) ? LENGTH_GAP_CLOSE_STRUCTURAL_SLACK : 0;
        if ((!cfg || cfg.STRATEGY_REPAIR_LENGTH_GAP_CLOSE) && outcome === 'deadend'
                && deficit <= slack && nodesExpandedLocal < nodeBudget) {
            const closeBudget = Math.min(LENGTH_GAP_CLOSE_NODE_BUDGET, nodeBudget - nodesExpandedLocal);
            const _lgcLenDeficit = _LENGTH_GAP_DEBUG ? computeBadness(ws, level) : 0;
            const closeResult = closeLengthGap(ws, level, prep, profile, template, cfg, liveUndo, spliceFloor, closeBudget);
            nodesExpandedLocal += closeResult.nodes;
            if (prep._metrics) prep._metrics.nodesExpanded += closeResult.nodes;
            if (_LENGTH_GAP_DEBUG) {
                console.error(`  [lgc] gate=${startKey} restart=${restartCount} lenDeficit=${_lgcLenDeficit} closeBudget=${closeBudget} nodesUsed=${closeResult.nodes} exhausted=${closeResult.nodes < closeBudget} solved=${closeResult.solved}`);
            }
            if (closeResult.solved) {
                if (out) out.nodesExpanded = nodesExpandedLocal;
                return ws.path.slice();
            }
        }
        // outcome is 'deadend' or 'goalInvalid' here ('solved' already returned above). Both mean
        // this restart ended without solving, and both get the same near-miss bookkeeping
        // (elite-pool candidacy + bestBadnessEver tracking) — not just 'goalInvalid'.
        //
        // History: 'goalInvalid' used to be the common case (a walk stalling out at/near goal
        // without satisfying the win condition), so this bookkeeping ran often. Since
        // evaluatePrunedMove started rejecting a non-winning goal-cell candidate outright
        // (prune-gauntlet.ts — a real correctness fix, not a regression to revert: see this
        // file's SOUNDNESS comment and takePly's), that candidate never reaches `survivors`
        // anymore, so 'goalInvalid' can no longer fire (see takePly's dead-code comment on its
        // `chosen === level.goalKey` check) — the exact same stall now surfaces as an ordinary
        // 'deadend' instead (`survivors.length === 0`). Scoping this block to 'goalInvalid' alone
        // silently went from "usual case" to "never happens" the moment that fix landed, leaving
        // the elite pool permanently empty and every restart splicing from nothing but a fresh
        // gate start — a large, uncredited chunk of repair's post-fix slowdown, since
        // ELITE_POOL_SIZE/SPLICE_PROBABILITY's whole purpose (see their own comments) is
        // escaping the single-best-path premature-convergence trap this reduces back to.
        const b = computeBadness(ws, level);
        if (_SIG_DEBUG) {
            const rec = deadEndSignatureRecord(ws, level, prep);
            sigRestarts++;
            sigCounts!.set(rec.sigKey, (sigCounts!.get(rec.sigKey) ?? 0) + 1);
            const prevMin = sigBadness!.get(rec.sigKey);
            if (prevMin === undefined || b < prevMin) sigBadness!.set(rec.sigKey, b);
            let fm = featBySig!.get(rec.sigKey);
            if (!fm) { fm = new Map<string, number>(); featBySig!.set(rec.sigKey, fm); }
            for (const f of rec.features) {
                featGlobal!.set(f, (featGlobal!.get(f) ?? 0) + 1);
                fm.set(f, (fm.get(f) ?? 0) + 1);
            }
        }
        // Stage 2: record this dead-ended restart's shape + attractor cells into the conditional-
        // frequency tables. `_plShape` is reused below to update the plateau shape on improvement.
        let _plShape: string | null = null;
        if (enablePlateauPenalty) {
            const rec = plateauShapeAndCells(ws, level);
            _plShape = rec.shape;
            plateauRecorded++;
            shapeTotal!.set(rec.shape, (shapeTotal!.get(rec.shape) ?? 0) + 1);
            let cm = cellByShape!.get(rec.shape);
            if (!cm) { cm = new Map<number, number>(); cellByShape!.set(rec.shape, cm); }
            for (const c of rec.cells) {
                cellGlobal!.set(c, (cellGlobal!.get(c) ?? 0) + 1);
                cm.set(c, (cm.get(c) ?? 0) + 1);
            }
        }
        // cells/pend feed guide selection for both Stage 3 mechanisms (recombination's soft reward
        // and relink's complementarity pairing) — built only when one is enabled.
        const trackEliteStructure = enableRecombination || enableRelink;
        considerElite(ws.path.slice(), b, trackEliteStructure ? new Set(ws.path) : null, trackEliteStructure ? elitePendFromState(ws, level) : null);
        if (b < bestBadnessEver) {
            bestBadnessEver = b;
            restartsSinceImprovement = 0;
            // Stage 2: a genuine best-ever improvement is the "signature changed" event — retire any
            // active penalty (it was tuned to the old plateau) and adopt the new best's shape.
            if (enablePlateauPenalty) { plateauShape = _plShape; penaltyCells = null; penaltyRemaining = 0; }
            // Turn bias: retire it on improvement, and record whether the new best is still stuck on a
            // pending must-turn (ws holds the improving restart's dead-end state here).
            if (enableTurnBias) { bestHadPendingMustTurn = ws.mustTurnMask !== 0; turnBiasRemaining = 0; }
            if (_REPAIR_DEBUG) console.error(`  [repair] gate=${startKey} restart=${restartCount} t=${Date.now() - startTime}ms bestBadness=${b} poolSize=${elites.length} (${debugBadnessBreakdown(ws, level)})`);
        } else {
            restartsSinceImprovement++;
        }

        // Ablation: STRATEGY_REPAIR_STAGNATION_BURST — disabling never forces a fresh-restart burst.
        if ((!cfg || cfg.STRATEGY_REPAIR_STAGNATION_BURST) && restartsSinceImprovement >= STAGNATION_THRESHOLD && forcedFreshRemaining === 0) {
            forcedFreshRemaining = STAGNATION_BURST_LEN;
            restartsSinceImprovement = 0;
            // Stage 2: stagnation is the plateau-detection signal — (re-)arm the soft penalty from
            // the plateau shape's accumulated attractor cells, once it has enough samples to be
            // meaningful. Re-armed (not just left running) so a persistent plateau keeps a fresh map.
            if (enablePlateauPenalty && plateauShape !== null && (shapeTotal!.get(plateauShape) ?? 0) >= PLATEAU_MIN_SHAPE_SAMPLE) {
                penaltyCells = computePlateauPenaltyCells(cellByShape!.get(plateauShape), shapeTotal!.get(plateauShape)!, cellGlobal!, plateauRecorded, PLATEAU_PENALTY_MIN_LOGODDS, PLATEAU_PENALTY_UNIT, PLATEAU_PENALTY_LOGODDS_CAP);
                penaltyRemaining = PLATEAU_PENALTY_WINDOW;
            }
            // Turn bias: arm only when the plateau is actually stuck on a pending must-turn (Stage 1's
            // dominant frozen shape) — the selective condition that keeps it off levels it can't help.
            // (A near-solved arming guard was tried to fix the descent-phase regression and, as in
            // Stage 2, did nothing — the harm precedes the near-solved state; see the report.)
            if (enableTurnBias && bestHadPendingMustTurn) turnBiasRemaining = TURN_BIAS_WINDOW;
            if (_REPAIR_DEBUG) console.error(`  [repair] gate=${startKey} restart=${restartCount} t=${Date.now() - startTime}ms STAGNATION — forcing ${STAGNATION_BURST_LEN} fresh restarts${enablePlateauPenalty && penaltyCells ? ` (plateau penalty: ${penaltyCells.size} cells)` : ''}`);

            // Stage 3-real: stagnation is also the trigger for bidirectional reversible-operator
            // relinking between the best elite and its most-complementary partner (complementarity
            // primary, structural distance tiebreak). relinkPaths copies guide suffixes through the
            // real gauntlet, so any solution it returns is isSolutionState-valid by construction.
            if (enableRelink && elites.length >= 2 && nodesExpandedLocal < nodeBudget) {
                const base = elites[0];
                let guide: typeof base | null = null, bestScore = -1;
                for (const e of elites) {
                    if (e === base || !e.pend) continue;
                    const comp = base.pend ? complementarity(base.pend, e.pend) : 0;
                    const dist = (base.cells && e.cells) ? symmetricDifferenceSize(base.cells, e.cells) : 0;
                    const score = comp * 100000 + dist;
                    if (score > bestScore) { bestScore = score; guide = e; }
                }
                if (guide) {
                    for (const [from, to] of [[base, guide], [guide, base]] as const) {
                        if (nodesExpandedLocal >= nodeBudget) break;
                        const rlBudget = Math.min(RELINK_NODE_BUDGET, nodeBudget - nodesExpandedLocal);
                        const rl = relinkPaths(ws, from.path, to.path, level, prep, cfg, liveUndo, startKey, rlBudget);
                        nodesExpandedLocal += rl.nodes;
                        if (prep._metrics) prep._metrics.nodesExpanded += rl.nodes;
                        if (rl.solved) { if (out) out.nodesExpanded = nodesExpandedLocal; return ws.path.slice(); }
                        if (_RELINK_DEBUG) {
                            const worstB = elites.length > 0 ? elites[elites.length - 1].badness : Infinity;
                            console.error(`  [relink] gate=${startKey} nodes=${rl.nodes} bestIntermediate=${rl.bestPath ? rl.bestBadness : 'none'} poolWorst=${worstB} poolBest=${elites[0]?.badness} beatsPool=${!!rl.bestPath && rl.bestBadness < worstB}`);
                        }
                        // Feed the best recombined intermediate back as search material (the point of a
                        // relinking trajectory) — and track it as a genuine best-ever if it beats it.
                        if (rl.bestPath) {
                            considerElite(rl.bestPath, rl.bestBadness, new Set(rl.bestPath), rl.bestPend);
                            if (rl.bestBadness < bestBadnessEver) bestBadnessEver = rl.bestBadness;
                        }
                    }
                }
            }

            // Elite-prefix DFS repair: stagnation is also the trigger for this operator (see its
            // own header comment) — a bounded deterministic completion search from several points
            // scattered across the top elites' own paths, not just this restart's own dead end.
            if ((!cfg || cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS) && enableElitePrefixDfs && elites.length > 0 && nodesExpandedLocal < nodeBudget) {
                const epdBudget = Math.min(ELITE_PREFIX_DFS_TOTAL_BUDGET, nodeBudget - nodesExpandedLocal);
                const epd = elitePrefixDfsRepair(ws, level, prep, profile, template, cfg, liveUndo, elites, startKey, epdBudget);
                nodesExpandedLocal += epd.nodes;
                if (prep._metrics) prep._metrics.nodesExpanded += epd.nodes;
                if (_ELITE_PREFIX_DFS_DEBUG) {
                    console.error(`  [elite-prefix-dfs] gate=${startKey} nodes=${epd.nodes} solved=${epd.solved} bestFound=${epd.bestPath ? epd.bestBadness : 'none'} poolWorst=${elites.length > 0 ? elites[elites.length - 1].badness : Infinity} poolBest=${elites[0]?.badness}`);
                }
                if (epd.solved) { if (out) out.nodesExpanded = nodesExpandedLocal; return ws.path.slice(); }
                // Feed the best intermediate found back as search material (mirrors relink's own
                // pattern above) — and track it as a genuine best-ever if it beats it.
                if (epd.bestPath) {
                    // pend is always null here (unlike relink's rl.bestPend): ws no longer reflects
                    // epd.bestPath's state by the time elitePrefixDfsRepair returns (it restores to
                    // [startKey] before returning), so the pending-objective masks aren't available
                    // to recompute at this call site. Only affects Stage 3 guide selection
                    // (enableRecombination/enableRelink), neither of which any production caller
                    // enables — a candidate for a follow-up if either is ever promoted alongside this.
                    considerElite(epd.bestPath, epd.bestBadness, trackEliteStructure ? new Set(epd.bestPath) : null, null);
                    if (epd.bestBadness < bestBadnessEver) bestBadnessEver = epd.bestBadness;
                }
            }
        }
    }
}
