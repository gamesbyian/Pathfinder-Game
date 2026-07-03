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
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, SolverSearchState } from './types.js';

/** Uniform [0,1) RNG. `null` → deterministic child order (complete-traversal mode). */
export type Rng = (() => number) | null;
export type OnSolution = (path: number[]) => void;
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
    const { rng = null, nodeBudget = Infinity, onSolution, shouldStop, yieldFn = null } = opts;
    const startKey = state.path[state.path.length - 1];
    let nodes = 0;
    let lastYield = Date.now();
    const rootChildren = orderChildren(getNeighbors(startKey, state, level, prep).slice(), rng);
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
        if (realLen > level.reqLen || state.ints > level.reqInt) { undoMove(undo, state); continue; }
        if (next === level.goalKey) {
            if (isSolutionState(state, level)) onSolution(state.path.slice());
            undoMove(undo, state); continue;
        }
        const rSteps = level.reqLen - realLen;
        const gd = getDistanceFromArray(prep.goalDistArr, next);
        if (!Number.isFinite(gd) || gd > rSteps) { undoMove(undo, state); continue; }
        const nb = getNeighbors(next, state, level, prep);
        if (nb.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        stack.push({ key: next, children: orderChildren(nb.slice(), rng), idx: 0, undo });
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
