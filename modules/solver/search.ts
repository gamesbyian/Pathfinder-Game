import { getDistanceFromArray } from './distance.js';
import { KEY_SPACE, popcount } from './encoding.js';
import { adjTurnLowerBound, mustCrossLowerBound, mustPassLowerBound, mustTurnDeadlocked, surroundLowerBound } from './lower-bounds.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { buildCurUrgencyContext, scoreAndSort, scoreMove } from './scoring.js';
import { computeBadness, getRealLengthFromState, isSolutionState } from './solution.js';
import { isConnected } from './topology.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, UndoToken, ScoringProfile, StructuralTemplate } from './types.js';

/** A yield callback (cooperative scheduling); throws on cancellation. */
type YieldFn = (() => Promise<void>) | null;
/** A DFS stack frame. */
interface DfsFrame { key: number; children: number[]; childIdx: number; undoInfo: UndoToken | null; disc: number; }
/** A beam parent-pointer frontier node. */
interface BeamNode { key: number; prev: BeamNode | null; depth: number; score: number; sc: number; sk?: number; }

// ─── Core DFS ─────────────────────────────────────────────────────────────────

// Iterative DFS from `startKey` using policy `profile` (and optional `template`).
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
async function dfsFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, levelBudgetMs: number, levelStartTime: number, template: StructuralTemplate | null, maxDiscrepancy = Infinity, yieldFn: YieldFn = null, out: { timedOut?: boolean; nodesExpanded?: number; finalBadness?: number } | null = null, nodeBudget = Infinity): Promise<number[] | null> {
    const state = createState(startKey, level, prep);
    const cfg = prep._cfg; // null = no ablation (all features enabled)

    // Stack entry: { key, children, childIdx, undoInfo, disc } where disc = cumulative
    // discrepancy to REACH this node (sum of chosen child-indices along the path).
    let children0 = getNeighbors(startKey, state, level, prep);
    if (prep._forcedFirstStepKey != null) children0 = children0.filter(k => k === prep._forcedFirstStepKey);
    scoreAndSort(children0, startKey, state, level, prep, profile, template);
    const stack: DfsFrame[] = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null, disc: 0 }];

    let nodesExpanded = 0;
    let lastYield = levelStartTime;

    while (stack.length > 0) {
        // Budget + yield check every 256 nodes.
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - levelStartTime > levelBudgetMs || nodesExpanded >= nodeBudget) {
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
            return state.path.slice();
        }
        if (verdict === 'reject') { undoMove(undo, state); continue; }

        // Expand next
        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        scoreAndSort(nextNeighbors, next, state, level, prep, profile, template);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
    if (out) out.nodesExpanded = nodesExpanded;
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
 *  across the whole ladder, unlike the repair-probe's narrow feature gate — a flat cap sized
 *  for a large/dense level would hand every attempt on a small/simple level the same
 *  oversized allowance) and NOT a live self-calibrated nodes/ms rate (only guards a transient
 *  spike inside one probe window, not the sustained ambient contention across separate
 *  fresh-process runs the determinism report actually observed). Scaled the same way
 *  `getTrapSpotBudgetMs` (orchestration.ts) sizes an ms budget from a level's own static
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
// vs. generating/pruning/scoring candidates vs. sorting/deduping the candidate pool.
const _BEAM_DEBUG = !!(_proc && _proc.env && _proc.env.PF_BEAM_DEBUG === '1');
// out (optional, last param): mirrors dfsFromGate's own out contract for external tooling (the
// stress benchmark's per-attempt telemetry) — set to whether the OVERALL call's null return was
// because levelBudgetMs ran out (true) vs. the search genuinely exhausted every avenue it tried
// within budget (false). Determined solely by the two decisive points below (the level-wide
// budget check and the final unbounded pass's own out) — a probe wave hitting ITS OWN smaller
// probeCapMs is not by itself a level-wide timeout (plenty of levelBudgetMs may remain for the
// final pass), so probe-internal timedOut flags are deliberately not surfaced here.
export async function dfsFromGateLDS(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, levelBudgetMs: number, levelStartTime: number, template: StructuralTemplate | null, yieldFn?: YieldFn, out: { timedOut?: boolean; finalBadness?: number } | null = null, nodeBudget = Infinity): Promise<number[] | null> {
    const cfg = prep._cfg;
    // nodeBudget (default Infinity => inert): a caller-supplied cumulative-remaining node cap for
    // this whole LDS invocation (offline batch tooling only). dfsFromGate's own nodeBudget param is
    // LOCAL (per-call counter from 0), so each sub-call below gets the external remainder shrunk by
    // the nodes earlier waves in THIS invocation already spent (probeNodesUsed) — keeping the LDS's
    // total within nodeBudget rather than letting the final unbounded wave run to the time limit.
    // When STRATEGY_LDS is disabled, skip probe waves and run plain best-first DFS directly.
    if (cfg && !cfg.STRATEGY_LDS) {
        const bypassOut: { timedOut?: boolean; finalBadness?: number } = {};
        const path = await dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity, yieldFn, bypassOut, nodeBudget);
        if (out) { out.timedOut = !!bypassOut.timedOut; out.finalBadness = bypassOut.finalBadness; }
        return path;
    }
    const probeCapMs = Math.min(
        Math.max(Math.floor(levelBudgetMs * 0.5), Math.min(_LDS_PROBE_FLOOR_MS, levelBudgetMs)),
        Math.floor(levelBudgetMs * _LDS_PROBE_MAX_FRACTION),
        4000,
    );
    const probeNodeBudget = getLdsProbeNodeBudget(level);
    let probeNodesUsed = 0;
    for (const k of _LDS_PROBE_K) {
        if (yieldFn) await yieldFn();
        const externalRemaining = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - probeNodesUsed);
        const remainingNodeBudget = Math.min(probeNodeBudget - probeNodesUsed, externalRemaining);
        if (remainingNodeBudget <= 0) break;
        const w0 = Date.now();
        const probeOut: { timedOut?: boolean; nodesExpanded?: number } = { timedOut: false };
        const path = await dfsFromGate(startKey, level, prep, profile, probeCapMs, levelStartTime, template, k, yieldFn, probeOut, remainingNodeBudget);
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
    const path = await dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity, yieldFn, finalOut, finalNodeBudget);
    if (out) { out.timedOut = !!finalOut.timedOut; out.finalBadness = finalOut.finalBadness; }
    if (_LDS_DEBUG) console.error(`    [lds] k=Inf ${path?'SOLVED':'-'}`);
    return path;
}

