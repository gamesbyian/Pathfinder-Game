import { getAttemptConfigs } from './attempts.js';
import { detectArchetype } from './archetype.js';
import { buildDistMap } from './distance.js';
import { normalizeRawLevelV2 } from './normalization.js';
import { prepLevel } from './prep.js';

export function createSolverTestingApi() {
    return Object.freeze({
        normalizeRawLevel: normalizeRawLevelV2,
        buildDistMap,
        detectArchetype,
        getAttemptConfigs,
        prepLevel,
    });
}

export const SOLVER_TESTING_API = createSolverTestingApi();
