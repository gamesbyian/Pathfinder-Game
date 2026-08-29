import { STATE_BUF_BEAM, STATE_BUF_DFS, applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { KEY_SPACE } from './encoding.js';
import { buildCurUrgencyContext, scoreAndSort, scoreMove } from './scoring.js';
import { computeBadness, getRealLengthFromState, isSolutionState } from './solution.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import type { PruneDiagnostics } from './prune-gauntlet.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, UndoToken, ScoringProfile, StructuralOrderingBias } from './types.js';

/** A yield callback (cooperative scheduling); throws on cancellation. */
type YieldFn = (() => Promise<void>) | null;
/** A DFS stack frame. */
interface DfsFrame { key: number; children: number[]; childIdx: number; undoInfo: UndoToken | null; disc: number; }
/** A beam parent-pointer frontier node. */
/** Two independent orderings, both assigned when the node is generated (see the phase loop):
 *  `insOrd` reproduces the index this candidate WOULD have had if the frontier were still walked in
 *  score order — `cands` is sorted back into that order before culling, so coarse state merge's first-wins-on-ties
 *  and the stable score sort see byte-identical input regardless of walk order. `treeOrd` groups
 *  siblings under their parent, giving a depth-first walk of the beam's parent-pointer tree, which
 *  is what makes repositioning the shared working state cheap. Keeping them separate is the point:
 *  walk order and cull order are decoupled. */
interface BeamPathNode { key: number; prev: BeamPathNode | null; depth: number }
/** Raw constraint-state fields a candidate carried right after its move (snapshotted from `ws`
 *  at candidate-generation time, since `ws` is shared/mutable and gets undone before the next
 *  candidate). Stored as scalars rather than the joined delimited string coarse-state-merge/mechanic-bucket-retention actually
 *  key on: `beamNumericCoarseStateKey`/the diverse-select key (built inline in `beamSearchFromGate`/
 *  `_mechanicBucketSelect`) read these fields directly, or `beamStateKey` below builds the equivalent
 *  delimited string as a fallback for the rare level where the numeric key would not fit — either
 *  way only for candidates that reach the coarse-state-merge branch (`cands.length > beamWidth`); most phases
 *  in most solves stay under beamWidth, where nothing beyond this scalar snapshot is ever built.
 *  See beamNumericCoarseStateKey's own comment for the field list and safety argument. */
interface BeamNode extends BeamPathNode {
    prev: BeamNode | null; score: number; insOrd: number; treeOrd: number;
    ints: number; mpVisitedMask: number; mustCrossMask: number; flipperUsedMask: number;
    surroundMask: number; mustTurnMask: number; adjTurnMask: number;
}
// String fallback for beamNumericCoarseStateKey (see its comment): used only on the rare level where
// the numeric encoding would not fit under Number.MAX_SAFE_INTEGER. Delimited, not a bit-packed
// integer — a fixed-width packing silently overflowed on any level with more than 4 must-pass/
// must-cross/flipper cells (stress-corpus-2's generator raises those caps to 8); see
// reports/2026-08-06-beam-state-dedup-sound-signature-audit.md. Collision-free regardless of any
// mechanic's cardinality since every field is delimited, not shifted.
function beamStateKey(c: BeamNode): string {
    return `${c.ints}|${c.mpVisitedMask}|${c.mustCrossMask}|${c.flipperUsedMask}|${c.surroundMask}|${c.mustTurnMask}|${c.adjTurnMask}`;
}

/** Single implementation of the pre-move forced-first-step prune shared by DFS and beam. */
function pruneFirstStepNeighbors(startKey: number, neighbors: number[], prep: PrepLevel, diagnostics?: PruneDiagnostics): number[] {
    if (prep._forcedFirstStepKey != null) return neighbors.filter(k => k === prep._forcedFirstStepKey);
    const cfg = prep._cfg;
    if ((!cfg || cfg.PRUNE_MC_FORCED_FIRST_MOVE) && prep.gateForcedFirstStepKey.has(startKey)) {
        const forced = prep.gateForcedFirstStepKey.get(startKey);
        if (diagnostics) diagnostics.reached.PRUNE_MC_FORCED_FIRST_MOVE =
            (diagnostics.reached.PRUNE_MC_FORCED_FIRST_MOVE ?? 0) + 1;
        const filtered = neighbors.filter(k => k === forced);
        if (diagnostics && filtered.length < neighbors.length) diagnostics.rejected.PRUNE_MC_FORCED_FIRST_MOVE =
            (diagnostics.rejected.PRUNE_MC_FORCED_FIRST_MOVE ?? 0) + neighbors.length - filtered.length;
        return filtered;
    }
    return neighbors;
}

/** Test seam for the pre-candidate prune that necessarily runs before evaluatePrunedMove. */
export function __pruneFirstStepNeighborsForTests(startKey: number, neighbors: number[], prep: PrepLevel,
    diagnostics: PruneDiagnostics): number[] {
    return pruneFirstStepNeighbors(startKey, neighbors, prep, diagnostics);
}

/** Reconstruct a parent-pointer path into caller-owned scratch. */
function _reconstructBeamPath(node: BeamPathNode, scratch: number[]): number[] {
    const len = node.depth + 1;
    scratch.length = len;
    let cur: BeamPathNode | null = node;
    for (let i = len - 1; i >= 0; i--) {
        if (!cur) throw new Error('beam parent chain shorter than declared depth');
        scratch[i] = cur.key;
        cur = cur.prev;
    }
    return scratch;
}

/** Test seam for the production reconstruction routine's exact-length reuse contract. */
export function __reconstructBeamPathForTests(node: BeamPathNode, scratch: number[]): number[] {
    return _reconstructBeamPath(node, scratch);
}

// ─── Core DFS ─────────────────────────────────────────────────────────────────

