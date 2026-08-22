#!/usr/bin/env node
/**
 * Direct Node driver for Solver. Usage mirrors run-solver-direct.mjs.
 *
 *   node scripts/run-solverv2-direct.mjs --levels=pos:92
 *   node scripts/run-solverv2-direct.mjs --levels=all --budget-ms=30000 [--work-budget=<n>]
 *
 * --work-budget pins the machine-independent bound (modules/solver/work-meter.ts); pass it whenever
 * the run's result needs to be reproducible. Without it, one is derived from --budget-ms.
 *   node scripts/run-solverv2-direct.mjs --levels=pos:1-10
 */
import { mkdir, writeFile } from 'node:fs/promises';

import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions, readLevelsWithHints } from './level-data-io.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';

const args    = process.argv.slice(2);
const argMap  = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const levelFilter  = parseLevelPositions(argMap.get('--levels'));
const budgetMsArg  = argMap.get('--budget-ms');
const outputFile   = argMap.get('--output') || 'logs/Solver/latest.json';
const verbose      = argFlags.has('--verbose');
// Opt-in, default OFF: an ordinary `npm run solver:direct` debugging run must never write to the
// committed hint corpus. audit-export.yml passes it so the CI solver pass stops discarding what it
// finds -- see that workflow and docs/testing.md's "Retroactive cost drift" note.
const saveHints    = argFlags.has('--save-hints');

installBrowserStubs();

const { createSolver } = await import('../modules/solver.js');

const budgetMs = Number(budgetMsArg || 30000);
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;

const Solver = createSolver();

const LEVELS_PATH = path.join(new URL('..', import.meta.url).pathname, 'data', 'levels.json');

function loadAllLevels() {
    // readLevelsWithHints (rather than a bare readFileSync) attaches each level's existing
    // hints/hintRecords, which --save-hints needs in order to MERGE into them. Without it a save
    // would overwrite a level's hint set with the single path this run happened to find. Harmless
    // when --save-hints is off: the extra fields are ignored, and prepareLevelForSolver takes the
    // level as-is exactly as before.
    const levels = readLevelsWithHints(LEVELS_PATH);
    if (!Array.isArray(levels) || levels.length === 0) throw new Error('data/levels.json is empty or not an array');
    return levels;
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const rawLevels = loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels. Budget: ${budgetMs}ms${saveHints ? ' (saving hints)' : ''}`);

const hintCapture = await createHintCapture({ solverVersion: getCommitSha(), budgetMs, enabled: saveHints });
if (saveHints) await hintCapture.prepare(rawLevels);

const levelNumbers = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

console.log(`Target: ${levelNumbers.length} level(s)`);

const results = [];
let solvedCount = 0, failCount = 0, errorCount = 0;
const runStart = Date.now();

for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    if (!raw) { results.push({ level: levelNumber, status: 'error', error: 'no-raw-level' }); errorCount++; continue; }

    let level;
    try { level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber }); }
    catch (e) { results.push({ level: levelNumber, status: 'error', error: `normalize: ${e?.message}` }); errorCount++; continue; }

    const t0 = Date.now();
    let result;
    try { result = await Solver.solve(level, { timeBudgetMs: budgetMs, ...(workBudget !== undefined ? { workBudget } : {}) }); }
    catch (e) { results.push({ level: levelNumber, status: 'error', error: `solve: ${e?.message}`, elapsedMs: Date.now() - t0 }); errorCount++; console.log(`  L${levelNumber}: ERROR — ${e?.message}`); continue; }

    const elapsed = Date.now() - t0;
    const ok = !!result?.ok;
    ok ? solvedCount++ : failCount++;

    const solvedBy = ok ? (result.attempts?.find(a => a.ok)?.profile ?? 'unknown') : null;
    if (ok) hintCapture.record(raw, result);
    results.push({ level: levelNumber, status: result.status, ok, elapsedMs: elapsed, solvedBy, attempts: result.attempts });

    const marker = ok ? '✓' : '✗';
    if (verbose || !ok) console.log(`  L${levelNumber} ${marker} ${elapsed}ms${ok ? ` [${solvedBy}]` : ''}`);
    else process.stdout.write(`  L${levelNumber} ${marker} ${elapsed}ms [${solvedBy}]\n`);
}

const totalMs = Date.now() - runStart;
console.log(`\nDone: ${solvedCount} solved, ${failCount} failed, ${errorCount} errors / ${levelNumbers.length} total — ${totalMs}ms`);

// Flush AFTER the whole run, not per level: one write pass, and writeLevelsWithHints only rewrites
// artifacts whose content actually changed.
const hintSummary = hintCapture.flush(LEVELS_PATH, rawLevels);
if (saveHints) {
    console.log(`Hints: ${hintSummary.newPaths} new path(s), ${hintSummary.rediscoveries} rediscover(ies) ` +
        `(provenance appended at this commit), ${hintSummary.hintFilesChanged} artifact(s) rewritten.`);
}

const out = {
    timestamp: new Date().toISOString(),
    commitSha: getCommitSha(),
    budgetMs,
    workBudget: workBudget ?? null,
    levelFilter: levelFilter ? [...levelFilter].sort((a,b) => a-b) : 'all',
    solved: solvedCount, failed: failCount, errors: errorCount, total: levelNumbers.length, totalMs,
    levels: results,
};

const dir = path.dirname(path.resolve(outputFile));
await mkdir(dir, { recursive: true });
await writeFile(outputFile, JSON.stringify(out, null, 2));
console.log(`Results → ${outputFile}`);
