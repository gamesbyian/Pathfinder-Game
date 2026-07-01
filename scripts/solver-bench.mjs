#!/usr/bin/env node
/**
 * Solver benchmark + regression gate (codebase-quality-followup-plan §1).
 *
 * Two jobs:
 *
 *  1. SAFETY NET. `--check` runs the full corpus in the production (default-order) path and
 *     compares the solved set against the committed baseline (audits/solver-baseline.json). Any
 *     level that the baseline solves but this run does not is a regression and fails the build.
 *     This is the seatbelt for any change to the solver's attempt policy or search.
 *
 *  2. ORDER-INDEPENDENCE. `--order=reverse|random` re-runs the corpus with the attempt configs
 *     reordered (via the ablation ATTEMPT_ORDER knob, with the full baseline feature-set otherwise
 *     enabled) and compares the solved set against the baseline. The plan's falsifiable invariant
 *     is that **success is order-independent** — reordering may change wall-time but must not change
 *     which levels solve. A non-empty "only-solved-by-default" set quantifies how far the current
 *     allocator is from that invariant.
 *
 * Usage:
 *   node scripts/solver-bench.mjs --update-baseline      # write audits/solver-baseline.json (default order)
 *   node scripts/solver-bench.mjs --check                # compare default-order run to baseline (exit 1 on regression)
 *   node scripts/solver-bench.mjs --order=reverse        # order-independence probe vs baseline
 *   node scripts/solver-bench.mjs --order=random --seed=7
 *   flags: --budget-ms=30000  --levels=all|1,2,3|1-10  --out=path.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { defaultConfig } from './ablation-config.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const flags = new Set(args.filter(a => !a.includes('=')));

const BASELINE_PATH = 'audits/solver-baseline.json';
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
const order = argMap.get('--order') || 'default';
const seed = Number(argMap.get('--seed') || 42);
const updateBaseline = flags.has('--update-baseline');

const parseLevelSpec = spec => {
    if (!spec || spec === 'all') return null;
    const set = new Set();
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (t.includes('-')) { const [a, b] = t.split('-').map(Number); for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i); }
        else { const n = Number(t); if (n > 0) set.add(n); }
    }
    return set;
};
const levelFilter = parseLevelSpec(argMap.get('--levels'));

// Browser stubs (mirror run-solverv2-direct.mjs).
if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { createSolverV2 } = await import('../modules/SolverV2.js');
const SolverV2 = createSolverV2();

const root = new URL('..', import.meta.url).pathname;
const rawLevels = JSON.parse(readFileSync(path.join(root, 'data', 'levels.json'), 'utf8'));
const commit = (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();

// Build the ablation config for the requested ordering. `default` uses the production path
// (ablation=null); reverse/random use the full baseline feature-set with only ATTEMPT_ORDER changed,
// so the ONLY variable vs. the default run is the order in which configs are tried.
function ablationForOrder() {
    if (order === 'default') return null;
    const cfg = defaultConfig();
    if (order === 'reverse') cfg.ATTEMPT_ORDER = 'reverse';
    else if (order === 'random') { cfg.ATTEMPT_ORDER = 'random'; cfg._randomSeed = seed; }
    else { console.error(`Unknown --order=${order} (use default|reverse|random)`); process.exit(2); }
    return cfg;
}
const ablation = ablationForOrder();

const targets = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

console.log(`solver-bench: order=${order}${order === 'random' ? ` seed=${seed}` : ''} budget=${budgetMs}ms levels=${targets.length}`);

const solved = [];
const failed = [];
const runStart = Date.now();
for (const n of targets) {
    const raw = rawLevels[n - 1];
    let ok = false;
    try {
        const level = SolverV2.prepareLevelForSolver(raw, { source: 'raw', levelNumber: n });
        const res = await SolverV2.solve(level, { timeBudgetMs: budgetMs, ablation });
        ok = !!res?.ok;
    } catch (e) {
        console.log(`  L${n}: ERROR ${e?.message}`);
    }
    (ok ? solved : failed).push(n);
}
const totalMs = Date.now() - runStart;
console.log(`Result: solved ${solved.length}/${targets.length}, failed [${failed.join(', ')}], ${(totalMs / 1000).toFixed(1)}s`);

const outFile = argMap.get('--out');
if (outFile) {
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify({ order, seed, budgetMs, commit, solved, failed, totalMs }, null, 2));
    console.log(`Wrote ${outFile}`);
}

if (updateBaseline) {
    if (order !== 'default' || levelFilter) { console.error('--update-baseline requires the full default-order run (no --order / --levels).'); process.exit(2); }
    writeFileSync(BASELINE_PATH, JSON.stringify({ budgetMs, commit, generatedAt: new Date().toISOString(), solved, failed }, null, 2) + '\n');
    console.log(`Baseline written to ${BASELINE_PATH} (${solved.length} solved).`);
    process.exit(0);
}

// Compare against the committed baseline.
let baseline;
try { baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')); }
catch { console.error(`No baseline at ${BASELINE_PATH}. Run with --update-baseline first.`); process.exit(2); }

const baseSolved = new Set(baseline.solved);
const nowSolved = new Set(solved);
const considered = new Set(targets);
const regressions = [...baseSolved].filter(n => considered.has(n) && !nowSolved.has(n)).sort((a, b) => a - b);
const improvements = [...nowSolved].filter(n => !baseSolved.has(n)).sort((a, b) => a - b);

console.log(`\nvs baseline (budget=${baseline.budgetMs}ms, commit ${baseline.commit}):`);
if (improvements.length) console.log(`  + newly solved: [${improvements.join(', ')}]`);
if (order === 'default') {
    if (regressions.length) { console.error(`  REGRESSION — baseline solved but this run did not: [${regressions.join(', ')}]`); process.exit(1); }
    console.log('  no regressions — solver-bench --check PASS');
} else {
    // Order-independence probe.
    if (regressions.length) {
        console.error(`  ORDER-DEPENDENT — solved by default order but NOT by order=${order}: [${regressions.join(', ')}]`);
        console.error('  (success should be order-independent; this set is the gap to close.)');
        process.exit(1);
    }
    console.log(`  order=${order} solves every baseline level — order-independence holds for this ordering.`);
}
