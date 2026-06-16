import { getDistanceFromArray } from './distance.js';
import { KEY_SPACE, popcount } from './encoding.js';
import { adjTurnLowerBound, mustCrossLowerBound, mustPassLowerBound, surroundLowerBound } from './lower-bounds.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { scoreAndSort, scoreMoveV2 } from './scoring.js';
import { getRealLengthFromState, isSolutionState } from './solution.js';
import { isConnected } from './topology.js';

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
async function dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, maxDiscrepancy = Infinity, yieldFn = null, out = null) {
    const state = createState(startKey, level, prep);
    const cfg = prep._cfg; // null = no ablation (all features enabled)

    // Stack entry: { key, children, childIdx, undoInfo, disc } where disc = cumulative
    // discrepancy to REACH this node (sum of chosen child-indices along the path).
    const children0 = getNeighbors(startKey, state, level, prep);
    scoreAndSort(children0, startKey, state, level, prep, profile, template);
    const stack = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null, disc: 0 }];

    let nodesExpanded = 0;
    let lastYield = levelStartTime;

    while (stack.length > 0) {
        // Budget + yield check every 256 nodes.
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - levelStartTime > levelBudgetMs) { if (out) out.timedOut = true; return null; }
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

        // Over-length prune (fundamental — always on)
        if (realLen > level.reqLen) { undoMove(undo, state); continue; }

        // Over-intersection prune (fundamental — always on)
        if (state.ints > level.reqInt) { undoMove(undo, state); continue; }

        // Intersection ceiling: ints + remaining_MC_crossings must not exceed reqInt.
        // Each pending MC cell will contribute exactly 1 intersection (its 2nd-axis visit).
        // If current ints + guaranteed future MC ints already exceeds reqInt, prune.
        // This eliminates paths with non-MC crossings on levels where all intersections
        // must come from MC cells (e.g. L53: mc=3, reqInt=3 → zero non-MC crossings).
        if ((!cfg || cfg.PRUNE_MC_CEILING) && state.mustCrossMask !== 0 && level.mustCrossKeys.length > 0) {
            const mcRemaining = popcount(state.mustCrossMask);
            if (state.ints + mcRemaining > level.reqInt) { undoMove(undo, state); continue; }
        }

        // Solution check (only when at goal)
        if (next === level.goalKey) {
            if (isSolutionState(state, level)) {
                if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
                return state.path.slice();
            }
            undoMove(undo, state); continue;
        }

        const rSteps = level.reqLen - realLen;

        // Distance bound: min steps from next to goal must fit in remaining steps
        if (!cfg || cfg.PRUNE_DISTANCE_BOUND) {
            const goalDist = getDistanceFromArray(prep.goalDistArr, next);
            if (!Number.isFinite(goalDist) || goalDist > rSteps) { undoMove(undo, state); continue; }
        }

        // Parity pruning (V1 line 6559): on a portal-free grid every step flips (x+y)%2.
        // Always apply at depth 1 (catches globally infeasible gates, e.g. L53 gate 2).
        // Apply deep parity (full DFS) only for corridor-rich levels (≥10 blocks): these
        // levels have tightly constrained paths where parity cuts many dead-end corridors.
        // For open levels with few blocks, deep parity changes search order adversely.
        if ((!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
            const posP  = ((next & 0xFFFF) + ((next >>> 16) & 0xFFFF)) & 1;
            const goalP = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
            const firstStep = (realLen === 1);
            if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
                undoMove(undo, state); continue;
            }
        }

        // Must-pass lower bound: dist(next→MP) + dist(MP→goal) ≤ rSteps
        if ((!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
            const mpLB = mustPassLowerBound(next, state, level, prep);
            if (!Number.isFinite(mpLB) || mpLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Must-cross lower bound: dist(next→MC) + dist(MC→goal) ≤ rSteps
        if ((!cfg || cfg.PRUNE_MUST_CROSS_LB) && state.mustCrossMask !== 0) {
            const mcLB = mustCrossLowerBound(next, state, level, prep);
            if (!Number.isFinite(mcLB) || mcLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Surround lower bound: all unvisited surround-cell neighbors must be reachable
        if (state.surroundMask !== 0) {
            const sLB = surroundLowerBound(next, state, level, prep);
            if (!Number.isFinite(sLB) || sLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Adjacent-turn lower bound: must reach an adjacent cell of each pending adj-turn obj
        if (state.adjTurnMask !== 0) {
            const atLB = adjTurnLowerBound(next, state, level, prep);
            if (!Number.isFinite(atLB) || atLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Intersection deficit: can't create more than rSteps intersections
        if (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) {
            const intNeeded = level.reqInt - state.ints;
            if (intNeeded > rSteps) { undoMove(undo, state); continue; }
        }

        // Connectivity + volume check: every 64 nodes and always near end.
        if ((!cfg || cfg.PRUNE_CONNECTIVITY) && (rSteps <= 10 || (nodesExpanded & 63) === 0)) {
            if (!isConnected(next, state, level, prep)) { undoMove(undo, state); continue; }
        }

        // Expand next
        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        scoreAndSort(nextNeighbors, next, state, level, prep, profile, template);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
    return null;
}

// Iterative-deepening LDS wrapper. Runs a geometric ladder of discrepancy bounds —
// cheap low-k probes first (find close-to-greedy solutions fast), ending with an
// UNBOUNDED wave that is identical to plain best-first DFS. Ending unbounded guarantees
// LDS never loses plain-DFS's reach: a level whose solution is far from greedy still
// gets a full sweep in the final wave (preventing regressions like L26). Each wave
// re-explores the lower-k region (LDS redundancy), but low-k waves are cheap and the
// final unbounded wave dominates cost, so the overhead is bounded.
// Limited Discrepancy Search wrapper, two phases:
//   1. CHEAP PROBE: discrepancy bounds k ∈ {0,1,2,4,8}, hard-capped at probeCapMs total.
//      Empirically every close-to-greedy solution (L61, L79, L136, L143, L147) is found
//      by k=8 in under 1.3s, so a small cap suffices and the bounded trees exhaust fast.
//   2. UNBOUNDED FALLBACK: plain best-first DFS (k=∞) with all remaining budget. This is
//      bit-for-bit the original solver, so levels whose solution is far from greedy
//      (e.g. L26) keep essentially the full DFS budget — no regression.
// The hard cap on phase 1 is what prevents the probe waves from starving phase 2.
const _LDS_PROBE_K = [0, 1, 2, 4, 8];
const _LDS_DEBUG = typeof process !== 'undefined' && process.env && process.env.PF_LDS_DEBUG === '1';
export async function dfsFromGateLDS(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, yieldFn) {
    const cfg = prep._cfg;
    // When STRATEGY_LDS is disabled, skip probe waves and run plain best-first DFS directly.
    if (cfg && !cfg.STRATEGY_LDS) {
        return dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity, yieldFn);
    }
    const probeCapMs = Math.min(Math.floor(levelBudgetMs * 0.5), 4000);
    for (const k of _LDS_PROBE_K) {
        if (yieldFn) await yieldFn();
        const w0 = Date.now();
        const probeOut = { timedOut: false };
        const path = await dfsFromGate(startKey, level, prep, profile, probeCapMs, levelStartTime, template, k, yieldFn, probeOut);
        if (_LDS_DEBUG) console.error(`    [lds] k=${k} ${Date.now()-w0}ms ${path?'SOLVED':probeOut.timedOut?'timeout':'exhausted'}`);
        if (path) return path;
        if (probeOut.timedOut) break;
    }
    if (Date.now() - levelStartTime >= levelBudgetMs) return null;
    if (yieldFn) await yieldFn();
    const path = await dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity, yieldFn);
    if (_LDS_DEBUG) console.error(`    [lds] k=Inf ${path?'SOLVED':'-'}`);
    return path;
}

// ─── Beam search ─────────────────────────────────────────────────────────────

// Reset ws back to start-of-level (single occupied cell: startKey).
// Zeros only the cells in ws.path (O(path_length)), not the full KEY_SPACE arrays.
function _beamResetState(ws, startKey, level, prep) {
    const wsP = ws.path, wsN = wsP.length;
    for (let i = 0; i < wsN; i++) {
        const k = wsP[i];
        ws.visited[k]   = 0;
        ws.edgeUsage[k] = 0;
    }
    wsP.length = 1; wsP[0] = startKey;
    ws.ints = 0; ws.portalJumps = 0; ws.lastWasPortalJump = false;
    ws.mustMask         = prep.initialMustMask;
    ws.mustCrossMask    = prep.initialMustCrossMask;
    ws.mpVisitedMask    = 0;
    ws.flipperUsedMask  = 0;
    ws.crossCounts.fill(0);
    ws.visited[startKey] = 1;
    const mpIdx = prep.mustPassIndex.get(startKey);
    if (mpIdx !== undefined) {
        ws.mustMask &= ~(1 << mpIdx);
        ws.mpVisitedMask |= (1 << mpIdx);
    }
    const mcIdx = prep.mustCrossIndex.get(startKey);
    if (mcIdx !== undefined) ws.crossCounts[mcIdx] = 1;
    const _fsi = prep.flipperIndexMap.get(startKey);
    if (_fsi !== undefined) ws.flipperUsedMask |= (1 << _fsi);
    // Landmark state reset
    ws.surroundMask  = prep.initialSurroundMask  ?? 0;
    ws.mustTurnMask  = prep.initialMustTurnMask  ?? 0;
    ws.adjTurnMask   = prep.initialAdjTurnMask   ?? 0;
    if (prep.surroundInitNeighborMasks?.length > 0) {
        ws.surroundNeighborRemainingMasks.set(prep.surroundInitNeighborMasks);
    }
    // Apply start-cell surround neighbor effects
    if (ws.surroundMask !== 0) {
        const snNbrs = prep.surroundNeighborIndex?.get(startKey);
        if (snNbrs) {
            for (const { i, bit } of snNbrs) {
                ws.surroundNeighborRemainingMasks[i] &= ~bit;
                if (ws.surroundNeighborRemainingMasks[i] === 0) ws.surroundMask &= ~(1 << i);
            }
        }
    }
}

// Diverse beam selection: guarantee each (flipperUsedMask, mustCrossMask) bucket
// retains at least floor(beamWidth/numBuckets) candidates. The remaining slots
// are filled from the global top of the score-sorted list.
// `sorted` must already be sorted descending by score; each entry carries `.sk`
// (stateKey = (flipperUsedMask << 4) | mustCrossMask, packed at candidate creation).
function _diverseSelect(sorted, beamWidth) {
    const buckets = new Map();
    for (const c of sorted) {
        let b = buckets.get(c.sk);
        if (!b) { b = []; buckets.set(c.sk, b); }
        b.push(c);
    }
    const nb = buckets.size;
    if (nb <= 1) return sorted.slice(0, beamWidth);

    const guaranteed = Math.max(1, Math.floor(beamWidth / nb));
    const result = [];
    const added = new Set();

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
// The path is reconstructed into a reusable scratch array only when needed.
// diverseBeam: if true, use _diverseSelect to maintain candidate diversity across
// flipper and must-cross constraint states (prevents beam collapse to one structural mode).
export async function beamSearchFromGate(startKey, level, prep, profile, budgetMs, startTime, template, beamWidth, yieldFn, diverseBeam) {
    const ws = createState(startKey, level, prep);
    const cfg = prep._cfg;
    // State dedup: safe when there are no portals (portals aren't captured in sc).
    // Ablation: STRATEGY_STATE_DEDUP can disable this optimisation independently.
    const useStateDedup = level.portalMap.size === 0 && (!cfg || cfg.STRATEGY_STATE_DEDUP);
    // Ablation: STRATEGY_DIVERSE_BEAM can disable diverse selection even when the config requests it.
    const effectiveDiverseBeam = diverseBeam && (!cfg || cfg.STRATEGY_DIVERSE_BEAM);
    // Root node: prev=null, key=startKey, depth=0
    let frontier = [{ key: startKey, prev: null, depth: 0, score: 0, sc: 0 }];
    let lastYield = startTime;
    // Work-based budget: beam search terminates in at most reqLen + portal-pair phases.
    const maxPhases = level.reqLen + Math.floor(level.portalMap.size / 2);
    let phasesCompleted = 0;
    let frontierIndex = 0;
    // Reusable scratch array for path reconstruction from parent pointers
    const _scratch = [];

    const yieldIfNeeded = async () => {
        if (!yieldFn) return false;
        const now = Date.now();
        if (now - lastYield < 16) return false;
        lastYield = now;
        await yieldFn(); // throws on cancellation
        return true;
    };

    while (frontier.length > 0) {
        if (Date.now() - startTime >= budgetMs) return null;
        if (phasesCompleted >= maxPhases) return null;
        phasesCompleted++;
        if (yieldFn) {
            await yieldFn(); // yield between beam passes; throws on cancellation
            lastYield = Date.now();
        }

        const cands = [];
        frontierIndex = 0;

        for (const node of frontier) {
            if (((++frontierIndex) & 255) === 0) {
                if (Date.now() - startTime >= budgetMs) return null;
                await yieldIfNeeded();
            }

            // Reconstruct path from parent-pointer chain into _scratch.
            // node.depth stores path length-1, so one traversal suffices (no length-count pass).
            const len = node.depth + 1;
            _scratch.length = len;
            let cur = node;
            for (let i = len - 1; i >= 0; i--) { _scratch[i] = cur.key; cur = cur.prev; }

            // Reset ws to startKey state, then replay the reconstructed path
            _beamResetState(ws, startKey, level, prep);
            for (let i = 1; i < len; i++) {
                const from = _scratch[i - 1], to = _scratch[i];
                const p = level.portalMap.get(from);
                const isJump = !!(p && !ws.lastWasPortalJump && p.dest === to);
                applyMove(to, ws, level, prep, isJump);
            }

            const pos = node.key;
            if (pos === level.goalKey) {
                if (isSolutionState(ws, level)) return _scratch.slice();
                continue;
            }

            const neighbors = getNeighbors(pos, ws, level, prep);
            let _beamNeighborCount = neighbors.length;
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
                        if (prep._metrics) prep._metrics.nodesExpanded += frontierIndex + _beamNeighborCount;
                        return sol;
                    }
                    ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_DISTANCE_BOUND)) {
                    const gd = getDistanceFromArray(prep.goalDistArr, next);
                    if (!Number.isFinite(gd) || gd > rSteps) ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
                    const pp = ((next & 0xFFFF) + ((next >>> 16) & 0xFFFF)) & 1;
                    const gp = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
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
                if (ok && ws.surroundMask !== 0) {
                    const lb = surroundLowerBound(next, ws, level, prep);
                    if (!Number.isFinite(lb) || lb > rSteps) ok = false;
                }
                if (ok && ws.adjTurnMask !== 0) {
                    const lb = adjTurnLowerBound(next, ws, level, prep);
                    if (!Number.isFinite(lb) || lb > rSteps) ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) && (level.reqInt - ws.ints) > rSteps) ok = false;
                // Connectivity: check near end and every 8 path steps
                if (ok && (!cfg || cfg.PRUNE_CONNECTIVITY) && (rSteps <= 20 || (realLen & 7) === 0)) {
                    if (!isConnected(next, ws, level, prep)) ok = false;
                }
                if (ok) {
                    const mv = scoreMoveV2(next, pos, ws, level, prep, profile, rSteps, template);
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
        }

        if (cands.length === 0) break;
        await yieldIfNeeded();
        if (cands.length > beamWidth) {
            // State-based deduplication: candidates sharing (position, constraint-state) are merged —
            // only the highest-scoring path to each (cell, flipper+MC+MP+ints) combo survives.
            // Uses a single float64 Map key: key + sc * KEY_SPACE (exact for key<2^20, sc<2^16).
            // Disabled for portal levels — portal usage isn't captured in sc, so merging would be
            // incorrect (two paths at the same cell may have used different portals).
            let pool = cands;
            if (useStateDedup) {
                const dm = new Map();
                for (const c of cands) {
                    const dk = c.key + c.sc * KEY_SPACE;
                    const p = dm.get(dk);
                    if (!p || c.score > p.score) dm.set(dk, c);
                }
                if (dm.size < cands.length) pool = [...dm.values()];
            }
            pool.sort((a, b) => b.score - a.score);
            await yieldIfNeeded();
            frontier = effectiveDiverseBeam ? _diverseSelect(pool, beamWidth) : pool.slice(0, beamWidth);
        } else {
            frontier = cands;
        }
    }
    if (prep._metrics) prep._metrics.nodesExpanded += frontierIndex;
    return null;
}

