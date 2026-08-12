#!/usr/bin/env node
/**
 * Level-blind capability sweep.
 *
 * Canonical measurement entrypoint for the level-editor use case. Solver workers receive a
 * mechanics-only copy of each puzzle, with exact-level identity/history stripped before
 * prepareLevelForSolver is called. No baseline, saved hint, prior solution, winning config/gate/
 * seed, solved status, attempt cache, corpus position, provenance, or research metadata can enter
 * Solver.solve().
 *
 * --save-hints is output-only: after a worker finishes a solve, the main process may attach the new
 * valid path/provenance to the original corpus's external hint artifacts. Those artifacts are never
 * supplied to the worker.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { readLevelsWithHints } from './level-data-io.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { buildRow } from './portfolio-solve-sweep-lib.mjs';
import { runWorkerPool } from './solver-worker-pool.mjs';
import { FEATURES } from './ablation-config.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [key, ...value] = a.split('=');
    return [key, value.join('=')];
}));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));
const root = new URL('..', import.meta.url).pathname;
const corpusPath = path.resolve(argMap.get('--corpus') || path.join(root, 'data', 'levels.json'));
const outFile = argMap.get('--out') || 'reports/stress/level-blind-capability-sweep.json';
const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
const budgetMs = Number(argMap.get('--budget-ms') || 86400000);
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : undefined;
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;
const workers = Math.max(1, Number(argMap.get('--workers') || 1));
const saveHints = flags.has('--save-hints');
const mainLoopLateReserveFraction = argMap.has('--main-loop-late-reserve-fraction')
    ? Number(argMap.get('--main-loop-late-reserve-fraction')) : undefined;
const mainLoopLateReserveConfigCount = argMap.has('--main-loop-late-reserve-config-count')
    ? Number(argMap.get('--main-loop-late-reserve-config-count')) : undefined;

for (const forbidden of ['--baseline', '--baseline-budget', '--prime-winner', '--prime-include-all', '--priority', '--attempt-cache', '--resume']) {
    if (args.some(a => a === forbidden || a.startsWith(`${forbidden}=`))) {
        console.error(`level-blind-capability-sweep refuses ${forbidden}: exact-level history cannot influence capability solves.`);
        process.exit(2);
    }
}

const enableFlags = argMap.has('--enable-flags')
    ? argMap.get('--enable-flags').split(',').map(s => s.trim()).filter(Boolean) : [];
const disableFlags = argMap.has('--disable-flags')
    ? argMap.get('--disable-flags').split(',').map(s => s.trim()).filter(Boolean) : [];
for (const flag of [...enableFlags, ...disableFlags]) {
    if (!(flag in FEATURES)) {
        console.error(`Unknown ablation flag "${flag}" (see scripts/ablation-config.mjs FEATURES).`);
        process.exit(2);
    }
}
for (const flag of enableFlags) {
    if (disableFlags.includes(flag)) {
        console.error(`Ablation flag "${flag}" cannot be both enabled and disabled.`);
        process.exit(2);
    }
}
const ablation = enableFlags.length || disableFlags.length
    ? Object.fromEntries([...enableFlags.map(f => [f, true]), ...disableFlags.map(f => [f, false])])
    : null;

function parseLevelSpec(spec, total) {
    if (!spec) return Array.from({ length: total }, (_, i) => i + 1);
    const normalized = spec.startsWith('pos:') ? spec.slice(4) : spec;
    const selected = new Set();
    for (const token of normalized.split(',').map(s => s.trim()).filter(Boolean)) {
        const range = token.match(/^(\d+)-(\d+)$/u);
        if (range) {
            const a = Number(range[1]), b = Number(range[2]);
            for (let n = Math.min(a, b); n <= Math.max(a, b); n++) selected.add(n);
        } else if (/^\d+$/u.test(token)) selected.add(Number(token));
        else throw new Error(`Cannot parse --levels token "${token}".`);
    }
    return [...selected].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
}

const parsedCorpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const rawLevels = Array.isArray(parsedCorpus) ? parsedCorpus : parsedCorpus.levels;
if (!Array.isArray(rawLevels)) throw new Error(`${corpusPath}: expected an array or {levels:[...]}`);
const targets = parseLevelSpec(argMap.get('--levels'), rawLevels.length);
const commit = (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();

// Explicit allowlist of puzzle mechanics. Deliberately excludes raw `id`, `hints`, designerName,
// description, difficulty, provenance, stressMeta, generator metadata, solution witnesses, and any
// future research field. A new gameplay mechanic must be consciously added here and covered by the
// capability-boundary test; new research metadata is excluded automatically.
const PUZZLE_FIELDS = [
    'grid', 'gates', 'goal', 'reqLen', 'reqInt', 'blocks', 'geese', 'falseGoals', 'mustPass',
    'mustCross', 'landmarks', 'filters', 'flippingFilters', 'portals',
];
function mechanicsOnlyLevel(raw) {
    const clean = {};
    for (const key of PUZZLE_FIELDS) {
        if (raw?.[key] !== undefined) clean[key] = JSON.parse(JSON.stringify(raw[key]));
    }
    return clean;
}
const mechanicsOnlyCorpus = rawLevels.map(mechanicsOnlyLevel);
const toolDir = path.join(root, '.solver-tools');
mkdirSync(toolDir, { recursive: true });
const solveCorpusPath = path.join(toolDir, `level-blind-corpus-${process.pid}.json`);
writeFileSync(solveCorpusPath, JSON.stringify(mechanicsOnlyCorpus));

const solveOpts = { timeBudgetMs: budgetMs };
if (Number.isFinite(nodeBudget)) solveOpts.nodeBudget = nodeBudget;
if (Number.isFinite(workBudget)) solveOpts.workBudget = workBudget;
if (Number.isFinite(mainLoopLateReserveFraction)) solveOpts.mainLoopLateReserveFractionOverride = mainLoopLateReserveFraction;
if (Number.isFinite(mainLoopLateReserveConfigCount)) solveOpts.mainLoopLateReserveConfigCountOverride = mainLoopLateReserveConfigCount;
if (ablation) solveOpts.ablation = ablation;

// Output-side hint state is deliberately distinct from mechanicsOnlyCorpus. Never pass hintLevels
// or corpusPath to the solver worker.
const hintLevels = saveHints ? readLevelsWithHints(corpusPath) : null;
const hintCapture = await createHintCapture({ solverVersion: commit, budgetMs, enabled: saveHints });
if (saveHints) await hintCapture.prepare(targets.map(n => hintLevels[n - 1]));

const rows = new Map();
let hintChanges = 0;
function writeReport() {
    const levels = [...rows.values()].sort((a, b) => a.level - b.level);
    const solved = levels.filter(r => r.ok).length;
    const summary = {
        generatedAt: new Date().toISOString(), commit,
        corpus: path.relative(root, corpusPath), schedulerMode: 'legacy', levelBlind: true,
        solverInputFields: PUZZLE_FIELDS, historicalInputs: [], budgetMs,
        nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
        workBudget: Number.isFinite(workBudget) ? workBudget : null,
        workers, enableFlags, disableFlags,
        mainLoopLateReserveFraction: Number.isFinite(mainLoopLateReserveFraction) ? mainLoopLateReserveFraction : null,
        mainLoopLateReserveConfigCount: Number.isFinite(mainLoopLateReserveConfigCount) ? mainLoopLateReserveConfigCount : null,
        levelsRequested: targets.length, levelsRun: levels.length, solvedCount: solved,
        unsolvedCount: levels.length - solved, saveHints, hintChanges,
    };
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify({ summary, levels }, null, 2) + '\n');
    mkdirSync(path.dirname(summaryOutFile), { recursive: true });
    writeFileSync(summaryOutFile, [
        '# Level-blind capability sweep', '',
        `Commit: ${commit}`,
        `Corpus: ${summary.corpus}`,
        'Level-blind: yes (mechanics-only input; no identity/history/hints/baseline)',
        `Budget: ${budgetMs}ms; nodes=${summary.nodeBudget ?? '(none)'}; work=${summary.workBudget ?? '(none)'}`,
        `Workers: ${workers}`,
        `Flags: enable=${enableFlags.join(',') || '(none)'} disable=${disableFlags.join(',') || '(none)'}`,
        `Completed: ${levels.length}/${targets.length}`,
        `Solved: ${solved}/${levels.length}`,
        `Hints saved: ${saveHints ? `yes (${hintChanges} write event(s))` : 'no'}`,
        '',
    ].join('\n'));
}

writeReport();
const workerScript = path.join(root, 'scripts', 'level-blind-capability-worker.mjs');
const tasks = targets.map(levelNumber => ({ solveCorpusPath, levelIndex: levelNumber - 1, solveOpts }));
let completed = 0;
try {
    await runWorkerPool({
        workerScript, tasks, concurrency: workers,
        onResult: (index, workerResult) => {
            const levelNumber = targets[index];
            const original = rawLevels[levelNumber - 1];
            const result = workerResult.result;
            const row = buildRow(levelNumber, original?.id ?? null, result, 'legacy');
            if (saveHints) {
                row.hintAppended = hintCapture.record(hintLevels[levelNumber - 1], result);
                if (row.hintAppended) {
                    const flush = hintCapture.flush(corpusPath, hintLevels);
                    hintChanges += flush.hintFilesChanged;
                }
            }
            rows.set(levelNumber, row);
            completed += 1;
            console.log(`[${completed}/${targets.length}] ${row.id ?? `L${levelNumber}`} ${row.ok ? 'SOLVED' : row.status}`);
            writeReport();
        },
    });
} finally {
    rmSync(solveCorpusPath, { force: true });
}

writeReport();
const finalRows = [...rows.values()];
const solved = finalRows.filter(r => r.ok).length;
console.log(`Result: solved=${solved}/${finalRows.length}; requested=${targets.length}; levelBlind=true`);
if (finalRows.length !== targets.length) process.exitCode = 3;
