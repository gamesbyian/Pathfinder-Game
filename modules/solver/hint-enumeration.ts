// Shared solution-enumeration engine — reused by the back-end corpus-expansion script
// (scripts/hint-corpus-expand.mjs) and the in-editor "Solve" variety search. Browser-safe: it uses
// only the solver's move machinery (createState/getNeighbors/applyMove/undoMove) and sound pruning,
// no DOM, no Node APIs.
//
// Two generation strategies, both a DFS that CONTINUES past every solution (unlike the production
// solver, which returns the first):
//   • randomized-restart enumeration from a gate (System A) — floods open levels;
//   • prefix-anchored completion from a known solution (System B) — rescues tight levels.
// Both funnel through `completeFromState`, which also supports a DETERMINISTIC complete traversal
// (no shuffle, unbounded budget) that provably drains the whole tree — the "Find all" mode. The
// returned `exhausted` flag is true only when the tree was fully drained (not cut short by the node
// budget or `shouldStop`), which is what lets a caller honestly claim "all solutions found".
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { getRealLengthFromState, isSolutionState } from './solution.js';
import { getDistanceFromArray } from './distance.js';
import { rankByAdmissibleSlack } from './admissible-order-search.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile, SolverSearchState } from './types.js';

/** Uniform [0,1) RNG. `null` → deterministic child order (complete-traversal mode). */
export type Rng = (() => number) | null;
export type OnSolution = (path: number[], nodesExpanded: number, elapsedMs: number) => void;
export type ShouldStop = () => boolean;

export interface EnumOptions {
    /** RNG for random child order; omit/null for deterministic order (needed for exhaustive "Find all"). */
    rng?: Rng;
    /** Node ceiling; Infinity = no ceiling (exhaustive). */
    nodeBudget?: number;
    /** Invoked for every accepting solution path found. */
    onSolution: OnSolution;
    /** Polled each node; return true to stop early (e.g. cancel / cap reached). */
    shouldStop?: ShouldStop;
    /** Cooperative scheduler awaited ~every 16ms so a long run (e.g. "Find all") doesn't freeze the UI.
     *  Null (Node batch) = never yields, runs straight through. Use `shouldStop` for cancel, not this. */
    yieldFn?: (() => Promise<void>) | null;
    /** Complete-mode sharding: when provided, only these of the root's real neighbors are explored
     *  (intersected against the actual getNeighbors() result, so a stale/wrong shard can only narrow,
     *  never widen, what's searched). Lets a caller partition ONE gate's tree into disjoint subtrees —
     *  each a complete, independent enumeration — so a worker pool can run them concurrently with zero
     *  change to the DFS itself: partitioning by first move is sound because every path from this root
     *  shares cell 0 (the root) but diverges at cell 1, so disjoint shards can never both find the same
     *  solution. Omit to explore every neighbor (the default, single-shard behavior). */
    rootChildren?: number[];
    /** Child ordering + pruning strategy. Default ('random', i.e. omitted) is this module's
     *  original behavior — `rng`-shuffled child order when given, else getNeighbors()'s own order,
     *  pruned only by the weak checks already inline below (over-length, over-intersection,
     *  goal-distance) — completely unaffected by this option's existence.
     *
     *  'admissible-slack' is a PACKAGE DEAL, not ordering alone: it both ranks children by
     *  modules/solver/admissible-order-search.ts's rankByAdmissibleSlack (least admissible slack
     *  first — the "most-constrained-first" signal the production solver's last-resort
     *  admissible-order-search tier uses) AND switches pruning to the full admissible gauntlet
     *  (evaluatePrunedMove — must-pass/must-cross/surround/adjTurn lower bounds, parity, etc., not
     *  just this module's weak defaults). Both changes are required together: an earlier version of
     *  this option applied ONLY the ranking, reusing this module's existing weak pruning — measured
     *  to be actively COUNTERPRODUCTIVE on a constructed must-pass test level (random order found a
     *  solution by node ~50; admissible-slack ordering alone found nothing in 12,800 nodes). Root
     *  cause: rankByAdmissibleSlack's ranking is only a trustworthy signal when paired with pruning
     *  strong enough to immediately reject a branch it ranks first but that a must-pass/must-cross/
     *  etc. bound already proves is dead — this module's own weak checks don't know about those
     *  bounds at all, so a "most promising by slack" branch that's actually doomed gets explored
     *  DEEPLY (nothing catches it early) instead of rejected in O(1) the way it would be inside
     *  admissibleOrderSearch itself (which always pairs this exact ranking with this exact gauntlet).
     *  Swapping in the full gauntlet is provably safe for completeness regardless: every one of its
     *  checks is itself admissible (never rejects a move that could still reach a valid solution —
     *  see prune-gauntlet.ts's own doc), so it can only prune MORE than this module's defaults,
     *  never differently — an unbounded run under either mode still reaches the exact same complete
     *  solution set. Kept opt-in (not applied to 'random' mode too) specifically because
     *  `completeFromState`'s default pruning is relied on by existing, player-facing production
     *  callers (the in-editor "Solve" button via variety-search.ts) that this change must not alter
     *  even in a can-only-help direction, without the full corpus-timing verification CLAUDE.md
     *  requires for that kind of change — this option's blast radius is contained to callers that
     *  explicitly opt in. */
    orderBy?: 'random' | 'admissible-slack';
    /** Only meaningful when orderBy is 'admissible-slack': how ties in admissible slack are broken.
     *  `null` (default) skips the tie-break entirely (ties keep getNeighbors()'s own order) — the
     *  simplest, assumption-free choice, since the named POLICY_PROFILES tie-break profiles were
     *  tuned for admissible-order-search's own last-resort single-solve context, not open-ended
     *  enumeration; pass an explicit ScoringProfile to opt into score-based tie-breaking instead. */
    tieBreakProfile?: ScoringProfile | null;
}