// Iterative DFS from `startKey` using policy `profile` (and optional `orderingBias`).
// levelStartTime + levelBudgetMs: hard wall-clock cap for the whole level.
// maxDiscrepancy: Limited Discrepancy Search bound. A "discrepancy" is choosing a
//   non-greedy child; the j-th best child (0-indexed) costs j discrepancies. With
//   maxDiscrepancy=Infinity this is plain best-first DFS (original behaviour). With a
//   finite bound it explores only paths within `maxDiscrepancy` deviations of greedy —
//   recovering from a small number of wrong early ordering decisions (the diagnosed
//   failure mode) while remaining complete as the bound grows.
// Returns the solution path (array of keys) or null on timeout/failure.
// nodeBudget: optional, in ADDITION to levelBudgetMs (never a substitute for it) — a
// deterministic, machine-speed-independent cap used by dfsFromGateLDS's probe waves (see its
// comment) so probe escalation decisions depend on work done, not wall-clock luck under
// contention. Infinity (default) preserves the pre-existing ms-only behavior exactly.
async function dfsFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, levelBudgetMs: number, levelStartTime: number, orderingBias: StructuralOrderingBias | null, maxDiscrepancy = Infinity, yieldFn: YieldFn = null, out: { timedOut?: boolean; nodesExpanded?: number; finalBadness?: number } | null = null, nodeBudget = Infinity): Promise<number[] | null> {
    const state = createState(startKey, level, prep, STATE_BUF_DFS);
    const cfg = prep._cfg; // null = no ablation (all features enabled)

    // Stack entry: { key, children, childIdx, undoInfo, disc } where disc = cumulative
    // discrepancy to REACH this node (sum of chosen child-indices along the path).
    const children0 = pruneFirstStepNeighbors(startKey, getNeighbors(startKey, state, level, prep), prep);
    scoreAndSort(children0, startKey, state, level, prep, profile, orderingBias);
    const stack: DfsFrame[] = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null, disc: 0 }];

    let nodesExpanded = 0;
    let lastYield = levelStartTime;

    // _DFS_DEBUG-only backtrack-depth tracking. `_dbgPushNodesAt[d]`/`_dbgPushDepthAt[d]` record,
    // parallel to `stack` (index d = stack depth, kept in lockstep with push/pop), the nodesExpanded
    // count and reqLen-relative depth at the moment a frame was pushed — so when it's later popped
    // (every child exhausted, no solution beneath it), the difference is that frame's SUBTREE SIZE:
    // how many nodes the search spent before recognizing this particular branch doesn't pan out.
    // Kept entirely separate from the hot-path `DfsFrame`/`stack` shape (no new field on the frame
    // object itself) specifically so there is zero allocation-shape/hidden-class risk on the
    // production path when the flag is off — every access below is gated behind `if (_DFS_DEBUG)`.
    const _dbgPushNodesAt: number[] = _DFS_DEBUG ? [nodesExpanded] : [];
    const _dbgSubtreeSizes: number[] = [];
    const _dbgSubtreeDepths: number[] = [];
    let _dbgInstantRejects = 0;
    // Log-scale histogram of subtree sizes (bucket i = [2^i, 2^(i+1))) — cheap to build
    // incrementally per pop, avoids sorting a possibly multi-million-entry array just to report
    // percentiles at the end of a debug run. Allocated only when the flag is on: dfsFromGate can
    // be called many times per solve (once per gate x config), so an unconditional 32-element
    // allocation+fill here — unlike the cheap primitive counters above — is real, avoidable waste
    // on the production path.
    const _dbgSizeBuckets: number[] = _DFS_DEBUG ? new Array(32).fill(0) : [];
    const _dbgFlushDfs = (outcome: string) => {
        if (!_DFS_DEBUG) return;
        const n = _dbgSubtreeSizes.length;
        const sum = _dbgSubtreeSizes.reduce((a, b) => a + b, 0);
        const max = n ? Math.max(..._dbgSubtreeSizes) : 0;
        const sumDepth = _dbgSubtreeDepths.reduce((a, b) => a + b, 0);
        const buckets = _dbgSizeBuckets.map((c, i) => (c > 0 ? `${1 << i}:${c}` : null)).filter(Boolean).join(',');
        console.error(`__DFS_BACKTRACK_STATS__ ${JSON.stringify({
            gate: startKey, outcome, nodesExpanded, poppedFrames: n, instantRejects: _dbgInstantRejects,
            meanSubtreeSize: n ? +(sum / n).toFixed(2) : 0, maxSubtreeSize: max,
            meanSubtreeDepth: n ? +(sumDepth / n).toFixed(2) : 0, sizeHistogram: buckets,
        })}`);
    };

    while (stack.length > 0) {
        // Budget + yield check every 256 nodes.
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - levelStartTime > levelBudgetMs || nodesExpanded >= nodeBudget
                || prep._workMeter.units >= (prep._workCap ?? Infinity)) {
                // Credit prep._metrics BEFORE returning — the exact same instrumentation gap
                // beamSearchFromGate's timeout paths had (see reports/2026-07-16-beam-
                // nodesexpanded-instrumentation-gap.md): `out.nodesExpanded` was already set here,
                // but prep._metrics.nodesExpanded (what orchestration.ts's runAttempt actually
                // derives a per-attempt nodesExpanded from — see its nodesBefore/nodesAfter diff)
                // was never incremented on this path, so every DFS attempt that timed out here —
                // whether via levelBudgetMs or dfsFromGateLDS's own probe-wave nodeBudget, which is
                // the MORE common of the two given LDS probing's whole point is a bounded-then-
                // escalating search — silently reported nodesExpanded: 0 despite doing real work.
                if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
                // finalBadness: a one-shot snapshot of computeBadness at wherever this DFS
                // pointer currently sits — cheap (computed only here, once per timeout, never
                // per-node) but NOT a tracked best-ever minimum the way repair-search's
                // bestBadness is; best-first ordering means it's usually a reasonable sample,
                // not necessarily the best position this branch ever visited.
                if (out) { out.timedOut = true; out.nodesExpanded = nodesExpanded; out.finalBadness = computeBadness(state, level); }
                _dbgFlushDfs('timeout');
                return null;
            }
            if (yieldFn && now - lastYield >= 16) {
                lastYield = now;
                await yieldFn();
            }
        }

        const top = stack[stack.length - 1];
        if (top.childIdx >= top.children.length) {
            if (_DFS_DEBUG) {
                const depth = stack.length - 1;
                const size = nodesExpanded - _dbgPushNodesAt.pop()!;
                _dbgSubtreeSizes.push(size);
                _dbgSubtreeDepths.push(depth);
                _dbgSizeBuckets[size > 0 ? Math.min(31, 31 - Math.clz32(size)) : 0]++;
            }
            if (top.undoInfo) undoMove(top.undoInfo, state);
            stack.pop();
            continue;
        }

        // LDS: the child at index ci costs ci discrepancies on top of this node's disc.
        // Children are sorted best-first, so once a child exceeds the budget every later
        // child does too — exhaust the node immediately.
        const ci = top.childIdx++;
        const childDisc = top.disc + ci;
        if (childDisc > maxDiscrepancy) { top.childIdx = top.children.length; continue; }

        const next = top.children[ci];
        const portal = level.portalMap.get(top.key);
        const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === next);

        const undo = applyMove(next, state, level, prep, isPortalJump);

        const realLen = getRealLengthFromState(state);
        const rSteps = level.reqLen - realLen;
        // Connectivity + volume check: every 64 nodes and always near end. Passed as a resolved
        // boolean since the throttle schedule (nodesExpanded) is DFS-loop-local — see
        // prune-gauntlet.ts's file doc for why this differs per caller.
        const runConnectivity = rSteps <= 10 || (nodesExpanded & 63) === 0;
        const verdict = evaluatePrunedMove(next, realLen, state, level, prep, cfg, runConnectivity);

        if (verdict === 'solution') {
            if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
            if (out) out.nodesExpanded = nodesExpanded;
            _dbgFlushDfs('solution');
            return state.path.slice();
        }
        if (verdict === 'reject') { if (_DFS_DEBUG) _dbgInstantRejects++; undoMove(undo, state); continue; }

        // Expand next
        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { if (_DFS_DEBUG) _dbgInstantRejects++; undoMove(undo, state); continue; }
        scoreAndSort(nextNeighbors, next, state, level, prep, profile, orderingBias);
        if (_DFS_DEBUG) _dbgPushNodesAt.push(nodesExpanded);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
    if (out) out.nodesExpanded = nodesExpanded;
    _dbgFlushDfs('exhausted');
    return null;
}

