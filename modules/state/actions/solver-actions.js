// @ts-check
// Solver slice state actions (engineState.solver.*): in-game solver run lifecycle.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} [controller] @returns {any} */
export function startSolverRun(stateOrEngine, controller) {
    const engineState = resolveEngineState(stateOrEngine);
    const solver = engineState?.solver;
    if (!solver) return null;
    solver.controller = controller;
    solver.abortRequested = false;
    return solver;
}

/** @param {any} stateOrEngine @returns {any} */
export function requestSolverAbort(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const solver = engineState?.solver;
    if (!solver?.controller) return null;
    solver.abortRequested = true;
    return solver;
}

/** @param {any} stateOrEngine @returns {any} */
export function endSolverRun(stateOrEngine) {
    return startSolverRun(stateOrEngine, null);
}
