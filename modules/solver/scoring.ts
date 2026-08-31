import { getDistanceFromArray } from './distance.js';
import { AXIS_H, AXIS_V, popcount } from './encoding.js';
import { getRealLengthFromState } from './solution.js';
import { turnDirection } from '../domain/geometry.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel, ScoringProfile, StructuralOrderingBias } from './types.js';

// Pre-compute orderingBias bonus for a candidate move.
// Returns the bonus to add to the DFS score (higher = preferred).
export function computeOrderingBiasBonus(target: number, pos: number, level: NormalizedLevel, orderingBias: StructuralOrderingBias | null | undefined, rRatio: number): number {
    if (!orderingBias) return 0;
    const { w, h } = level.grid;
    const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
    const px = pos   & 0xFFFF, py = (pos   >>> 16) & 0xFFFF;
    const edgeNow  = Math.min(px, py, (w - 1) - px, (h - 1) - py);
    const edgeNext = Math.min(tx, ty, (w - 1) - tx, (h - 1) - ty);
    let bonus = 0;

    if (orderingBias.perimeterDir) {
        // Phase-aware perimeter gradient: mirrors V1's harvest→knot transition.
        // During harvest (rRatio<0.45): full perimeter pull. During knot (rRatio>0.45):
        // gradually relax so the solver can build interior intersections.
        const perimScale = rRatio > 0.45
            ? Math.max(0.22, 1.0 - (rRatio - 0.45) * 1.42)
            : 1.0;
        if (edgeNext === 0) {
            bonus += Math.round(42 * perimScale);
        } else {
            bonus -= Math.round(edgeNext * 16 * perimScale);
        }
        // Directional bias when moving perimeter-to-perimeter (CW vs CCW)
        if (edgeNow === 0 && edgeNext === 0) {
            const cx = (w - 1) / 2, cy = (h - 1) / 2;
            const cross = (px - cx) * (ty - cy) - (py - cy) * (tx - cx);
            if (cross !== 0) {
                const correctDir = (orderingBias.perimeterDir === 'cw') ? (cross < 0) : (cross > 0);
                bonus += correctDir ? (orderingBias.branchBiasBoost ?? 0) : -(orderingBias.directionPenalty ?? 0);
            }
        }
        // Penalty for leaving perimeter, scaled with phase (relaxes in knot phase)
        if (edgeNow === 0 && edgeNext > 0) {
            bonus -= Math.round((orderingBias.edgeDriftPenalty ?? 0) * perimScale);
        }
    }

    if (orderingBias.prefersCorner) {
        if (rRatio < 0.58) {
            const cornerDist = Math.min(tx + ty, (w - 1 - tx) + ty, tx + (h - 1 - ty), (w - 1 - tx) + (h - 1 - ty));
            if (cornerDist <= 2) {
                bonus += 48;
            } else {
                bonus -= cornerDist * 9;  // -27 at dist 3, -36 at dist 4, etc.
            }
        }
    }

    if (orderingBias.prefersSide && rRatio < 0.65 && w > 4) {
        const midX = (w - 1) / 2;
        const pSide = px - midX, tSide = tx - midX;
        const pSign = Math.sign(pSide), tSign = Math.sign(tSide);
        if (pSign !== 0) {
            if (tSign === pSign)       bonus += 22;  // reward staying on same side
            else if (tSign === -pSign) bonus -= 38;  // strongly penalise crossing
        }
    }

    if (orderingBias.sideAxis && rRatio < 0.68) {
        const mid    = orderingBias.sideAxis === 'x' ? (w - 1) / 2 : (h - 1) / 2;
        const tCoord = orderingBias.sideAxis === 'x' ? tx : ty;
        const side   = Math.sign(tCoord - mid);
        if (side === orderingBias.sideDir)       bonus += (orderingBias.sideBiasBoost ?? 0) * 3;
        else if (side === -(orderingBias.sideDir ?? 0)) bonus -= (orderingBias.sideViolation ?? 0)  * 3;
    }

    return bonus;
}

/** Precomputed "distance FROM the current node's `pos`" values, shared across every sibling
 *  candidate scoreMove evaluates from that one `pos` (DFS's scoreAndSort loop, one beam frontier
 *  node's candidate loop, one repair takePly call). mpCur is a pure speed optimisation (mpDistArrs
 *  is a plain static BFS array — every candidate would recompute the identical value). mcCur is
 *  both a speed optimisation AND a correctness fix — see below.
 *
 *  SAFE TO SHARE ACROSS CANDIDATES, unlike a persistent state-keyed cache (see CLAUDE.md's
 *  memoization gotcha): this only holds raw "distance from pos" figures, computed fresh once per
 *  batch and never reused across batches or stored on `prep`/`state`. The *decision* of whether
 *  an objective is still pending (which can legitimately differ per candidate — see scoreMove's
 *  own `state.mustMask`/`mustCrossMask` checks) is deliberately NOT captured here; scoreMove
 *  still re-reads that fresh, per-candidate, exactly as before.
 *
 *  mcCur's history: an EARLIER version of this hoist also captured must-cross's 2nd-visit
 *  approach-map axis selection (`usedH = state.edgeUsage[mcKey] & AXIS_H`) and was reverted after
 *  a node-count A/B showed real divergence from the ORIGINAL per-candidate code. Root cause: when
 *  `pos` itself IS the pending must-cross cell (crossCounts[i]===1, evaluating exit candidates
 *  from it — an ordinary, frequent occurrence, not a rare edge case), the original code reads
 *  `usedH` AFTER the current candidate's own exit move has been tentatively applied (beam/repair's
 *  post-apply convention), so a candidate whose exit axis differs from the entry axis sets a NEW
 *  bit that changes `usedH` for THAT SPECIFIC CANDIDATE ONLY — an accidental, candidate-dependent
 *  reading with no design intent behind it (the term's own comment says it should guide toward
 *  "the perpendicular-axis approach cells," i.e. perpendicular to the ENTRY axis, a fixed fact
 *  once you've arrived — not a per-candidate one). Re-added here as a deliberate fix, not merely
 *  a speed trick: `pos`'s entry axis is captured once per batch, BEFORE any candidate is applied,
 *  so every candidate in the batch is scored against the SAME, semantically-correct axis choice.
 *  This is a genuine, small, intentional behavior change (verified via a full stress-corpus
 *  before/after comparison, not a bit-identical node-count check — see data/stress/README.md) —
 *  unlike mpCur and the rest of today's session, which were all pure representation changes. */
