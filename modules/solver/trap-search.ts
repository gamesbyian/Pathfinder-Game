import { getDistanceFromArray } from './distance.js';
import { popcount } from './encoding.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { getRealLengthFromState, structuralDeficit } from './solution.js';
import { isConnectedForTrap } from './topology.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, UndoToken } from './types.js';

type YieldFn = (() => Promise<void>) | null;
type OnSpotFn = ((key: number) => void) | null;
/** A trap-search DFS frame. */
interface TrapFrame { key: number; children: number[]; childIdx: number; undoChain: UndoToken[]; }

function isPrematureFalseGoalStep(level: NormalizedLevel, key: number, realLen: number): boolean {
    return level.falseGoalKeys.has(key) && realLen < level.reqLen;
}

// DFS from startKey recording every cell that can serve as a valid false-goal location.
// A valid trap spot is any cell where a path of exactly reqLen steps from the gate
// satisfies all win conditions (length, intersections, must-pass, must-cross).
// Adds found cells to validSpots. Returns true on full completion, false on timeout.
//
// Forced-move optimisation: after taking a move, if the reached cell has exactly one
// valid forward neighbor we follow that chain inline without pushing stack frames,
// bundling all undo tokens onto a single frame at the first real branching point.
// Corridors that previously cost O(b^20) stack frames cost O(1) after compression.
async function dfsEnumerateTrapSpots(
    startKey: number, level: NormalizedLevel, prep: PrepLevel,
    budgetMs: number, startTime: number, validSpots: Set<number>, yieldFn: YieldFn, onSpot: OnSpotFn,
): Promise<boolean> {
    const recordSpot = (key: number) => {
        if (validSpots.has(key)) return;
        validSpots.add(key);
        if (onSpot) onSpot(key);
    };
    const state = createState(startKey, level, prep);
    const mpN = level.mustPassKeys.length;
    const mpAllMask = mpN > 0 ? (1 << mpN) - 1 : 0;
    const mcN = level.mustCrossKeys.length;

    let nodesExpanded = 0;
    let lastYield = startTime;

    // Each frame: { key, children, childIdx, undoChain }
    // undoChain holds every applyMove undo needed to reach `key` from the previous
    // frame's key; popping the frame undoes them in reverse.
    const stack: TrapFrame[] = [{ key: startKey, children: getNeighbors(startKey, state, level, prep), childIdx: 0, undoChain: [] }];

    while (stack.length > 0) {
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - startTime > budgetMs) return false;
            if (yieldFn && now - lastYield >= 16) { lastYield = now; await yieldFn(); }
        }

        const top = stack[stack.length - 1];

        if (top.childIdx >= top.children.length) {
            const ch = top.undoChain;
            for (let ui = ch.length - 1; ui >= 0; ui--) undoMove(ch[ui], state);
            stack.pop();
            continue;
        }

        // ── Apply move from top.key → next ────────────────────────────────────
        const next = top.children[top.childIdx++];
        const _pt = level.portalMap.get(top.key);
        const undo = applyMove(next, state, level, prep, !!(_pt && !state.lastWasPortalJump && _pt.dest === next));
        let curRealLen = getRealLengthFromState(state);

        // Basic pruning for the first step
        if (curRealLen > level.reqLen || state.ints > level.reqInt || isPrematureFalseGoalStep(level, next, curRealLen)) { undoMove(undo, state); continue; }
        if (state.mustCrossMask !== 0 && mcN > 0 &&
            state.ints + popcount(state.mustCrossMask) > level.reqInt) { undoMove(undo, state); continue; }
        if (curRealLen === level.reqLen) {
            if (state.ints === level.reqInt && structuralDeficit(state, level) === 0 &&
                !prep.trapInvalidSet.has(next)) recordSpot(next);
            undoMove(undo, state);
            continue;
        }

        // ── Forced-move chain ─────────────────────────────────────────────────
        // Follow cells with exactly one valid neighbor without creating frames.
        const undoChain = [undo];
        let cur = next;
        let chainDone = false;
        let chainNeighbors: number[] | null = null;

        while (true) {
            const curNeighbors = getNeighbors(cur, state, level, prep);

            if (curNeighbors.length === 0) { chainDone = true; break; }

            if (curNeighbors.length !== 1) {
                // Real branching point — run full pruning once for the whole chain
                const rSteps = level.reqLen - curRealLen;

                if (mpAllMask !== 0 && (state.mpVisitedMask & mpAllMask) !== mpAllMask) {
                    let mpLB = 0;
                    for (let i = 0; i < mpN; i++) {
                        if (state.mpVisitedMask & (1 << i)) continue;
                        const d = getDistanceFromArray(prep.mpDistArrs[i], cur, prep.gridW);
                        if (!Number.isFinite(d)) { mpLB = Infinity; break; }
                        if (d > mpLB) mpLB = d;
                    }
                    if (!Number.isFinite(mpLB) || mpLB > rSteps) { chainDone = true; break; }
                }

                if (state.mustCrossMask !== 0) {
                    let mcLB = 0;
                    for (let i = 0; i < mcN; i++) {
                        if ((state.mustCrossMask & (1 << i)) === 0) continue;
                        const d = getDistanceFromArray(prep.mcDistArrs[i], cur, prep.gridW);
                        if (!Number.isFinite(d)) { mcLB = Infinity; break; }
                        if (d > mcLB) mcLB = d;
                    }
                    if (!Number.isFinite(mcLB) || mcLB > rSteps) { chainDone = true; break; }
                }

                if (level.reqInt - state.ints > rSteps) { chainDone = true; break; }

                if (!isConnectedForTrap(cur, state, level, prep)) { chainDone = true; break; }

                chainNeighbors = curNeighbors;
                break;
            }

            // Forced move: exactly 1 neighbor — apply inline, no frame
            const forcedNext = curNeighbors[0];
            const _pc = level.portalMap.get(cur);
            const forcedUndo = applyMove(forcedNext, state, level, prep, !!(_pc && !state.lastWasPortalJump && _pc.dest === forcedNext));
            curRealLen = getRealLengthFromState(state);

            // Light pruning after each forced step
            if (curRealLen > level.reqLen || state.ints > level.reqInt || isPrematureFalseGoalStep(level, forcedNext, curRealLen)) {
                undoMove(forcedUndo, state); chainDone = true; break;
            }
            if (state.mustCrossMask !== 0 && mcN > 0 &&
                state.ints + popcount(state.mustCrossMask) > level.reqInt) {
                undoMove(forcedUndo, state); chainDone = true; break;
            }
            if (curRealLen === level.reqLen) {
                if (state.ints === level.reqInt && structuralDeficit(state, level) === 0 &&
                    !prep.trapInvalidSet.has(forcedNext)) recordSpot(forcedNext);
                undoMove(forcedUndo, state); chainDone = true; break;
            }

            undoChain.push(forcedUndo);
            cur = forcedNext;
        }

        if (chainDone) {
            for (let ui = undoChain.length - 1; ui >= 0; ui--) undoMove(undoChain[ui], state);
            continue;
        }

        // Push a single frame at the branching point with the bundled undo chain
        stack.push({ key: cur, children: chainNeighbors as number[], childIdx: 0, undoChain });
    }
    return true;
}

