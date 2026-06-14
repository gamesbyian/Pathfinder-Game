import { getDistanceFromArray } from './distance.js';
import { popcount } from './encoding.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, getNeighbors, undoMove } from './search-state.js';
import { getRealLengthFromState } from './solution.js';
import { isConnectedForTrap } from './topology.js';

// DFS from startKey recording every cell that can serve as a valid false-goal location.
// A valid trap spot is any cell where a path of exactly reqLen steps from the gate
// satisfies all win conditions (length, intersections, must-pass, must-cross).
// Adds found cells to validSpots. Returns true on full completion, false on timeout.
//
// Forced-move optimisation: after taking a move, if the reached cell has exactly one
// valid forward neighbor we follow that chain inline without pushing stack frames,
// bundling all undo tokens onto a single frame at the first real branching point.
// Corridors that previously cost O(b^20) stack frames cost O(1) after compression.
async function dfsEnumerateTrapSpots(startKey, level, prep, budgetMs, startTime, validSpots, yieldFn) {
    const state = createState(startKey, level, prep);
    const mpN = level.mustPassKeys.length;
    const mpAllMask = mpN > 0 ? (1 << mpN) - 1 : 0;
    const mcN = level.mustCrossKeys.length;

    let nodesExpanded = 0;
    let lastYield = startTime;

    // Each frame: { key, children, childIdx, undoChain }
    // undoChain holds every applyMove undo needed to reach `key` from the previous
    // frame's key; popping the frame undoes them in reverse.
    const stack = [{ key: startKey, children: getNeighbors(startKey, state, level, prep), childIdx: 0, undoChain: [] }];

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
        if (curRealLen > level.reqLen || state.ints > level.reqInt) { undoMove(undo, state); continue; }
        if (state.mustCrossMask !== 0 && mcN > 0 &&
            state.ints + popcount(state.mustCrossMask) > level.reqInt) { undoMove(undo, state); continue; }
        if (curRealLen === level.reqLen) {
            if (state.ints === level.reqInt && state.mustCrossMask === 0 &&
                (mpAllMask === 0 || (state.mpVisitedMask & mpAllMask) === mpAllMask) &&
                !prep.trapInvalidSet.has(next)) validSpots.add(next);
            undoMove(undo, state);
            continue;
        }

        // ── Forced-move chain ─────────────────────────────────────────────────
        // Follow cells with exactly one valid neighbor without creating frames.
        const undoChain = [undo];
        let cur = next;
        let chainDone = false;
        let chainNeighbors = null;

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
                        const d = getDistanceFromArray(prep.mpDistArrs[i], cur);
                        if (!Number.isFinite(d)) { mpLB = Infinity; break; }
                        if (d > mpLB) mpLB = d;
                    }
                    if (!Number.isFinite(mpLB) || mpLB > rSteps) { chainDone = true; break; }
                }

                if (state.mustCrossMask !== 0) {
                    let mcLB = 0;
                    for (let i = 0; i < mcN; i++) {
                        if ((state.mustCrossMask & (1 << i)) === 0) continue;
                        const d = getDistanceFromArray(prep.mcDistArrs[i], cur);
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
            if (curRealLen > level.reqLen || state.ints > level.reqInt) {
                undoMove(forcedUndo, state); chainDone = true; break;
            }
            if (state.mustCrossMask !== 0 && mcN > 0 &&
                state.ints + popcount(state.mustCrossMask) > level.reqInt) {
                undoMove(forcedUndo, state); chainDone = true; break;
            }
            if (curRealLen === level.reqLen) {
                if (state.ints === level.reqInt && state.mustCrossMask === 0 &&
                    (mpAllMask === 0 || (state.mpVisitedMask & mpAllMask) === mpAllMask) &&
                    !prep.trapInvalidSet.has(forcedNext)) validSpots.add(forcedNext);
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
        stack.push({ key: cur, children: chainNeighbors, childIdx: 0, undoChain });
    }
    return true;
}

// Finds all valid trap spot positions across all gates. Returns a result object
// compatible with APP.Solver.findTrapSpots: { ok, status, spots, timedOut, gatesProcessed, elapsedMs, timeLimit }.
export async function findTrapSpotsV2(level, opts = {}) {
    const startTime = Date.now();
    const budgetMs = opts.timeLimit ?? 30000;
    const yieldFn = opts.yieldFn ?? null;
    const prep = prepLevel(level);
    const validSpots = new Set();
    let gatesProcessed = 0;
    let timedOut = false;

    for (const gateKey of level.gateKeys) {
        if (Date.now() - startTime >= budgetMs) { timedOut = true; break; }
        let completed;
        try {
            completed = await dfsEnumerateTrapSpots(gateKey, level, prep, budgetMs, startTime, validSpots, yieldFn);
        } catch (err) {
            if (err?.message === 'SolverV2:cancelled') {
                return { ok: false, status: 'aborted', spots: validSpots, timedOut: false, gatesProcessed, elapsedMs: Date.now() - startTime, timeLimit: budgetMs };
            }
            completed = false;
        }
        gatesProcessed++;
        if (!completed) { timedOut = true; break; }
    }

    const elapsedMs = Date.now() - startTime;
    return { ok: true, status: timedOut ? 'timeout' : 'done', spots: validSpots, timedOut, gatesProcessed, elapsedMs, timeLimit: budgetMs };
}

