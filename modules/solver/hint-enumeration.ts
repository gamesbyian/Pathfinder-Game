// Shared browser-safe solution enumeration for corpus expansion and editor variety search.
// Randomized gate enumeration, prefix-anchored completion, and deterministic exhaustive traversal
// all continue past solutions. `exhausted` means the explored tree was fully drained.
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { getRealLengthFromState, isSolutionState } from './solution.js';
import { getDistanceFromArray } from './distance.js';
import { rankByAdmissibleSlack } from './admissible-order-search.js';
import { evaluatePrunedMove } from './hard-prune-pipeline.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, ScoringProfile, SolverSearchState } from './types.js';

/** Uniform [0,1) RNG; null preserves deterministic child order. */
export type Rng = (() => number) | null;
export type OnSolution = (path: number[], nodesExpanded: number, elapsedMs: number) => void;
export type ShouldStop = () => boolean;

export interface EnumOptions {
    /** RNG for random child order; null/omitted for deterministic traversal. */
    rng?: Rng;
    /** Node ceiling; Infinity is exhaustive. */
    nodeBudget?: number;
    /** Called for every accepting solution. */
    onSolution: OnSolution;
    /** Early-stop predicate, e.g. cancel or cap. */
    shouldStop?: ShouldStop;
    /** Cooperative scheduler for UI callers; null runs straight through. */
    yieldFn?: (() => Promise<void>) | null;
    /** Restrict exhaustive traversal to these actual root children, enabling disjoint first-move shards. */
    rootChildren?: number[];
    /** `admissible-slack` is a package: slack ordering plus the full admissible hard-prune pipeline.
     * Pairing matters because the ranking assumes dead constrained branches are rejected promptly.
     * Both modes remain complete when unbounded; default `random` behavior is unchanged. */
    orderBy?: 'random' | 'admissible-slack';
    /** Admissible-slack tie-break profile; null preserves neighbor order on slack ties. */
    tieBreakProfile?: ScoringProfile | null;
}

export interface EnumResult {
    /** Nodes expanded this call. */
    nodes: number;
    /** True iff the DFS drained the whole requested tree. */
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

/** Enumerate from an already-positioned state, continuing past every solution. */
export async function completeFromState(
    level: NormalizedLevel, prep: PrepLevel, state: SolverSearchState, opts: EnumOptions,
): Promise<EnumResult> {
    const { rng = null, nodeBudget = Infinity, onSolution, shouldStop, yieldFn = null, rootChildren: shard, orderBy = 'random', tieBreakProfile = null } = opts;
    const useAdmissibleGauntlet = orderBy === 'admissible-slack';
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
            // Match admissibleOrderSearch's connectivity cadence; it is the expensive gauntlet member.
            const runConnectivity = rSteps <= 10 || (nodes & 63) === 0;
            const verdict = evaluatePrunedMove(next, realLen, state, level, prep, prep._cfg, runConnectivity);
            if (verdict === 'reject') { undoMove(undo, state); continue; }
            if (verdict === 'solution') {
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

/** System A: enumerate from one gate. */
export function enumerateFromGate(
    level: NormalizedLevel, prep: PrepLevel, gateKey: number, opts: EnumOptions,
): Promise<EnumResult> {
    return completeFromState(level, prep, createState(gateKey, level, prep), opts);
}

/** System B: replay a known prefix, then enumerate its suffix space. `exhausted` applies only to that prefix. */
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

// Complete-enumeration sharding partitions one gate by its first real move; shards are disjoint.

/** Actual first-move neighbors from `gateKey`. */
export function rootChildrenForGate(level: NormalizedLevel, prep: PrepLevel, gateKey: number): number[] {
    const state = createState(gateKey, level, prep);
    return getNeighbors(gateKey, state, level, prep);
}

/** Deterministically round-robin sorted root children into up to `shardCount` non-empty shards. */
export function planGateShards(rootChildren: number[], shardCount: number): number[][] {
    const n = Math.max(1, Math.floor(shardCount));
    const sorted = [...rootChildren].sort((a, b) => a - b);
    const shards: number[][] = Array.from({ length: Math.min(n, sorted.length) || 1 }, () => []);
    sorted.forEach((child, i) => shards[i % shards.length].push(child));
    return shards.filter(shard => shard.length > 0);
}