// Iterative-deepening LDS wrapper. Runs a geometric ladder of discrepancy bounds —
// cheap low-k probes first (find close-to-greedy solutions fast), ending with an
// UNBOUNDED wave that is identical to plain best-first DFS. Ending unbounded guarantees
// LDS never loses plain-DFS's reach: a level whose solution is far from greedy still
// gets a full sweep in the final wave (preventing regressions on far-from-greedy levels).
// Each wave re-explores the lower-k region (LDS redundancy), but low-k waves are cheap and
// the final unbounded wave dominates cost, so the overhead is bounded.
//
// Limited Discrepancy Search wrapper, two phases:
//   1. CHEAP PROBE: discrepancy bounds k ∈ {0,1,2,4,8}, capped at probeCapMs total.
//   2. UNBOUNDED FALLBACK: plain best-first DFS (k=∞) with all remaining budget.
//
// probeCapMs = clamp(floor(levelBudgetMs*0.5), FLOOR, CEILING): a floor AND a ceiling, not
// just a floor. THREE independent designs were tried and reverted before landing here —
// recorded in full in data/stress/README.md's "tried and REVERTED" snapshots, summarized only
// briefly below since the reasoning matters more than repeating the data:
//   - A FLOOR alone (guaranteeing probeCapMs >= ~1000ms even on a budget-diluted attempt, so a
//     genuinely-close-to-greedy k=8 solution needing ~900ms isn't cut off right before landing)
//     fixed one level but broke another: unconditionally giving every attempt more probe room
//     also gives every DOOMED attempt earlier in that level's config ladder more room to fail
//     in, compounding wasted ladder budget until the level's real (later) winner is never
//     reached.
//   - Extending ONLY the k=8 wave when it's reached at all (a tighter gate — attempts that
//     time out earlier than k=8 never qualify) narrowed but did not close the same wound: it
//     still broke a THIRD level, because reaching k=8 does not distinguish "this attempt's
//     answer is at k=8" from "this attempt's answer needs k=∞" — both commonly reach k=8 and
//     time out there under the ORIGINAL small cap, so extending k=8 unconditionally still
//     steals time from k=∞ within that SAME attempt whenever k=∞ was what it actually needed.
//   - A "doubling trick" redesign (widen k AND each wave's own fresh time budget together,
//     doubling only once a smaller allotment proves insufficient) is theoretically
//     well-founded (bounded ~2x overhead vs. an oracle) but empirically made things WORSE here:
//     reaching a wave with enough of its own room to land a ~900ms solution, starting from a
//     tiny first-wave cap, itself costs roughly 2x that target in cumulative escalation
//     overhead BEFORE ever reaching it — which exceeded the entire diluted attempt's own
//     budget in practice. The old fixed-percentage design's advantage was putting a big chunk
//     of the budget at k=8 immediately (on the first attempt), which doubling-from-scratch
//     cannot do without either an arbitrary large first step (reintroducing the same
//     unconditional-extension problem) or paying the escalation tax.
// The common thread across all three: any additional room handed to the probe phase is either
// wasted on a doomed attempt (cross-attempt cost) or is taken directly from that same
// attempt's own unbounded fallback (within-attempt cost) — extending probeCapMs is a real
// trade, not a free win, no matter how it's gated or scheduled. A CEILING (probeCapMs never
// exceeds `levelBudgetMs * _LDS_PROBE_MAX_FRACTION`) bounds BOTH costs directly instead of
// trying to out-guess which attempts deserve the floor: it guarantees the unbounded fallback a
// protected minimum share of THIS attempt's own budget no matter how large the floor pushes
// probeCapMs (closing the within-attempt failure), and — because the ceiling is a fraction of
// THIS attempt's own (already-diluted, possibly tiny) budget — it keeps the ABSOLUTE cost of
// extending any one heavily-diluted attempt small even when the floor would otherwise push it
// far above what a 50% split would have given (closing the cross-attempt failure: a
// tiny-budget attempt's probeCapMs can now only grow to a bounded fraction of ITS OWN small
// budget, not a large absolute constant that dwarfs it). Note MAX_FRACTION <= 0.5 makes the
// floor completely inert (the ceiling always wins), so the useful range is strictly above 0.5.
// Both constants are real, verified trade-offs, calibrated by testing (not derived): 0.7
// still let a previously bit-identical, always-solving level fail ~40% of repeated isolated
// runs; 0.55 still failed ~1 in 6; 0.6 is the verified value — clean across 10/10 and 5/5
// repeated isolated runs on the two stress-corpus levels this was calibrated against, plus a
// clean run on the published level the floor-only design broke. Don't change either constant
// without re-running solver:bench --check AND repeated isolated runs on all three reference
// levels (see data/stress/README.md) — full-corpus-vs-full-corpus diffing alone is NOT sufficient
// verification (it hid a real regression once already; see the same snapshots).
const _LDS_PROBE_K = [0, 1, 2, 4, 8];
const _LDS_PROBE_FLOOR_MS = 1000;
const _LDS_PROBE_MAX_FRACTION = 0.6;

/** Feature-scaled node budget for dfsFromGateLDS's probe phase (k∈{0,1,2,4,8}), covering the
 *  SAME "wall-clock decides which branch wins" determinism risk `runRepairProbe` had (see
 *  docs/solver-architecture.md's "Wall-clock-gated search probes" section): under CPU/memory
 *  contention the same nominal probeCapMs window covers fewer actual search nodes, so a probe
 *  wave that would land the solution on an uncontended run can miss it on a contended one,
 *  silently handing the win to a different (still-valid) later wave or the unbounded fallback.
 *
 *  Deliberately NOT a flat constant (dfsFromGateLDS runs on nearly every DFS-type attempt
 *  across the whole ladder, unlike the early-repair-search's narrow feature gate — a flat cap sized
 *  for a large/dense level would hand every attempt on a small/simple level the same
 *  oversized allowance) and NOT a live self-calibrated nodes/ms rate (only guards a transient
 *  spike inside one probe window, not the sustained ambient contention across separate
 *  fresh-process runs the determinism report actually observed). Scaled the same way
 *  `getFalseGoalTriggerSearchBudgetMs` (orchestration.ts) sizes an ms budget from a level's own static
 *  structural features. probeCapMs (below, unchanged) remains in force alongside this — never
 *  loosened — so it stays the active protector for a heavily budget-diluted attempt exactly as
 *  before; the node budget only ever makes a well-funded attempt's probe phase stop SOONER
 *  (once its deterministic node allotment is spent), never later, so it can't reintroduce the
 *  cross-attempt starvation that sank the three earlier probeCapMs redesigns documented above.
 *  If the linear estimate undershoots a genuinely hard level, the probe phase simply exhausts
 *  its budget and falls through to the unbounded k=∞ fallback (already the existing, tested
 *  path for a probe that doesn't land in time) — deterministically, every run, not a regression
 *  as long as that fallback still fits the attempt's own ms budget.
 *
 *  Calibrated by direct measurement: `dfsFromGateLDS` called directly (via
 *  `PF_LDS_DEBUG=1`, isolated fresh prep) on the winning (gate, config) pair for every
 *  probe-phase-solved level across the published corpus and the 150-level hypothesis stress
 *  corpus. The published corpus's hardest probe-solved case needs 1,926,137 nodes at
 *  area=144/reqLen=59/2 special objectives; these coefficients give it ~1.64x headroom
 *  (3,168,000). Re-measure before changing either the coefficients or the bounds. */
const _LDS_PROBE_NODE_AREA_COEF = 8000;
const _LDS_PROBE_NODE_REQLEN_COEF = 32000;
const _LDS_PROBE_NODE_SPECIAL_COEF = 64000;
const _LDS_PROBE_NODE_BUDGET_MIN = 30000;
const _LDS_PROBE_NODE_BUDGET_MAX = 4000000;

export function getLdsProbeNodeBudget(level: NormalizedLevel): number {
    const area = (level.grid?.w || 0) * (level.grid?.h || 0);
    const special = (level.mustPassKeys?.length || 0) + (level.mustCrossKeys?.length || 0) +
        (level.portalMap?.size || 0) + (level.flippingFilterMap?.size || 0);
    const raw = area * _LDS_PROBE_NODE_AREA_COEF + (level.reqLen || 0) * _LDS_PROBE_NODE_REQLEN_COEF + special * _LDS_PROBE_NODE_SPECIAL_COEF;
    return Math.min(_LDS_PROBE_NODE_BUDGET_MAX, Math.max(_LDS_PROBE_NODE_BUDGET_MIN, raw));
}
const _proc = (globalThis as any).process as { env?: Record<string, string | undefined> } | undefined;
const _LDS_DEBUG = !!(_proc && _proc.env && _proc.env.PF_LDS_DEBUG === '1');
// Beam-search cost-breakdown probe (audit/debug-only, env-gated — zero overhead when unset).
// Measures where beamSearchFromGate wall time actually goes: replaying reconstructed paths
// vs. generating/pruning/scoring candidates vs. sorting/coarse-state merging the candidate pool.
const _BEAM_DEBUG = !!(_proc && _proc.env && _proc.env.PF_BEAM_DEBUG === '1');
// DFS backtrack-depth probe (audit/debug-only, env-gated — zero overhead when unset, same
// shape as _BEAM_DEBUG/_LDS_DEBUG above). Referenced from dfsFromGate, which is declared
// earlier in this file — safe: module-level consts are all initialized before any function
// body actually runs, since dfsFromGate is only ever called after the module finishes
// loading, never at module-evaluation time. Built for reports/2026-08-06-branching-factor-
// parity.md's follow-up question ("does more search survive under a wrong branch on hard
// levels than on their cheaply-solved near-twins, not just a witness-replay proxy for it") —
// see reports/2026-08-06-backtrack-depth-instrumentation.md for what it found.
const _DFS_DEBUG = !!(_proc && _proc.env && _proc.env.PF_DFS_DEBUG === '1');

