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
 * cell.workBudget (2026-08-28, opt-in, additive): when a cell supplies a finite `workBudget`
 * instead of/alongside `nodeBudget`, this shares/divides canonical WORK (see
 * modules/solver/work-meter.ts) across gates/configs the exact same way the default mode divides
 * NODES, mirroring method-probe.mjs's own `--work-budget` deterministic mode. This is the
 * equal-work census execution capability docs/solver-budget-determinism.md's "module-global
 * discovery work meter"/"equal-work technique census execution" debt items call for — it makes a
 * directly cross-technique-priced action map possible without discarding the existing node-depth
 * curves (every existing node-budget-only cell is completely unaffected: see `useWork` below).
 * Building an actual equal-work plan TIER (build-technique-census-plan.mjs population/scale
 * choices) and wiring combine-technique-census-shards.mjs's summary buckets for the new
 * work-budget-reached/deadline-truncated statuses are deliberately NOT done here — population/
 * scale is itself a decision-bearing research choice needing its own premise/pilot, not plumbing.
 * See reports/2026-08-28-discovery-work-meter-session-scope-fix.md and the queue's item #2.
 *
 * cell.perTechniqueWorkCap (2026-09-02, opt-in, additive, work-mode only): narrows every individual
 * technique attempt's own share of the gate ceiling to at most this many work units, so one
 * non-naturally-terminating technique (repair right-censors at whatever cap it is given rather than
 * exhausting) cannot silently consume an entire shared cell.workBudget and starve every later
 * technique in cell.techniqueKeys regardless of budget size. Only ever narrows an attempt's cap
 * (`Math.min(remaining, perTechniqueWorkCap)`), never widens it; omitting the field reproduces the
 * exact pre-existing gate-ceiling-only math. See reports/2026-09-02-static-portfolio-construction-
 * pilot.md for the motivating finding and scripts/build-static-portfolio-plan.mjs for a consumer.
 *
 * cell.perTechniqueWorkCapByKey (2026-09-03, opt-in, additive, work-mode only): a
 * `{ [techniqueKey]: cap }` map giving individual techniques their OWN cap instead of one flat
 * `perTechniqueWorkCap` shared by every technique in the cell. A technique whose canonical key is
 * present here uses that entry's cap; every other technique falls back to `perTechniqueWorkCap`
 * (which may itself be absent, reproducing the pre-existing gate-ceiling-only math for that
 * technique). This exists because a flat per-technique cap cannot express a tranche-weighted
 * allocation (e.g. a cheap self-exhausting beam needs far less protected room than a deep DFS/IDA/
 * repair continuation — see docs/solver-scheduling-policy.md's tranche guidance and
 * docs/solver-budget-determinism.md's "Cap and tranche discipline") without either starving the
 * deep techniques or wastefully over-provisioning the cheap ones. Purely additive: a cell that never
 * sets this field is completely unaffected (falls through to `perTechniqueWorkCap`/uncapped exactly
 * as before this field existed), and the per-key cap composes with the existing gate-ceiling/
 * work-budget math the same way `perTechniqueWorkCap` already does — it is still only ever the
 * narrower of the resolved per-technique cap and the gate's own remaining share that binds.
 *
 * Usage:
 *   import { createCellRunner } from './technique-census-cell.mjs';
 *   const { runCell } = await createCellRunner();
 *   const result = await runCell(cell);
 *
 * `runAttemptForTesting` (test-only, mirrors orchestration.ts's solveLevel `attemptSearchForTesting`
 * injection point): substitutes the real solver's runAttempt with a caller-supplied stub, e.g. to
 * force a deterministic `outcome: 'timed-out'` for the deadline-truncation branch without a real
 * wall-clock race. Never supplied by any production caller (technique-census.mjs/-worker.mjs); real
 * runs always get SOLVER_TESTING_API's own runAttempt.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';

export async function createCellRunner({ runAttemptForTesting } = {}) {
    installBrowserStubs();
    const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
    const { STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES } = await import('../modules/solver/policy.js');
    const Solver = createSolver();
    const { prepLevel, attemptConfigKey, normalizeAblationConfig } = SOLVER_TESTING_API;
    const runAttempt = runAttemptForTesting ?? SOLVER_TESTING_API.runAttempt;
    const parseAttemptConfigKey = makeAttemptConfigKeyParser({ STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES, attemptConfigKey });

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

        // See this file's header comment. `Number.isFinite` (not just truthy) so an explicit
        // `workBudget: Infinity` — which nothing currently sends, but which would be meaningless as
        // "cap by work" — falls back to ordinary node-budget mode rather than silently no-capping.
        const useWork = Number.isFinite(cell.workBudget);
        prep._attemptBudgetTelemetry = useWork;
        const workStart = prep._workMeter.units;
        const spentUnits = () => useWork ? (prep._workMeter.units - workStart) : prep._metrics.nodesExpanded;
        const totalBudget = useWork ? cell.workBudget : cell.nodeBudget;

        const configs = cell.techniqueKeys.map(rawKey => { const config = getParsedConfig(rawKey); return { key: attemptConfigKey(config), config }; });
        const canonicalTechniqueKeys = configs.map(({ key }) => key);
        const attempts = [];
        const gateSummaries = [];
        let solution = null;
        let winningKey = null;
        let winningGate = null;
        // Only ever set (and only ever checked) in work mode — see the timed-out branch below.
        let deadlineTruncated = false;
        const startTime = Date.now();
        outer:
        for (let gi = 0; gi < level.gateKeys.length; gi++) {
            const gateKey = level.gateKeys[gi];
            const remainingTotal = totalBudget === Infinity ? Infinity : Math.max(0, totalBudget - spentUnits());
            if (remainingTotal <= 0) break outer;
            const gatesLeft = level.gateKeys.length - gi;
            const gateShare = remainingTotal === Infinity ? Infinity : Math.floor(remainingTotal / gatesLeft);
            const gateStartNodes = prep._metrics.nodesExpanded;
            const gateStartUnits = spentUnits();
            const gateCeiling = gateShare === Infinity ? Infinity : gateStartUnits + gateShare;
            for (const { key, config } of configs) {
                if (spentUnits() >= gateCeiling) break;
                const remaining = gateCeiling === Infinity ? Infinity : Math.max(0, gateCeiling - spentUnits());
                // cell.perTechniqueWorkCap (2026-09-02, opt-in, additive): when set, no single
                // technique in cell.techniqueKeys may claim more than this share of the gate's
                // remaining work, even if nothing later in the list would otherwise ever get a turn.
                // Motivated by the static-portfolio pilot (reports/2026-09-02-static-portfolio-
                // construction-pilot.md): a naive shared budget lets a non-naturally-terminating
                // technique (e.g. repair, which right-censors at whatever cap it is given rather than
                // exhausting) consume the entire remainder regardless of budget size, starving every
                // later list position and making the technique list's own composition untestable.
                // Unused share still rolls forward to the next technique exactly as before (this only
                // ever narrows `remaining`, never widens it) — every existing caller that never sets
                // this field is completely unaffected; see this file's own equal-work-cell precedent
                // in the header comment for why an unconditional new cap dimension needs the same
                // explicit-opt-in treatment.
                //
                // cell.perTechniqueWorkCapByKey (2026-09-03, opt-in, additive) — see this file's own
                // header comment: a per-key override takes precedence over the flat perTechniqueWorkCap
                // for that one technique; every technique absent from the map falls back to the flat
                // cap (or uncapped, if that is also absent) exactly as before this field existed.
                const effectivePerTechniqueWorkCap = (cell.perTechniqueWorkCapByKey && Object.hasOwn(cell.perTechniqueWorkCapByKey, key))
                    ? cell.perTechniqueWorkCapByKey[key] : cell.perTechniqueWorkCap;
                const attemptRemaining = (useWork && Number.isFinite(effectivePerTechniqueWorkCap))
                    ? Math.min(remaining, effectivePerTechniqueWorkCap) : remaining;
                // Work mode bounds the attempt via prep._workCap (read internally by runAttempt/
                // search primitives) and passes nodeBudget=Infinity — nodesExpanded stays a
                // diagnostic remainder, not the bounding currency. `attemptRemaining` is always finite
                // here whenever useWork is true (totalBudget is finite by useWork's own precondition,
                // and every derived share/ceiling/remaining above is finite whenever totalBudget is),
                // so no Infinity-guard is needed on this assignment. Node mode is completely
                // unchanged: it still bounds via runAttempt's own nodeBudget param using `remaining`
                // directly, exactly as before this cell gained work-budget support.
                if (useWork) {
                    const attemptWorkCap = prep._workMeter.units + attemptRemaining;
                    prep._workCap = attemptWorkCap;
                    // admissible-order / ida search intentionally ignores the historical soft
                    // _workCap and only obeys _strictWorkCap inside its hot loop. Equal-work census
                    // cells are decision-bearing fixed-work experiments, so both caps must describe
                    // the same per-attempt remainder. Without this, IDA could overshoot a nominal
                    // 10M EW1 cell into hundreds of millions/billions of work while DFS/beam/repair
                    // stopped correctly, destroying cross-family comparability.
                    prep._strictWorkCap = attemptWorkCap;
                }
                const spentBeforeAttempt = spentUnits();
                const r = await runAttempt(gateKey, level, prep, config, cell.budgetMs, Date.now(), null, useWork ? Infinity : remaining);
                attempts.push({ configKey: key, gateKey, ...r.attempt });
                if (r.path) { solution = r.path; winningKey = key; winningGate = gateKey; break outer; }
                // A wall-safety timeout before this attempt's own share is exhausted right-censors
                // the cell's work evidence — mirrors method-probe.mjs's --work-budget
                // deadlineTruncated discipline (docs/solver-budget-determinism.md's "Deadline
                // truncation" rules): such a row must not be recorded as ordinary unsolved-at-budget
                // evidence. Compares against THIS ATTEMPT's own allocated share (`attemptRemaining`),
                // not the whole gate's `gateCeiling`: without cell.perTechniqueWorkCap those are
                // identical (attemptRemaining === remaining === gateCeiling - spentBeforeAttempt), so
                // this reduces to the original `spentUnits() < gateCeiling` check byte-for-byte. WITH
                // a per-technique cap, an attempt can legitimately right-censor at its own small share
                // while the gate ceiling still has plenty left for the NEXT technique — comparing
                // against gateCeiling would misclassify that ordinary hand-off as a wall-clock problem
                // and wrongly abort the whole cell instead of moving on.
                const spentThisAttempt = spentUnits() - spentBeforeAttempt;
                if (useWork && r.attempt.outcome === 'timed-out' && spentThisAttempt < attemptRemaining) {
                    deadlineTruncated = true;
                    break outer;
                }
            }
            gateSummaries.push({ gateKey, nodesExpanded: prep._metrics.nodesExpanded - gateStartNodes, share: gateShare === Infinity ? null : gateShare });
        }

        const nodesExpanded = prep._metrics.nodesExpanded;
        const workSpent = useWork ? spentUnits() : undefined;
        const totalMs = Date.now() - startTime;
        let refereeValid = null;
        if (solution) refereeValid = Solver.validateCandidatePath(level, solution).ok;
        const ok = !!solution && refereeValid === true;
        const status = ok ? 'success'
            : (solution && refereeValid === false) ? 'referee-invalid'
            : deadlineTruncated ? 'deadline-truncated'
            : useWork ? (workSpent >= cell.workBudget ? 'work-budget-reached' : 'exhausted')
            : (nodesExpanded >= cell.nodeBudget) ? 'node-budget-reached'
            : 'exhausted';

        return {
            cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelId: entry.id ?? null, levelPos: cell.levelPos,
            techniqueKeys: canonicalTechniqueKeys, variantLabel: cell.variantLabel ?? null,
            pairLabel: cell.pairLabel ?? null, flagExperiment: cell.flagExperiment ?? null,
            ablation: cell.ablation ?? null, nodeBudget: cell.nodeBudget,
            ...(useWork ? { workBudget: cell.workBudget, workSpent, deadlineTruncated } : {}),
            ...(useWork && Number.isFinite(cell.perTechniqueWorkCap) ? { perTechniqueWorkCap: cell.perTechniqueWorkCap } : {}),
            ...(useWork && cell.perTechniqueWorkCapByKey ? { perTechniqueWorkCapByKey: cell.perTechniqueWorkCapByKey } : {}),
            ok, status, refereeValid, winningConfigKey: winningKey, winningGate,
            gateSummaries: level.gateKeys.length > 1 ? gateSummaries : undefined,
            nodesExpanded, totalMs,
            // Shadow scheduling pilots need the already-produced lifecycle outcome for an
            // unsuccessful, capped attempt. Keep the historical compact result by default; this
            // opt-in only exposes existing generic telemetry and does not alter execution.
            attempts: (ok || cell.collectAttemptTelemetry === true) ? attempts : undefined,
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
                ...(Number.isFinite(cell.workBudget) ? { workBudget: cell.workBudget } : {}),
                ok: false, status: 'error', error: err?.message ?? String(err),
            };
        }
    }

    return { runCell, runCellSafe };
}
