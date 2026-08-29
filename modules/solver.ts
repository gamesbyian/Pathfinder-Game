// Solver.ts — the Pathfinder hint solver (thin public facade; the search lives in modules/solver/).
// A flat attempt loop: per gate × config, run DFS or beam (see solver/attempts.ts for the
// feature-keyed policy and solver/orchestration.ts for budget allocation). Supports all level
// mechanics: portals (forced), regular + flipping filters, geese, false goals, must-pass,
// must-cross, surround/turn landmarks, and exact length/intersection targets.

import { validateCandidatePath } from './domain/path-validator.js';
import { normalizeRawLevel } from './solver/normalization.js';
import { prepLevel } from './solver/prep.js';
import { createVarietySearch as makeVarietySearch } from './solver/variety-search.js';
import { getFalseGoalTriggerSearchBudgetMs, solveLevel } from './solver/orchestration.js';
import { SOLVER_TESTING_API } from './solver/testing-api.js';
import { findTriggerableFalseGoalCells, classifyFalseGoalTriggerability } from './solver/false-goal-trigger-search.js';
import type { PrepareLevelForSolverOptions, SolverApi } from './ports.js';
import type { NormalizedLevel } from './domain/types.js';

// ─── Solver policy, encoding, distance, and solution primitives live in modules/solver/ ─

// ─── Level normalisation lives in modules/solver/normalization.js ───────────

// ─── Pre-computation lives in modules/solver/prep.js ───────────────────────

// ─── Search state and neighbour generation live in modules/solver/search-state.js ─

// ─── Lower-bound pruning lives in modules/solver/lower-bounds.js ───────────

// ─── Connectivity/topology pruning lives in modules/solver/topology.js ─────

// ─── False-goal trigger search lives in modules/solver/false-goal-trigger-search.js ─────────────────

// ─── Move scoring lives in modules/solver/scoring.js ─────────────────────

// ─── Solution checks live in modules/solver/solution.js ─────────────────────

// ─── DFS/LDS/beam search loops live in modules/solver/search.js ─────────

// ─── Score sorting lives in modules/solver/scoring.js ────────────────────

// ─── Attempt ordering lives in modules/solver/attempts.js ──────────────────

// ─── Main solver orchestration lives in modules/solver/orchestration.js ───

// ─── Public API ───────────────────────────────────────────────────────────────

function createSolver(): SolverApi {
    const prepareLevelForSolver = (
        rawLevel: unknown,
        opts: PrepareLevelForSolverOptions = {},
    ): NormalizedLevel => {
        if (!rawLevel || typeof rawLevel !== 'object') throw new Error('Solver: missing level');
        const candidate = rawLevel as Record<string, unknown>;
        // Raw normalisation — applied when opts.source === 'raw' or the level is in raw wire format.
        if ((opts.source === 'raw') || (candidate.goal && Array.isArray(candidate.gates) && !Array.isArray(candidate.gateKeys))) {
            return normalizeRawLevel(rawLevel, opts.levelNumber ?? opts.level ?? null);
        }
        return rawLevel as NormalizedLevel;
    };


    return {
        prepareLevelForSolver: prepareLevelForSolver,
        solveLevel,
        findTriggerableFalseGoalCells: (level: any, opts: any = {}) => findTriggerableFalseGoalCells(level, opts),
        classifyFalseGoalTriggerability: (level: any, result: any) => classifyFalseGoalTriggerability(level, result),
        getFalseGoalTriggerSearchBudgetMs,
        validateCandidatePath,
        createVarietySearch: (level: any, existingHints: number[][], config: any) =>
            makeVarietySearch(level, prepLevel(level), existingHints, config),
    };
}

// Canonical test/ablation analysis surface. Lives on its own named export rather than on
// the solver instance so it is not part of the runtime solver's public shape. (The former
// `_normalizeRawLevel`/`_buildDistMap`/`_classifyRoutingRegime`/`_getAttemptConfigs`/`_prepLevel`
// underscore aliases on the createSolver() instance were removed — import from here.)
export { createSolver, SOLVER_TESTING_API };
