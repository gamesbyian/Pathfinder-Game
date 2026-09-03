#!/usr/bin/env node
/**
 * Build a technique-census-compatible plan.json for a fixed-work static-portfolio comparison.
 *
 * This is gate-sequence (C) rung 2's bounded-implementation step ("construct a small fixed-work
 * static portfolio", docs/solver-scheduling-policy.md's complexity ladder), made cheap by an
 * existing capability: technique-census-cell.mjs's `runCell` already runs an arbitrary ORDERED LIST
 * of technique keys against one level under one cumulative shared work budget, stopping at the
 * first solve (see that file's own header comment) — the exact semantics a real sequential
 * portfolio needs. No solver/production code changes; this only constructs plan cells that reuse
 * that existing, already-tested execution path (the same one EW1's own pricing snapshot used).
 *
 * Each population level gets one cell per named arm, all sharing the same --work-budget so results
 * are directly comparable. A typical use: an arm named e.g. "full-menu" listing all technique keys
 * (a fixed-work re-run of the whole menu) and a "portfolio-N" arm listing only a candidate subset,
 * both in the SAME technique order so they can only diverge once the smaller arm's list is
 * exhausted — isolating exactly the effect of dropping the tail, not a reordering effect.
 *
 * Usage:
 *   node scripts/build-static-portfolio-plan.mjs \
 *     --population=reports/stress/ew1/33156541827-pricing-snapshot.json \
 *     --arms=path/to/arms.json \
 *     --work-budget=67000000 \
 *     [--per-technique-work-cap=10000000] \
 *     [--per-technique-work-cap-map=path/to/cap-map.json] \
 *     --out=path/to/plan.json
 *
 * --population accepts either an EW1-shaped pricing snapshot ({ results: [{ levelId, corpus,
 * levelPos }, ...] }, deduplicated by levelId) or a plain JSON array of { corpus, levelPos } rows.
 * --arms is a JSON object mapping arm name -> ordered array of technique-identity-key strings
 * (the same compact vocabulary as EW1 cell techniqueKeys / modules/solver/attempt-identity.mjs).
 *
 * --per-technique-work-cap (optional): sets technique-census-cell.mjs's `cell.perTechniqueWorkCap`
 * on every generated cell, so no single technique in an arm's list can consume more than this share
 * of --work-budget regardless of how the rest of the list is ordered. Omit this for the original
 * naive first-come-first-served semantics (see reports/2026-09-02-static-portfolio-construction-
 * pilot.md for why that naive form starved every position after a non-terminating technique like
 * repair, independent of --work-budget's own size).
 *
 * --per-technique-work-cap-map (optional, 2026-09-03): a path to a JSON file mapping
 * technique-key -> cap, forwarded verbatim as technique-census-cell.mjs's own
 * `cell.perTechniqueWorkCapByKey` on every generated cell. Use this instead of (or alongside)
 * --per-technique-work-cap when different techniques should get different protected shares — e.g. a
 * tranche-weighted allocation sized from each technique's own EW1/production cost, rather than one
 * flat cap for every technique in the menu. A technique absent from the map falls back to
 * --per-technique-work-cap (or uncapped, if that is also omitted); see technique-census-cell.mjs's
 * own header comment for the exact precedence/fallback contract.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ATTEMPT_BUDGET_MS = 600000;

/**
 * @param {{ corpus: string, levelPos: number, levelId?: string }[]} population
 * @param {Record<string, string[]>} arms
 * @param {number} workBudget
 * @param {number | null} [perTechniqueWorkCap] optional; see this file's header comment
 * @param {number} [attemptBudgetMs] per-attempt wall-safety deadline (non-binding by default;
 *   work_budget/perTechniqueWorkCap govern allocation) — defaults to ATTEMPT_BUDGET_MS
 * @param {Record<string, number> | null} [perTechniqueWorkCapByKey] optional; see this file's own
 *   header comment and technique-census-cell.mjs's own header comment for the precedence contract
 * @returns {{ budgetProtocol: string, equalCostAcrossTechniques: boolean, cells: object[] }}
 */