export interface EnumResult {
    /** Nodes expanded this call. */
    nodes: number;
    /** True iff the DFS drained its whole tree (not stopped by budget or shouldStop) — i.e. every
     *  solution reachable from this start was visited. */
    exhausted: boolean;
}

interface DfsFrame { key: number; children: number[]; idx: number; undo: ReturnType<typeof applyMove> | null; }

function orderChildren(children: number[], rng: Rng): number[] {
    if (!rng) return children;
    for (let i = children.length - 1; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        [children[i], children[j]] = [children[j], children[i]];
    }
    return children;
}

/**
 * DFS from a positioned `state` (its last cell is the search root), continuing past every solution.
 * Sound pruning only (over-length, over-intersection, goal-distance) — never prunes a real solution,
 * so a deterministic unbounded run is a complete enumeration.
 */
export async function completeFromState(
    level: NormalizedLevel, prep: PrepLevel, state: SolverSearchState, opts: EnumOptions,
): Promise<EnumResult> {
    const { rng = null, nodeBudget = Infinity, onSolution, shouldStop, yieldFn = null, rootChildren: shard, orderBy = 'random', tieBreakProfile = null } = opts;
    const useAdmissibleGauntlet = orderBy === 'admissible-slack';
    // A package deal, not ordering alone — see EnumOptions.orderBy's own doc for why the ranking
    // and the stronger pruning below must travel together, and why swapping in the full admissible
    // gauntlet is still provably safe for completeness (every check in it is itself admissible).
    const order = useAdmissibleGauntlet
        ? (children: number[]) => rankByAdmissibleSlack(children, level, prep, state, tieBreakProfile)
        : (children: number[]) => orderChildren(children, rng);
    const startKey = state.path[state.path.length - 1];
    let nodes = 0;
    const startedAt = Date.now();
    let lastYield = startedAt;
    const allRootChildren = getNeighbors(startKey, state, level, prep);
    const rootChildrenSource = shard ? allRootChildren.filter((c) => shard.includes(c)) : allRootChildren;
    const rootChildren = order(rootChildrenSource.slice());
    const stack: DfsFrame[] = [{ key: startKey, children: rootChildren, idx: 0, undo: null }];

    while (stack.length) {
        if (++nodes > nodeBudget || (shouldStop && shouldStop())) return { nodes, exhausted: false };
        if (yieldFn && (nodes & 255) === 0) {
            const now = Date.now();
            if (now - lastYield >= 16) { lastYield = now; await yieldFn(); }
        }
        const top = stack[stack.length - 1];
        if (top.idx >= top.children.length) { if (top.undo) undoMove(top.undo, state); stack.pop(); continue; }
        const next = top.children[top.idx++];
        const portal = level.portalMap.get(top.key);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === next);
        const undo = applyMove(next, state, level, prep, isJump);
        const realLen = getRealLengthFromState(state);
        const rSteps = level.reqLen - realLen;

        if (useAdmissibleGauntlet) {
            // Same runConnectivity cadence admissibleOrderSearch itself uses (admissible-order-
            // search.ts) — connectivity is the one non-O(1) check in the gauntlet, so it isn't run
            // every node, only when steps are tight or periodically.
            const runConnectivity = rSteps <= 10 || (nodes & 63) === 0;
            const verdict = evaluatePrunedMove(next, realLen, state, level, prep, prep._cfg, runConnectivity);
            if (verdict === 'reject') { undoMove(undo, state); continue; }
            if (verdict === 'solution') {
                // Unlike admissibleOrderSearch (which returns on the first solution), this module's
                // whole contract is continuing PAST every solution — report it and keep backtracking.
                onSolution(state.path.slice(), nodes, Date.now() - startedAt);
                undoMove(undo, state); continue;
            }
            const nb = getNeighbors(next, state, level, prep);
            if (nb.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
            stack.push({ key: next, children: order(nb.slice()), idx: 0, undo });
            continue;
        }

        if (realLen > level.reqLen || state.ints > level.reqInt) { undoMove(undo, state); continue; }
        if (next === level.goalKey) {
            if (isSolutionState(state, level)) onSolution(state.path.slice(), nodes, Date.now() - startedAt);
            undoMove(undo, state); continue;
        }
        const gd = getDistanceFromArray(prep.goalDistArr, next, prep.gridW);
        if (!Number.isFinite(gd) || gd > rSteps) { undoMove(undo, state); continue; }
        const nb = getNeighbors(next, state, level, prep);
        if (nb.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        stack.push({ key: next, children: order(nb.slice()), idx: 0, undo });
    }
    return { nodes, exhausted: true };
}

/** System A: enumerate solutions starting at `gateKey`. */
export function enumerateFromGate(
    level: NormalizedLevel, prep: PrepLevel, gateKey: number, opts: EnumOptions,
): Promise<EnumResult> {
    return completeFromState(level, prep, createState(gateKey, level, prep), opts);
}

/** System B: replay the first `k` moves of a known `seedPath`, then enumerate completions of the rest.
 *  Inherits the seed's hard-constraint scaffolding, so it finds solutions on tightly-constrained levels
 *  that blind enumeration from the gate rarely reaches. `exhausted` here means the suffix space under
 *  this specific prefix was drained — not the level's whole space. */
export function anchoredFromSeed(
    level: NormalizedLevel, prep: PrepLevel, seedPath: number[], k: number, opts: EnumOptions,
): Promise<EnumResult> {
    const state = createState(seedPath[0], level, prep);
    for (let i = 1; i <= k && i < seedPath.length; i++) {
        const from = state.path[state.path.length - 1], nextK = seedPath[i];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === nextK);
        applyMove(nextK, state, level, prep, isJump);
    }
    return completeFromState(level, prep, state, opts);
}

