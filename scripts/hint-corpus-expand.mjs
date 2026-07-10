#!/usr/bin/env node
/**
 * Back-end hint-corpus expansion (Systems A + B from docs/archive/hint-discovery-design.md;
 * see docs/hint-curation.md for the shipped shared-primitives/acceptance-policy summary).
 *
 * Two generators, both reusing the solver's exact move machinery:
 *   A. Randomized-restart enumeration — random child order, continue past every solution. Floods
 *      open/loosely-constrained levels.
 *   B. Prefix-anchored seeded completion — replay a prefix of a known hint, then randomized-complete
 *      the suffix. Rescues tightly-constrained levels (must-cross / portals / exact-intersection).
 *
 * Every candidate is PLAY-validated (validateCandidatePath) and streamed through the shared
 * heatmap-novelty acceptance gate (modules/domain/hint-novelty.ts). A level stops when it hits its
 * accept budget, its 1,000-hint cap, or a stagnation limit (N valid-but-rejected candidates in a row
 * with no novel accept). Garbage-tagged levels are skipped (via a ratings JSON).
 *
 * Read-only by default (writes an audit JSON). Pass --write-levels to append accepted hints; the
 * caller must then regenerate heatmaps (npm run levels:generate-heatmaps) and run
 * npm run check:hint-validity + npm run test:hint-path-oracle.
 *
 * --parallel[=N] processes levels across N worker threads (default: availableParallelism()-1).
 * Each level is still expanded by a single worker, start to finish, exactly as processLevel() runs
 * today — this parallelizes ACROSS levels, not the restarts/seeds within one level. Modeled on
 * scripts/stress/benchmark.mjs's own --parallel (same isMainThread/workerData self-spawn shape,
 * same worker-pulls-next-index dispatch): a level's accept/reject/RNG behavior only ever depends on
 * that level's own seed (mulberry32(seedBase + levelNumber)), never on execution order, so results
 * are byte-for-byte identical to a sequential run — only wall-clock time changes. Workers only
 * *compute*; the main thread is the sole writer of both the in-memory raw.hints mutation and the
 * final levels.json write-back, so there's no cross-worker shared-state risk (see "Making racing the
 * default for batch runs" in docs/solver-architecture.md for the persistent-pool lesson this borrows:
 * pool/worker spin-up cost only pays for itself amortized across many levels in one run, which is
 * exactly this script's normal `--levels=all` usage shape).
 *
 * Run via the esbuild wrapper (imports the TS solver + hint-enumeration engine) — required for
 * --parallel to work at all: a worker_threads Worker does not reliably inherit tsx's ESM loader
 * hooks for nested .ts imports (confirmed empirically), so self-spawning workers only resolves
 * correctly once this whole file is pre-flattened to plain JS by esbuild, same as
 * scripts/stress/benchmark.mjs already relies on:
 *   npm run hints:expand -- --levels=100 --dry-run
 *   npm run hints:expand -- --levels=all --ratings=tmp/ratings.json --write-levels
 *   npm run hints:expand -- --levels=all --parallel --dry-run
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { decideCandidateAcceptance, pathSignature } from '../modules/domain/hint-novelty.ts';

installBrowserStubs();

const { createSolver } = await import('../modules/Solver.js');
const { prepLevel } = await import('../modules/solver/prep.js');
const { normalizeRawLevel } = await import('../modules/solver/normalization.js');
const { enumerateFromGate, anchoredFromSeed } = await import('../modules/solver/hint-enumeration.js');
const { readLevelsWithHints, writeLevelsWithHints } = await import('./level-data-io.mjs');

const Solver = createSolver();
const ROOT = new URL('..', import.meta.url).pathname;

// ─── args ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
    const args = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        args.set(key, rest.length ? rest.join('=') : 'true');
    }
    return args;
}

function parseLevelSpec(spec, maxLevel) {
    if (!spec || spec === 'all') return Array.from({ length: maxLevel }, (_, i) => i + 1);
    const levels = new Set();
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (!t) continue;
        if (t.includes('-')) {
            const [from, to] = t.split('-').map(v => Number(v.trim()));
            if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
            for (let l = Math.min(from, to); l <= Math.max(from, to); l++) levels.add(l);
        } else {
            const n = Number(t);
            if (Number.isFinite(n)) levels.add(n);
        }
    }
    return [...levels].filter(l => l >= 1 && l <= maxLevel).sort((a, b) => a - b);
}

function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffle(arr, rnd) { for (let i = arr.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

async function atomicWrite(filePath, contents) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, contents);
    await rename(tmp, abs);
}

// ─── ratings / garbage skip ───────────────────────────────────────────────────
function loadGarbageLevels(ratingsPath, skipTags) {
    if (!ratingsPath) return new Set();
    const raw = JSON.parse(readFileSync(path.isAbsolute(ratingsPath) ? ratingsPath : path.join(ROOT, ratingsPath), 'utf8'));
    const skip = new Set();
    for (const r of Array.isArray(raw) ? raw : []) {
        if (!Number.isInteger(r.levelNumber)) continue;
        const tags = [...(r.tags || []), ...(r.customTags || [])].map(t => String(t).toLowerCase());
        if (tags.some(t => skipTags.has(t))) skip.add(r.levelNumber);
    }
    return skip;
}

// Generators (System A: randomized-restart enumeration from a gate; System B: prefix-anchored
// completion) now live in modules/solver/hint-enumeration.ts — the shared browser-safe engine used by
// both this script and the in-editor Solve search. This script just streams their output through the
// acceptance gate below.

// ─── per-level expansion ───────────────────────────────────────────────────────
async function processLevel(levelNumber, raw, opts, rnd) {
    const level = normalizeRawLevel(raw, levelNumber);
    const prep = prepLevel(level);
    const pool = [...(raw.hints || [])];
    const poolSigs = new Set(pool.map(pathSignature));
    const seedHints = [...(raw.hints || [])];
    const accepted = [];
    const rejected = new Map();
    let stagnation = 0;
    let validSeen = 0, considered = 0;
    let nodes = 0;

    const gateOpts = { maxHintsPerLevel: opts.maxHints, diversityFloor: opts.diversityFloor, heatmapScoreFloor: opts.heatmapScoreFloor };
    const shouldStop = () => accepted.length >= opts.maxAccepted || pool.length >= opts.maxHints || stagnation >= opts.stagnation;

    const consider = (candidate) => {
        considered++;
        const sig = pathSignature(candidate);
        if (poolSigs.has(sig)) { rejected.set('duplicate', (rejected.get('duplicate') || 0) + 1); return; }
        const v = Solver.validateCandidatePath(level, candidate);
        if (!v.ok) { rejected.set(`invalid:${v.reason}`, (rejected.get(`invalid:${v.reason}`) || 0) + 1); return; }
        const canonicalSig = pathSignature(v.path);
        if (poolSigs.has(canonicalSig)) { rejected.set('duplicate', (rejected.get('duplicate') || 0) + 1); return; }
        validSeen++;
        const decision = decideCandidateAcceptance({ ...raw, hints: pool }, v.path, gateOpts);
        if (decision.accept) {
            poolSigs.add(canonicalSig);
            pool.push(v.path);
            accepted.push({ path: v.path, reason: decision.reason, heatmapScore: decision.evaluation.heatmap.score, newCells: decision.evaluation.heatmap.newCells });
            stagnation = 0;
        } else {
            rejected.set(decision.reason, (rejected.get(decision.reason) || 0) + 1);
            stagnation++; // valid but rejected — counts toward stagnation
        }
    };

    // Generator A: randomized-restart enumeration, round-robin over gates.
    for (let r = 0; r < opts.restarts && !shouldStop(); r++) {
        for (const gateKey of level.gateKeys) {
            if (shouldStop()) break;
            nodes += (await enumerateFromGate(level, prep, gateKey, { rng: rnd, nodeBudget: opts.nodeBudget, onSolution: consider, shouldStop })).nodes;
        }
    }
    // Generator B: prefix-anchored completion from a shuffled sample of seed hints, sweeping anchor depth.
    if (!shouldStop() && seedHints.length) {
        const seeds = shuffle(seedHints.slice(), rnd).slice(0, opts.seeds);
        for (const seed of seeds) {
            if (shouldStop()) break;
            const L = seed.length;
            for (let K = Math.max(1, Math.floor(L * 0.3)); K < L - 2 && !shouldStop(); K += Math.max(1, Math.floor(L * 0.12))) {
                nodes += (await anchoredFromSeed(level, prep, seed, K, { rng: rnd, nodeBudget: opts.nodeBudget, onSolution: consider, shouldStop })).nodes;
            }
        }
    }

    const stopReason = accepted.length >= opts.maxAccepted ? 'accept-budget'
        : pool.length >= opts.maxHints ? 'at-cap'
        : stagnation >= opts.stagnation ? 'stagnation'
        : 'exhausted';

    return {
        level: levelNumber,
        hintCountBefore: (raw.hints || []).length,
        hintCountAfter: pool.length,
        acceptedCount: accepted.length,
        considered, validSeen, nodes, stopReason,
        rejected: Object.fromEntries([...rejected.entries()].sort()),
        acceptedPaths: accepted.map(a => a.path),
        acceptedMeta: accepted.map(({ reason, heatmapScore, newCells }) => ({ reason, heatmapScore, newCells })),
    };
}

// Workers receive their config via workerData — a worker's process.argv is not the CLI's.
// levelsJsonPath/opts/seedBase are the only inputs processLevel() needs, so that's all a worker
// requires; skip-tag/write-levels/output decisions stay main-thread-only (see main() below), since
// only the main thread dispatches jobs and writes results.
const argMap = parseArgs(process.argv.slice(2));
const cfg = isMainThread
    ? {
        levelsJsonPath: argMap.get('--levels-json') || 'data/levels.json',
        opts: {
            maxHints: Number(argMap.get('--max-hints') || 1000),
            maxAccepted: Number(argMap.get('--max-accepted') || 150),
            stagnation: Number(argMap.get('--stagnation') || 400),
            restarts: Number(argMap.get('--restarts') || 24),
            nodeBudget: Number(argMap.get('--node-budget') || 120000),
            seeds: Number(argMap.get('--seeds') || 12),
            diversityFloor: Number(argMap.get('--diversity-floor') || 0.65),
            heatmapScoreFloor: Number(argMap.get('--heatmap-score-floor') || 1),
        },
        seedBase: Number(argMap.get('--seed') || 20260703),
    }
    : workerData;

const rawLevels = readLevelsWithHints(path.join(ROOT, cfg.levelsJsonPath));

// ─── worker mode: expand whichever level index the main thread hands us next ───────────────────
if (!isMainThread) {
    parentPort.on('message', async (msg) => {
        if (msg?.type !== 'process') return;
        const raw = rawLevels[msg.levelNumber - 1];
        const t0 = Date.now();
        const result = await processLevel(msg.levelNumber, raw, cfg.opts, mulberry32(cfg.seedBase + msg.levelNumber));
        result.elapsedMs = Date.now() - t0;
        parentPort.postMessage({ type: 'result', levelNumber: msg.levelNumber, resultIndex: msg.resultIndex, result });
    });
} else {
    await main();
}

async function main() {
    const levelNumbers = parseLevelSpec(argMap.get('--levels') || 'all', rawLevels.length);
    const skipTags = new Set(String(argMap.get('--skip-tags') || 'garbage').split(',').map(t => t.trim().toLowerCase()).filter(Boolean));
    const garbage = loadGarbageLevels(argMap.get('--ratings'), skipTags);
    const writeLevels = argMap.has('--write-levels') && !argMap.has('--dry-run');

    // Pre-filter skips/at-cap up front (cheap, main-thread-only) so only levels that actually need
    // expansion get dispatched to the pool. `results` is pre-sized and index-addressed so parallel
    // completions (which arrive out of order) still land in `levelNumbers` order in the report.
    const results = new Array(levelNumbers.length).fill(null);
    let totalAccepted = 0, skippedTag = 0, skippedCap = 0;
    const jobs = [];
    levelNumbers.forEach((levelNumber, resultIndex) => {
        const raw = rawLevels[levelNumber - 1];
        if (garbage.has(levelNumber)) { skippedTag++; results[resultIndex] = { level: levelNumber, status: 'skipped-tag' }; return; }
        if ((raw.hints || []).length >= cfg.opts.maxHints) { skippedCap++; results[resultIndex] = { level: levelNumber, status: 'at-cap' }; return; }
        jobs.push({ levelNumber, resultIndex });
    });

    // Applying a level's result — mutating raw.hints and logging — happens ONLY on the main thread
    // for both the sequential and parallel paths, so there's exactly one writer regardless of which
    // worker (or the main thread itself) computed the result.
    const applyResult = (levelNumber, resultIndex, result) => {
        totalAccepted += result.acceptedCount;
        if (writeLevels && result.acceptedCount) {
            const raw = rawLevels[levelNumber - 1];
            raw.hints = [...(raw.hints || []), ...result.acceptedPaths];
        }
        results[resultIndex] = result;
        console.log(`L${levelNumber}: +${result.acceptedCount} (${result.hintCountBefore}->${result.hintCountAfter}) `
            + `[${result.stopReason}, ${result.validSeen} valid, ${result.nodes} nodes, ${result.elapsedMs}ms]`);
    };

    const parallelArg = argMap.has('--parallel')
        ? (argMap.get('--parallel') === '' ? Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1) : Number(argMap.get('--parallel')))
        : 1;
    const parallel = Math.max(1, Math.min(parallelArg, jobs.length || 1));

    if (parallel === 1 || jobs.length === 0) {
        for (const { levelNumber, resultIndex } of jobs) {
            const raw = rawLevels[levelNumber - 1];
            const t0 = Date.now();
            const result = await processLevel(levelNumber, raw, cfg.opts, mulberry32(cfg.seedBase + levelNumber));
            result.elapsedMs = Date.now() - t0;
            applyResult(levelNumber, resultIndex, result);
        }
    } else {
        console.log(`  parallel mode: ${parallel} workers across ${jobs.length} eligible level(s).`);
        await new Promise((resolve, reject) => {
            let nextJob = 0, doneCount = 0;
            const workers = [];
            const shutdown = () => workers.forEach((w) => w.terminate());
            for (let w = 0; w < parallel; w++) {
                const worker = new Worker(fileURLToPath(import.meta.url), { workerData: cfg });
                workers.push(worker);
                worker.on('error', (err) => { shutdown(); reject(err); });
                worker.on('message', (msg) => {
                    if (msg?.type !== 'result') return;
                    applyResult(msg.levelNumber, msg.resultIndex, msg.result);
                    doneCount++;
                    if (nextJob < jobs.length) {
                        const job = jobs[nextJob++];
                        worker.postMessage({ type: 'process', levelNumber: job.levelNumber, resultIndex: job.resultIndex });
                    } else if (doneCount === jobs.length) {
                        shutdown();
                        resolve();
                    }
                });
                if (nextJob < jobs.length) {
                    const job = jobs[nextJob++];
                    worker.postMessage({ type: 'process', levelNumber: job.levelNumber, resultIndex: job.resultIndex });
                } else {
                    worker.terminate();
                }
            }
        });
    }

    const report = {
        generatedAt: new Date().toISOString(),
        options: cfg.opts, seedBase: cfg.seedBase, skipTags: [...skipTags],
        totalLevels: levelNumbers.length, skippedTag, skippedCap, totalAccepted,
        levels: results,
    };
    const output = argMap.get('--output') || 'reports/hint-discovery/expand-latest.json';
    await atomicWrite(path.join(ROOT, output), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nTotal accepted: ${totalAccepted} across ${levelNumbers.length - skippedTag - skippedCap} eligible level(s). `
        + `Skipped: ${skippedTag} garbage, ${skippedCap} at-cap. Report -> ${output}`);
    if (writeLevels && totalAccepted > 0) {
        writeLevelsWithHints(path.join(ROOT, cfg.levelsJsonPath), rawLevels);
        console.log(`Wrote ${totalAccepted} new hint(s) to ${cfg.levelsJsonPath}. Now run: npm run levels:generate-heatmaps && npm run check:hint-validity && npm run test:hint-path-oracle`);
    }
}
