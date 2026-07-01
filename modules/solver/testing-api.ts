import { getAttemptConfigs } from './attempts.js';
import { detectArchetype } from './archetype.js';
import { buildDistMap } from './distance.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';

/** The canonical solver analysis/debug surface (also a named Solver export). */
export function createSolverTestingApi() {
    return Object.freeze({
        normalizeRawLevel: normalizeRawLevel,
        buildDistMap,
        detectArchetype,
        getAttemptConfigs,
        prepLevel,
    });
}

export const SOLVER_TESTING_API = createSolverTestingApi();