// ─── Complete-enumeration sharding (Component 8 of the hint-workbench plan) ──────────────────
//
// completeFromState's `rootChildren` option already lets a caller restrict which of the root's
// real neighbors are explored, partitioning ONE gate's search tree into disjoint subtrees that
// can be enumerated independently (in parallel, by a worker pool — see
// scripts/hint-complete-enumeration-sharded.mjs, the Node-side orchestrator, since worker_threads
// dispatch itself needs Node APIs this browser-safe module can't use). These two helpers are the
// pure, testable planning half: computing the actual root children for a gate, and partitioning
// them into N shards. Soundness (disjoint shards never both find the same solution; merging all
// shards reproduces unsharded complete enumeration) follows directly from completeFromState's own
// contract as long as the shards form an exact partition of the true root children — which
// planGateShards guarantees by construction (every child assigned to exactly one shard).

/** The root's real first-move neighbors from `gateKey` — the set `planGateShards` partitions. */
export function rootChildrenForGate(level: NormalizedLevel, prep: PrepLevel, gateKey: number): number[] {
    const state = createState(gateKey, level, prep);
    return getNeighbors(gateKey, state, level, prep);
}

/**
 * Deterministically partitions `rootChildren` into up to `shardCount` non-empty shards via
 * round-robin assignment over the NUMERICALLY SORTED children — sorted (not insertion/iteration
 * order) so the same gate always produces the same shard plan regardless of how `rootChildren`
 * was obtained, which is what makes parallel and sequential runs byte-stable (design principle 6).
 * Returns fewer than `shardCount` shards when there are fewer children than requested shards
 * (never an empty shard — an empty shard would just be wasted dispatch overhead).
 */
export function planGateShards(rootChildren: number[], shardCount: number): number[][] {
    const n = Math.max(1, Math.floor(shardCount));
    const sorted = [...rootChildren].sort((a, b) => a - b);
    const shards: number[][] = Array.from({ length: Math.min(n, sorted.length) || 1 }, () => []);
    sorted.forEach((child, i) => shards[i % shards.length].push(child));
    return shards.filter(shard => shard.length > 0);
}
