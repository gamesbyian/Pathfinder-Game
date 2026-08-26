#!/usr/bin/env node
/**
 * Calls repairSearchFromGate directly against one level/gate — bypassing solveLevel's full
 * orchestration/ladder (DFS/beam main loop, other gates, the probe) entirely. For fast iteration
 * when a change is scoped to repair-search.ts: the main ladder's own budget is often "pure
 * scheduling tax" ahead of repair on the repair-gated feature cluster (see
 * REPAIR_EXTRA_BUDGET_FRACTION's comment in orchestration.ts), so testing repair in isolation
 * skips straight to the part that actually matters for that iteration.
 *
 * Three modes:
 *   Single run (default): one repairSearchFromGate call, this process, deterministic.
 *   --races=<n>: runs N independent repairSearchFromGate calls in parallel child processes
 *                (scripts/solver-worker-pool.mjs — real OS parallelism), each with a different
 *                seedSalt (repair-search.ts's seedSalt parameter — additive-only, see its
 *                docstring; no production caller ever sets it), first success wins. An
 *                embarrassingly-parallel variant of the same racePool idea used elsewhere in the
 *                solver, applied to repair's own restart search instead of across attempt
 *                configs. Honest tradeoff, not a strict win: N shorter independent searches
 *                instead of one long search with an accumulating "elite" splice pool — repair's
 *                own stagnation-burst logic suggests pure restart diversity sometimes beats
 *                elite-guided restarts anyway, so measure for your own change rather than assume.
 *   --work-budget=<n>: runs modules/solver/restart-continuation-harness.ts's
 *                      runRepairRestartVsContinuation — the equal-canonical-`workSpent`-envelope
 *                      comparison docs/reports/2026-08-24-restart-continuation-value-audit.md's
 *                      execution-readiness gate calls for (seed 0 continued to n work units versus
 *                      seed 0 to n*restartSplit then, only on failure, a fresh seed 1 for the
 *                      remainder). `--restart-split=<f>` (default 0.5, the audit's own primary
 *                      comparison) picks seed 0's share of n in the restart arm; an unequal split
 *                      is a DIFFERENT treatment from the 50/50 form, not a variant of it — see
 *                      reports/2026-08-26-restart-vs-continuation-near-miss-development-pilot.md.
 *                      Deliberately NOT the same currency as --node-budget/--races above: `n` here
 *                      is canonical `workSpent`, which the audit found node counts cannot express
 *                      faithfully across arms. Single-run, this process, deterministic.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/repair-direct-probe.mjs -- --corpus=data/stress/stress-levels.json --level=44 --gate-index=0 --budget-ms=20000 --node-budget=8000000 [--must-turn-biased] [--races=8]
 *   node scripts/run-bundled.mjs scripts/repair-direct-probe.mjs -- --corpus=data/stress/stress-levels.json --level=44 --gate-index=0 --work-budget=200000
 */
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { runWorkerPool, defaultConcurrency } from './solver-worker-pool.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const root = new URL('..', import.meta.url).pathname;
const corpusPath = argMap.get('--corpus') || path.join(root, 'data', 'levels.json');
const levelNumber = Number(argMap.get('--level'));
if (!Number.isFinite(levelNumber) || levelNumber < 1) { console.error('--level=<n> is required (1-indexed position in --corpus).'); process.exit(2); }
const gateIndex = Number(argMap.get('--gate-index') || 0);
const budgetMs = Number(argMap.get('--budget-ms') || 20000);
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : Infinity;
const mustTurnBiased = flags.has('--must-turn-biased');
const races = Number(argMap.get('--races') || 1);
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : null;
const restartSplitFraction = argMap.has('--restart-split') ? Number(argMap.get('--restart-split')) : 0.5;
if (workBudget !== null && races > 1) { console.error('--work-budget and --races are mutually exclusive.'); process.exit(2); }

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const { prepLevel } = await import('../modules/solver/prep.js');
const { repairSearchFromGate } = await import('../modules/solver/repair-search.js');
const { POLICY_PROFILES } = await import('../modules/solver/policy.js');
const { runRepairRestartVsContinuation } = await import('../modules/solver/restart-continuation-harness.js');

