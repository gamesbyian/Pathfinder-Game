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
// disc: cumulative discrepancy to REACH this node (sum of chosen child-indices along the path) —
// same LDS bookkeeping as search.ts's DfsFrame, applied to slack-order rank instead of score-order
// rank. See admissibleOrderSearchLDS's own doc for what a "discrepancy" means here.
interface AdmissibleFrame { key: number; children: number[]; childIdx: number; undoInfo: UndoToken | null; disc: number; }

/** The tightest applicable admissible lower bound on remaining steps from `pos` to a valid finish,
 *  given the state already reflects having just moved there. Mirrors exactly which bounds
 *  evaluatePrunedMove itself checks (prune-gauntlet.ts) — this is the same math, reused as an
 *  ordering signal instead of a pass/reject threshold. Returns Infinity if any bound proves the
 *  position is already a dead end (mirrors evaluatePrunedMove's own Infinity-propagation). */
function admissibleRemainingBound(pos: number, state: Parameters<typeof mustPassLowerBound>[1], level: NormalizedLevel, prep: PrepLevel): number {
    let h = getDistanceFromArray(prep.goalDistArr, pos, prep.gridW);
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
 *  move minus the tightest admissible bound from there) — least slack first, among candidates that
 *  are still actually alive. A candidate whose slack is negative (h exceeds remaining steps —
 *  already provably dead by this same bound) sorts LAST, after every live (slack ≥ 0) candidate,
 *  not dropped: evaluatePrunedMove is still the single source of truth for rejection, so this
 *  function only orders, it never excludes — a bug here can misorder exploration but can never
 *  cause a missed solution the way an exclusion bug could. (Fixed 2026-07-25: a raw ascending sort
 *  on the signed slack value put the MOST negative — i.e. deadest — candidates first, the opposite
 *  of this doc's stated intent, since negative numbers sort below zero. Provably safe either way
 *  for correctness — evaluatePrunedMove rejects a dead candidate in O(1) wherever it lands in the
 *  order — but the old order wasted one node-budget unit trying an already-doomed candidate before
 *  ever reaching a live one; sorting dead last is strictly no-worse and sometimes better. Positive-
 *  infinity slack — h itself provably Infinity, i.e. unreachable — already sorted last correctly
 *  before this fix and is unaffected by it.)
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
export function rankByAdmissibleSlack(candidates: number[], level: NormalizedLevel, prep: PrepLevel, state: Parameters<typeof applyMove>[1], tieBreakProfile: ScoringProfile | null): number[] {
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
    // Dead (negative-slack) candidates always sort after every live one, regardless of how negative
    // — see this function's own doc for why a plain `a.slack - b.slack` doesn't already achieve
    // this. Among candidates on the same side of that line: ascending slack (least room to spare
    // first), tie-broken by descending score (higher is more promising, matching scoreAndSort's own
    // convention) — a no-op when tieBreakProfile is null (every score is the same flat 0, so the
    // stable sort leaves slack-ties in candidate order).
    ranked.sort((a, b) => {
        const aDead = a.slack < 0;
        const bDead = b.slack < 0;
        if (aDead !== bDead) return aDead ? 1 : -1;
        return a.slack - b.slack || b.score - a.score;
    });
    return ranked.map(r => r.key);
}

/** Complete, admissible-order DFS from `startKey`. Same sound gauntlet, memory footprint, and
 *  budget/node-cap contract as dfsFromGate (search.ts) — see that function and this file's own doc
 *  for what's the same (the bounds, the completeness) and what's different (child ORDER: admissible
 *  slack instead of soft heuristic score).
 *
 *  maxDiscrepancy: Limited Discrepancy Search bound, same meaning as dfsFromGate's own parameter —
 *  a "discrepancy" is choosing a non-least-slack child; the j-th ranked child (0-indexed, by
 *  rankByAdmissibleSlack's ordering) costs j discrepancies. Infinity (default) explores every
 *  admissibly-surviving branch, same as before this parameter existed — every existing caller is
 *  byte-for-byte unaffected. See admissibleOrderSearchLDS below for the bounded-then-unbounded
 *  wrapper that actually uses a finite bound. */