/** Result of a trap-spot search. `gatesCompleted` < `totalGates` (or `timedOut`)
 *  means the spot set is partial — a cell's absence does NOT prove it invalid. */
export interface TrapSearchResult {
    ok: boolean;
    status: 'done' | 'timeout' | 'aborted';
    spots: Set<number>;
    timedOut: boolean;
    /** gates the search reached (started a DFS for) */
    gatesProcessed: number;
    /** gates whose DFS ran to exhaustion (fully enumerated) */
    gatesCompleted: number;
    totalGates: number;
    elapsedMs: number;
    timeLimit: number;
}

/** Progress callback payload, emitted after each gate is processed. */
export interface TrapProgress { gatesProcessed: number; gatesCompleted: number; totalGates: number; spots: number; }

type TrapOpts = {
    timeLimit?: number;
    yieldFn?: (() => Promise<void>);
    onProgress?: (p: TrapProgress) => void | Promise<void>;
    /** Called once per newly-found spot, as it is found — lets callers stream
     *  partial results (the editor paints highlights while the search runs). */
    onSpot?: (key: number) => void;
};

// Sound, cheap necessary-condition test for whether a cell could ever be a path
// endpoint. On portal-free levels every path of exactly reqLen counted steps from
// a gate ends on a cell whose parity equals (gateParity ^ (reqLen & 1)) — each
// step flips parity and counted length equals the step count. A cell whose parity
// matches NO gate can therefore never terminate a path, so a false goal there can
// never be triggered regardless of any other constraint.
//
// Portals make free (zero-length) jumps that move position without spending a
// step. A jump shifts position parity by the parity of its endpoints' Manhattan
// distance, which equals keyParity(a) ^ keyParity(b). So a portal only breaks
// the invariant if it connects cells of OPPOSITE parity; a portal between two
// same-parity cells contributes nothing to end parity. If every portal is
// parity-preserving (or there are none), the portal-free invariant still holds
// and we can rule cells out; if any portal is parity-flipping, both parities are
// reachable and we conservatively return true. This test only ever rules cells
// OUT — it never claims a cell IS reachable.
export function isParityReachableEndpoint(level: NormalizedLevel, key: number): boolean {
    for (const [a, p] of level.portalMap) {
        if ((keyParity(a) ^ keyParity(p.dest)) !== 0) return true; // parity-flipping portal present
    }
    const rp = level.reqLen & 1;
    const kp = keyParity(key);
    for (const g of level.gateKeys) if ((keyParity(g) ^ rp) === kp) return true;
    return false;
}