/** NOTE ON ARRAY LENGTHS: every array below is a POOLED, capacity-sized buffer (see
 *  `_MAX_POOLED_OBJECTIVES`), not one sized to the level's objective count. Index them strictly
 *  by `level.mustPassKeys.length` / `level.mustCrossKeys.length` — never by `.length`, and never
 *  iterate them wholesale — since slots past those counts hold whatever the PREVIOUS call left
 *  there. Every current reader (scoreMove) is already bounded that way. */
export interface CurUrgencyContext {
    /** mpCur[i] = distance from pos to must-pass i (mustPassKeys[i]) */
    mpCur: Float64Array;
    /** mcCur[i] = distance from pos to must-cross i's *currently relevant* target — the plain
     *  cell distance, or (when a 2nd visit is pending) the correct perpendicular-approach
     *  distance, using the entry axis captured once for the whole batch. `null` when the caller
     *  opted out via `includeMcAxisFix=false` — see buildCurUrgencyContext's doc comment for why
     *  repair-search.ts does this. */
    mcCur: Float64Array | null;
    /** mcTargetArr[i] = the exact same static distance array mcCur[i] was read from. dTarget
     *  MUST be read from the same array as dCur (approach-map axis, or plain) — reading them from
     *  independently-chosen arrays would silently recreate a version of the axis-timing bug. */
    mcTargetArr: Uint16Array[] | null;
    /** mcIsApproach[i] = 1 when mcCur[i]/mcTargetArr[i] came from the 2nd-visit approach-map
     *  branch (weight ×15) rather than the plain 1st-visit branch (weight ×5) — scoreMove needs
     *  to know which multiplier applies without re-deriving the branch choice itself. */
    mcIsApproach: Uint8Array | null;
    /** Precomputed `profile.<field> ?? 1` for all 12 scoreMove weights, built once per candidate
     *  batch instead of once per candidate (profile is a FIXED reference for a whole search
     *  attempt — CPU-profiled 2026-07-23: scoreMove was the single largest self-time consumer in
     *  both a beam-heavy sample (9.2%) and a repair-heavy one (22.6%), and this 12-field property-
     *  read+??-fallback resolution ran identically on every one of its ~10^5-10^7 calls per
     *  search). Pure redundant-work elimination, never a behavior change: `null` when the caller
     *  didn't pass `profile` to buildCurUrgencyContext (every existing test call site) — scoreMove
     *  falls back to its own inline resolution exactly as before, byte-identical either way. */
    weights: ResolvedWeights | null;
}

/** See CurUrgencyContext.weights — one field per scoreMove weight, `?? 1`-defaulted exactly as
 *  scoreMove's own inline resolution. */
export interface ResolvedWeights {
    w: number; wo: number; wf: number; wp: number; wmp: number; wmc: number;
    wmt: number; wmte: number; wpp: number; wi: number; wdt: number; wrv: number;
}

function resolveWeightsInto(profile: ScoringProfile, into: ResolvedWeights): ResolvedWeights {
    into.w    = profile.goalAttractionWeight       ?? 1;
    into.wo   = profile.objectiveAttractionWeight  ?? 1;
    into.wf   = profile.finishCommitmentWeight     ?? 1;
    into.wp   = profile.perimeterBiasWeight        ?? 1;
    into.wmp  = profile.mustPassUrgencyWeight      ?? 1;
    into.wmc  = profile.mustCrossUrgencyWeight     ?? 1;
    into.wmt  = profile.mustTurnUrgencyWeight      ?? 1;
    into.wmte = profile.mustTurnExitGuidanceWeight ?? 1;
    into.wpp  = profile.portalParityGuidanceWeight ?? 1;
    into.wi   = profile.intersectionSetupWeight    ?? 1;
    into.wdt  = profile.antiDitherWeight           ?? 1;
    into.wrv  = profile.revisitPenaltyWeight       ?? 1;
    return into;
}

/** Pooled backing store for {@link buildCurUrgencyContext}'s return value — see its doc comment
 *  for the lifetime argument that makes a single shared instance safe, and for the sizing
 *  fallback. Sized well above the corpus-wide observed maxima (6 must-pass once must-turn
 *  landmarks fold in, 4 must-cross — see lower-bounds.ts's MAX_MST_K note); a level past it
 *  falls back to fresh allocations rather than writing out of bounds. */
/** Public audit/test contract for the allocation-fresh fallback boundary. */
export const MAX_POOLED_OBJECTIVES = 32;
const _pooledMpCur        = new Float64Array(MAX_POOLED_OBJECTIVES);
const _pooledMcCur        = new Float64Array(MAX_POOLED_OBJECTIVES);
const _pooledMcIsApproach = new Uint8Array(MAX_POOLED_OBJECTIVES);
const _pooledMcTargetArr: Uint16Array[] = new Array(MAX_POOLED_OBJECTIVES);
const _pooledWeights: ResolvedWeights = {
    w: 1, wo: 1, wf: 1, wp: 1, wmp: 1, wmc: 1, wmt: 1, wmte: 1, wpp: 1, wi: 1, wdt: 1, wrv: 1,
};
const _pooledCtx: CurUrgencyContext = {
    mpCur: _pooledMpCur, mcCur: null, mcTargetArr: null, mcIsApproach: null, weights: null,
};

