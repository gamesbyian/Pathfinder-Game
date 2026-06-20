// SolverV2.js — Clean-room rewrite of the Pathfinder solver.
// Flat attempt loop: no cascade, no referee, no MITM, no near-closure rescue.
// Supports all level mechanics: portals (forced), regular filters, flipping filters,
// geese, false goals, must-pass, must-cross, intersections.

import { validateCandidatePath } from './domain/path-validator.js';
import { normalizeRawLevelV2 } from './solver/normalization.js';
import { getTrapSpotBudgetMs, solveLevelV2 } from './solver/orchestration.js';
import { SOLVER_TESTING_API } from './solver/testing-api.js';
import { findTrapSpotsV2 } from './solver/trap-search.js';

// ─── Solver policy, encoding, distance, and solution primitives live in modules/solver/ ─

// ─── Level normalisation lives in modules/solver/normalization.js ───────────

// ─── Pre-computation lives in modules/solver/prep.js ───────────────────────

// ─── Search state and neighbour generation live in modules/solver/search-state.js ─

// ─── Lower-bound pruning lives in modules/solver/lower-bounds.js ───────────

// ─── Connectivity/topology pruning lives in modules/solver/topology.js ─────

// ─── Trap search lives in modules/solver/trap-search.js ─────────────────

// ─── Move scoring lives in modules/solver/scoring.js ─────────────────────

// ─── Solution checks live in modules/solver/solution.js ─────────────────────

// ─── DFS/LDS/beam search loops live in modules/solver/search.js ─────────

// ─── Score sorting lives in modules/solver/scoring.js ────────────────────

// ─── Attempt ordering lives in modules/solver/attempts.js ──────────────────

// ─── Main solver orchestration lives in modules/solver/orchestration.js ───

// ─── Public API ───────────────────────────────────────────────────────────────

function createSolverV2() {
    const prepareLevelForSolverV2 = (rawLevel, opts = {}) => {
        if (!rawLevel || typeof rawLevel !== 'object') throw new Error('SolverV2: missing level');
        // Raw normalisation — applied when opts.source === 'raw' or the level is in raw wire format.
        if ((opts.source === 'raw') || (rawLevel?.goal && Array.isArray(rawLevel?.gates) && !Array.isArray(rawLevel?.gateKeys))) {
            return normalizeRawLevelV2(rawLevel, opts.levelNumber ?? opts.level ?? null);
        }
        return rawLevel;
    };

    const universalSolveLevel = (level, opts = {}) => solveLevelV2(level, opts);

    return {
        prepareLevelForSolver: prepareLevelForSolverV2,
        universalSolveLevel,
        solveLevel: universalSolveLevel,
        solve: (level, opts = {}) => solveLevelV2(level, opts),
        findTrapSpots: (level, opts = {}) => findTrapSpotsV2(level, opts),
        getTrapSpotBudgetMs,
        validateCandidatePath,
        // DEPRECATED compatibility shims — these underscore-prefixed internals are kept
        // only so existing callers don't break in one step. New code should import the
        // canonical surface instead:
        //   import { SOLVER_TESTING_API } from './SolverV2.js';   (or directly from
        //   './solver/testing-api.js'). Removal target: once the remaining CLI consumers
        // (hint-diversification.mjs, trap-search-audit.mjs, hint-weight-calibration.mjs,
        // level-boredom-report.mjs) and the alias-equivalence unit tests are migrated to
        // SOLVER_TESTING_API, delete these five properties.
        _normalizeRawLevel: SOLVER_TESTING_API.normalizeRawLevel,
        _buildDistMap: SOLVER_TESTING_API.buildDistMap,
        _detectArchetype: SOLVER_TESTING_API.detectArchetype,
        _getAttemptConfigs: SOLVER_TESTING_API.getAttemptConfigs,
        _prepLevel: SOLVER_TESTING_API.prepLevel,
    };
}

// Canonical test/ablation analysis surface. Lives on its own named export rather than
// on the solver instance so it is not part of the runtime solver's public shape. The
// underscore properties on createSolverV2()'s return value are deprecated aliases of
// these (see the block above).
export { createSolverV2, SOLVER_TESTING_API };
