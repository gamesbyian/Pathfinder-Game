// A complete, admissible-order DFS variant — prototype, not wired into production attempt
// selection yet.
//
// Motivation: dfsFromGateLDS's final (unbounded, k=∞) wave is ALREADY a complete, admissibly-sound
// search — evaluatePrunedMove (prune-gauntlet.ts) rejects a candidate move only when a real
// admissible bound proves it can no longer reach a valid solution (distance-to-goal, parity,
// mustPassLowerBound, mustCrossLowerBound, surroundLowerBound, adjTurnLowerBound, intersection
// deficit — see that file), so nothing here is a NEW soundness primitive. What dfsFromGate commits
// to, though, is exploring each node's SURVIVING children in *soft scoring* order (scoreAndSort,
// scoring.ts's tuned heuristic weights) — a child can pass every hard admissible check yet still
// look good to the soft scorer while actually leading nowhere, and a plain DFS only discovers that
// after however deep it commits before backtracking.
//
// This variant keeps the exact same sound gauntlet and the exact same DFS memory footprint
// (iterative explicit stack, not a priority queue — a real frontier-priority A* would have the
// same completeness/optimality property but risks the well-known combinatorial memory blowup on a
// state space this large; IDA*-style bounded-memory search is the standard answer), but replaces
// the ordering rule: children are ranked by ADMISSIBLE SLACK — rSteps-after-the-move minus the
// tightest applicable admissible lower bound, ascending (least slack first) — instead of the soft
// heuristic score. This is the "most-constrained-first" idea from classical A*/IDA*/CSP search:
// prefer to commit to whichever legal continuation has the LEAST room to spare, since that's the
// move most likely to be forced by the puzzle's actual structure, not just locally attractive.
//
// Framed as "IDA*-inspired" deliberately, not textbook IDA*: classical IDA* iteratively deepens a
// numeric f-threshold until a solution is found under a MINIMIZE-cost objective. This puzzle has no
// minimize-cost objective — reqLen is an exact target, already the tightest possible threshold — so
// there is nothing to iteratively deepen; f = g + h > reqLen is already the same bound
// evaluatePrunedMove applies today (its "distance bound" check, reframed). What's genuinely new
// here is using that same f-style bound as an ORDERING signal across every admissible child, not
// only as a per-node pass/reject gate.
//
// Cost tradeoff, honestly: ranking children requires tentatively applying and undoing EACH
// candidate (to read state-dependent bounds like mustPassLowerBound, which need the move already
// applied) before committing to one — up to a small constant factor more apply/undo cycles per node
// than plain DFS's "try the single best-scored child, backtrack only on rejection." Branching factor
// is small (≤4, axis-aligned moves only), so this is a bounded, not unbounded, overhead — but it's
// real, and whether smarter ordering pays for itself in fewer total nodes explored is exactly the
// open empirical question this prototype exists to answer. Not yet measured against dfsFromGateLDS
// on any real corpus — see scripts/method-probe.mjs for the fast per-level comparison tool built
// for exactly this kind of question, and test on genuinely hard/robust levels before drawing any
// conclusion from easy ones (an easy level's ordering barely matters either way).
import { getDistanceFromArray } from './distance.js';
import { adjTurnLowerBound, mustCrossLowerBound, mustPassLowerBound, surroundLowerBound } from './lower-bounds.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { getRealLengthFromState } from './solution.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import { buildCurUrgencyContext, scoreMove } from './scoring.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile, UndoToken } from './types.js';

// TUNING EXPERIMENT (2026-07-24): tie-break candidates that share the same admissible slack by the
// existing soft heuristic score, instead of leaving ties in getNeighbors' arbitrary directional
// order. Slack is an INTEGER (remaining steps minus an integer bound), so ties among a node's ≤4
// children are common — many moves reduce the tightest bound by exactly the same amount without
// distinguishing which one is actually more promising. scoreMove/buildCurUrgencyContext read the
// PRE-move state (no apply/undo needed — see scoreAndSort's own comment: "none of these candidates
// have been applied yet"), so this tie-break is cheap relative to the slack computation itself,
// which does need apply/undo per candidate (the admissible bounds are state-dependent).
//
// The tie-break PROFILE is caller-supplied (threaded from AttemptConfig.profileName via
// attempt-dispatch.ts, same field every other search dispatches on — repurposed here rather than
// adding a new one, since admissibleOrderSearch has no other use for profileName) rather than a
// fixed constant: measured 2026-07-24 that which profile breaks ties matters (see
// reports/2026-07-24-admissible-order-search-corpus2-validation.md's tuning-round history) —
// different weight balances thread different additional levels through the same admissible-slack
// primary ordering. scripts/method-probe.mjs's `ida:<profileName>` key format selects it directly.