/** Builds a {@link CurUrgencyContext} for `pos` using `state` as it stands right now — call once
 *  per candidate batch, BEFORE applying any candidate, and reuse for every sibling. Deliberately
 *  small fresh allocations per batch (must-pass/must-cross are capped at 4 each — CLAUDE.md), not
 *  shared/pooled scratch buffers: given the MST scratch-buffer sizing bug this session already
 *  found and fixed (data/stress/README.md), plain small allocations that are trivially reviewed for
 *  correctness beat reused buffers whose safety depends on every caller fully overwriting them.
 *
 *  `includeMcAxisFix` (default true): repair-search.ts passes `false`. A full stress-corpus run
 *  with the fix applied everywhere regressed S043 from a ~4.4s solve (via the must-turn-biased
 *  repair attempt) to a hard 266s failure — BOTH the ordinary and biased repair attempts now
 *  burned their full 120s extra-budget allotment and still failed. S043 needed three independently
 *  stacked, carefully-tuned fixes to become solvable at all (must-turn exit guidance, portal-parity
 *  guidance, a dedicated biased-repair attempt — see data/stress/README.md), and repair's randomized
 *  restart search is *already* documented as measurably more sensitive to scoreMove's exact
 *  balance than DFS/beam's deterministic search — exactly why `mustTurnUrgencyWeight` and
 *  `mustTurnExitGuidanceWeight` are independently zeroed for `SCORING_PROFILES.repair` while every
 *  other profile keeps those terms at full strength. Same shape of problem, same fix: repair keeps
 *  the ORIGINAL per-candidate (axis-timing-buggy, but apparently load-bearing for this specific
 *  fragile level) must-cross computation, while DFS and beam — whose deterministic, non-restart
 *  search is not documented as sensitive this way, and which don't touch S043's winning path at
 *  all — get the correctness fix at full strength. mpCur (must-pass) is unaffected either way. */
export function buildCurUrgencyContext(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, includeMcAxisFix = true, profile?: ScoringProfile, forceFreshForTests = false): CurUrgencyContext {
    const mpN = level.mustPassKeys.length;
    const mcN = level.mustCrossKeys.length;

    // Pooled by default. CPU profiling (node --cpu-prof, 2026-07-30) put this function at 7.7% of
    // published-corpus and 11.2% of corpus-2 solver self-time — not the distance loops below
    // (mustPass/mustCross are capped at a handful each) but the six heap objects it used to
    // allocate on EVERY search node: four typed/plain arrays, the returned record, and the
    // resolved-weights record. Reusing one instance is what the doc comment above used to argue
    // against, on the grounds that the MST scratch-buffer sizing bug made reused buffers risky —
    // the distinction that makes it safe here is that every read is bounds-tied to mpN/mcN, the
    // same counts that just wrote those slots, so a stale slot beyond them is never read (the MST
    // bug was precisely a read PAST what the call had written).
    //
    // Lifetime/reentrancy, audited rather than assumed — a returned context must not still be in
    // use when the next build starts. All four call sites hold one only across a candidate loop
    // that never scores again: scoreAndSort (build → scoreMove loop → sort), beamSearchFromGate
    // (search.ts), repair-search's takePly, and admissible-order-search's tie-break ranking. The
    // loops call applyMove/undoMove/evaluatePrunedMove/scoreMove, none of which build a context
    // (evaluatePrunedMove reaches only lower-bounds/solution/topology), and no call site nests
    // another. scoring.test.ts likewise never holds two at once. Module state is per-worker under
    // worker_threads, same as the _sas scratch below.
    const pooled = !forceFreshForTests && mpN <= MAX_POOLED_OBJECTIVES && mcN <= MAX_POOLED_OBJECTIVES;
    const ctx = pooled ? _pooledCtx : ({
        mpCur: new Float64Array(mpN), mcCur: null, mcTargetArr: null, mcIsApproach: null, weights: null,
    } as CurUrgencyContext);
    if (pooled) ctx.mpCur = _pooledMpCur;

    // `profile` is optional (appended as a 6th param rather than inserted, so every existing
    // 4-/5-arg call site — every test in scoring.test.ts — is unaffected): weights stays null
    // there, and scoreMove's own per-field `?? 1` fallback runs exactly as before.
    ctx.weights = profile
        ? resolveWeightsInto(profile, pooled ? _pooledWeights : { ...(_pooledWeights) })
        : null;

    const mpCur = ctx.mpCur;
    for (let i = 0; i < mpN; i++) mpCur[i] = getDistanceFromArray(prep.mpDistArrs[i], pos, prep.gridW);

    if (!includeMcAxisFix) {
        ctx.mcCur = null; ctx.mcTargetArr = null; ctx.mcIsApproach = null;
        return ctx;
    }

    // Must mirror scoreMove's own SCORE_MC_APPROACH_GUIDANCE gate exactly: if that ablation flag
    // is disabled, the fallback should be the plain branch, not the approach-map branch.
    const cfg = prep._cfg;
    const useApproachGuidance = !cfg || cfg.SCORE_MC_APPROACH_GUIDANCE;

    const mcCur        = (ctx.mcCur        = pooled ? _pooledMcCur        : new Float64Array(mcN));
    const mcTargetArr  = (ctx.mcTargetArr  = pooled ? _pooledMcTargetArr  : new Array<Uint16Array>(mcN));
    const mcIsApproach = (ctx.mcIsApproach = pooled ? _pooledMcIsApproach : new Uint8Array(mcN));
    for (let i = 0; i < mcN; i++) {
        if (useApproachGuidance && state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
            const mcKey = level.mustCrossKeys[i];
            const usedH = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
            const approach = prep.mcApproachDistMaps[i];
            const aEmpty = usedH ? approach.vEmpty : approach.hEmpty;
            if (!aEmpty) {
                const aMap = usedH ? approach.v : approach.h;
                mcCur[i] = getDistanceFromArray(aMap, pos, prep.gridW);
                mcTargetArr[i] = aMap;
                mcIsApproach[i] = 1;
                continue;
            }
        }
        mcCur[i] = getDistanceFromArray(prep.mcDistArrs[i], pos, prep.gridW);
        mcTargetArr[i] = prep.mcDistArrs[i];
        mcIsApproach[i] = 0;
    }
    return ctx;
}

