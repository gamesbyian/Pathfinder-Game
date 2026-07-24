import { getAttemptConfigs } from './attempts.js';
import { detectArchetype } from './archetype.js';
import { buildDistMap } from './distance.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createState, getNeighbors, applyMove } from './search-state.js';
import { scoreAndSort } from './scoring.js';
import { isSolutionState } from './solution.js';
import { POLICY_PROFILES } from './policy.js';
import { PACK } from './encoding.js';
import { runAttempt, attemptConfigKey } from './orchestration.js';

/** The canonical solver analysis/debug surface (also a named Solver export). */
export function createSolverTestingApi() {
    return Object.freeze({
        normalizeRawLevel: normalizeRawLevel,
        buildDistMap,
        detectArchetype,
        getAttemptConfigs,
        prepLevel,
        // Search-core primitives — added for witness-trace replay tooling (scripts/stress/
        // witness-divergence.mjs): lets external tooling walk a known path through the exact
        // getNeighbors/scoreAndSort code the real search uses, without duplicating any of it.
        createState,
        getNeighbors,
        applyMove,
        scoreAndSort,
        isSolutionState,
        POLICY_PROFILES,
        PACK,
        // Single-attempt primitive + its canonical key format — added for scripts/method-probe.mjs
        // (run ONE attempt config against ONE gate directly, bypassing the full ladder/probe/
        // fallback machinery, for fast per-method iteration signal offline).
        runAttempt,
        attemptConfigKey,
    });
}

export const SOLVER_TESTING_API = createSolverTestingApi();
