#!/usr/bin/env node
/**
 * run-ablation.mjs — Solver ablation experiment runner.
 *
 * Runs a set of controlled ablation experiments and writes machine-readable JSON.
 * Each experiment re-runs the full solver with one or more features disabled.
 *
 * Usage (via the esbuild wrapper — tsx runs the solver hot path ~5x slower, see run-bundled.mjs):
 *   node scripts/run-bundled.mjs scripts/run-ablation.mjs [options]
 *
 * Options:
 *   --experiment=<phase>   baseline | single-feature | scoring-profiles | ordering-biases |
 *                          order | pairs | full  (default: full)
 *   --corpus=<path>        Level corpus: published data/levels.json (default), or a stress-corpus
 *                          file (data/stress/stress-levels.json) — detected by the presence of a
 *                          top-level `levels` array whose entries carry a `stressMeta` witness
 *                          (stripped before the solver ever sees the level, same as
 *                          scripts/stress/benchmark.mjs).
 *   --levels=<spec>        Level filter. Published corpus: "all", "pos:1-10", "pos:74,pos:129,pos:130"
 *                          (1-based array position). Stress corpus: "all", "S00001,S00005",
 *                          "id:1-20" (maps to every distinct id prefix+width the corpus uses, e.g.
 *                          S00001-S00020). See LEVEL_SPEC_PREFIX_HELP (level-data-io.mjs) / CLAUDE.md's
 *                          "--levels selector semantics" note for why bare numbers require a prefix.
 *   --budget-ms=<n>        Per-level time budget in ms (default: 10000)
 *   --output=<path>        Output JSON file (default: logs/ablation/run-<timestamp>.json)
 *   --baseline=<path>      Reuse a previously saved baseline run (skips re-running baseline)
 *   --concise              Only store per-level solved/ms/nodes — omit full attempt lists
 *   --filter=<name>        Only run experiments whose name contains this substring
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions, parseLevelSelector } from './level-data-io.mjs';

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const argMap  = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const eq = a.indexOf('=');
    return [a.slice(0, eq), a.slice(eq + 1)];
}));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const phase       = argMap.get('--experiment') || 'full';
const corpusFile  = argMap.get('--corpus') || 'data/levels.json';
const budgetMs    = Number(argMap.get('--budget-ms') || 10000);
const baselineFile = argMap.get('--baseline') || null;
const concise     = argFlags.has('--concise');
const nameFilter  = argMap.get('--filter') || null;

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const defaultOutput = `logs/ablation/run-${ts}.json`;
const outputFile  = argMap.get('--output') || defaultOutput;

installBrowserStubs();

// ─── Load solver + levels ─────────────────────────────────────────────────────

const { createSolver }  = await import('../modules/solver.js');
const { buildExperimentList } = await import('../modules/solver/ablation-config.js');

const Solver = createSolver();

/**
 * Loads the corpus as a uniform list of { id, raw } entries, id ascending in file order.
 * Published corpus (plain array): id = 1-based index (number), raw = the level object itself.
 * Stress corpus ({ levels: [...] }, entries carrying a `stressMeta` witness): id = "S001" etc.,
 * raw = the entry with `id`/`stressMeta` stripped (the solver must never see the witness —
 * mirrors scripts/stress/benchmark.mjs).
 */
