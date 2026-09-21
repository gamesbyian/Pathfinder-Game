#!/usr/bin/env node
/**
 * Batch-digestion fixed-cost probe.
 *
 * Measures the level-shaped fixed work that happens before/at solveLevel's search boundary:
 * raw schema validation, normalization, and prepLevel(). Search is OFF by default so opportunity
 * sizing does not require an expensive corpus run. Pass --solve to additionally measure the
 * ordinary solveLevel wall time (which intentionally includes its own fresh prepLevel call).
 *
 * Run bundled so the runtime matches other solver performance tools:
 *
 *   node scripts/run-bundled.mjs scripts/solver-batch-cost-probe.mjs -- \
 *     --corpus=published --count=160 --repeats=5 --out=/tmp/batch-cost-published.json
 *
 *   node scripts/run-bundled.mjs scripts/solver-batch-cost-probe.mjs -- \
 *     --corpus=corpus2 --count=24 --stride=70 --repeats=5 --solve \
 *     --work-budget=250000 --budget-ms=600000 --out=/tmp/batch-cost-c2.json
 *
 * This is reconnaissance, not an A/B performance gate. Nested stage timers perturb tiny stages;
 * use repeated medians and compare orders of magnitude, not sub-percent differences.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const flags = new Set(args.filter(a => !a.includes('=')));

const corpus = argMap.get('--corpus') || 'published';
const count = Math.max(1, Number(argMap.get('--count') || 40));
const start = Math.max(1, Number(argMap.get('--start') || 1));
const stride = Math.max(1, Number(argMap.get('--stride') || 1));
const repeats = Math.max(1, Number(argMap.get('--repeats') || 5));
const solve = flags.has('--solve');
const budgetMs = Number(argMap.get('--budget-ms') || 600000);
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : Infinity;
const outFile = argMap.get('--out') || null;

const CORPORA = {
    published: 'data/levels.json',
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
};
if (!(corpus in CORPORA)) {
    console.error(`Unknown --corpus=${corpus}; expected ${Object.keys(CORPORA).join('|')}`);
    process.exit(2);
}

installBrowserStubs();
const [{ validateRawLevel }, { normalizeRawLevel }, { prepLevel }, { solveLevel }] = await Promise.all([
    import('../modules/domain/level-schema.js'),
    import('../modules/solver/normalization.js'),
    import('../modules/solver/prep.js'),
    import('../modules/solver/orchestration.js'),
]);

const root = new URL('..', import.meta.url).pathname;
const parsed = JSON.parse(readFileSync(path.join(root, CORPORA[corpus]), 'utf8'));
const rawLevels = Array.isArray(parsed) ? parsed : parsed.levels;
if (!Array.isArray(rawLevels)) throw new Error(`${CORPORA[corpus]} has no level array`);

const selected = [];
const idSpec = argMap.get('--ids');
if (idSpec) {
    const wanted = new Set(idSpec.split(',').map(s => s.trim()).filter(Boolean));
    rawLevels.forEach((raw, index) => {
        if (raw?.id && wanted.has(raw.id)) selected.push({ position: index + 1, raw });
    });
    const found = new Set(selected.map(row => row.raw.id));
    const missing = [...wanted].filter(id => !found.has(id));
    if (missing.length > 0) {
        console.error(`Unknown level id(s): ${missing.join(', ')}`);
        process.exit(2);
    }
} else {
    for (let position = start; position <= rawLevels.length && selected.length < count; position += stride) {
        selected.push({ position, raw: rawLevels[position - 1] });
    }
}

function now() {
    return process.hrtime.bigint();
}
function elapsedMs(t0) {
    return Number(process.hrtime.bigint() - t0) / 1e6;
}
function median(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function quantile(values, q) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
    return sorted[index];
}
function summarize(values) {
    return {
        n: values.length,
        totalMs: +values.reduce((a, b) => a + b, 0).toFixed(3),
        medianMs: +(median(values) ?? 0).toFixed(4),
        p90Ms: +(quantile(values, 0.90) ?? 0).toFixed(4),
        maxMs: +(Math.max(...values, 0)).toFixed(4),
    };
}

const rows = [];
const allValidation = [];
const allNormalization = [];
const allPrep = [];
const allSolve = [];

for (const { position, raw } of selected) {
    const validationMs = [];
    const normalizationMs = [];
    const prepMs = [];
    const solveMs = [];
    let lastSolve = null;

    for (let repeat = 0; repeat < repeats; repeat++) {
        let t0 = now();
        const validation = validateRawLevel(raw);
        validationMs.push(elapsedMs(t0));
        const solverBoundaryErrors = validation.errors.filter(error => !error.startsWith('grid must be square '));
        if (solverBoundaryErrors.length > 0) {
            throw new Error(`Invalid raw level ${raw?.id ?? position}: ${solverBoundaryErrors.join('; ')}`);
        }

        t0 = now();
        const level = normalizeRawLevel(raw, position);
        normalizationMs.push(elapsedMs(t0));

        t0 = now();
        // Intentionally discard the prep after timing it. solveLevel(), when requested below,
        // creates its own fresh prep exactly as production currently does.
        prepLevel(level);
        prepMs.push(elapsedMs(t0));

        if (solve) {
            t0 = now();
            lastSolve = await solveLevel(level, {
                timeBudgetMs: budgetMs,
                nodeBudget,
                ...(workBudget !== undefined ? { workBudget } : {}),
                disableExtraBudgetPasses: true,
            });
            solveMs.push(elapsedMs(t0));
        }
    }

    allValidation.push(...validationMs);
    allNormalization.push(...normalizationMs);
    allPrep.push(...prepMs);
    allSolve.push(...solveMs);

    const row = {
        position,
        id: raw?.id ?? null,
        validation: summarize(validationMs),
        normalization: summarize(normalizationMs),
        prep: summarize(prepMs),
        ...(solve ? {
            solve: summarize(solveMs),
            solveOutcome: {
                ok: !!lastSolve?.ok,
                status: lastSolve?.status ?? null,
                workSpent: lastSolve?.workSpent ?? null,
                nodesExpanded: lastSolve?.nodesExpanded ?? null,
            },
        } : {}),
    };
    rows.push(row);

    const fixedMedian = row.validation.medianMs + row.normalization.medianMs + row.prep.medianMs;
    console.log(
        `  ${corpus} L${position}${raw?.id ? ` (${raw.id})` : ''}` +
        ` fixed≈${fixedMedian.toFixed(3)}ms` +
        ` [validate=${row.validation.medianMs.toFixed(3)} normalize=${row.normalization.medianMs.toFixed(3)} prep=${row.prep.medianMs.toFixed(3)}]` +
        (solve ? ` solve=${row.solve.medianMs.toFixed(1)}ms ${row.solveOutcome.ok ? '✓' : '✗'}` : '')
    );
}

const summary = {
    corpus,
    selection: { count: selected.length, start, stride, ids: idSpec || null },
    repeats,
    solve,
    solveOptions: solve ? {
        budgetMs,
        workBudget: workBudget ?? null,
        nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
        disableExtraBudgetPasses: true,
    } : null,
    validation: summarize(allValidation),
    normalization: summarize(allNormalization),
    prep: summarize(allPrep),
    ...(solve ? { solveWall: summarize(allSolve) } : {}),
};

const fixedTotal = summary.validation.totalMs + summary.normalization.totalMs + summary.prep.totalMs;
console.log(
    `TOTAL samples=${selected.length * repeats}: fixed-stage measured ${fixedTotal.toFixed(2)}ms` +
    ` (validate ${summary.validation.totalMs.toFixed(2)}, normalize ${summary.normalization.totalMs.toFixed(2)}, prep ${summary.prep.totalMs.toFixed(2)})`
);
if (solve) console.log(`Solve wall measured: ${summary.solveWall.totalMs.toFixed(1)}ms`);

if (outFile) {
    mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    writeFileSync(outFile, JSON.stringify({
        generatedAt: new Date().toISOString(),
        summary,
        rows,
    }, null, 2) + '\n');
    console.log(`Wrote ${outFile}`);
}