// 0 = disabled (shipped 2026-08-15 — see reports/2026-08-15-connectivity-axis-exhausted-
// regression.md for the regression this targets and the validation this margin was picked from):
// relative score margin (fraction of the winner's score) within which coarse-state merge retains a
// collision's runner-up alongside its winner, instead of discarding it outright. Rescues a
// genuinely-winning-but-locally-lower-scoring lineage from a single close comparison it would
// otherwise lose. Recovers R02248 (previously unsolved) at +0.3% nodes / +1.8% wall time on the
// full published-corpus regression check, with zero solved/failed-set changes measured across a
// 20-level mined-regression sample and a 112-level corpus-2 sample. Does NOT recover every known
// case in the same regression family (R02114, R00592 remain unfixed — see the report's "what this
// does and does not establish"). 0 must be, and is measured to be, byte-identical in behavior and
// performance to coarse-state merging with no retention widening at all.
//
// CORRECTION (2026-08-15, same day, full-corpus GHA A/B at production 50M node budget): the 112-
// level sample above was badness-stratified toward HARD levels and completely missed this margin's
// real population-scale effect. On the full 1700-level Corpus 2, default-ON nets -7 (731 -> 724):
// 27 gained (R02248 among them) but 34 LOST, every single flip in either direction sharing the same
// signature — a level that used to solve cheaply (4-35M nodes) via beam:intersectionHarvest@beam5000
// or beam:objectiveFirst@beam5000 (often (diverse)) now exhausts the full 50M budget with zero
// progress, or vice versa. This is NOT a narrow, targeted fix; it perturbs beam search broadly on
// any level whose winning technique is in that family — a coin-flip-shaped reshuffling, not a
// monotonic improvement. Kept default-ON regardless (net loss accepted for now — see
// orchestration.ts's STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY for the recovery mechanism this motivated,
// implemented and locally validated the same day, not yet validated at population scale) rather
// than reverted, since a blanket revert would give back R02248 and the 26 other gains for no net
// improvement on the loss side either.
const COARSE_STATE_NEAR_TIE_RETENTION_MARGIN = 0.01;
// out (optional, last param): mirrors dfsFromGate's own out contract for external tooling (the
// stress benchmark's per-attempt telemetry) — set to whether the OVERALL call's null return was
// because levelBudgetMs ran out (true) vs. the search genuinely exhausted every avenue it tried
// within budget (false). Determined solely by the two decisive points below (the level-wide
// budget check and the final unbounded pass's own out) — a probe wave hitting ITS OWN smaller
// probeCapMs is not by itself a level-wide timeout (plenty of levelBudgetMs may remain for the
// final pass), so probe-internal timedOut flags are deliberately not surfaced here.
export async function dfsFromGateLDS(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, levelBudgetMs: number, levelStartTime: number, orderingBias: StructuralOrderingBias | null, yieldFn?: YieldFn, out: { timedOut?: boolean; finalBadness?: number } | null = null, nodeBudget = Infinity): Promise<number[] | null> {
    const cfg = prep._cfg;
    // nodeBudget (default Infinity => inert): a caller-supplied cumulative-remaining node cap for
    // this whole LDS invocation (offline batch tooling only). dfsFromGate's own nodeBudget param is
    // LOCAL (per-call counter from 0), so each sub-call below gets the external remainder shrunk by
    // the nodes earlier waves in THIS invocation already spent (probeNodesUsed) — keeping the LDS's
    // total within nodeBudget rather than letting the final unbounded wave run to the time limit.
    // When STRATEGY_LDS is disabled, skip probe waves and run plain best-first DFS directly.
    if (cfg && !cfg.STRATEGY_LDS) {
        const bypassOut: { timedOut?: boolean; finalBadness?: number } = {};
        const path = await dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, orderingBias, Infinity, yieldFn, bypassOut, nodeBudget);
        if (out) { out.timedOut = !!bypassOut.timedOut; out.finalBadness = bypassOut.finalBadness; }
        return path;
    }
    // probeCapMs used to bound the probe ladder before it falls through to the unbounded wave.
    // That is an ESCALATION DECISION, not a safety cap — `probeOut.timedOut` below breaks the
    // ladder — so deriving it from wall clock made escalation a function of machine speed. It is
    // now simply the outer deadline, leaving probeNodeBudget (feature-scaled, deterministic) and
    // prep._workCap as the real gates. See docs/solver-budget-determinism.md.
    const probeCapMs = levelBudgetMs;
    const probeNodeBudget = getLdsProbeNodeBudget(level);
    let probeNodesUsed = 0;
    for (const k of _LDS_PROBE_K) {
        if (yieldFn) await yieldFn();
        const externalRemaining = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - probeNodesUsed);
        const remainingNodeBudget = Math.min(probeNodeBudget - probeNodesUsed, externalRemaining);
        if (remainingNodeBudget <= 0) break;
        const w0 = Date.now();
        const probeOut: { timedOut?: boolean; nodesExpanded?: number } = { timedOut: false };
        const path = await dfsFromGate(startKey, level, prep, profile, probeCapMs, levelStartTime, orderingBias, k, yieldFn, probeOut, remainingNodeBudget);
        probeNodesUsed += probeOut.nodesExpanded ?? remainingNodeBudget;
        if (_LDS_DEBUG) console.error(`    [lds] k=${k} ${Date.now()-w0}ms nodes=${probeOut.nodesExpanded ?? 0} ${path?'SOLVED':probeOut.timedOut?'timeout':'exhausted'}`);
        if (path) return path;
        if (probeOut.timedOut) break;
    }
    // No dfsFromGate call runs here (probes alone exhausted levelBudgetMs) — no search state to
    // sample, so finalBadness is left unset for this specific (rare) exit rather than reported
    // from stale probe data.
    if (Date.now() - levelStartTime >= levelBudgetMs) { if (out) out.timedOut = true; return null; }
    const finalNodeBudget = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - probeNodesUsed);
    if (finalNodeBudget <= 0) { if (out) out.timedOut = true; return null; }
    if (yieldFn) await yieldFn();
    const finalOut: { timedOut?: boolean; finalBadness?: number } = {};
    const path = await dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, orderingBias, Infinity, yieldFn, finalOut, finalNodeBudget);
    if (out) { out.timedOut = !!finalOut.timedOut; out.finalBadness = finalOut.finalBadness; }
    if (_LDS_DEBUG) console.error(`    [lds] k=Inf ${path?'SOLVED':'-'}`);
    return path;
}

// ─── Beam search ─────────────────────────────────────────────────────────────