function loadCorpus(filePath) {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    if (Array.isArray(parsed)) {
        if (parsed.length === 0) throw new Error(`${filePath} is empty`);
        return { isStress: false, entries: parsed.map((raw, i) => ({ id: i + 1, raw })) };
    }
    if (Array.isArray(parsed.levels) && parsed.levels.length > 0 && 'stressMeta' in parsed.levels[0]) {
        return {
            isStress: true,
            entries: parsed.levels.map(entry => {
                const { id, stressMeta: _stressMeta, ...raw } = entry;
                return { id, raw };
            }),
        };
    }
    throw new Error(`${filePath} is neither a published-corpus array nor a recognizable stress corpus`);
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const root = new URL('..', import.meta.url).pathname;
const { isStress, entries: allEntries } = loadCorpus(path.resolve(root, corpusFile));

// Both branches resolve to a Set of 1-based POSITIONS into allEntries (for the published corpus
// e.id === position by construction; for the stress corpus, allEntries preserves parsed.levels'
// original order, so position i+1 in allEntries === position i+1 in the source array
// parseLevelSelector resolves against — it only ever reads each entry's own `.id`, so passing
// allEntries directly works unchanged). Delegating to the shared parsers (instead of this file's
// former standalone copies) also fixes a real bug those copies had: the stress-corpus parser was
// hardcoded to an "S"-prefix, fixed-5-digit-width regex, so it silently resolved to nothing at all
// when pointed at stress-corpus-2 (R-prefixed ids) or corpus-1's non-5-digit-width ids.
const levelFilter = isStress
    ? parseLevelSelector(allEntries, argMap.get('--levels'))
    : new Set(parseLevelPositions(argMap.get('--levels'), { maxLevel: allEntries.length }));

const entries = allEntries.filter((_, i) => levelFilter.has(i + 1));

console.log(`Loaded ${allEntries.length} levels from ${corpusFile}${isStress ? ' (stress corpus)' : ''}. Targeting ${entries.length} levels. Budget: ${budgetMs}ms`);

// ─── Experiment list ──────────────────────────────────────────────────────────

let experiments = buildExperimentList(phase);
if (nameFilter) experiments = experiments.filter(e => e.name.includes(nameFilter));
console.log(`Phase: ${phase} — ${experiments.length} experiments`);

// ─── Core runner ─────────────────────────────────────────────────────────────

async function runExperiment(experiment, targetEntries) {
    const { name, config } = experiment;
    const levelResults = [];
    let solvedCount = 0, failCount = 0, errorCount = 0;
    let totalNodesExpanded = 0;
    const elapsedTimes = [];

    for (const { id: levelNumber, raw } of targetEntries) {
        let level;
        try {
            level = isStress
                ? Solver.prepareLevelForSolver(raw, { source: 'raw' })
                : Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
        }
        catch (e) {
            levelResults.push({ level: levelNumber, status: 'error', error: `normalize: ${e?.message}` });
            errorCount++;
            continue;
        }

        const t0 = Date.now();
        let result;
        try {
            result = await Solver.solveLevel(level, { timeBudgetMs: budgetMs, ablation: config });
        } catch (e) {
            levelResults.push({ level: levelNumber, status: 'error', error: `solve: ${e?.message}`, elapsedMs: Date.now() - t0 });
            errorCount++;
            continue;
        }

        const elapsed = Date.now() - t0;
        const ok = !!result?.ok;
        ok ? solvedCount++ : failCount++;
        elapsedTimes.push(elapsed);
        totalNodesExpanded += result?.nodesExpanded ?? 0;

        const solvedByScoringProfileId = ok ? (result.attempts?.find(a => a.ok)?.scoringProfileId ?? 'unknown') : null;
        const entry = {
            level: levelNumber,
            status: result.status,
            ok,
            elapsedMs: elapsed,
            nodesExpanded: result?.nodesExpanded ?? 0,
            solvedByScoringProfileId,
        };
        if (!concise) {
            entry.attempts = result.attempts;
        }
        levelResults.push(entry);
    }

    // Compute aggregate stats
    elapsedTimes.sort((a, b) => a - b);
    const totalMs = elapsedTimes.reduce((s, v) => s + v, 0);
    const avgMs   = elapsedTimes.length > 0 ? Math.round(totalMs / elapsedTimes.length) : 0;
    const medianMs = elapsedTimes.length > 0
        ? elapsedTimes[Math.floor(elapsedTimes.length / 2)] : 0;
    const p95Ms = elapsedTimes.length > 0
        ? elapsedTimes[Math.floor(elapsedTimes.length * 0.95)] : 0;

    const solvedLevels  = levelResults.filter(r => r.ok).map(r => r.level);
    const failedLevels  = levelResults.filter(r => !r.ok && r.status !== 'error').map(r => r.level);

    const nodesPerSolved = solvedCount > 0
        ? Math.round(levelResults.filter(r => r.ok).reduce((s, r) => s + (r.nodesExpanded || 0), 0) / solvedCount)
        : 0;
    const nodesPerFailed = failCount > 0
        ? Math.round(levelResults.filter(r => !r.ok && r.status !== 'error').reduce((s, r) => s + (r.nodesExpanded || 0), 0) / failCount)
        : 0;

    return {
        name,
        label: experiment.label,
        tags: experiment.tags,
        config: config,
        summary: {
            solved: solvedCount,
            failed: failCount,
            errors: errorCount,
            total: targetEntries.length,
            solveRate: targetEntries.length > 0 ? (solvedCount / targetEntries.length) : 0,
            totalMs,
            avgMs,
            medianMs,
            p95Ms,
            nodesExpanded: totalNodesExpanded,
            nodesPerSolved,
            nodesPerFailed,
        },
        solvedLevels,
        failedLevels,
        levels: levelResults,
    };
}

// ─── Main loop ────────────────────────────────────────────────────────────────

const runs = [];
let baseline = null;

// If a saved baseline is provided, load it instead of re-running
if (baselineFile && existsSync(baselineFile)) {
    try {
        const saved = JSON.parse(await readFile(baselineFile, 'utf8'));
        baseline = saved.runs?.find(r => r.name === 'baseline') ?? saved;
        console.log(`Loaded baseline from ${baselineFile}: ${baseline.summary?.solved ?? '?'} solved`);
        // Skip the baseline experiment in the list
        const bi = experiments.findIndex(e => e.name === 'baseline');
        if (bi >= 0) experiments.splice(bi, 1);
    } catch (e) {
        console.warn(`Could not load baseline from ${baselineFile}: ${e.message}`);
    }
}

const runStart = Date.now();
for (let ei = 0; ei < experiments.length; ei++) {
    const exp = experiments[ei];
    const elapsed = Math.round((Date.now() - runStart) / 1000);
    process.stdout.write(`[${ei + 1}/${experiments.length}] ${elapsed}s elapsed — ${exp.name} ... `);
    const result = await runExperiment(exp, entries);
    runs.push(result);
    if (exp.name === 'baseline') baseline = result;
    const s = result.summary;
    console.log(`${s.solved}/${s.total} solved — ${s.totalMs}ms — ${s.nodesExpanded} nodes`);
}

const totalWallMs = Date.now() - runStart;
console.log(`\nDone: ${experiments.length} experiments in ${Math.round(totalWallMs / 1000)}s`);

// If baseline was pre-loaded, prepend it so it's in the output
if (baseline && !runs.find(r => r.name === 'baseline')) {
    runs.unshift(baseline);
}

// ─── Output ───────────────────────────────────────────────────────────────────

const out = {
    timestamp: new Date().toISOString(),
    commitSha: getCommitSha(),
    phase,
    corpus: corpusFile,
    budgetMs,
    levelFilter: levelFilter ? [...levelFilter].sort(isStress ? undefined : (a, b) => a - b) : 'all',
    levelCount: entries.length,
    experimentCount: experiments.length,
    totalWallMs,
    runs,
};

const dir = path.dirname(path.resolve(outputFile));
await mkdir(dir, { recursive: true });
await writeFile(outputFile, JSON.stringify(out, null, 2));
console.log(`Results → ${outputFile}`);