export function buildPlan(population, arms, workBudget, perTechniqueWorkCap = null, attemptBudgetMs = ATTEMPT_BUDGET_MS, perTechniqueWorkCapByKey = null) {
    if (!Array.isArray(population) || population.length === 0) {
        throw new Error('buildPlan: population must be a non-empty array');
    }
    const armNames = Object.keys(arms);
    if (armNames.length === 0) throw new Error('buildPlan: arms must have at least one named arm');
    for (const [name, keys] of Object.entries(arms)) {
        if (!Array.isArray(keys) || keys.length === 0) throw new Error(`buildPlan: arm "${name}" must be a non-empty technique-key array`);
    }
    const cells = [];
    for (const level of population) {
        for (const armName of armNames) {
            cells.push({
                cellId: `SP-${level.corpus}-${level.levelPos}-${armName}`,
                tier: 'STATIC-PORTFOLIO',
                corpus: level.corpus,
                levelPos: level.levelPos,
                levelId: level.levelId ?? null,
                variantLabel: armName,
                techniqueKeys: arms[armName],
                workBudget,
                budgetMs: attemptBudgetMs,
                ablation: null,
                ...(Number.isFinite(perTechniqueWorkCap) ? { perTechniqueWorkCap } : {}),
                ...(perTechniqueWorkCapByKey && Object.keys(perTechniqueWorkCapByKey).length > 0 ? { perTechniqueWorkCapByKey } : {}),
            });
        }
    }
    return { budgetProtocol: 'static-portfolio-shared-work', equalCostAcrossTechniques: false, cells };
}

function loadPopulation(pop) {
    if (Array.isArray(pop)) return pop;
    if (Array.isArray(pop.results)) {
        const byLevel = new Map();
        for (const r of pop.results) {
            if (!byLevel.has(r.levelId)) byLevel.set(r.levelId, { corpus: r.corpus, levelPos: r.levelPos, levelId: r.levelId });
        }
        return [...byLevel.values()];
    }
    throw new Error('loadPopulation: unrecognized population shape (expected an array or an EW1-shaped { results: [...] })');
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const args = process.argv.slice(2);
    const argMap = new Map(args.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
    const root = new URL('..', import.meta.url).pathname;
    const populationPath = argMap.get('--population');
    const armsPath = argMap.get('--arms');
    const workBudget = Number(argMap.get('--work-budget'));
    const perTechniqueWorkCap = argMap.has('--per-technique-work-cap') ? Number(argMap.get('--per-technique-work-cap')) : null;
    const perTechniqueWorkCapMapPath = argMap.get('--per-technique-work-cap-map');
    const attemptBudgetMs = argMap.has('--attempt-budget-ms') ? Number(argMap.get('--attempt-budget-ms')) : ATTEMPT_BUDGET_MS;
    const outFile = argMap.get('--out');
    if (!populationPath || !armsPath || !Number.isFinite(workBudget) || !outFile) {
        console.error('Usage: --population=<path> --arms=<path> --work-budget=<number> [--per-technique-work-cap=<number>] [--per-technique-work-cap-map=<path>] [--attempt-budget-ms=<number>] --out=<path>');
        process.exit(1);
    }
    const population = loadPopulation(JSON.parse(readFileSync(path.resolve(root, populationPath), 'utf8')));
    const arms = JSON.parse(readFileSync(path.resolve(root, armsPath), 'utf8'));
    const perTechniqueWorkCapByKey = perTechniqueWorkCapMapPath
        ? JSON.parse(readFileSync(path.resolve(root, perTechniqueWorkCapMapPath), 'utf8')) : null;
    const plan = buildPlan(population, arms, workBudget, perTechniqueWorkCap, attemptBudgetMs, perTechniqueWorkCapByKey);

    mkdirSync(path.dirname(path.resolve(root, outFile)), { recursive: true });
    writeFileSync(path.resolve(root, outFile), JSON.stringify(plan, null, 2) + '\n');
    console.log(`Wrote ${outFile}: ${plan.cells.length} cells (${population.length} levels x ${Object.keys(arms).length} arms), workBudget=${workBudget}`
        + (Number.isFinite(perTechniqueWorkCap) ? `, perTechniqueWorkCap=${perTechniqueWorkCap}` : '')
        + (perTechniqueWorkCapByKey ? `, perTechniqueWorkCapByKey keys=${Object.keys(perTechniqueWorkCapByKey).length}` : '') + `, attemptBudgetMs=${attemptBudgetMs}`);
}
