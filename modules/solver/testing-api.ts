import { getAttemptConfigs } from './attempts.js';
import { classifyRoutingRegime, normalizeRoutingRegime } from './routing-regime.js';
import { buildDistMap } from './distance.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createState, getNeighbors, applyMove } from './search-state.js';
import { buildCurUrgencyContext, scoreAndSort, scoreMove } from './scoring.js';
import { isSolutionState } from './solution.js';
import { SCORING_PROFILES } from './policy.js';
import { PACK } from './encoding.js';
import { runAttempt, attemptConfigKey, normalizeAblationConfig } from './orchestration.js';
import { WinningLineageObserver, WinningPrefixIndex } from './research-lineage.js';
import { beamSearchFromGate } from './search.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import { getRealLengthFromState } from './solution.js';
import { mustCrossLowerBound, mustPassLowerBound } from './lower-bounds.js';
import { structuralSolutionFamilySignature } from '../domain/path-features.js';

/** The canonical solver analysis/debug surface (also a named Solver export). */
export function createSolverTestingApi() {
    return Object.freeze({
        normalizeRawLevel: normalizeRawLevel,
        buildDistMap,
        classifyRoutingRegime,
        normalizeRoutingRegime,
        getAttemptConfigs,
        prepLevel,
        // Search-core primitives — added for witness-trace replay tooling (scripts/stress/
        // witness-divergence.mjs): lets external tooling walk a known path through the exact
        // getNeighbors/scoreAndSort code the real search uses, without duplicating any of it.
        createState,
        getNeighbors,
        applyMove,
        scoreAndSort,
        scoreMove,
        buildCurUrgencyContext,
        isSolutionState,
        SCORING_PROFILES,
        PACK,
        // Single-attempt primitive + its canonical key format — added for scripts/method-probe.mjs
        // (run ONE attempt config against ONE gate directly, bypassing the full ladder/probe/
        // fallback machinery, for fast per-method iteration signal offline).
        runAttempt,
        attemptConfigKey,
        // The provably-correct sparse-ablation-override builder (orchestration.ts's own doc
        // comment on it explains the Proxy and why a hand-built partial object is unsafe). Exposed
        // so external tooling that needs to set prep._cfg directly — e.g. hint-divergence.mjs's
        // per-flag SCORE_* sweep — reuses the same mechanism production itself funnels every
        // opts.ablation through, instead of separately reconstructing "every flag defaults true"
        // by hand-listing modules/solver/ablation-config.ts's FEATURES (easy to get subtly wrong: an
        // earlier version of hint-divergence.mjs did, complete only for the flags its own call
        // path happened to read).
        normalizeAblationConfig,
        WinningPrefixIndex,
        WinningLineageObserver,
        beamSearchFromGate,
        evaluatePrunedMove,
        getRealLengthFromState,
        mustCrossLowerBound,
        mustPassLowerBound,
        structuralSolutionFamilySignature,
    });
}

export const SOLVER_TESTING_API = createSolverTestingApi();