/** Allocation-fresh differential oracle for pooled-context tests. */
export function __buildFreshCurUrgencyContextForTests(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, includeMcAxisFix = true, profile?: ScoringProfile): CurUrgencyContext {
    return buildCurUrgencyContext(pos, state, level, prep, includeMcAxisFix, profile, true);
}

// Score a candidate move `target` from `pos` in `state`.
// Higher score = better (explored first).
// prep._cfg: optional ablation config — null means all features enabled (default behaviour).
// curCtx: optional precomputed CurUrgencyContext for this `pos` (see its own doc comment) — when
// omitted, scoreMove recomputes the same values inline, so every existing caller/test keeps its
// exact current behaviour unless it explicitly opts in.
export function scoreMove(target: number, pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, rStepsAfterMove: number, orderingBias?: StructuralOrderingBias | null, curCtx?: CurUrgencyContext | null): number {
    // Prefer curCtx's precomputed weights (built once per candidate batch — see
    // CurUrgencyContext.weights) over re-resolving profile.<field> ?? 1 on every call. Byte-
    // identical either way (rw's fields ARE that exact `?? 1` resolution); `rw` is null for any
    // caller that didn't pass `profile` to buildCurUrgencyContext (every scoring.test.ts site),
    // which keeps this fallback path unchanged from before curCtx.weights existed.
    const rw = curCtx?.weights;
    const w    = rw ? rw.w    : (profile.goalAttractionWeight       ?? 1);
    const wo   = rw ? rw.wo   : (profile.objectiveAttractionWeight  ?? 1);
    const wf   = rw ? rw.wf   : (profile.finishCommitmentWeight     ?? 1);
    const wp   = rw ? rw.wp   : (profile.perimeterBiasWeight        ?? 1);
    const wmp  = rw ? rw.wmp  : (profile.mustPassUrgencyWeight      ?? 1);
    const wmc  = rw ? rw.wmc  : (profile.mustCrossUrgencyWeight     ?? 1);
    const wmt  = rw ? rw.wmt  : (profile.mustTurnUrgencyWeight      ?? 1);
    const wmte = rw ? rw.wmte : (profile.mustTurnExitGuidanceWeight ?? 1);
    const wpp  = rw ? rw.wpp  : (profile.portalParityGuidanceWeight ?? 1);
    const wi   = rw ? rw.wi   : (profile.intersectionSetupWeight    ?? 1);
    const wdt  = rw ? rw.wdt  : (profile.antiDitherWeight           ?? 1);
    const wrv  = rw ? rw.wrv  : (profile.revisitPenaltyWeight       ?? 1);

    const cfg = prep._cfg; // null when no ablation config (fast-path: !cfg is true → run normally)

    // Phase-based multipliers — mirroring V1's harvest/finish phase policy.
    // Harvest (early path, rRatio < 0.45): weaken goal pull so the DFS builds
    // structural layout before committing to a direction.
    // Finish (late path, rRatio > 0.82): strengthen goal pull to commit to ending.
    const rRatio = level.requiredLength > 0 ? Math.max(0, 1 - rStepsAfterMove / level.requiredLength) : 1;
    let phaseGoalScale = 1.0;
    if (rRatio < 0.45) {
        phaseGoalScale = 0.65 + (rRatio / 0.45) * 0.35;  // 0.65 at rRatio=0, 1.0 at 0.45
    } else if (rRatio > 0.82) {
        const t = (rRatio - 0.82) / 0.18;
        phaseGoalScale = 1.0 + t * 1.8;                   // 1.0 at 0.82, 2.8 at 1.0
    }
    // Phase-based perimeter scaling: mirrors V1's harvest→knot transition.
    // V1 drops perimeterBias from 1.65 (harvest) to 0.45 (knot) so the solver can
    // leave the perimeter to build intersections / MC crossings in the mid phase.
    // Only applies to directional CW/CCW templates to avoid disturbing non-perimeter configs.
    const phasePerimScale = (orderingBias && orderingBias.perimeterDir && rRatio > 0.45)
        ? Math.max(0.22, 1.0 - (rRatio - 0.45) * 1.42)  // 1.0→0.22 over rRatio 0.45→1.0
        : 1.0;

    // Ablation: when SCORE_PHASE_SCALING is disabled, all phase multipliers collapse to 1.0.
    const _phaseGoalScale  = (!cfg || cfg.SCORE_PHASE_SCALING) ? phaseGoalScale  : 1.0;
    const _phasePerimScale = (!cfg || cfg.SCORE_PHASE_SCALING) ? phasePerimScale : 1.0;

    let score = 0;

    // Goal attraction: reward moves that reduce distance to goal
    const goalDistCur    = getDistanceFromArray(prep.goalDistArr, pos, prep.gridW);
    const goalDistTarget = getDistanceFromArray(prep.goalDistArr, target, prep.gridW);
    if (!cfg || cfg.SCORE_GOAL_ATTRACTION) {
        // SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE (opt-in, see its own ablation-config.ts comment):
        // reads the guidance-only sibling array instead of the corrected one above, for THIS term
        // only — goalDistCur/goalDistTarget above stay untouched for SCORE_FINISH_COMMITMENT.
        const useLegacyGoalDist = !!(cfg && cfg.SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE === true);
        const attrDistCur    = useLegacyGoalDist ? getDistanceFromArray(prep.guidanceGoalDistArr, pos, prep.gridW)    : goalDistCur;
        const attrDistTarget = useLegacyGoalDist ? getDistanceFromArray(prep.guidanceGoalDistArr, target, prep.gridW) : goalDistTarget;
        if (Number.isFinite(attrDistCur) && Number.isFinite(attrDistTarget)) {
            const gain = attrDistCur - attrDistTarget;
            score += w * _phaseGoalScale * gain * 10;
        }
    }

    // Finish commitment: bonus when close to goal (small rSteps)
    if (!cfg || cfg.SCORE_FINISH_COMMITMENT) {
        if (rStepsAfterMove <= 4 && Number.isFinite(goalDistTarget)) {
            score += wf * (5 - rStepsAfterMove) * 8;
        }
    }

    // Objective attraction: reward moves toward nearest unsatisfied objective
    if ((!cfg || cfg.SCORE_OBJECTIVE_ATTRACTION) && (state.mustMask !== 0 || state.mustCrossMask !== 0)) {
        let bestObjDist = Infinity;
        for (let oi = 0; oi < prep.objectiveKeys.length; oi++) {
            const objKey = prep.objectiveKeys[oi];
            const mpIdx = (prep.mustPassIndex[objKey] - 1);
            const mcIdx = (prep.mustCrossIndex[objKey] - 1);
            const satisfied = (mpIdx !== -1 && (state.mustMask & (1 << mpIdx)) === 0)
                           || (mcIdx !== -1 && (state.mustCrossMask & (1 << mcIdx)) === 0);
            if (satisfied) continue;
            const d = getDistanceFromArray(prep.objDistArrs[oi], target, prep.gridW);
            if (Number.isFinite(d)) bestObjDist = Math.min(bestObjDist, d);
        }
        if (Number.isFinite(bestObjDist)) {
            score += wo * (10 / (1 + bestObjDist));
        }
    }

    // Must-pass urgency: bonus for moving toward must-pass
    if ((!cfg || cfg.SCORE_MUST_PASS_URGENCY) && state.mustMask !== 0) {
        for (let i = 0; i < level.mustPassKeys.length; i++) {
            if ((state.mustMask & (1 << i)) === 0) continue;
            const dCur    = curCtx ? curCtx.mpCur[i] : getDistanceFromArray(prep.mpDistArrs[i], pos, prep.gridW);
            const dTarget = getDistanceFromArray(prep.mpDistArrs[i], target, prep.gridW);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmp * (dCur - dTarget) * 5;
            }
        }
    }

    // Must-cross urgency
    if ((!cfg || cfg.SCORE_MUST_CROSS_URGENCY) && state.mustCrossMask !== 0) {
        for (let i = 0; i < level.mustCrossKeys.length; i++) {
            if ((state.mustCrossMask & (1 << i)) === 0) continue;

            if (curCtx && curCtx.mcCur) {
                // Correct, entry-axis-based branch/array selection captured once for the whole
                // candidate batch — see CurUrgencyContext's doc comment for why this differs from
                // (and fixes a real bug in) the per-candidate fallback below.
                const dCur    = curCtx.mcCur[i];
                const dTarget = getDistanceFromArray(curCtx.mcTargetArr![i], target, prep.gridW);
                if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                    score += wmc * (dCur - dTarget) * (curCtx.mcIsApproach![i] ? 15 : 5);
                }
                continue;
            }

            // No curCtx, or curCtx.mcCur is null (repair-search.ts opts out — see
            // buildCurUrgencyContext's doc comment): preserve the exact original per-candidate
            // computation.
            // 2nd-visit approach guidance (independently togglable)
            if ((!cfg || cfg.SCORE_MC_APPROACH_GUIDANCE) && state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
                // 2nd visit needed: guide toward the perpendicular-axis approach cells,
                // not the MC cell itself (which is axis-blocked from the used direction).
                const mcKey = level.mustCrossKeys[i];
                const usedH = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
                const approach = prep.mcApproachDistMaps[i];
                const aEmpty = usedH ? approach.vEmpty : approach.hEmpty;
                if (!aEmpty) {
                    const aMap    = usedH ? approach.v : approach.h;
                    const dCur    = getDistanceFromArray(aMap, pos, prep.gridW);
                    const dTarget = getDistanceFromArray(aMap, target, prep.gridW);
                    if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                        score += wmc * (dCur - dTarget) * 15;
                    }
                    continue;
                }
            }

            // 1st visit (or approach map unavailable / guidance disabled): standard urgency
            const dCur    = getDistanceFromArray(prep.mcDistArrs[i], pos, prep.gridW);
            const dTarget = getDistanceFromArray(prep.mcDistArrs[i], target, prep.gridW);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmc * (dCur - dTarget) * 5;
            }
        }
    }

    // Portal-parity guidance: reward heading toward the nearer terminal of a "twist" portal
    // (mismatched-parity pair — see prep.ts) exactly when the level's gate/goal/requiredLength parity
    // relationship requires an odd number of such crossings and none has happened yet. This is a
    // *guidance* term only — isSolutionState independently enforces the real win condition, so an
    // over/under-estimate here can only cost search efficiency, never correctness. Gate parity is
    // read from state.path[0] (the actual start of THIS walk), not level.gateKeys, since a
    // multi-gate level's attempts run per-gate and different gates can have different parity.
    const _ppMaps = prep.parityPortalDistMaps;
    if ((!cfg || cfg.SCORE_PORTAL_PARITY_GUIDANCE) && _ppMaps && _ppMaps.length > 0) {
        const needsTwist = (keyParity(state.path[0]) ^ keyParity(level.goalKey) ^ (level.requiredLength & 1)) === 1;
        if (needsTwist) {
            const anyTwistUsed = _ppMaps.some(p => state.visited[p.a] > 0 || state.visited[p.b] > 0);
            if (!anyTwistUsed) {
                let bestGain = -Infinity;
                for (const p of _ppMaps) {
                    const dCur    = getDistanceFromArray(p.dist, pos, prep.gridW);
                    const dTarget = getDistanceFromArray(p.dist, target, prep.gridW);
                    if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                        const gain = dCur - dTarget;
                        if (gain > bestGain) bestGain = gain;
                    }
                }
                if (Number.isFinite(bestGain)) score += wpp * bestGain * 15;
            }
        }
    }

    // Must-turn urgency: reward moves toward each pending must-turn cell itself (passable single
    // point, unlike surround/adjacent-turn's impassable multi-source-neighbor cells below —
    // mirrors must-pass urgency's plain distance-to-cell shape instead). Without this term
    // scoreMove had no guidance at all toward must-turn landmarks — the only landmark type with
    // none — leaving a directional (cw/ccw, not "either") turn requirement to pure incidental
    // momentum; stress-corpus finding, see data/stress/README.md.
    //
    // SCORING_PROFILES.repair sets mustTurnUrgencyWeight to 0 (see policy.ts), fully opting
    // repair-search.ts out of this term: repair's randomized-restart exploration was measured
    // to be sensitive to scoreMove's exact balance in a way DFS/beam are not — adding this term
    // at ANY tried weight fixed one repair-search plateau but broke a different one on the same
    // run (whack-a-mole, not converging), whereas DFS/beam profiles only ever benefited from it
    // (one level went from a 20s+repair-fallback timeout to a ~1s direct DFS solve). Scoping the
    // opt-out to repair's own profile keeps the DFS/beam win with zero risk to repair's already
    // fully-validated cluster performance.
    const _mtDistMaps = prep.mustTurnDistMaps;
    if ((!cfg || cfg.SCORE_MUST_TURN_URGENCY) && wmt !== 0 && state.mustTurnMask !== 0 && _mtDistMaps && _mtDistMaps.length > 0) {
        const mtN = prep.mustTurnKeys?.length ?? 0;
        for (let i = 0; i < mtN; i++) {
            if ((state.mustTurnMask & (1 << i)) === 0) continue;
            const dCur    = getDistanceFromArray(_mtDistMaps[i], pos, prep.gridW);
            const dTarget = getDistanceFromArray(_mtDistMaps[i], target, prep.gridW);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmt * (dCur - dTarget) * 2;
            }
        }
    }

    // Must-turn exit guidance: any entry direction can satisfy either cw or ccw — it depends
    // only on which exit is chosen (see domain/geometry.ts's turnDirection, a cross product of
    // the entry and exit direction vectors) — so distance urgency above (which only gets the
    // path NEAR the cell) leaves the actual directional requirement to chance once there.
    // This rewards choosing the specific exit that satisfies the required direction over any
    // other legal one, right when standing at the cell. Conceptually mirrors search-state.ts
    // applyMove's must-turn detection (same prevKey/entryAxis/moveAxis shape) but as a scoring
    // hint, not a hard constraint — must-turn is satisfied on any visit, so a path that doesn't
    // turn here can still turn on a later revisit. Deliberately its own
    // mustTurnExitGuidanceWeight (and, for ablation purposes, its own SCORE_MUST_TURN_EXIT_GUIDANCE
    // flag rather than reusing SCORE_MUST_TURN_URGENCY) — kept separate on the theory that its
    // narrower trigger condition (only nonzero when actually standing at a pending cell, not a
    // constant background pull) would carry less destabilization risk to repair's convergence
    // than mustTurnUrgencyWeight. That theory held right up until this term
    // was fixed to actually fire under repair's calling convention (see the "before/after-apply
    // split" comment below) — at that point it turned out to be just as destabilizing, and
    // SCORING_PROFILES.repair now zeroes it too. See policy.ts and data/stress/README.md's S043
    // writeup for the reproducible A/B; the real fix for the level that needed this term lives
    // in repair-search.ts's own exploration sampling instead, gated to a separate attempt.
    //
    // Locating "prevKey" (the cell before pos) is NOT a fixed path index: dfsFromGate's
    // scoreAndSort scores candidates BEFORE applying any of them (state.path's last entry is
    // still pos, so prevKey = path[len-2]), but beamSearchFromGate and repair-search.ts's
    // takePly score AFTER tentatively applying the candidate (state.path's last entry is
    // already `target`, so prevKey = path[len-3]) — this cost a full debugging round to catch
    // (a first version always resolved prevKey to pos itself under the second calling
    // convention, a zero-length "entry vector" that made turnDirection return null on every
    // single call, silently doing nothing for beam/repair while working correctly for DFS).
    // Resolved by detecting which convention is in effect from path.length and pos's actual
    // position in it, rather than assuming one. The orthogonal-adjacency check below (exactly
    // one axis differs by 1) additionally guards against portal-teleported entries, which
    // aren't real "directions" — cheaper and more robust here than relying on
    // state.lastWasPortalJump, whose value is itself ambiguous across the same two conventions.
    //
    // A second, more consequential instance of the same before/after-apply split (see S043's
    // diagnosis in data/stress/README.md): under the post-apply convention, `state.mustTurnMask` is
    // read AFTER `target` has already been applied, so if `target` is itself the exact move that
    // satisfies the pending direction, applyMove (search-state.ts) has ALREADY cleared its bit —
    // gating on "is this cell's bit still set" then reads false for precisely the candidate this
    // term exists to reward, silently zeroing the bonus on every beam/repair call (DFS was
    // unaffected: its pre-apply state still shows the bit set). This is why the term measurably
    // helped DFS profiles (S028) but never moved repair's search at all despite being "enabled
    // for every profile" — it was dead code under repair's calling convention specifically. Fixed
    // by only gating on the pre-apply mask under the convention where that value is actually
    // pre-apply (posIsPathTip); under the post-apply convention we skip straight to the
    // structural turn/direction check below, which independently derives correctness from
    // prevKey/pos/target and needs no pre-image of the mask.
    if ((!cfg || cfg.SCORE_MUST_TURN_EXIT_GUIDANCE) && wmte !== 0) {
        const mtIdx = (prep.mustTurnCellIndex[pos] - 1);
        if (mtIdx !== -1) {
            const pathLen = state.path.length;
            const posIsPathTip = pathLen >= 1 && state.path[pathLen - 1] === pos;
            const alreadySatisfiedBeforeThisMove = posIsPathTip && (state.mustTurnMask & (1 << mtIdx)) === 0;
            if (!alreadySatisfiedBeforeThisMove) {
                const prevIdx = posIsPathTip ? pathLen - 2 : pathLen - 3;
                if (prevIdx >= 0) {
                    const prevKey = state.path[prevIdx];
                    const px = prevKey & 0xFFFF, py = (prevKey >>> 16) & 0xFFFF;
                    const posx = pos & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
                    const dx = posx - px, dy = y - py;
                    if ((dx === 0) !== (dy === 0) && Math.abs(dx) + Math.abs(dy) === 1) {
                        const entryAxis = dy === 0 ? AXIS_H : AXIS_V;
                        const ty = (target >>> 16) & 0xFFFF;
                        const moveAxis = ty === y ? AXIS_H : AXIS_V;
                        if (entryAxis !== moveAxis) {
                            const req = prep.mustTurnDirs?.[mtIdx];
                            const turnDir = req === 'either' ? 'either' : turnDirection(prevKey, pos, target);
                            if (req === 'either' || turnDir === req) score += wmte * 40;
                        }
                    }
                }
            }
        }
    }

    // Surround urgency: reward moves toward nearest unvisited neighbor of each pending surround cell
    const _snDistMaps = prep.surroundNeighborDistMaps, _snKeys = prep.surroundNeighborKeys;
    if ((!cfg || cfg.SCORE_SURROUND_URGENCY) && state.surroundMask !== 0 && _snDistMaps && _snDistMaps.length > 0 && _snKeys) {
        const snN = (level.surroundKeys || []).length;
        for (let i = 0; i < snN; i++) {
            if ((state.surroundMask & (1 << i)) === 0) continue;
            const remainBits  = state.surroundNeighborRemainingMasks[i];
            const nbrDistMaps = _snDistMaps[i];
            const nbrKeys     = _snKeys[i];
            let bestGain = -Infinity;
            for (let j = 0; j < nbrKeys.length; j++) {
                if (!(remainBits & (1 << j))) continue;
                const dCur    = getDistanceFromArray(nbrDistMaps[j], pos, prep.gridW);
                const dTarget = getDistanceFromArray(nbrDistMaps[j], target, prep.gridW);
                if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                    const gain = dCur - dTarget;
                    if (gain > bestGain) bestGain = gain;
                }
            }
            if (Number.isFinite(bestGain)) score += wmp * bestGain * 5;
        }
    }

    // Adjacent-turn urgency: reward moves toward any adjacent cell of pending adj-turn objects
    const _atDistMaps = prep.adjTurnDistMaps;
    if ((!cfg || cfg.SCORE_ADJ_TURN_URGENCY) && state.adjTurnMask !== 0 && _atDistMaps && _atDistMaps.length > 0) {
        const atN = (level.adjacentTurnKeys || []).length;
        for (let i = 0; i < atN; i++) {
            if ((state.adjTurnMask & (1 << i)) === 0) continue;
            const dCur    = getDistanceFromArray(_atDistMaps[i], pos, prep.gridW);
            const dTarget = getDistanceFromArray(_atDistMaps[i], target, prep.gridW);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmp * (dCur - dTarget) * 4;
            }
        }
    }

    // Flipping filter approach urgency (harvest phase only, rRatio < 0.45).
    // Rewards moves toward the entry zone of each accessible unused flipper.
    // This is critical when flipper access is order-dependent (global-flip rule):
    // e.g. when one flipper (axisV) must be approached from above/below before another
    // becomes accessible from a non-flipper cell — without this urgency the beam/DFS heads
    // toward the nearer MC/MP cells and never reaches the order-gated flippers.
    if ((!cfg || cfg.SCORE_FLIPPER_URGENCY) && rRatio < 0.45 && prep.flipperApproachEven.length > 0) {
        const _parityOdd = (popcount(state.flipperUsedMask) & 1) === 1;
        const _aMaps = _parityOdd ? prep.flipperApproachOdd : prep.flipperApproachEven;
        for (let _fi = 0; _fi < _aMaps.length; _fi++) {
            if (state.flipperUsedMask & (1 << _fi)) continue;
            const _aMap = _aMaps[_fi];
            if (_aMap.empty) continue;
            const _dCur    = getDistanceFromArray(_aMap.dist, pos, prep.gridW);
            const _dTarget = getDistanceFromArray(_aMap.dist, target, prep.gridW);
            if (Number.isFinite(_dCur) && Number.isFinite(_dTarget)) {
                score += 2.0 * (_dCur - _dTarget) * 5;
            }
        }
    }

    // Intersection setup: reward second visit to a non-gate, non-goal cell if ints needed
    if (!cfg || cfg.SCORE_INTERSECTION_SETUP) {
        const intNeeded = level.requiredIntersections - state.ints;
        if (intNeeded > 0 && state.visited[target] > 0 && target !== level.goalKey && !prep.gateFlags[target]) {
            score += wi * 12;
        } else if (intNeeded > 0) {
            score += wi * 1;
        }
    }

    // Perimeter bias: prefer cells on the grid edge
    if (!cfg || cfg.SCORE_PERIMETER_BIAS) {
        const gw = level.grid.w, gh = level.grid.h;
        const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
        if (tx === 0 || ty === 0 || tx === gw - 1 || ty === gh - 1) score += wp * _phasePerimScale * 3;
    }

    // Anti-dither: penalise immediate U-turns
    if ((!cfg || cfg.SCORE_ANTI_DITHER) && state.path.length >= 2) {
        const prevPrev = state.path[state.path.length - 2];
        if (prevPrev === target) score -= wdt * 15;
    }

    // Revisit penalty
    if ((!cfg || cfg.SCORE_REVISIT_PENALTY) && state.visited[target] > 0) score -= wrv * 8;

    // Structural ordering-bias bonus (overrides/supplements profile heuristics)
    if ((!cfg || cfg.SCORE_ORDERING_BIAS_BONUS) && orderingBias) score += computeOrderingBiasBonus(target, pos, level, orderingBias, rRatio);

    return score;
}