type YieldFn = (() => Promise<void>) | null;
interface AdmissibleFrame { key: number; children: number[]; childIdx: number; undoInfo: UndoToken | null; }

/** The tightest applicable admissible lower bound on remaining steps from `pos` to a valid finish,
 *  given the state already reflects having just moved there. Mirrors exactly which bounds
 *  evaluatePrunedMove itself checks (prune-gauntlet.ts) — this is the same math, reused as an
 *  ordering signal instead of a pass/reject threshold. Returns Infinity if any bound proves the
 *  position is already a dead end (mirrors evaluatePrunedMove's own Infinity-propagation). */
function admissibleRemainingBound(pos: number, state: Parameters<typeof mustPassLowerBound>[1], level: NormalizedLevel, prep: PrepLevel): number {
    let h = getDistanceFromArray(prep.goalDistArr, pos);
    if (!Number.isFinite(h)) return Infinity;
    if (level.mustPassKeys.length > 0) {
        const mpLB = mustPassLowerBound(pos, state, level, prep);
        if (!Number.isFinite(mpLB)) return Infinity;
        if (mpLB > h) h = mpLB;
    }
    if (state.mustCrossMask !== 0) {
        const mcLB = mustCrossLowerBound(pos, state, level, prep);
        if (!Number.isFinite(mcLB)) return Infinity;
        if (mcLB > h) h = mcLB;
    }
    if (state.surroundMask !== 0) {
        const sLB = surroundLowerBound(pos, state, level, prep);
        if (!Number.isFinite(sLB)) return Infinity;
        if (sLB > h) h = sLB;
    }
    if (state.adjTurnMask !== 0) {
        const atLB = adjTurnLowerBound(pos, state, level, prep);
        if (!Number.isFinite(atLB)) return Infinity;
        if (atLB > h) h = atLB;
    }
    return h;
}

/** Ranks `candidates` (neighbors of `fromKey`) by ascending admissible slack (rSteps after the
 *  move minus the tightest admissible bound from there) — least slack first. Tentatively applies
 *  and undoes each candidate in turn (see file doc for the cost tradeoff this implies). A
 *  candidate whose slack is negative (h exceeds remaining steps — already provably dead) sorts
 *  last, not dropped: evaluatePrunedMove is still the single source of truth for rejection: this
 *  function only orders, it never excludes, so a bug here can misorder exploration but can never
 *  cause a missed solution the way an exclusion bug could.
 *
 *  `tieBreakProfile: null` skips the soft-score tie-break entirely — ties among equal-slack
 *  candidates keep getNeighbors()'s own (arbitrary directional) order, since `Array.prototype.sort`
 *  is stable. This reproduces the technique's ORIGINAL form (2026-07-24, before the same-day
 *  same-file tuning-experiment comment above added the score tie-break): a real, if small,
 *  population of the technique's earliest validated solves needed this exact no-tie-break ordering
 *  and stopped reproducing once the tie-break became unconditional — see
 *  reports/2026-07-24-admissible-order-search-corpus2-validation.md's "recovering the 52" section.
 *  Not the same as passing an all-default `{}` profile: `{}` still computes and sorts by a real
 *  (if flatly-weighted) score, which is a different ordering signal than "no score at all." */
