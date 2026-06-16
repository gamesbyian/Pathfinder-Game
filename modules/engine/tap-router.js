import { cloneTapRouteState, simulateTapRouteStep } from '../runtime/path-state.js';

export function createTapRouter({ core, state, levelUtils }) {
    return {
        findTapRoute(target, options = {}) {
            const level = state.ENGINE.mode === core.PLAY
                ? state.ENGINE.level
                : state.ENGINE.editor.workingLevel;
            if (!level || !state.ENGINE.nav.path.length) return null;

            const { PACK, UNPACK } = levelUtils;
            const targetKey = PACK(target.x, target.y);
            const startState = cloneTapRouteState(state.ENGINE);
            const startKey = startState.path[startState.path.length - 1];
            if (targetKey === startKey) return [];

            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const maxExpansions = options.maxExpansions || Math.max(200, level.grid.w * level.grid.h * 40);
            const queue = [{ state: startState, inputs: [] }];
            const seen = new Set([`${startKey}|${startState.path.join('.')}`]);
            let expansions = 0;

            while (queue.length > 0 && expansions < maxExpansions) {
                const cur = queue.shift();
                expansions++;
                const headKey = cur.state.path[cur.state.path.length - 1];
                const head = UNPACK(headKey);
                for (const [dx, dy] of dirs) {
                    const nk = PACK(head.x + dx, head.y + dy);
                    const sim = simulateTapRouteStep(cur.state, nk, level);
                    if (!sim || sim.result === 'goose' || sim.result === 'detonate') continue;
                    const newInputs = [...cur.inputs, nk];
                    if (nk === targetKey) return newInputs;
                    const nextKey = sim.state.path[sim.state.path.length - 1];
                    if (nextKey === targetKey) return newInputs;
                    const sig = `${nextKey}|${sim.state.path.join('.')}`;
                    if (seen.has(sig)) continue;
                    seen.add(sig);
                    queue.push({ state: sim.state, inputs: newInputs });
                }
            }
            return null;
        },
    };
}
