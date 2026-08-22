/**
 * technique-census: shared single-cell execution logic.
 *
 * Extracted from technique-census.mjs (2026-08-19) so both the sequential path (--workers=1, or a
 * local/dev run) and the worker-pool path (technique-census-worker.mjs, --workers>1) run the exact
 * same code — a cell's outcome must not depend on which of the two ever executed it. Runs every
 * listed technique key in a cell, per gate, sharing the cell's node budget cumulatively (same
 * early-return-on-first-success shape as method-probe.mjs's own probeLevel, generalized from a
 * fixed --only list to a per-cell technique list and an optional ablation override).
 *
 * Usage:
 *   import { createCellRunner } from './technique-census-cell.mjs';
 *   const { runCell } = await createCellRunner();
 *   const result = await runCell(cell);
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';

export async function createCellRunner() {
    installBrowserStubs();
    const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
    const { TEMPLATES, POLICY_PROFILES } = await import('../modules/solver/policy.js');
    const Solver = createSolver();
    const { prepLevel, runAttempt, attemptConfigKey, normalizeAblationConfig } = SOLVER_TESTING_API;
    const parseAttemptConfigKey = makeAttemptConfigKeyParser({ TEMPLATES, POLICY_PROFILES, attemptConfigKey });

    // Corpus files: loaded lazily and cached, one parse per corpus regardless of how many cells
    // reference it (a shard's cells can span all 3 corpora across different tiers). Read-only. In
    // the worker-pool path each worker process gets its own cache (separate process = separate
    // module instance), so this is per-worker, not shared across workers — each corpus is at most
    // a few MB, parsed once per worker, not per cell.
    const CORPUS_FILES = { published: 'data/levels.json', corpus1: 'data/stress/stress-levels.json', corpus2: 'data/stress/stress-levels-random.json' };
    const corpusCache = new Map();
    function getRawLevel(corpus, pos) {
        if (!corpusCache.has(corpus)) {
            const raw = JSON.parse(readFileSync(path.resolve(CORPUS_FILES[corpus]), 'utf8'));
            corpusCache.set(corpus, Array.isArray(raw) ? raw : raw.levels);
        }
        return corpusCache.get(corpus)[pos - 1];
    }

    const parsedConfigCache = new Map(); // technique key -> parsed AttemptConfig (parsing is pure, safe to cache across cells)
    function getParsedConfig(key) {
        if (!parsedConfigCache.has(key)) parsedConfigCache.set(key, parseAttemptConfigKey(key));
        return parsedConfigCache.get(key);
    }

    async function runCell(cell) {
        const entry = getRawLevel(cell.corpus, cell.levelPos);
        const { id: _id, stressMeta: _sm, ...rawLevel } = entry;
        const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        const prep = prepLevel(level);
        prep._cfg = cell.ablation
            ? normalizeAblationConfig(Object.fromEntries([
                ...(cell.ablation.enable ?? []).map(f => [f, true]),
                ...(cell.ablation.disable ?? []).map(f => [f, false]),
            ]))
            : null;
        prep._metrics = { nodesExpanded: 0 };
        prep._forcedFirstStepKey = null;
        prep._forcedPortalExitKey = null;

        const configs = cell.techniqueKeys.map(key => ({ key, config: getParsedConfig(key) }));
        const attempts = [];
        const gateSummaries = [];
        let solution = null;
        let winningKey = null;
        let winningGate = null;
        const startTime = Date.now();
        // FAIR PER-GATE NODE SHARE, not gate-outer exhaustion — see the file header for why (a
        // single shared budget across gates would recreate ladder gate-starvation inside the very
        // experiment meant to eliminate it; published carries real exposure, 54/160 levels have
        // 2-3 gates). Mirrors runGateSerialAttempts's own "recompute remaining / gatesLeft at each
        // gate boundary" pattern: an early-exhausted gate's unspent share rolls forward.
        outer:
        for (let gi = 0; gi < level.gateKeys.length; gi++) {
            const gateKey = level.gateKeys[gi];
            const remainingTotal = cell.nodeBudget === Infinity ? Infinity : Math.max(0, cell.nodeBudget - prep._metrics.nodesExpanded);
            if (remainingTotal <= 0) break outer;
            const gatesLeft = level.gateKeys.length - gi;
            const gateShare = remainingTotal === Infinity ? Infinity : Math.floor(remainingTotal / gatesLeft);
            const gateStartNodes = prep._metrics.nodesExpanded;
            const gateCeiling = gateShare === Infinity ? Infinity : gateStartNodes + gateShare;
            for (const { key, config } of configs) {
                if (prep._metrics.nodesExpanded >= gateCeiling) break;
                const remaining = gateCeiling === Infinity ? Infinity : Math.max(0, gateCeiling - prep._metrics.nodesExpanded);
                const r = await runAttempt(gateKey, level, prep, config, cell.budgetMs, Date.now(), null, remaining);
                attempts.push({ configKey: key, gateKey, ...r.attempt });
                if (r.path) { solution = r.path; winningKey = key; winningGate = gateKey; break outer; }
            }
            gateSummaries.push({ gateKey, nodesExpanded: prep._metrics.nodesExpanded - gateStartNodes, share: gateShare === Infinity ? null : gateShare });
        }

        const nodesExpanded = prep._metrics.nodesExpanded;
        const totalMs = Date.now() - startTime;
        let refereeValid = null;
        if (solution) refereeValid = Solver.validateCandidatePath(level, solution).ok;
        const ok = !!solution && refereeValid === true;
        // Derived status vocabulary, aligned with the rest of the batch-tooling family
        // (level-blind-capability-sweep.mjs / portfolio-solve-sweep.mjs): 'success' | 'node-budget-
        // reached' | 'exhausted' (every technique in the cell terminated on its own, under budget) |
        // 'referee-invalid' (a rare, load-bearing signal: the solver found a path SOLVER-mode rules
        // accept but PLAY-mode rules don't — see CLAUDE.md's MoveContext.SOLVER note — never silently
        // dropped as a plain failure).
        const status = ok ? 'success'
            : (solution && refereeValid === false) ? 'referee-invalid'
            : (nodesExpanded >= cell.nodeBudget) ? 'node-budget-reached'
            : 'exhausted';

        return {
            cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelId: entry.id ?? null, levelPos: cell.levelPos,
            techniqueKeys: cell.techniqueKeys, pairLabel: cell.pairLabel ?? null, flagExperiment: cell.flagExperiment ?? null,
            ablation: cell.ablation ?? null, nodeBudget: cell.nodeBudget,
            ok, status, refereeValid, winningConfigKey: winningKey, winningGate,
            // Per-gate breakdown — only when there's more than one gate to break down (the overwhelming
            // majority of cells are single-gate; a 1-element array there is pure redundancy with the
            // fields above). Answers "which gate got cut off at its own share vs. genuinely exhausted"
            // at finer grain than the cell-level `status` aggregate above.
            gateSummaries: level.gateKeys.length > 1 ? gateSummaries : undefined,
            nodesExpanded, totalMs,
            // Full per-attempt breakdown (needed by provenanceFromSolveResult at combine time) is kept
            // only for a genuine solve — most cells will be negative results on an unsolved level, and
            // the aggregate above is what every downstream analysis actually needs from those; keeping
            // every attempt record for all of them would multiply artifact size for no benefit.
            attempts: ok ? attempts : undefined,
            solution: ok ? solution : undefined,
        };
    }

    /** Same as runCell, but never throws — a cell-level exception becomes an error-shaped result row
     *  instead of aborting whatever is driving it (the sequential loop already caught this inline;
     *  the worker-pool path needs the SAME isolation, since runWorkerPool fails the ENTIRE pool run
     *  if any task's handler throws — one cell's crash must not lose every other in-flight result). */
    async function runCellSafe(cell) {
        try { return await runCell(cell); }
        catch (err) {
            return { cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelPos: cell.levelPos, ok: false, status: 'error', error: err?.message ?? String(err) };
        }
    }

    return { runCell, runCellSafe };
}