// Reusable scratch buffer for scoreAndSort (max 4 neighbors on a 4-directional grid).
const _sas = new Float64Array(4); // scores indexed by neighbor position

// Sort neighbors in-place: best-first at index 0 (DFS iterates with childIdx++).
export function scoreAndSort(neighbors: number[], pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, orderingBias?: StructuralOrderingBias | null): void {
    const n = neighbors.length;
    if (n <= 1) return;
    const realLen = getRealLengthFromState(state);
    const portalEntry = level.portalMap.get(pos);
    // state is fixed for this whole batch (none of these candidates have been applied yet —
    // DFS scores children before applying any of them) — see CurUrgencyContext's doc comment.
    const curCtx = buildCurUrgencyContext(pos, state, level, prep, true, profile);
    for (let i = 0; i < n; i++) {
        const nk = neighbors[i];
        const isJump = !!(portalEntry && portalEntry.dest === nk);
        const nRSteps = level.requiredLength - realLen - (isJump ? 0 : 1);
        _sas[i] = scoreMove(nk, pos, state, level, prep, profile, nRSteps, orderingBias, curCtx);
    }
    const research = prep._orderingResearchObserver;
    if (research) {
        const candidates = [...neighbors];
        const policies = (research.policies ?? [{ id: 'active', scoringProfile: profile, orderingBias }])
            .filter((policy): policy is typeof policy & { scoringProfile: ScoringProfile } => policy.scoringProfile !== null);
        const rankings = policies.map(policy => {
            const ctx = buildCurUrgencyContext(pos, state, level, prep, true, policy.scoringProfile);
            const scored = candidates.map((candidate, index) => {
                const isJump = !!(portalEntry && portalEntry.dest === candidate);
                const remaining = level.requiredLength - realLen - (isJump ? 0 : 1);
                return { candidate, index, score: scoreMove(candidate, pos, state, level, prep,
                    policy.scoringProfile, remaining, policy.orderingBias, ctx) };
            }).sort((a, b) => b.score - a.score || a.index - b.index);
            return { policyId: policy.id, order: scored.map(row => row.candidate), scores: scored.map(row => row.score) };
        });
        const pairwiseDivergences: NonNullable<import('./types.js').OrderingResearchRecord['pairwiseDivergences']> = [];
        for (let leftIndex = 0; leftIndex < policies.length; leftIndex++) for (let rightIndex = leftIndex + 1; rightIndex < policies.length; rightIndex++) {
            const leftRanking = rankings[leftIndex], rightRanking = rankings[rightIndex];
            if (leftRanking.order[0] === rightRanking.order[0]) continue;
            const leftPolicy = policies[leftIndex], rightPolicy = policies[rightIndex];
            if (leftPolicy.orderingBias !== rightPolicy.orderingBias) continue;
            const leftTop = leftRanking.order[0], rightTop = rightRanking.order[0];
            const margin = (policy: ScoringProfile): number => {
                const ctx = buildCurUrgencyContext(pos, state, level, prep, true, policy);
                const remaining = (candidate: number) => level.requiredLength - realLen
                    - (portalEntry?.dest === candidate ? 0 : 1);
                return scoreMove(leftTop, pos, state, level, prep, policy, remaining(leftTop), leftPolicy.orderingBias, ctx)
                    - scoreMove(rightTop, pos, state, level, prep, policy, remaining(rightTop), leftPolicy.orderingBias, ctx);
            };
            const leftMargin = margin(leftPolicy.scoringProfile), rightMargin = margin(rightPolicy.scoringProfile);
            const terms = [...new Set([...Object.keys(leftPolicy.scoringProfile), ...Object.keys(rightPolicy.scoringProfile)])].sort();
            const scoringWeightContributions = terms.map(term => {
                const leftValue = leftPolicy.scoringProfile[term as keyof ScoringProfile] ?? 1;
                const rightValue = rightPolicy.scoringProfile[term as keyof ScoringProfile] ?? 1;
                if (leftValue === rightValue) return { term, marginDelta: 0 };
                const hybrid = { ...leftPolicy.scoringProfile, [term]: rightValue };
                return { term, marginDelta: margin(hybrid) - leftMargin };
            }).filter(row => Math.abs(row.marginDelta) > 1e-10);
            pairwiseDivergences.push({ leftPolicyId: leftPolicy.id, rightPolicyId: rightPolicy.id,
                leftTop, rightTop, leftMargin, rightMargin, scoringWeightContributions,
                contributionSum: scoringWeightContributions.reduce((sum, row) => sum + row.marginDelta, 0) });
        }
        research.observe({ searchFamily: 'dfs', depth: state.path.length - 1, candidates, rankings, pairwiseDivergences });
    }
    // Insertion sort (tiny arrays ≤4)
    for (let i = 1; i < n; i++) {
        const si = _sas[i], ki = neighbors[i];
        let j = i - 1;
        while (j >= 0 && _sas[j] < si) { _sas[j + 1] = _sas[j]; neighbors[j + 1] = neighbors[j]; j--; }
        _sas[j + 1] = si; neighbors[j + 1] = ki;
    }
}