function rankByAdmissibleSlack(candidates: number[], level: NormalizedLevel, prep: PrepLevel, state: Parameters<typeof applyMove>[1], tieBreakProfile: ScoringProfile | null): number[] {
    if (candidates.length <= 1) return candidates;
    const fromKey = state.path[state.path.length - 1];
    // Soft-score tie-break: cheap, no apply/undo (see this file's top-of-file comment). Computed
    // from the fixed pre-move state, same convention scoreAndSort itself uses. Skipped entirely
    // when tieBreakProfile is null (see this function's own doc).
    const preRealLen = getRealLengthFromState(state);
    const portalFromHere = level.portalMap.get(fromKey);
    const curCtx = tieBreakProfile !== null ? buildCurUrgencyContext(fromKey, state, level, prep, true, tieBreakProfile) : null;
    const ranked: { key: number; slack: number; score: number }[] = [];
    for (const next of candidates) {
        const isJump = !!(portalFromHere && !state.lastWasPortalJump && portalFromHere.dest === next);
        const nRSteps = level.reqLen - preRealLen - (isJump ? 0 : 1);
        const score = tieBreakProfile !== null ? scoreMove(next, fromKey, state, level, prep, tieBreakProfile, nRSteps, null, curCtx) : 0;

        const undo = applyMove(next, state, level, prep, isJump);
        const realLen = getRealLengthFromState(state);
        const rSteps = level.reqLen - realLen;
        const h = admissibleRemainingBound(next, state, level, prep);
        const slack = Number.isFinite(h) ? rSteps - h : Number.POSITIVE_INFINITY;
        undoMove(undo, state);
        ranked.push({ key: next, slack, score });
    }
    // Primary: ascending slack (least room to spare first). Tie-break: descending score (higher is
    // more promising, matching scoreAndSort's own convention) — a no-op when tieBreakProfile is null
    // (every score is the same flat 0, so the stable sort leaves slack-ties in candidate order).
    ranked.sort((a, b) => a.slack - b.slack || b.score - a.score);
    return ranked.map(r => r.key);
}

/** Complete, admissible-order DFS from `startKey`. Same sound gauntlet, memory footprint, and
 *  budget/node-cap contract as dfsFromGate (search.ts) — see that function and this file's own doc
 *  for what's the same (the bounds, the completeness) and what's different (child ORDER: admissible
 *  slack instead of soft heuristic score). No discrepancy limiting — every admissibly-surviving
 *  branch is eventually tried, same as dfsFromGate's unbounded (maxDiscrepancy=Infinity) mode. */
export async function admissibleOrderSearch(
    startKey: number, level: NormalizedLevel, prep: PrepLevel,
    levelBudgetMs: number, levelStartTime: number, yieldFn: YieldFn = null,
    out: { timedOut?: boolean; nodesExpanded?: number } | null = null, nodeBudget = Infinity,
    // null reproduces the technique's original no-tie-break ordering — see rankByAdmissibleSlack's
    // own doc comment. {} (the default) is a REAL profile (every weight defaults to 1), not "no
    // tie-break."
    tieBreakProfile: ScoringProfile | null = {},
): Promise<number[] | null> {
    const state = createState(startKey, level, prep);
    const cfg = prep._cfg;

    let children0 = getNeighbors(startKey, state, level, prep);
    if (prep._forcedFirstStepKey != null) children0 = children0.filter(k => k === prep._forcedFirstStepKey);
    children0 = rankByAdmissibleSlack(children0, level, prep, state, tieBreakProfile);
    const stack: AdmissibleFrame[] = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null }];

    let nodesExpanded = 0;
    let lastYield = levelStartTime;

    while (stack.length > 0) {
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - levelStartTime > levelBudgetMs || nodesExpanded >= nodeBudget) {
                if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
                if (out) { out.timedOut = true; out.nodesExpanded = nodesExpanded; }
                return null;
            }
            if (yieldFn && now - lastYield >= 16) {
                lastYield = now;
                await yieldFn();
            }
        }

        const top = stack[stack.length - 1];
        if (top.childIdx >= top.children.length) {
            if (top.undoInfo) undoMove(top.undoInfo, state);
            stack.pop();
            continue;
        }

        const next = top.children[top.childIdx++];
        const portal = level.portalMap.get(top.key);
        const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === next);
        const undo = applyMove(next, state, level, prep, isPortalJump);

        const realLen = getRealLengthFromState(state);
        const rSteps = level.reqLen - realLen;
        const runConnectivity = rSteps <= 10 || (nodesExpanded & 63) === 0;
        const verdict = evaluatePrunedMove(next, realLen, state, level, prep, cfg, runConnectivity);

        if (verdict === 'solution') {
            if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
            if (out) out.nodesExpanded = nodesExpanded;
            return state.path.slice();
        }
        if (verdict === 'reject') { undoMove(undo, state); continue; }

        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        const ranked = rankByAdmissibleSlack(nextNeighbors, level, prep, state, tieBreakProfile);
        stack.push({ key: next, children: ranked, childIdx: 0, undoInfo: undo });
    }
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
    if (out) out.nodesExpanded = nodesExpanded;
    return null;
}