// Mechanic-bucket retention selection: guarantee each (flipperUsedMask, mustCrossMask) bucket
// retains at least floor(beamWidth/numBuckets) candidates. The remaining slots
// are filled from the global top of the score-sorted list.
// `sorted` must already be sorted descending by score; bucketed by a numeric stateKey
// (`mustCrossMask * flipperBase + flipperUsedMask`, `flipperBase` the caller's precomputed
// `1 << flipperCount` — always strictly larger than any real `flipperUsedMask`, so this is an
// exact, always-collision-free positional encoding, same reasoning as beamNumericCoarseStateKey's own
// comment). Used to be `(flipperUsedMask << 4) | (mustCrossMask & 0xF)` — a narrower defect than
// the coarse-state key's old bug (mustCrossMask's `&0xF` mask sits below flipperUsedMask's shifted
// range, so it can't corrupt flipperUsedMask's bits the way the old coarse-state key's fields corrupted
// each other), but still the same root cause: mustCrossMask silently ALIASES (bits above the 4th
// discarded, not shifted anywhere) on any level with more than 4 must-cross cells (stress-corpus-2
// raises the cap to 8) — e.g. mustCrossMask=1 and mustCrossMask=17 (a 5th must-cross cell pending)
// both truncated to the same bucket. Same class of bug, just feeding a soft diversity heuristic
// rather than a hard merge/discard decision, so it degraded bucketing precision rather than
// costing solves outright. Fixed alongside the coarse-state key, 2026-08-06 — see
// reports/2026-08-06-beam-state-dedup-sound-signature-audit.md. `flipperBase` is always small
// (well under 2^16 even at stress-corpus-2's raised 8-cell caps), so unlike the coarse-state key this
// needs no per-level overflow fallback.
function _mechanicBucketSelect(sorted: BeamNode[], beamWidth: number, flipperBase: number): BeamNode[] {
    const buckets = new Map<number, BeamNode[]>();
    for (const c of sorted) {
        const key = c.mustCrossMask * flipperBase + c.flipperUsedMask;
        let b = buckets.get(key);
        if (!b) { b = []; buckets.set(key, b); }
        b.push(c);
    }
    const nb = buckets.size;
    if (nb <= 1) return sorted.slice(0, beamWidth);

    const guaranteed = Math.max(1, Math.floor(beamWidth / nb));
    const result: BeamNode[] = [];
    const added = new Set<BeamNode>();

    for (const bucket of buckets.values()) {
        const take = Math.min(guaranteed, bucket.length);
        for (let i = 0; i < take; i++) { result.push(bucket[i]); added.add(bucket[i]); }
    }
    for (const c of sorted) {
        if (result.length >= beamWidth) break;
        if (!added.has(c)) result.push(c);
    }
    return result;
}

