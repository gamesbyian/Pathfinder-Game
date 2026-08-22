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

    const CORPUS_FILES = { published: 'data/levels.json', corpus1: 'data/stress/stress-levels.json', corpus2: 'data/stress/stress-levels-random.json' };
    const corpusCache = new Map();
    function getRawLevel(corpus, pos) {
        if (!corpusCache.has(corpus)) {
            const raw = JSON.parse(readFileSync(path.resolve(CORPUS_FILES[corpus]), 'utf8'));
            corpusCache.set(corpus, Array.isArray(raw) ? raw : raw.levels);
        }
        return corpusCache.get(corpus)[pos - 1];
    }

    const parsedConfigCache = new Map();
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
        const status = ok ? 'success'
            : (solution && refereeValid === false) ? 'referee-invalid'
            : (nodesExpanded >= cell.nodeBudget) ? 'node-budget-reached'
            : 'exhausted';

        return {
            cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelId: entry.id ?? null, levelPos: cell.levelPos,
            techniqueKeys: cell.techniqueKeys, variantLabel: cell.variantLabel ?? null,
            pairLabel: cell.pairLabel ?? null, flagExperiment: cell.flagExperiment ?? null,
            ablation: cell.ablation ?? null, nodeBudget: cell.nodeBudget,
            ok, status, refereeValid, winningConfigKey: winningKey, winningGate,
            gateSummaries: level.gateKeys.length > 1 ? gateSummaries : undefined,
            nodesExpanded, totalMs,
            attempts: ok ? attempts : undefined,
            solution: ok ? solution : undefined,
        };
    }

    async function runCellSafe(cell) {
        try { return await runCell(cell); }
        catch (err) {
            return {
                cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelPos: cell.levelPos,
                techniqueKeys: cell.techniqueKeys, variantLabel: cell.variantLabel ?? null,
                pairLabel: cell.pairLabel ?? null, flagExperiment: cell.flagExperiment ?? null,
                ablation: cell.ablation ?? null, nodeBudget: cell.nodeBudget,
                ok: false, status: 'error', error: err?.message ?? String(err),
            };
        }
    }

    return { runCell, runCellSafe };
}
