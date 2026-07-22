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
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { buildCurUrgencyContext, scoreAndSort, scoreMove } from './scoring.js';
import { computeBadness, getRealLengthFromState, structuralDeficit } from './solution.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import { turnDirection } from '../domain/geometry.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, PrepLevel, ScoringProfile, StructuralTemplate, SolverSearchState, UndoToken } from './types.js';

type YieldFn = (() => Promise<void>) | null;

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
    // ws is fixed for this whole batch — none of these candidates has been tentatively applied
    // yet (that happens per-candidate inside the loop below, then gets undone) — so `pos` and
    // everything CurUrgencyContext captures are stable for every sibling. See its doc comment.
    // includeMcAxisFix=false: repair specifically keeps the ORIGINAL (axis-timing-buggy but
    // apparently load-bearing for S043) must-cross computation — see buildCurUrgencyContext's
    // doc comment for the full story (a stress-corpus regression, not a hypothetical concern).
    const curCtx = buildCurUrgencyContext(pos, ws, level, prep, false);

    // Identify (if any) the neighbor that is the correct-direction turn at a still-pending
    // must-turn cell — computed structurally from the untouched pre-move state (`pos` is the
    // path's current tip here, matching scoreMove's DFS/pre-apply convention, no ambiguity).
    // Used only to bias the random-exploration branch below via the independent `rand2` stream
    // (see EXIT_GUIDANCE_EPSILON_BOOST) — never the greedy ranking, and never `rand` itself.
    let preferredTurnTarget: number | null = null;
    if (rand2 !== null && ws.mustTurnMask !== 0 && ws.path.length >= 2) {
        const mtIdx = prep.mustTurnCellIndex[pos];
        if (mtIdx !== -1 && (ws.mustTurnMask & (1 << mtIdx)) !== 0) {
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

        // runConnectivity=false: repair-search deliberately omits the isConnected prune — see
        // this file's top-of-file SOUNDNESS comment on why that's a pure speed tradeoff.
        const verdict = evaluatePrunedMove(next, realLen, ws, level, prep, cfg, false);

        if (verdict === 'solution') {
            liveUndo.push(undo);
            return 'solved';
        }

        if (verdict === 'pass') {
            const rStepsForScore = level.reqLen - realLen;
            const sc = scoreMove(next, pos, ws, level, prep, profile, rStepsForScore, template, curCtx);
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
        if ((!cfg || cfg.STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST) && rand2 !== null && preferredSurvivorIdx !== -1 && rand2() < EXIT_GUIDANCE_EPSILON_BOOST) chosenIdx = preferredSurvivorIdx;
    }
    const chosen = survivors[chosenIdx];
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
export async function repairSearchFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, budgetMs: number, startTime: number, template: StructuralTemplate | null, yieldFn: YieldFn = null, enableMustTurnBias = false, nodeBudget = Infinity, out: { nodesExpanded?: number; timedOut?: boolean; bestBadness?: number } | null = null, seedSalt = 0): Promise<number[] | null> {
    const cfg = prep._cfg;
    const ws = createState(startKey, level, prep);
    const liveUndo: UndoToken[] = [];
    // Seeded from startKey alone: deterministic per gate, varies naturally across gates/levels.
    // seedSalt (default 0, XOR no-op) is additive-only: offline batch tooling (scripts/repair-
    // direct-probe.mjs's --races) is the only caller that ever passes a nonzero value, to run
    // several genuinely independent deterministic trajectories from the same gate in parallel.
    // No production/live caller passes this argument, so every existing call site is unaffected.
    const rand = mulberry32(((startKey * 2654435761) ^ (seedSalt * 0x9E3779B1)) >>> 0);
    // A SECOND, independent stream (different constant) dedicated to the must-turn exit-guidance
    // nudge below (see EXIT_GUIDANCE_EPSILON_BOOST) — deliberately never drawn from `rand` itself,
    // and only ever created/consumed when enableMustTurnBias is true (the biased attempt).
    const rand2 = enableMustTurnBias ? mulberry32(((startKey * 0x27220A95) ^ (seedSalt * 0x85EBCA77)) >>> 0) : null;

    // Elite pool, sorted ascending by badness (elites[0] is the best-ever near-miss). See
    // ELITE_POOL_SIZE.
    const elites: { path: number[]; badness: number }[] = [];
    let bestBadnessEver = Infinity;
    let restartsSinceImprovement = 0;
    let forcedFreshRemaining = 0;
    let restartCount = 0;
    let lastYield = startTime;
    let nodesExpandedLocal = 0;

    // Stage-1 instrumentation only (see _SIG_DEBUG) — null and untouched on a normal run.
    const sigCounts = _SIG_DEBUG ? new Map<string, number>() : null;         // signature -> restarts landing there
    const featGlobal = _SIG_DEBUG ? new Map<string, number>() : null;       // feature -> restarts exhibiting it (any signature)
    const featBySig = _SIG_DEBUG ? new Map<string, Map<string, number>>() : null; // signature -> (feature -> count)
    const sigBadness = _SIG_DEBUG ? new Map<string, number>() : null;       // signature -> min computeBadness seen at it
    let sigRestarts = 0;

    while (true) {
        const now = Date.now();
        if (now - startTime >= budgetMs || nodesExpandedLocal >= nodeBudget) {
            if (out) { out.nodesExpanded = nodesExpandedLocal; out.timedOut = true; out.bestBadness = bestBadnessEver; }
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
        const elitePath = spliceFromElite ? elites[Math.floor(rand() * elites.length)].path : null;
        const targetPrefix = elitePath && elitePath.length > 1
            ? elitePath.slice(0, 1 + Math.floor(rand() * (elitePath.length - 1)))
            : [startKey];
        replayToPrefix(ws, liveUndo, targetPrefix, level, prep);
        const spliceFloor = liveUndo.length;

        let outcome: PlyOutcome = 'continue';
        while (outcome === 'continue') {
            outcome = takePly(ws, level, prep, profile, template, rand, rand2, epsilon, liveUndo);
            if (prep._metrics) prep._metrics.nodesExpanded++;
            nodesExpandedLocal++;
        }

        if (outcome === 'solved') {
            if (out) out.nodesExpanded = nodesExpandedLocal;
            return ws.path.slice();
        }

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

        // Ablation: STRATEGY_REPAIR_STAGNATION_BURST — disabling never forces a fresh-restart burst.
        if ((!cfg || cfg.STRATEGY_REPAIR_STAGNATION_BURST) && restartsSinceImprovement >= STAGNATION_THRESHOLD && forcedFreshRemaining === 0) {
            forcedFreshRemaining = STAGNATION_BURST_LEN;
            restartsSinceImprovement = 0;
            if (_REPAIR_DEBUG) console.error(`  [repair] gate=${startKey} restart=${restartCount} t=${Date.now() - startTime}ms STAGNATION — forcing ${STAGNATION_BURST_LEN} fresh restarts`);
        }
    }
}
