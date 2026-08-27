import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createState, applyMove } from './search-state.js';
import { isSolutionState } from './solution.js';

export function replayAndValidate(
    path: number[],
    level: ReturnType<typeof normalizeRawLevel>,
    prep: ReturnType<typeof prepLevel>,
): boolean {
    const state = createState(path[0], level, prep);
    for (let i = 1; i < path.length; i++) {
        const from = path[i - 1];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === path[i]);
        applyMove(path[i], state, level, prep, isJump);
    }
    return isSolutionState(state, level);
}

export function r02560Level() {
    return normalizeRawLevel({
        grid: { w: 15, h: 15 }, gates: [{ x: 11, y: 5 }], goal: { x: 11, y: 1 },
        reqLen: 138, reqInt: 9,
        falseGoals: [{ x: 2, y: 1 }, { x: 2, y: 12 }, { x: 8, y: 3 }, { x: 13, y: 13 }, { x: 1, y: 13 }, { x: 2, y: 2 }],
        blocks: [], mustPass: [], mustCross: [], filters: [],
        flippingFilters: [
            { x: 15, y: 12, axis: 2 }, { x: 14, y: 3, axis: 1 }, { x: 9, y: 12, axis: 1 }, { x: 2, y: 3, axis: 1 },
            { x: 10, y: 15, axis: 1 }, { x: 14, y: 10, axis: 2 }, { x: 1, y: 6, axis: 1 }, { x: 4, y: 8, axis: 1 },
        ],
        portals: [],
        geese: [{ x: 4, y: 5 }, { x: 15, y: 2 }, { x: 12, y: 9 }, { x: 3, y: 1 }, { x: 8, y: 6 }, { x: 15, y: 14 }, { x: 9, y: 14 }, { x: 7, y: 5 }],
        landmarks: [
            { x: 14, y: 14, objectType: 'park', role: 'decorative' }, { x: 8, y: 12, objectType: 'park', role: 'decorative' },
            { x: 5, y: 5, objectType: 'fountain', role: 'decorative' }, { x: 1, y: 2, objectType: 'market', role: 'decorative' },
            { x: 5, y: 3, objectType: 'fountain', role: 'decorative' }, { x: 5, y: 14, objectType: 'lamppost', role: 'decorative' },
            { x: 4, y: 1, objectType: 'fountain', role: 'decorative' }, { x: 14, y: 2, objectType: 'park', role: 'decorative' },
        ],
        hints: [],
    });
}

// Historical characterization records the enabled solve at exactly 803,000 nodes and the
// disabled control exhausting this 900,000-node ceiling. Preserve that published regression
// boundary; file-level parallelism now removes it from the rest of repair-search's critical path.
export const R02560_NODE_BUDGET = 900_000;

export const R02560_GATE_KEY = PACK(10, 4);