export type FalseGoalStatus = 'reachable' | 'unreachable' | 'unknown';

// Classifies each of the level's placed false goals against a trap-search result.
//  - 'reachable':   the cell is a valid trap spot (a path can end there).
//  - 'unreachable': provably can never be triggered — either the search fully
//                   enumerated every gate and the cell was not found, or parity
//                   rules it out outright. Safe to warn on (no false positives).
//  - 'unknown':     the search was partial (timed out / aborted before finishing
//                   all gates) AND parity can't decide. Do NOT warn — reachability
//                   is genuinely undetermined; advise running the full search.
export function classifyFalseGoals(
    level: NormalizedLevel,
    result: Pick<TrapSearchResult, 'spots' | 'timedOut' | 'gatesCompleted' | 'totalGates'>,
): Map<number, FalseGoalStatus> {
    const out = new Map<number, FalseGoalStatus>();
    const searchComplete = !result.timedOut && result.gatesCompleted >= result.totalGates;
    for (const fg of level.falseGoalKeys) {
        if (result.spots.has(fg)) { out.set(fg, 'reachable'); continue; }
        if (!isParityReachableEndpoint(level, fg)) { out.set(fg, 'unreachable'); continue; }
        out.set(fg, searchComplete ? 'unreachable' : 'unknown');
    }
    return out;
}

// Finds all valid trap-spot positions across all gates.
//
// Budget fairness: the time budget is split across gates rather than consumed by
// the first gate. Each gate gets an even slice of the *remaining* wall-clock
// (recomputed each iteration, so gates that finish early hand their leftover to
// later gates). A gate that exhausts its slice without completing no longer
// starves the gates after it — every gate is attempted — and the result reports
// how many gates were fully enumerated so callers can tell a complete sweep from
// a partial one. (Previously one slow gate could leave all later gates unsearched.)
export async function findTrapSpots(
    level: NormalizedLevel,
    opts: TrapOpts = {},
): Promise<TrapSearchResult> {
    const startTime = Date.now();
    const budgetMs = opts.timeLimit ?? 30000;
    const yieldFn = opts.yieldFn ?? null;
    const onProgress = opts.onProgress ?? null;
    const onSpot = opts.onSpot ?? null;
    const prep = prepLevel(level, { allowFalseGoalNeighbors: true });
    const validSpots = new Set<number>();
    const gates = level.gateKeys;
    const totalGates = gates.length;
    let gatesProcessed = 0;
    let gatesCompleted = 0;

    const finalize = (status: TrapSearchResult['status']): TrapSearchResult => ({
        ok: status !== 'aborted',
        status,
        spots: validSpots,
        timedOut: gatesCompleted < totalGates,
        gatesProcessed,
        gatesCompleted,
        totalGates,
        elapsedMs: Date.now() - startTime,
        timeLimit: budgetMs,
    });

    for (let gi = 0; gi < totalGates; gi++) {
        const now = Date.now();
        const remaining = budgetMs - (now - startTime);
        if (remaining <= 0) break; // out of time — remaining gates left unprocessed
        // Even slice of what's left; finished gates donate their unused time to the rest.
        const gateBudget = Math.max(1, Math.floor(remaining / (totalGates - gi)));
        let completed: boolean;
        try {
            completed = await dfsEnumerateTrapSpots(gates[gi], level, prep, gateBudget, now, validSpots, yieldFn, onSpot);
        } catch (err) {
            if ((err as { message?: string })?.message === 'Solver:cancelled') return finalize('aborted');
            completed = false;
        }
        gatesProcessed++;
        if (completed) gatesCompleted++;
        if (onProgress) {
            try { await onProgress({ gatesProcessed, gatesCompleted, totalGates, spots: validSpots.size }); }
            catch (err) {
                if ((err as { message?: string })?.message === 'Solver:cancelled') return finalize('aborted');
            }
        }
    }

    return finalize(gatesCompleted >= totalGates ? 'done' : 'timeout');
}