// ─── Beam search ─────────────────────────────────────────────────────────────

// Diverse beam selection: guarantee each (flipperUsedMask, mustCrossMask) bucket
// retains at least floor(beamWidth/numBuckets) candidates. The remaining slots
// are filled from the global top of the score-sorted list.
// `sorted` must already be sorted descending by score; each entry carries `.sk`
// (stateKey = (flipperUsedMask << 4) | mustCrossMask, packed at candidate creation).
function _diverseSelect(sorted: BeamNode[], beamWidth: number): BeamNode[] {
    const buckets = new Map<number | undefined, BeamNode[]>();
    for (const c of sorted) {
        let b = buckets.get(c.sk);
        if (!b) { b = []; buckets.set(c.sk, b); }
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
// diverseBeam: if true, use _diverseSelect to maintain candidate diversity across
// flipper and must-cross constraint states (prevents beam collapse to one structural mode).
// out (optional, last param): timedOut=true for the two budget-check returns, false for the
// (functionally identical) maxPhases-reached / frontier-collapsed returns — external tooling
// (stress benchmark telemetry) signal only, no effect on search behavior. finalBadness (timeout
// returns only) is a one-shot computeBadness snapshot of `ws` — the shared, incrementally-diffed
// search state — at that instant; `ws` always reflects a real reached position (whichever
// frontier node it was last replayed to), never garbage, but is not a tracked best-ever minimum
// the way repair-search's bestBadness is.
export async function beamSearchFromGate(startKey: number, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, budgetMs: number, startTime: number, template: StructuralTemplate | null, beamWidth: number, yieldFn: YieldFn, diverseBeam?: boolean, out: { timedOut?: boolean; finalBadness?: number } | null = null, nodeBudget = Infinity): Promise<number[] | null> {
    const ws = createState(startKey, level, prep);
    const cfg = prep._cfg;
    // State dedup: safe when there are no portals (portals aren't captured in sc).
    // Ablation: STRATEGY_STATE_DEDUP can disable this optimisation independently.
    const useStateDedup = level.portalMap.size === 0 && (!cfg || cfg.STRATEGY_STATE_DEDUP);
    // Ablation: STRATEGY_DIVERSE_BEAM can disable diverse selection even when the config requests it.
    const effectiveDiverseBeam = diverseBeam && (!cfg || cfg.STRATEGY_DIVERSE_BEAM);
    // Root node: prev=null, key=startKey, depth=0
    let frontier: BeamNode[] = [{ key: startKey, prev: null, depth: 0, score: 0, sc: 0 }];
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
    let _dbgReplayNs = 0n, _dbgCandGenNs = 0n, _dbgSortNs = 0n, _dbgDedupNs = 0n, _dbgConnNs = 0n;
    let _dbgReplaySteps = 0, _dbgCandCount = 0, _dbgFrontierNodes = 0, _dbgPhases = 0, _dbgConnCalls = 0;
    // Returns 0n when _BEAM_DEBUG is off (call sites are still gated by `if (_BEAM_DEBUG)`
    // for the accumulation itself; this just keeps the `bigint` type consistent unconditionally).
    const _hrtNow = (): bigint => (_BEAM_DEBUG ? (_proc as unknown as { hrtime: { bigint: () => bigint } }).hrtime.bigint() : 0n);
    const _dbgFlush = (outcome: string) => {
        if (!_BEAM_DEBUG) return;
        const ms = (n: bigint) => (Number(n) / 1e6).toFixed(1);
        console.error(`  [beam] gate=${startKey} bw=${beamWidth} outcome=${outcome} phases=${_dbgPhases} frontierNodes=${_dbgFrontierNodes} replaySteps=${_dbgReplaySteps} cands=${_dbgCandCount} connCalls=${_dbgConnCalls} | replay=${ms(_dbgReplayNs)}ms candGen=${ms(_dbgCandGenNs)}ms conn=${ms(_dbgConnNs)}ms dedup=${ms(_dbgDedupNs)}ms sort=${ms(_dbgSortNs)}ms`);
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
        if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('budget'); if (out) { out.timedOut = true; out.finalBadness = computeBadness(ws, level); } return null; }
        if (phasesCompleted >= maxPhases) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('maxPhases'); if (out) out.timedOut = false; return null; }
        phasesCompleted++;
        if (yieldFn) {
            await yieldFn(); // yield between beam passes; throws on cancellation
            lastYield = Date.now();
        }

        const cands: BeamNode[] = [];
        if (_BEAM_DEBUG) _dbgPhases++;

        for (const node of frontier) {
            if (((++frontierIndex) & 255) === 0) {
                // frontierIndex here is PARTIAL progress within the current (unfinished) phase --
                // same rationale as the outer checks above, just crediting an in-progress phase
                // instead of a fully-completed one.
                if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget) { if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex; _dbgFlush('budget-mid-phase'); if (out) { out.timedOut = true; out.finalBadness = computeBadness(ws, level); } return null; }
                await yieldIfNeeded();
            }
            if (_BEAM_DEBUG) _dbgFrontierNodes++;

            // Reconstruct path from parent-pointer chain into _scratch.
            // node.depth stores path length-1, so one traversal suffices (no length-count pass).
            const len = node.depth + 1;
            _scratch.length = len;
            let cur: BeamNode = node;
            for (let i = len - 1; i >= 0; i--) { _scratch[i] = cur.key; cur = cur.prev as BeamNode; }

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
            if (pos === startKey && prep._forcedFirstStepKey != null) {
                neighbors = neighbors.filter(k => k === prep._forcedFirstStepKey);
            }
            const _beamNeighborCount = neighbors.length;
            // ws is fixed for this node's whole candidate batch — none of these siblings has
            // been tentatively applied yet (that happens per-candidate below, then gets undone).
            // See CurUrgencyContext's doc comment.
            const curCtx = buildCurUrgencyContext(pos, ws, level, prep, true, profile);
            for (const next of neighbors) {
                const pAtPos = level.portalMap.get(pos);
                const isJump = !!(pAtPos && !ws.lastWasPortalJump && pAtPos.dest === next);
                const undo = applyMove(next, ws, level, prep, isJump);
                const realLen = getRealLengthFromState(ws);
                const rSteps  = level.reqLen - realLen;
                let ok = realLen <= level.reqLen && ws.ints <= level.reqInt; // fundamental, always on

                if (ok && (!cfg || cfg.PRUNE_MC_CEILING) && ws.mustCrossMask !== 0) {
                    if (ws.ints + popcount(ws.mustCrossMask) > level.reqInt) ok = false;
                }
                if (ok && next === level.goalKey) {
                    if (isSolutionState(ws, level)) {
                        // ws.path is already [startKey, ..., pos, next] — return it
                        const sol = ws.path.slice();
                        undoMove(undo, ws);
                        if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex + _beamNeighborCount;
                        if (_BEAM_DEBUG) _dbgCandGenNs += _hrtNow() - _t1;
                        _dbgFlush('solved-candidate');
                        return sol;
                    }
                    ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_DISTANCE_BOUND)) {
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
                // Connectivity: check near end and every 8 path steps. rSteps<=20 is intentionally
                // wider than dfsFromGate's/repair-search's rSteps<=10 -- tried narrowing it to 10
                // (2026-07-23, commit eadfadc) to cut isConnected's ~20%-of-CPU cost, but a clean
                // uncontended stress-corpus-1 before/after run found it cost 2 additional unsolved
                // levels (R01014, R01271) with no offsetting speed win, so it was reverted. See
                // reports/2026-07-23-solver-batch-speed-and-hint-provenance.md.
                if (ok && (!cfg || cfg.PRUNE_CONNECTIVITY) && (rSteps <= 20 || (realLen & 7) === 0)) {
                    const _tc = _BEAM_DEBUG ? _hrtNow() : 0n;
                    const _connOk = isConnected(next, ws, level, prep);
                    if (_BEAM_DEBUG) { _dbgConnNs += _hrtNow() - _tc; _dbgConnCalls++; }
                    if (!_connOk) ok = false;
                }
                if (ok) {
                    const mv = scoreMove(next, pos, ws, level, prep, profile, rSteps, template, curCtx);
                    // sc: 28-bit constraint-state key for beam dedup.
                    // bits 0-3: ints&0xF, 4-7: mpVisitedMask&0xF, 8-11: mustCrossMask&0xF,
                    // 12-15: flipperUsedMask&0xF, 16-19: surroundMask&0xF,
                    // 20-23: mustTurnMask&0xF, 24-27: adjTurnMask&0xF
                    const sc = (ws.flipperUsedMask << 12) | (ws.mustCrossMask << 8) | (ws.mpVisitedMask << 4) | (ws.ints & 0xF)
                             | (ws.surroundMask << 16) | (ws.mustTurnMask << 20) | (ws.adjTurnMask << 24);
                    // Parent-pointer node — O(1) instead of O(depth) path copy.
                    // sk = stateKey: (flipperUsedMask<<4)|mustCrossMask — used by _diverseSelect
                    // to bucket candidates and prevent beam collapse to one constraint-state mode.
                    if (effectiveDiverseBeam) {
                        cands.push({ key: next, prev: node, depth: node.depth + 1, score: node.score + mv,
                                     sk: (ws.flipperUsedMask << 4) | (ws.mustCrossMask & 0xF), sc });
                    } else {
                        cands.push({ key: next, prev: node, depth: node.depth + 1, score: node.score + mv, sc });
                    }
                }
                undoMove(undo, ws);
            }
            if (_BEAM_DEBUG) _dbgCandGenNs += _hrtNow() - _t1;
        }
        if (_BEAM_DEBUG) _dbgCandCount += cands.length;

        if (cands.length === 0) break;
        await yieldIfNeeded();
        if (cands.length > beamWidth) {
            // State-based deduplication: candidates sharing (position, constraint-state) are merged —
            // only the highest-scoring path to each (cell, flipper+MC+MP+ints) combo survives.
            // Uses a single float64 Map key: key + sc * KEY_SPACE (exact for key<2^20, sc<2^16).
            // Disabled for portal levels — portal usage isn't captured in sc, so merging would be
            // incorrect (two paths at the same cell may have used different portals).
            let pool = cands;
            const _t2 = _hrtNow();
            if (useStateDedup) {
                const dm = new Map<number, BeamNode>();
                for (const c of cands) {
                    const dk = c.key + c.sc * KEY_SPACE;
                    const p = dm.get(dk);
                    if (!p || c.score > p.score) dm.set(dk, c);
                }
                if (dm.size < cands.length) pool = [...dm.values()];
            }
            if (_BEAM_DEBUG) { _dbgDedupNs += _hrtNow() - _t2; }
            const _t3 = _hrtNow();
            pool.sort((a, b) => b.score - a.score);
            if (_BEAM_DEBUG) { _dbgSortNs += _hrtNow() - _t3; }
            await yieldIfNeeded();
            frontier = effectiveDiverseBeam ? _diverseSelect(pool, beamWidth) : pool.slice(0, beamWidth);
        } else {
            frontier = cands;
        }
    }
    _dbgFlush('exhausted');
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpandedTotal + frontierIndex;
    if (out) out.timedOut = false;
    return null;
}