const Solver = createSolver();
const { readFileSync } = await import('node:fs');
const parsed = JSON.parse(readFileSync(corpusPath, 'utf8'));
const rawLevels = Array.isArray(parsed) ? parsed : parsed.levels;
const raw = rawLevels[levelNumber - 1];
if (!raw) { console.error(`--level=${levelNumber}: no such level in ${corpusPath} (${rawLevels.length} levels).`); process.exit(2); }
const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
const gateKeys = Array.isArray(level.gateKeys) ? level.gateKeys : [];
const gateKey = gateKeys[gateIndex];
if (gateKey === undefined) { console.error(`--gate-index=${gateIndex}: level has ${gateKeys.length} gate(s).`); process.exit(2); }
const profile = POLICY_PROFILES.repair ?? POLICY_PROFILES.default;

console.log(`repair-direct-probe: level=${levelNumber}${raw.id ? ` (${raw.id})` : ''} gate=${gateIndex}/${gateKeys.length} budget=${budgetMs}ms node-budget=${Number.isFinite(nodeBudget) ? nodeBudget : '(none)'} must-turn-biased=${mustTurnBiased} races=${races}${workBudget !== null ? ` work-budget=${workBudget}` : ''}`);

if (workBudget !== null) {
    const result = await runRepairRestartVsContinuation(gateKey, level, () => prepLevel(level), profile, workBudget, { budgetMs, nodeBudget, restartSplitFraction });
    const fmt = (arm) => `solved=${arm.solved} workSpent=${arm.workSpent}/${workBudget} nodesExpanded=${arm.nodesExpanded} seedSalts=[${arm.seedSalts.join(',')}]`;
    console.log(`continuation: ${fmt(result.continuation)}`);
    console.log(`restart:      ${fmt(result.restart)}`);
    process.exitCode = 0;
} else if (races <= 1) {
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const out = {};
    const start = Date.now();
    const solution = await repairSearchFromGate(gateKey, level, prep, profile, budgetMs, start, null, null, mustTurnBiased, nodeBudget, out, 0);
    const elapsedMs = Date.now() - start;
    if (solution) {
        console.log(`SOLVED in ${elapsedMs}ms, ${out.nodesExpanded ?? '?'} nodes.`);
        console.log(JSON.stringify(solution));
    } else {
        console.log(`NOT SOLVED after ${elapsedMs}ms, ${out.nodesExpanded ?? '?'} nodes (bestBadness=${out.bestBadness ?? '?'}).`);
    }
    process.exitCode = solution ? 0 : 1;
} else {
    const workerScript = path.join(root, 'scripts', 'repair-direct-probe-worker.mjs');
    const tasks = Array.from({ length: races }, (_, i) => ({
        corpusPath, levelNumber, gateIndex, budgetMs, nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null, mustTurnBiased, seedSalt: i + 1,
    }));
    const raceStart = Date.now();
    let winner = null;
    const results = await runWorkerPool({
        workerScript,
        tasks,
        concurrency: Math.min(races, defaultConcurrency()),
        onResult: (index, result) => {
            const label = result.solution ? 'SOLVED' : 'failed';
            console.log(`  [seedSalt=${tasks[index].seedSalt}] ${label} in ${result.elapsedMs}ms, ${result.nodesExpanded ?? '?'} nodes${result.solution ? '' : ` (bestBadness=${result.bestBadness ?? '?'})`}`);
        },
        stopAfter: (index, result) => {
            if (result.solution && !winner) { winner = { seedSalt: tasks[index].seedSalt, ...result }; return true; }
            return false;
        },
    });
    const totalElapsedMs = Date.now() - raceStart;
    if (winner) {
        console.log(`SOLVED by seedSalt=${winner.seedSalt} in ${winner.elapsedMs}ms (race wall-clock ${totalElapsedMs}ms).`);
        console.log(JSON.stringify(winner.solution));
        process.exitCode = 0;
    } else {
        const attempted = results.filter(Boolean);
        console.log(`NOT SOLVED: all ${attempted.length}/${races} race(s) that completed failed (race wall-clock ${totalElapsedMs}ms).`);
        process.exitCode = 1;
    }
}
