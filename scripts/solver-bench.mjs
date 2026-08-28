#!/usr/bin/env node
/**
 * Solver benchmark + regression gate (see docs/archive/codebase-quality-followup-plan.md §1).
 *
 * Two jobs:
 *
 *  1. SAFETY NET. `--check` runs the full corpus in the production (default-order) path and
 *     compares the solved set against the committed baseline (logs/solver-baseline.json). Any
 *     level that the baseline solves but this run does not is a regression and fails the build.
 *     This is the seatbelt for any change to the solver's attempt policy or search.
 *     `--check` ALSO prints (never fails on) the total wall-time/nodesExpanded delta against the
 *     baseline's own recorded totals — solvability-only regression-safety says nothing about cost
 *     (see CLAUDE.md's solver-bench gotcha for a real case where a change passed --check cleanly
 *     while making the corpus ~14% slower for the same solved set), so this surfaces that gap
 *     directly in --check's own output instead of relying on a separate before/after sweep that's
 *     easy to forget to run. Only printed for a full-corpus run (no --levels), since a subset's
 *     cost isn't comparable to the baseline's full-corpus totals.
 *
 *  2. ORDER-INDEPENDENCE. `--order=reverse|random` re-runs the corpus with the attempt configs
 *     reordered (via the ablation ATTEMPT_ORDER knob, with the full baseline feature-set otherwise
 *     enabled) and compares the solved set against the baseline. The plan's falsifiable invariant
 *     is that **success is order-independent** — reordering may change wall-time but must not change
 *     which levels solve. A non-empty "only-solved-by-default" set quantifies how far the current
 *     allocator is from that invariant.
 *
 * Usage:
 *   node scripts/solver-bench.mjs --update-baseline      # write logs/solver-baseline.json (default order)
 *   node scripts/solver-bench.mjs --check                # compare default-order run to baseline (exit 1 on regression)
 *   node scripts/solver-bench.mjs --order=reverse        # order-independence probe vs baseline
 *   node scripts/solver-bench.mjs --order=random --seed=7
 *   flags: --budget-ms=30000  --work-budget=<n>  --levels=all|pos:1,...|pos:1-10  --out=path.json
 *
 * REPRODUCIBILITY: this is the regression gate, so it pins a WORK budget
 * (modules/solver/work-meter.ts) rather than letting the solve be shaped by wall clock. A work
 * budget is machine-independent, so the gate's solved set is the same on any host under any load;
 * --budget-ms survives only as a generous deadline that should never fire here. Before this, the
 * gate's own result depended on how fast and how loaded the machine was.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { defaultConfig } from '../modules/solver/ablation-config.js';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions } from './level-data-io.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const flags = new Set(args.filter(a => !a.includes('=')));

const BASELINE_PATH = 'logs/solver-baseline.json';
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
// Default derived from the historical 30s budget at the measured ~3.35M work/s, so the gate keeps
// its long-standing cost; --budget-ms is then a deadline with generous headroom over it.
const workBudget = Number(argMap.get('--work-budget') || 100_000_000);
const deadlineMs = Math.max(budgetMs, Math.floor(budgetMs * 4));
const order = argMap.get('--order') || 'default';
// Zero is a valid deterministic seed; default only when the option is absent.
const seed = Number(argMap.get('--seed') ?? 42);
const updateBaseline = flags.has('--update-baseline');

const levelFilter = parseLevelPositions(argMap.get('--levels'));

installBrowserStubs();

const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

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

console.log(`solver-bench: order=${order}${order === 'random' ? ` seed=${seed}` : ''} workBudget=${workBudget.toLocaleString()} deadline=${deadlineMs}ms levels=${targets.length}`);

const solved = [];
const failed = [];
const deadlineTruncatedLevels = [];
let nodesExpanded = 0;
const runStart = Date.now();
for (const [i, n] of targets.entries()) {
    const raw = rawLevels[n - 1];
    const levelStart = Date.now();
    let ok = false;
    try {
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: n });
        const res = await Solver.solveLevel(level, { timeBudgetMs: deadlineMs, workBudget, ablation });
        if (res?.deadlineTruncated) {
            // Indeterminate, not a negative — the deadline should never fire here (see the header).
            console.log(`  [!] L${n}: DEADLINE-TRUNCATED with work budget remaining; result is not reproducible`);
            deadlineTruncatedLevels.push(n);
        }
        ok = !!res?.ok;
        nodesExpanded += res?.nodesExpanded || 0;
    } catch (e) {
        console.log(`  [${i + 1}/${targets.length}] L${n}: ERROR ${e?.message}`);
    }
    (ok ? solved : failed).push(n);
    console.log(`  [${i + 1}/${targets.length}] L${n} ${ok ? '✓' : '✗'} ${Date.now() - levelStart}ms`);
}
const totalMs = Date.now() - runStart;
console.log(`Result: solved ${solved.length}/${targets.length}, failed [${failed.join(', ')}], ${(totalMs / 1000).toFixed(1)}s, ${nodesExpanded.toLocaleString()} nodes`);
// Promoted to its own unmissable summary line (added 2026-08-15) rather than relying on the
// per-level [!] lines above, which are easy to scroll past in a 100+-level run: this run's own
// nodes/time totals — and any --check cost comparison built from them — are NOT wall-clock-free
// (i.e. not purely work-budget-shaped, hence not machine-independent) whenever this list is
// non-empty, regardless of how generous deadlineMs looks on paper.
if (deadlineTruncatedLevels.length) {
    console.log(`[!!] ${deadlineTruncatedLevels.length} level(s) hit the wall-clock deadline before exhausting their work budget: [${deadlineTruncatedLevels.join(', ')}]. This run's cost is NOT purely work-budget-shaped — do not treat nodes/time below as machine-independent.`);
}

const outFile = argMap.get('--out');
if (outFile) {
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify({ order, seed, budgetMs, workBudget, commit, solved, failed, totalMs }, null, 2));
    console.log(`Wrote ${outFile}`);
}

if (updateBaseline) {
    if (order !== 'default' || levelFilter) { console.error('--update-baseline requires the full default-order run (no --order / --levels).'); process.exit(2); }
    writeFileSync(BASELINE_PATH, JSON.stringify({ budgetMs, workBudget, commit, generatedAt: new Date().toISOString(), solved, failed, totalMs, nodesExpanded }, null, 2) + '\n');
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

// Staleness check (added 2026-08-15 — see reports/2026-08-15-connectivity-axis-exhausted-
// regression.md): the baseline is a point-in-time snapshot, not a rolling target, and nothing
// previously flagged how far behind HEAD it had drifted. A comparison against a multi-week-stale
// baseline silently attributes ALL solver evolution since then to whatever the current run happens
// to be testing — a real, multi-hour misdiagnosis that motivated this check. Both signals are
// best-effort: `generatedAt` age needs no git access; commits-behind needs `baseline.commit` to
// still resolve, which a shallow clone (the default for CI/sandbox checkouts) can defeat entirely
// — that failure mode is itself reported, not swallowed, since "can't even tell how stale this is"
// is exactly the situation this check exists to prevent.
{
    const staleWarnings = [];
    if (baseline.generatedAt) {
        const ageDays = (Date.now() - new Date(baseline.generatedAt).getTime()) / 86_400_000;
        if (ageDays > 3) staleWarnings.push(`generated ${ageDays.toFixed(1)} days ago`);
    } else {
        staleWarnings.push('no generatedAt recorded (pre-dates staleness tracking)');
    }
    if (baseline.commit) {
        try {
            const behind = execSync(`git rev-list --count ${baseline.commit}..HEAD`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            const n = Number(behind);
            if (Number.isFinite(n) && n > 20) staleWarnings.push(`${n} commits behind HEAD`);
        } catch {
            staleWarnings.push(`baseline commit ${baseline.commit} does not resolve locally (shallow clone? run "git fetch --deepen=1000" or similar to check properly)`);
        }
    }
    if (staleWarnings.length) {
        console.log(`\n  [!!] STALE BASELINE — ${staleWarnings.join('; ')}.`);
        console.log(`       Cost/node deltas below may reflect unrelated solver evolution since the baseline was captured, not`);
        console.log(`       anything about this run's own change. Re-run "npm run solver:bench -- --update-baseline" if the`);
        console.log(`       working tree is otherwise clean, or treat the cost numbers below as unreliable until it is.`);
    }
}

console.log(`\nvs baseline (workBudget=${baseline.workBudget ? baseline.workBudget.toLocaleString() : 'n/a (pre-work-budget baseline)'}, commit ${baseline.commit}):`);
if (baseline.workBudget && baseline.workBudget !== workBudget) {
    console.log(`  [!] work budget differs from the baseline's (${workBudget.toLocaleString()} vs ${baseline.workBudget.toLocaleString()}) — solved-set differences are expected`);
}
if (improvements.length) console.log(`  + newly solved: [${improvements.join(', ')}]`);
if (order === 'default') {
    if (regressions.length) { console.error(`  REGRESSION — baseline solved but this run did not: [${regressions.join(', ')}]`); process.exit(1); }
    console.log('  no regressions — solver-bench --check PASS');
    // Cost delta: --check only proves the solved/failed SET is unchanged — a change can pass that
    // cleanly while making the corpus meaningfully slower/more-node-hungry for the same outcome
    // (see CLAUDE.md's solver-bench gotcha for a real case). Printed here so that fact is never
    // silently invisible to whoever ran --check, without turning it into a hard gate: cost varies
    // run to run (levelFilter subsets it further, and CPU-throttled sandboxes are noisy — see the
    // same gotcha), so this is a reported delta, not a pass/fail condition.
    if (!levelFilter && typeof baseline.totalMs === 'number' && typeof baseline.nodesExpanded === 'number') {
        const msDelta = ((totalMs - baseline.totalMs) / baseline.totalMs) * 100;
        const nodesDelta = ((nodesExpanded - baseline.nodesExpanded) / (baseline.nodesExpanded || 1)) * 100;
        const sign = n => (n >= 0 ? '+' : '') + n.toFixed(1);
        console.log(`  cost vs baseline: ${(totalMs / 1000).toFixed(1)}s (${sign(msDelta)}%), ${nodesExpanded.toLocaleString()} nodes (${sign(nodesDelta)}%)`);
    } else if (!levelFilter) {
        console.log('  cost vs baseline: no cost recorded in this baseline — run --update-baseline to start tracking it.');
    }
} else {
    // Order-independence probe.
    if (regressions.length) {
        console.error(`  ORDER-DEPENDENT — solved by default order but NOT by order=${order}: [${regressions.join(', ')}]`);
        console.error('  (success should be order-independent; this set is the gap to close.)');
        process.exit(1);
    }
    console.log(`  order=${order} solves every baseline level — order-independence holds for this ordering.`);
}