// Synchronous beam search using parent-pointer frontier nodes to eliminate
// O(depth) path-array copies. Each frontier entry is { key, prev, depth, score };
// depth is stored to avoid a length-counting pass during reconstruction.
// The path is reconstructed into a reusable scratch array only when needed. The mutable
// search state `ws` is not reset to the gate between nodes — it is diffed against each
// node's reconstructed path and moved there incrementally (see `_liveUndo` below), since a
// full reset+replay per frontier node per phase is O(beamWidth × depth²) over a search.
// mechanicBucketRetention: if true, use _mechanicBucketSelect to maintain candidate diversity across
// flipper and must-cross constraint states (prevents beam collapse to one structural mode).
// out (optional, last param): timedOut=true for the two budget-check returns, false for the
// (functionally identical) maxPhases-reached / frontier-collapsed returns — external tooling
// (stress benchmark telemetry) signal only, no effect on search behavior. finalBadness (timeout
// returns only) is a one-shot computeBadness snapshot of `ws` — the shared, incrementally-diffed
// search state — at that instant; `ws` always reflects a real reached position (whichever
// frontier node it was last replayed to), never garbage, but is not a tracked best-ever minimum
// the way repair-search's bestBadness is.
export async function beamSearchFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, budgetMs: number, startTime: number, orderingBias: StructuralOrderingBias | null, beamWidth: number, yieldFn: YieldFn, mechanicBucketRetention?: boolean, out: { timedOut?: boolean; finalBadness?: number } | null = null, nodeBudget = Infinity): Promise<number[] | null> {
    const ws = createState(startKey, level, prep, STATE_BUF_BEAM);
    const cfg = prep._cfg;
    const research = prep._beamResearchObserver;
    const emit = (stage: import('./types.js').BeamResearchStage, nodes: BeamNode[], details?: Record<string, unknown>): void => {
        if (!research) return;
        research.observe({ stage, depth: nodes[0]?.depth ?? phasesCompleted, work: nodesExpandedTotal + frontierIndex,
            paths: nodes.map(node => [..._reconstructBeamPath(node, [])]), ...(details ? { details } : {}) });
    };
    // Coarse state merge: safe when there are no portals (portals aren't captured in sc).
    // Ablation: STRATEGY_COARSE_STATE_MERGE can disable this optimisation independently.
    const useCoarseStateMerge = level.portalMap.size === 0 && (!cfg || cfg.STRATEGY_COARSE_STATE_MERGE);
    // Ablation: STRATEGY_MECHANIC_BUCKET_RETENTION can disable mechanic-bucket retention even when the config requests it.
    const effectiveMechanicBucketRetention = mechanicBucketRetention && (!cfg || cfg.STRATEGY_MECHANIC_BUCKET_RETENTION);
    // Fast numeric coarse-state-merge/mechanic-bucket-retention keys, computed once per call (not per candidate/phase) from
    // this level's OWN mechanic cardinalities — never a fixed-width assumption, which is exactly
    // what made the old bit-packed signature silently unsound (see beamStateKey's comment). Each
    // field's multiplier is its true maximum possible VALUE COUNT for this specific level, so the
    // mixed-radix encoding below is a provably exact bijection with the (key, 7-field) tuple, not
    // a heuristic. `_numericCoarseStateKeySafe` gates it: whenever the full product would not fit under
    // Number.MAX_SAFE_INTEGER (needs several landmark mechanic types simultaneously present, each
    // near its per-level maximum, plus a long reqInt — measured never to occur on the published or
    // stress-corpus-2 corpora, but not provably impossible), every site below falls back to the
    // exact same delimited-string key it always used. Correctness never depends on this fitting —
    // only speed does. See reports/2026-08-23-beam-dedup-numeric-key-arena.md.
    const _mpBase = 1 << level.mustPassKeys.length;
    const _mcBase = 1 << level.mustCrossKeys.length;
    const _flipperBase = 1 << prep.flipperKeys.length;
    const _surroundBase = (prep.initialSurroundMask ?? 0) + 1;
    const _turnBase = (prep.initialMustTurnMask ?? 0) + 1;
    const _adjBase = (prep.initialAdjTurnMask ?? 0) + 1;
    const _intsBase = level.reqInt + 1;
    const _coarseStateKeyProduct = KEY_SPACE * _intsBase * _mpBase * _mcBase * _flipperBase * _surroundBase * _turnBase * _adjBase;
    const _numericCoarseStateKeySafe = Number.isSafeInteger(_coarseStateKeyProduct) && !prep._forceBeamCoarseStateStringKeyForTests;
    // Numeric coarse-state key: strict positional (mixed-radix) encoding — every field is strictly
    // smaller than its own base by construction (masks are `< 2^bitCount`; `ints` is bounded by
    // `evaluatePrunedMove`'s own `state.ints > level.reqInt` reject, so always `<= reqInt`;
    // packed cell keys are always `< KEY_SPACE` for a `<=15x15` grid), so distinct tuples can never
    // collide to the same number. Order of composition is arbitrary but must stay internally
    // consistent (it is: this is the only place either key is built).
    const beamNumericCoarseStateKey = (c: BeamNode): number =>
        (((((((c.adjTurnMask) * _turnBase + c.mustTurnMask) * _surroundBase + c.surroundMask)
            * _flipperBase + c.flipperUsedMask) * _mcBase + c.mustCrossMask)
            * _mpBase + c.mpVisitedMask) * _intsBase + c.ints) * KEY_SPACE + c.key;
    // Root node: prev=null, key=startKey, depth=0
    let frontier: BeamNode[] = [{ key: startKey, prev: null, depth: 0, score: 0, ints: 0, mpVisitedMask: 0, mustCrossMask: 0, flipperUsedMask: 0, surroundMask: 0, mustTurnMask: 0, adjTurnMask: 0, insOrd: 0, treeOrd: 0 }];
    let lastYield = startTime;
    // Work-based budget: beam search terminates in at most reqLen + portal-pair phases.
    const maxPhases = level.reqLen + Math.floor(level.portalMap.size / 2);
    let phasesCompleted = 0;
    let frontierIndex = 0;
    // Sum of every COMPLETED phase's frontier size. frontierIndex tracks only the current phase and
    // resets each pass, so crediting it alone (as every return path used to) reports just the final
    // phase. Every return below credits nodesExpandedTotal + frontierIndex = all phases worked.
    let nodesExpandedTotal = 0;
    // Reusable scratch array for path reconstruction from parent pointers
    const _scratch: number[] = [];
    // Undo-token stack mirroring ws's current live path (ws.path[0] is always startKey with
    // no token; _liveUndo[i] is the token that applied ws.path[i+1]). Lets each frontier node's
    // state be reached by diffing against whatever path ws currently holds — undoing only the
    // divergent suffix and applying only the new suffix — instead of always resetting to
    // startKey and replaying the full path. Same total operation count in the worst case
    // (zero prefix overlap with the previous node), strictly less otherwise. Because applyMove
    // is a deterministic function of (state, move), and a shared index prefix means an identical
    // move sequence from an identical start state, the resulting ws is byte-identical to a full
    // reset+replay — this changes only how the state is computed, never which moves are scored,
    // pruned, or selected, so search behaviour and the returned path are unaffected.
    const _liveUndo: UndoToken[] = [];

    // _BEAM_DEBUG-only cost breakdown accumulators (ns). All reads/writes are gated behind
    // `if (_BEAM_DEBUG)` so there is no cost on the production path.
    let _dbgReplayNs = 0n, _dbgCandGenNs = 0n, _dbgSortNs = 0n, _dbgCoarseMergeNs = 0n, _dbgConnNs = 0n;
    let _dbgReplaySteps = 0, _dbgCandCount = 0, _dbgFrontierNodes = 0, _dbgPhases = 0, _dbgConnCalls = 0;
    // Returns 0n when _BEAM_DEBUG is off (call sites are still gated by `if (_BEAM_DEBUG)`
    // for the accumulation itself; this just keeps the `bigint` type consistent unconditionally).
    const _hrtNow = (): bigint => (_BEAM_DEBUG ? (_proc as unknown as { hrtime: { bigint: () => bigint } }).hrtime.bigint() : 0n);
    const _dbgFlush = (outcome: string) => {
        if (!_BEAM_DEBUG) return;
        const ms = (n: bigint) => (Number(n) / 1e6).toFixed(1);
        console.error(`  [beam] gate=${startKey} bw=${beamWidth} outcome=${outcome} phases=${_dbgPhases} frontierNodes=${_dbgFrontierNodes} replaySteps=${_dbgReplaySteps} cands=${_dbgCandCount} connCalls=${_dbgConnCalls} | replay=${ms(_dbgReplayNs)}ms candGen=${ms(_dbgCandGenNs)}ms conn=${ms(_dbgConnNs)}ms coarseMerge=${ms(_dbgCoarseMergeNs)}ms sort=${ms(_dbgSortNs)}ms`);
    };

    const yieldIfNeeded = async () => {
        if (!yieldFn) return false;
        const now = Date.now();
        if (now - lastYield < 16) return false;
        lastYield = now;
        await yieldFn(); // throws on cancellation
        return true;
    };

    while (frontier.length > 0) {
        // Fold the just-completed phase into the running total, then reset the per-phase counter.
        // Every return path below credits nodesExpandedTotal + frontierIndex, so a multi-phase beam
        // reports the SUM of all phases it worked. Before this, only the final phase's frontierIndex
        // was ever credited: a timed-out attempt reported 0 (reports/2026-07-16-beam-nodesexpanded-
        // instrumentation-gap.md fixed *that* to the current phase), and -- the case this fixes -- a
        // multi-phase SUCCESS that finished early in its last phase reported a near-zero node count
        // despite seconds of real work, because every earlier completed phase was dropped.
        nodesExpandedTotal += frontierIndex;
        frontierIndex = 0;
        // nodeBudget (default Infinity => inert): a caller-supplied cumulative-remaining node cap
        // (offline batch tooling only, same as dfsFromGate's). Counted in the exact quantity credited
        // to prep._metrics below (nodesExpandedTotal + frontierIndex), so the cap and the reported
        // node count stay consistent. timedOut=true matches dfsFromGate's node-budget exit.
        if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget || prep._workMeter.units >= (prep._workCap ?? Infinity)) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('budget'); if (out) { out.timedOut = true; out.finalBadness = computeBadness(ws, level); } return null; }
        if (phasesCompleted >= maxPhases) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('maxPhases'); if (out) out.timedOut = false; return null; }
        phasesCompleted++;
        if (yieldFn) {
            await yieldFn(); // yield between beam passes; throws on cancellation
            lastYield = Date.now();
        }

        const cands: BeamNode[] = [];
        const generatedForResearch: BeamNode[] | null = research ? [] : null;
        const hardPrunedForResearch: BeamNode[] | null = research ? [] : null;
        const hardPruneContexts: Record<string, unknown>[] | null = research ? [] : null;
        if (research) emit('incoming-frontier', frontier);
        if (_BEAM_DEBUG) _dbgPhases++;

        // `frontier` arrives in cull (score) order. Record that as each node's score rank, then
        // re-order the WALK into parent-grouped tree order. This loop keeps ONE mutable working
        // state `ws` and repositions it per node by undoing back to the shared prefix and replaying
        // forward; score order is uncorrelated with the parent-pointer tree, so consecutive nodes
        // share almost no prefix and each costs ~a full path of undo+replay. Measured on a beam5000
        // published level: 9,777,764 replay steps for 213,089 frontier nodes -- ~46 per node, the
        // worst case, and 441.7ms of ~1349ms of instrumented beam time. Tree order makes it ~2 per
        // node amortised (2.08M steps, 124.6ms).
        //
        // Walk order must NOT leak into which nodes survive: coarse state merge keeps the first node on a score
        // tie and the score sort is stable, so generation order otherwise propagates into the next
        // frontier. Reordering without the `insOrd` restoration below was measured and cost 3 of 47
        // solved corpus-2 levels in a paired sample; with it, that sample is exactly neutral.
        for (let i = 0; i < frontier.length; i++) frontier[i].insOrd = i;
        frontier.sort((a, b) => a.treeOrd - b.treeOrd);
        let _treeRank = 0;

        for (const node of frontier) {
            const _scoreBase = node.insOrd * 4, _treeBase = (_treeRank++) * 4;
            let _childIdx = 0;
            if (((++frontierIndex) & 255) === 0) {
                // frontierIndex here is PARTIAL progress within the current (unfinished) phase --
                // same rationale as the outer checks above, just crediting an in-progress phase
                // instead of a fully-completed one.
                if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget || prep._workMeter.units >= (prep._workCap ?? Infinity)) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('budget-mid-phase'); if (out) { out.timedOut = true; out.finalBadness = computeBadness(ws, level); } return null; }
                await yieldIfNeeded();
            }
            if (_BEAM_DEBUG) _dbgFrontierNodes++;

            // Reconstruct path from parent-pointer chain into _scratch.
            // node.depth stores path length-1, so one traversal suffices (no length-count pass).
            const len = node.depth + 1;
            _reconstructBeamPath(node, _scratch);

            // Diff ws's current live path against the reconstructed target path: undo the
            // divergent suffix of what's currently loaded, then apply only the new suffix.
            // Index 0 (startKey) always matches, so common starts at 1.
            const _t0 = _hrtNow();
            const curPath = ws.path;
            const minLen = Math.min(curPath.length, len);
            let common = 1;
            while (common < minLen && curPath[common] === _scratch[common]) common++;
            let _replaySteps = 0;
            while (ws.path.length > common) {
                undoMove(_liveUndo.pop() as UndoToken, ws);
                _replaySteps++;
            }
            for (let i = common; i < len; i++) {
                const from = _scratch[i - 1], to = _scratch[i];
                const p = level.portalMap.get(from);
                const isJump = !!(p && !ws.lastWasPortalJump && p.dest === to);
                _liveUndo.push(applyMove(to, ws, level, prep, isJump));
                _replaySteps++;
            }
            if (_BEAM_DEBUG) { _dbgReplayNs += _hrtNow() - _t0; _dbgReplaySteps += _replaySteps; }

            const pos = node.key;
            if (pos === level.goalKey) {
                if (isSolutionState(ws, level)) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('solved-frontier'); return _scratch.slice(); }
                continue;
            }

            const _t1 = _hrtNow();
            let neighbors = getNeighbors(pos, ws, level, prep);
            if (pos === startKey) {
                const beforeForced = research ? [...neighbors] : null;
                const diagnostics: PruneDiagnostics | undefined = research ? { reached: {}, rejected: {} } : undefined;
                neighbors = pruneFirstStepNeighbors(startKey, neighbors, prep, diagnostics);
                if (beforeForced && beforeForced.length !== neighbors.length) for (const removed of beforeForced) {
                    if (neighbors.includes(removed)) continue;
                    const diagnosticNode: BeamNode = { key: removed, prev: node, depth: node.depth + 1, score: node.score,
                        ints: 0, mpVisitedMask: 0, mustCrossMask: 0, flipperUsedMask: 0, surroundMask: 0, mustTurnMask: 0, adjTurnMask: 0, insOrd: 0, treeOrd: 0 };
                    hardPrunedForResearch!.push(diagnosticNode);
                    hardPruneContexts!.push({ path: [..._reconstructBeamPath(diagnosticNode, [])],
                        cause: '_forced-first-step', diagnostics });
                }
            }
            const _beamNeighborCount = neighbors.length;
            // ws is fixed for this node's whole candidate batch — none of these siblings has
            // been tentatively applied yet (that happens per-candidate below, then gets undone).
            // See CurUrgencyContext's doc comment.
            const curCtx = buildCurUrgencyContext(pos, ws, level, prep, true, profile);
            // Loop-invariant: pos is fixed for this whole candidate batch, same as curCtx above.
            const pAtPos = level.portalMap.get(pos);
            for (const next of neighbors) {
                const isJump = !!(pAtPos && !ws.lastWasPortalJump && pAtPos.dest === next);
                const undo = applyMove(next, ws, level, prep, isJump);
                const realLen = getRealLengthFromState(ws);
                const rSteps  = level.reqLen - realLen;
                // Beam keeps its deliberately wider connectivity schedule, but all rule
                // ordering and verdicts come from the shared gauntlet so it cannot drift from DFS.
                const runConnectivity = rSteps <= 20 || (realLen & 7) === 0;
                const _tc = _BEAM_DEBUG && runConnectivity ? _hrtNow() : 0n;
                const pruneDiagnostics: PruneDiagnostics | undefined = research ? { reached: {}, rejected: {} } : undefined;
                const verdict = evaluatePrunedMove(next, realLen, ws, level, prep, cfg, runConnectivity,
                    { diagnostics: pruneDiagnostics });
                if (_BEAM_DEBUG && runConnectivity) { _dbgConnNs += _hrtNow() - _tc; _dbgConnCalls++; }
                if (verdict === 'solution') {
                    // ws.path is already [startKey, ..., pos, next] — return it
                    const sol = ws.path.slice();
                    undoMove(undo, ws);
                    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex + _beamNeighborCount;
                    if (_BEAM_DEBUG) _dbgCandGenNs += _hrtNow() - _t1;
                    _dbgFlush('solved-candidate');
                    return sol;
                }
                const ok = verdict === 'pass';
                if (research) {
                    const diagnosticNode: BeamNode = { key: next, prev: node, depth: node.depth + 1, score: node.score,
                        ints: 0, mpVisitedMask: 0, mustCrossMask: 0, flipperUsedMask: 0, surroundMask: 0, mustTurnMask: 0, adjTurnMask: 0, insOrd: 0, treeOrd: 0 };
                    generatedForResearch!.push(diagnosticNode);
                    if (!ok) {
                        hardPrunedForResearch!.push(diagnosticNode);
                        hardPruneContexts!.push({ path: [..._reconstructBeamPath(diagnosticNode, [])], verdict,
                            cause: Object.keys(pruneDiagnostics!.rejected)[0] ?? (next === level.goalKey ? '_invalid-goal' : '_fundamental'),
                            diagnostics: pruneDiagnostics });
                    }
                }
                if (ok) {
                    const mv = scoreMove(next, pos, ws, level, prep, profile, rSteps, orderingBias, curCtx);
                    // Constraint-state fields snapshotted from ws right after this candidate's move —
                    // used by beamStateKey (coarse-state merge) and _mechanicBucketSelect below. Stored as
                    // scalars, not the joined delimited string, because most phases never reach the
                    // coarse-state-merge branch (cands.length <= beamWidth) and building that string per candidate
                    // regardless was pure waste on those phases — see BeamNode's own doc comment.
                    // Delimited-string, not bit-packed-integer, is a correctness requirement, not a
                    // style choice: a prior fixed-width packing silently overflowed and corrupted
                    // adjacent fields on any level with more than 4 must-pass/must-cross/flipper cells
                    // (stress-corpus-2's generator deliberately raises those caps to 8 — see
                    // generate-random.mjs's own header comment). Confirmed on real data: 671 non-portal
                    // stress-corpus-2 levels exceed 4 of at least one of these mechanic counts, 211 of
                    // those with a second, adjacent field simultaneously nonzero — a structurally
                    // guaranteed key collision, not a theoretical edge case. See
                    // reports/2026-08-06-beam-state-dedup-sound-signature-audit.md.
                    //
                    // This is intentionally NOT a fully sound future-state signature either (it
                    // omits visited-cell identity and per-cell edge-usage) — that was measured
                    // separately (same report) to have a duplicate ceiling of ~0.019% of candidates,
                    // and turning coarse state merging off entirely was measured to cost real solves on a harder
                    // stress-corpus-2 sample (19/75 divergent, non-portal, matched node budget) —
                    // its practical value comes from culling many candidates that converge on the
                    // same (cell, mask-tuple) down to the single best-scoring one, freeing beam
                    // width for candidates elsewhere, not from recognizing literally-identical
                    // futures. A fully sound key would eliminate that value along with the
                    // unsoundness (true duplicates are too rare to cull anything). The fix here is
                    // narrower: keep the exact same (cell, mask-tuple) merge granularity, just make
                    // the key itself collision-free regardless of any mechanic's cardinality.
                    // Parent-pointer node — O(1) instead of O(depth) path copy.
                    // <= 4 children per node (4-directional grid; a portal cell yields exactly 1),
                    // so scoreRank*4 + childIdx is a collision-free key for "the index this
                    // candidate would have had under a score-order walk".
                    const _ci = _childIdx++;
                    cands.push({ key: next, prev: node, depth: node.depth + 1, score: node.score + mv,
                                 ints: ws.ints, mpVisitedMask: ws.mpVisitedMask, mustCrossMask: ws.mustCrossMask,
                                 flipperUsedMask: ws.flipperUsedMask, surroundMask: ws.surroundMask,
                                 mustTurnMask: ws.mustTurnMask, adjTurnMask: ws.adjTurnMask,
                                 insOrd: _scoreBase + _ci, treeOrd: _treeBase + _ci });
                }
                undoMove(undo, ws);
            }
            if (_BEAM_DEBUG) _dbgCandGenNs += _hrtNow() - _t1;
        }
        if (_BEAM_DEBUG) _dbgCandCount += cands.length;
        if (generatedForResearch) emit('generated', generatedForResearch);
        if (hardPrunedForResearch) emit('hard-pruned', hardPrunedForResearch, { rejections: hardPruneContexts });
        if (research) emit('post-hard-prune', cands);

        if (cands.length === 0) break;
        await yieldIfNeeded();
        if (cands.length > beamWidth) {
            // Coarse state merge: candidates sharing (position, constraint-state) are merged —
            // only the highest-scoring path to each (cell, flipper+MC+MP+ints) combo survives.
            // String key (see sc's own comment for why NOT a bit-packed integer): `${key}|${sc}`
            // is collision-free regardless of any mechanic's cardinality.
            // Disabled for portal levels — portal usage isn't captured in sc, so merging would be
            // incorrect (two paths at the same cell may have used different portals).
            // Undo the walk reordering: restore the exact order a score-order walk would have
            // produced, so coarse state merge and the stable sort below are bit-identical to before.
            cands.sort((a, b) => a.insOrd - b.insOrd);
            let pool = cands;
            const _t2 = _hrtNow();
            if (useCoarseStateMerge) {
                // dm2 holds the runner-up ONLY for a key currently on a near-tie (see
                // COARSE_STATE_NEAR_TIE_RETENTION_MARGIN) — undefined for the overwhelming majority of keys, so this
                // second map stays empty and costs nothing when no near-ties occur. Kept fully
                // separate from `dm` (rather than a union-typed single map) specifically so `dm`
                // itself is monomorphic — a prior version that stored `BeamNode | BeamNode[]` in one
                // map measured a genuine ~30% per-op slowdown from that alone, even with retention
                // disabled, apparently from losing this map's monomorphic V8 shape. See
                // reports/2026-08-15-connectivity-axis-exhausted-regression.md. For the same
                // monomorphism reason, the numeric-key and string-key forms below are two fully
                // separate code paths (never one map holding a `string | number` union key) — see
                // beamNumericCoarseStateKey's own comment for why the numeric form is usually available
                // and reports/2026-08-23-beam-dedup-numeric-key-arena.md for the measured win.
                const nearTieRetentionEnabled = COARSE_STATE_NEAR_TIE_RETENTION_MARGIN > 0 && (!cfg || cfg.STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION);
                const coarseMergeRemoved: BeamNode[] | null = research ? [] : null;
                const coarseMergeContexts: Record<string, unknown>[] | null = research ? [] : null;
                if (_numericCoarseStateKeySafe) {
                    const dm = new Map<number, BeamNode>();
                    const dm2: Map<number, BeamNode> | null = nearTieRetentionEnabled ? new Map() : null;
                    for (const c of cands) {
                        const dk = beamNumericCoarseStateKey(c);
                        const p = dm.get(dk);
                        if (!p || c.score > p.score) {
                            if (p) {
                                if (research) { coarseMergeRemoved!.push(p); coarseMergeContexts!.push({ removedPath: [..._reconstructBeamPath(p, [])], competitorPath: [..._reconstructBeamPath(c, [])], removedScore: p.score, keptScore: c.score, key: dk }); }
                                if (dm2 && p.score >= c.score - COARSE_STATE_NEAR_TIE_RETENTION_MARGIN * Math.abs(c.score)) dm2.set(dk, p);
                                else if (dm2) dm2.delete(dk);
                            }
                            dm.set(dk, c);
                        } else {
                            if (research) { coarseMergeRemoved!.push(c); coarseMergeContexts!.push({ removedPath: [..._reconstructBeamPath(c, [])], competitorPath: [..._reconstructBeamPath(p, [])], removedScore: c.score, keptScore: p.score, key: dk }); }
                            if (dm2 && c.score >= p.score - COARSE_STATE_NEAR_TIE_RETENTION_MARGIN * Math.abs(p.score)) {
                                const runnerUp = dm2.get(dk);
                                if (!runnerUp || c.score > runnerUp.score) dm2.set(dk, c);
                            }
                        }
                    }
                    if (coarseMergeRemoved) emit('coarse-state-merge-removed', coarseMergeRemoved, { removals: coarseMergeContexts });
                    if (dm2 && dm2.size > 0) {
                        pool = [...dm.values()];
                        for (const [dk, runnerUp] of dm2) if (dm.get(dk) !== runnerUp) pool.push(runnerUp);
                    } else if (dm.size < cands.length) pool = [...dm.values()];
                } else {
                    const dm = new Map<string, BeamNode>();
                    const dm2: Map<string, BeamNode> | null = nearTieRetentionEnabled ? new Map() : null;
                    for (const c of cands) {
                        const dk = `${c.key}|${beamStateKey(c)}`;
                        const p = dm.get(dk);
                        if (!p || c.score > p.score) {
                            if (p) {
                                if (research) { coarseMergeRemoved!.push(p); coarseMergeContexts!.push({ removedPath: [..._reconstructBeamPath(p, [])], competitorPath: [..._reconstructBeamPath(c, [])], removedScore: p.score, keptScore: c.score, key: dk }); }
                                if (dm2 && p.score >= c.score - COARSE_STATE_NEAR_TIE_RETENTION_MARGIN * Math.abs(c.score)) dm2.set(dk, p);
                                else if (dm2) dm2.delete(dk);
                            }
                            dm.set(dk, c);
                        } else {
                            if (research) { coarseMergeRemoved!.push(c); coarseMergeContexts!.push({ removedPath: [..._reconstructBeamPath(c, [])], competitorPath: [..._reconstructBeamPath(p, [])], removedScore: c.score, keptScore: p.score, key: dk }); }
                            if (dm2 && c.score >= p.score - COARSE_STATE_NEAR_TIE_RETENTION_MARGIN * Math.abs(p.score)) {
                                const runnerUp = dm2.get(dk);
                                if (!runnerUp || c.score > runnerUp.score) dm2.set(dk, c);
                            }
                        }
                    }
                    if (coarseMergeRemoved) emit('coarse-state-merge-removed', coarseMergeRemoved, { removals: coarseMergeContexts });
                    if (dm2 && dm2.size > 0) {
                        pool = [...dm.values()];
                        for (const [dk, runnerUp] of dm2) if (dm.get(dk) !== runnerUp) pool.push(runnerUp);
                    } else if (dm.size < cands.length) pool = [...dm.values()];
                }
            }
            if (research) emit('post-production-coarse-state-merge', pool);
            if (_BEAM_DEBUG) { _dbgCoarseMergeNs += _hrtNow() - _t2; }
            const _t3 = _hrtNow();
            pool.sort((a, b) => b.score - a.score);
            if (_BEAM_DEBUG) { _dbgSortNs += _hrtNow() - _t3; }
            await yieldIfNeeded();
            const widthSelected = pool.slice(0, beamWidth);
            frontier = effectiveMechanicBucketRetention ? _mechanicBucketSelect(pool, beamWidth, _flipperBase) : widthSelected;
            // Mechanic-bucket selection is the production retention decision, not a score-width cull
            // followed by a second chance. Report only candidates absent from the actual result;
            // otherwise support would falsely disappear at the provisional slice and reappear.
            const retained = research && effectiveMechanicBucketRetention ? new Set(frontier) : null;
            const actuallyCulled = research && pool.length > beamWidth
                ? (retained ? pool.filter(c => !retained.has(c)) : pool.slice(beamWidth)) : null;
            if (actuallyCulled) emit(effectiveMechanicBucketRetention ? 'mechanic-bucket-culled' : 'score-width-culled', actuallyCulled, {
                beamWidth, cutoffScore: pool[beamWidth - 1]?.score ?? null,
                firstCulledScore: pool[beamWidth]?.score ?? null,
                equalScoreAtCutoff: pool.filter(c => c.score === pool[beamWidth - 1]?.score).length,
                stableOrderAdmission: pool[beamWidth - 1]?.score === pool[beamWidth]?.score,
                // Observation-only forensic context. The lineage observer immediately reduces this
                // to supported ranks/families, so compact artifacts do not retain the whole pool.
                rankedPool: pool.map((c, rank) => ({ path: [..._reconstructBeamPath(c, [])],
                    rank: rank + 1, score: c.score, insertionOrder: c.insOrd })),
                culled: actuallyCulled.map(c => ({ path: [..._reconstructBeamPath(c, [])], rank: pool.indexOf(c) + 1,
                    score: c.score, scoreMarginToCutoff: (pool[beamWidth - 1]?.score ?? c.score) - c.score })),
            });
            if (research) emit(effectiveMechanicBucketRetention ? 'post-mechanic-bucket-selection' : 'post-score-width-cull', frontier);
        } else {
            frontier = cands;
            if (research) {
                emit('post-production-coarse-state-merge', frontier);
                emit('post-score-width-cull', frontier);
            }
        }
    }
    _dbgFlush('exhausted');
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex;
    if (out) out.timedOut = false;
    return null;
}
