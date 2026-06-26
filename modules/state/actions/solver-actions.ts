// Solver slice state actions (engineState.solver.*): in-game solver run lifecycle.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';

type SolverController = { abort: () => void } | null;

export function startSolverRun(stateOrEngine: StateOrEngine, controller: SolverController) {
    const engineState = resolveEngineState(stateOrEngine);
    const solver = engineState?.solver;
    if (!solver) return null;
    solver.controller = controller;
    solver.abortRequested = false;
    return solver;
}

export function requestSolverAbort(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const solver = engineState?.solver;
    if (!solver?.controller) return null;
    solver.abortRequested = true;
    return solver;
}

export function endSolverRun(stateOrEngine: StateOrEngine) {
    return startSolverRun(stateOrEngine, null);
}
