#!/usr/bin/env node
/**
 * Direct Node driver for Solver.
 *
 *   node scripts/run-solver-direct.mjs --levels=pos:92
 *   node scripts/run-solver-direct.mjs --levels=all --budget-ms=30000 [--work-budget=<n>]
 *
 * --work-budget pins the machine-independent bound (modules/solver/work-meter.ts); pass it whenever
 * the run's result needs to be reproducible. Without it, one is derived from --budget-ms.
 *   node scripts/run-solver-direct.mjs --levels=pos:1-10
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';

import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions, readLevelCorpusDocumentWithHints } from './level-data-io.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { buildCanonicalSolverRequestProjection } from '../modules/solver/solver-request-projection.js';
import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';
import { classifyReproducibilityMode } from '../modules/solver/reproducibility-mode.mjs';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.js';

const args    = process.argv.slice(2);
const argMap  = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const levelFilter  = parseLevelPositions(argMap.get('--levels'));
const budgetMsArg  = argMap.get('--budget-ms');
const outputFile   = argMap.get('--output') || 'logs/Solver/latest.json';
const verbose      = argFlags.has('--verbose');
// Opt-in, default OFF: an ordinary `npm run solver:direct` debugging run must never write to the
// committed hint corpus. solver-diagnostics.yml passes it so the CI solver pass stops discarding what it
// finds -- see that workflow and docs/testing.md's "Retroactive cost drift" note.
const saveHints    = argFlags.has('--save-hints');

installBrowserStubs();

const { createSolver } = await import('../modules/solver.js');

const budgetMs = Number(budgetMsArg || 30000);
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;

const Solver = createSolver();

const LEVELS_PATH = path.join(new URL('..', import.meta.url).pathname, 'data', 'levels.json');

function loadCorpusDocument() {
    // readLevelCorpusDocumentWithHints (rather than a bare readFileSync) attaches each level's
    // existing hints/hintRecords, which --save-hints needs in order to MERGE into them. Without it a
    // save would overwrite a level's hint set with the single path this run happened to find.
    // Harmless when --save-hints is off: the extra fields are ignored, and prepareLevelForSolver
    // takes the level as-is exactly as before.
    const document = readLevelCorpusDocumentWithHints(LEVELS_PATH);
    if (!Array.isArray(document.levels) || document.levels.length === 0) throw new Error('data/levels.json is empty or not an array');
    return document;
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const corpusDocument = loadCorpusDocument();
const rawLevels = corpusDocument.levels;
console.log(`Loaded ${rawLevels.length} levels. Budget: ${budgetMs}ms${saveHints ? ' (saving hints)' : ''}`);

// The literal object handed to Solver.solveLevel() below, and nowhere else (see
// docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 3.2 -- request identity
// proves what actually reached the execution boundary). `baseWorkBudget` is the live SolveOpts name;
// `workBudget` is retired input orchestration.ts rejects, which was passed here unfixed until now.
// `schedulerMode: 'production'` is explicit, matching level-blind-capability-sweep.mjs's own
// convention: this tool has no --scheduler-mode flag, but orchestration.ts's own
// `opts.schedulerMode ?? 'production'` default means every run already IS production-scheduled --
// recording that as a real, known fact rather than an omitted, classifiable-as-'unknown' one.
const solveOpts = { timeBudgetMs: budgetMs, schedulerMode: 'production', ...(workBudget !== undefined ? { baseWorkBudget: workBudget } : {}) };
const solverRequestProjection = buildCanonicalSolverRequestProjection(solveOpts);
const solverRequestIdentity = solverRequestIdentityFromProjection(solverRequestProjection);
// backend: 'direct' -- levels run sequentially on the main thread, one solveLevel() call at a time;
// no worker pool, no race pool, so this is a certain fact, not a guess.
const backend = 'direct';
const reproducibilityMode = classifyReproducibilityMode({ schedulerMode: solveOpts.schedulerMode, backend });

// Bounded execution/run binding for hint provenance (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 4/W). No experiment contract object exists for this ad hoc direct
// driver, so protocolHash/executionArm stay genuinely absent; occurrenceRunId only when this
// invocation is a real GHA job (solver-diagnostics.yml) -- a local debugging run has no run to bind to.
const hintExecutionContext = {
    solverRequestIdentity, reproducibilityMode,
    ...(process.env.GITHUB_RUN_ID ? {
        occurrenceRunId: process.env.GITHUB_RUN_ID,
        ...(process.env.GITHUB_RUN_ATTEMPT ? { occurrenceRunAttempt: process.env.GITHUB_RUN_ATTEMPT } : {}),
    } : {}),
};

const hintCapture = await createHintCapture({ solverVersion: getCommitSha(), budgetMs, enabled: saveHints, executionContext: hintExecutionContext });
if (saveHints) await hintCapture.prepare(rawLevels);

const levelNumbers = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

console.log(`Target: ${levelNumbers.length} level(s)`);

const results = [];
let solvedCount = 0, failCount = 0, errorCount = 0;
const runStart = Date.now();
// Explicit fault-injection seam for the durability regression test. Not a CLI option and never
// enabled by production workflows.
const testFailAfterCompleted = Number(process.env.PATHFINDER_TEST_FAIL_AFTER_COMPLETED || 0);

const buildReport = () => ({
    schemaVersion: 1,
    kind: 'pathfinder-direct-solver-report',
    producer: 'run-solver-direct',
    corpus: 'data/levels.json',
    timestamp: new Date().toISOString(),
    commitSha: getCommitSha(),
    executionRuntime: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
    },
    budgetMs,
    workBudget: workBudget ?? null,
    levelFilter: levelFilter ? [...levelFilter].sort((a,b) => a-b) : 'all',
    solved: solvedCount,
    failed: failCount,
    errors: errorCount,
    completed: results.length,
    total: levelNumbers.length,
    complete: results.length === levelNumbers.length,
    totalMs: Date.now() - runStart,
    solverRequestProjection,
    solverRequestIdentity,
    backend,
    reproducibilityMode,
    levels: results,
});

async function checkpointReport() {
    const resolved = path.resolve(outputFile);
    const dir = path.dirname(resolved);
    await mkdir(dir, { recursive: true });
    const tmp = `${resolved}.tmp-${process.pid}`;
    await writeFile(tmp, JSON.stringify(buildReport(), null, 2));
    await rename(tmp, resolved);
}

async function checkpointObservation() {
    await checkpointReport();
    if (testFailAfterCompleted > 0 && results.length >= testFailAfterCompleted) {
        throw new Error(`PATHFINDER_TEST_FAIL_AFTER_COMPLETED=${testFailAfterCompleted}`);
    }
}

for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    if (!raw) {
        results.push({ level: levelNumber, status: 'error', error: 'no-raw-level' });
        errorCount++;
        await checkpointObservation();
        continue;
    }

    let level;
    try { level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber }); }
    catch (e) {
        results.push({ level: levelNumber, status: 'error', error: `normalize: ${e?.message}` });
        errorCount++;
        await checkpointObservation();
        continue;
    }

    const t0 = Date.now();
    let result;
    try { result = await Solver.solveLevel(level, solveOpts); }
    catch (e) {
        results.push({ level: levelNumber, status: 'error', error: `solve: ${e?.message}`, elapsedMs: Date.now() - t0 });
        errorCount++;
        console.log(`  L${levelNumber}: ERROR — ${e?.message}`);
        await checkpointObservation();
        continue;
    }

    const elapsed = Date.now() - t0;
    const ok = !!result?.ok;
    ok ? solvedCount++ : failCount++;

    const solvedByScoringProfileId = ok ? (result.attempts?.find(a => a.ok)?.scoringProfileId ?? 'unknown') : null;
    const discoveryObservedAt = ok ? new Date().toISOString() : null;
    const levelRevision = ok ? await getLevelFingerprint(raw) : null;
    if (ok) hintCapture.record(raw, result);
    results.push({
        level: levelNumber,
        levelId: raw.id ?? null,
        levelRevision,
        discoveryObservedAt,
        status: result.status,
        ok,
        solution: ok && Array.isArray(result.solution) ? result.solution : null,
        elapsedMs: elapsed,
        nodesExpanded: result.nodesExpanded ?? null,
        workSpent: result.workSpent ?? null,
        workBudget: result.workBudget ?? workBudget ?? null,
        solvedByScoringProfileId,
        attempts: result.attempts,
    });
    await checkpointObservation();

    const marker = ok ? '✓' : '✗';
    if (verbose || !ok) console.log(`  L${levelNumber} ${marker} ${elapsed}ms${ok ? ` [score=${solvedByScoringProfileId}]` : ''}`);
    else process.stdout.write(`  L${levelNumber} ${marker} ${elapsed}ms [score=${solvedByScoringProfileId}]\n`);
}

const totalMs = Date.now() - runStart;
console.log(`\nDone: ${solvedCount} solved, ${failCount} failed, ${errorCount} errors / ${levelNumbers.length} total — ${totalMs}ms`);

// Flush AFTER the whole run, not per level: one write pass, and writeLevelCorpusDocumentWithHints
// only rewrites artifacts whose content actually changed.
const hintSummary = hintCapture.flush(LEVELS_PATH, corpusDocument);
if (saveHints) {
    console.log(`Hints: ${hintSummary.newPaths} new path(s), ${hintSummary.rediscoveries} rediscover(ies) ` +
        `(provenance appended at this commit), ${hintSummary.hintFilesChanged} artifact(s) rewritten.`);
}

await checkpointReport();
console.log(`Results → ${outputFile}`);