export async function admissibleOrderSearch(
    startKey: number, level: NormalizedLevel, prep: PrepLevel,
    levelBudgetMs: number, levelStartTime: number, yieldFn: YieldFn = null,
    out: { timedOut?: boolean; nodesExpanded?: number } | null = null, nodeBudget = Infinity,
    // null reproduces the technique's original no-tie-break ordering — see rankByAdmissibleSlack's
    // own doc comment. {} (the default) is a REAL profile (every weight defaults to 1), not "no
    // tie-break."
    tieBreakProfile: ScoringProfile | null = {},
    maxDiscrepancy = Infinity,
): Promise<number[] | null> {
    // Experiment-only whole-solve enforcement. The historical admissible tier did not consult its
    // inherited work cap inside this loop at all; changing that unconditionally would silently
    // alter production scheduling. Strict mode opts into the corrected contract explicitly.
    if (prep._strictWorkCap !== undefined && prep._workMeter.units >= prep._strictWorkCap) {
        if (out) { out.timedOut = true; out.nodesExpanded = 0; }
        return null;
    }
    const state = createState(startKey, level, prep);
    const cfg = prep._cfg;

    let children0 = getNeighbors(startKey, state, level, prep);
    if (prep._forcedFirstStepKey != null) {
        children0 = children0.filter(k => k === prep._forcedFirstStepKey);
    } else if ((!cfg || cfg.PRUNE_MC_FORCED_FIRST_MOVE) && prep.gateForcedFirstStepKey.has(startKey)) {
        const forced = prep.gateForcedFirstStepKey.get(startKey);
        children0 = children0.filter(k => k === forced);
    }
    children0 = rankByAdmissibleSlack(children0, level, prep, state, tieBreakProfile);
    const stack: AdmissibleFrame[] = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null, disc: 0 }];

    let nodesExpanded = 0;
    let lastYield = levelStartTime;

    while (stack.length > 0) {
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - levelStartTime > levelBudgetMs || nodesExpanded >= nodeBudget
                || (prep._strictWorkCap !== undefined && prep._workMeter.units >= prep._strictWorkCap)) {
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

        // LDS: the child at index ci costs ci discrepancies on top of this node's disc. Children
        // are ranked least-slack-first, so once a child exceeds the budget every later (higher-
        // slack) child does too — exhaust the node immediately, same short-circuit dfsFromGate uses.
        const ci = top.childIdx++;
        const childDisc = top.disc + ci;
        if (childDisc > maxDiscrepancy) { top.childIdx = top.children.length; continue; }

        const next = top.children[ci];
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
        stack.push({ key: next, children: ranked, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
    if (out) { out.nodesExpanded = nodesExpanded; out.timedOut = false; }
    return null;
}

// ─── LDS wrapper (2026-07-24 experiment — TESTED, REJECTED, kept opt-in only) ───────────────────
// Same two-phase idea as search.ts's dfsFromGateLDS: cheap low-discrepancy probes first, ending
// with an unbounded (k=∞) wave that is byte-for-byte identical to calling admissibleOrderSearch
// directly — so this wrapper can never lose reach relative to the plain function GIVEN UNLIMITED
// budget, only change which order the same eventually-tried branches are visited in.
//
// RESULT (measured against all 117 of this technique's validated corpus-2 solves, same 8000ms/20M-
// node budget as every other measurement in reports/2026-07-24-admissible-order-search-corpus2-
// validation.md): the hypothesis below is REFUTED, not confirmed. LDS did not merely fail to find
// new solves (expected) — it used MORE nodes than the plain unbounded search on every one of the
// 108 levels where both solved within budget (0 fewer, 108 more, mean +1.5% total, up to +563,500
// on one level), AND regressed 9 of the 117 into outright timeout at the SAME budget the plain
// search solves them in (confirmed via a larger budget that these 9 aren't dead ends, just
// budget-starved by the probe phase). Mechanism, in hindsight: admissible-slack ordering already
// tends to follow the puzzle's forced structure directly — there's little "close-to-greedy-but-not-
// exactly" middle ground for low-k probes to usefully exploit the way dfsFromGateLDS's probes do
// against scoreAndSort's softer heuristic — so the probe waves are close to pure overhead here: they
// redundantly re-explore the near-greedy region, then the k=∞ fallback redoes the plain search's own
// full work on top of that, net always costing more, never less.
//
// Kept in the codebase as a fully opt-in, zero-default-risk, tested negative result (never invoked
// by any AttemptConfig getAttemptConfigs/ADMISSIBLE_ORDER_PROFILES produces — reachable only via
// scripts/method-probe.mjs's `ida:<profile>(lds)` for anyone who wants to re-verify or build on this
// finding) rather than deleted, so the next person considering "what if we add discrepancy limiting"
// doesn't have to re-derive this from scratch. Do not wire this into production without NEW evidence
// (e.g. a differently-calibrated probe ladder measured to actually help) — the data above is a clean
// rejection of the naive first-pass constants below, not an unexplored idea.
const _LDS_PROBE_K = [0, 1, 2, 4];
const _LDS_PROBE_CAP_FRACTION = 0.5;
const _LDS_PROBE_CAP_MS_MAX = 3000;

export async function admissibleOrderSearchLDS(
    startKey: number, level: NormalizedLevel, prep: PrepLevel,
    levelBudgetMs: number, levelStartTime: number, yieldFn: YieldFn = null,
    out: { timedOut?: boolean; nodesExpanded?: number } | null = null, nodeBudget = Infinity,
    tieBreakProfile: ScoringProfile | null = {},
): Promise<number[] | null> {
    const probeCapMs = Math.min(Math.floor(levelBudgetMs * _LDS_PROBE_CAP_FRACTION), _LDS_PROBE_CAP_MS_MAX);
    let probeNodesUsed = 0;
    for (const k of _LDS_PROBE_K) {
        if (yieldFn) await yieldFn();
        const externalRemaining = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - probeNodesUsed);
        if (externalRemaining <= 0) break;
        const probeOut: { timedOut?: boolean; nodesExpanded?: number } = {};
        const path = await admissibleOrderSearch(startKey, level, prep, probeCapMs, levelStartTime, yieldFn, probeOut, externalRemaining, tieBreakProfile, k);
        probeNodesUsed += probeOut.nodesExpanded ?? 0;
        if (path) return path;
        // Every wave shares the SAME probeCapMs/levelStartTime deadline (see this constant's own
        // comment), so once one wave hits it, every remaining wave would too — stop probing and
        // move straight to the unbounded fallback, same short-circuit dfsFromGateLDS's loop uses.
        if (probeOut.timedOut) break;
    }
    if (Date.now() - levelStartTime >= levelBudgetMs || prep._workMeter.units >= (prep._workCap ?? Infinity)) { if (out) out.timedOut = true; return null; }
    const finalNodeBudget = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - probeNodesUsed);
    if (finalNodeBudget <= 0) { if (out) out.timedOut = true; return null; }
    if (yieldFn) await yieldFn();
    return admissibleOrderSearch(startKey, level, prep, levelBudgetMs, levelStartTime, yieldFn, out, finalNodeBudget, tieBreakProfile, Infinity);
}
