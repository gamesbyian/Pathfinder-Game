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
 * --enum-order=admissible-slack switches both generators' child ordering AND pruning to
 * modules/solver/hint-enumeration.ts's 'admissible-slack' mode (least-admissible-slack-first
 * ranking + the full admissible pruning gauntlet, borrowed from the production solver's
 * admissible-order-search last-resort tier) instead of the default random order — see that
 * option's own doc comment for what it changes and why both pieces are required together.
 * Default 'random' leaves every existing invocation of this script byte-for-byte unaffected.
 * --restarts is automatically capped to 1 under this mode (admissible-slack ordering never reads
 * the RNG, so repeat restarts are provably pure waste). Pair with --enum-tie-break=true to also
 * break equal-slack ties by a soft heuristic score instead of leaving them in getNeighbors()'s
 * own order.
 *
 * Every candidate is PLAY-validated (validateCandidatePath) and streamed through the shared
 * heatmap-novelty acceptance gate (modules/domain/hint-novelty.ts). A level stops when it hits its
 * accept budget, its 1,000-hint cap, or a stagnation limit (N valid-but-rejected candidates in a row
 * with no novel accept). Garbage-tagged levels are skipped (via a ratings JSON).
 *
 * Read-only by default (writes an audit JSON). Pass --write-levels to append accepted hints; the
 * caller must then regenerate heatmaps (npm run levels:generate-heatmaps) and run
 * npm run check:level-data-validity + npm run test:hint-path-oracle.
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
 * scripts/stress/benchmark.mjs already relies on. --levels accepts positions or, when pointed at
 * a stress corpus via --levels-json (both carry an id), the id itself — e.g. --levels=S00028
 * (see level-data-io.mjs's parseLevelSelector, the shared parser every corpus-capable tool uses):
 *   npm run hints:expand -- --levels=id:100 --dry-run
 *   npm run hints:expand -- --levels=all --ratings=tmp/ratings.json --write-levels
 *   npm run hints:expand -- --levels=all --parallel --dry-run
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { decideCandidateAcceptance, pathSignature } from '../modules/domain/hint-novelty.ts';
import { evaluateCandidateAcceptance } from '../modules/domain/hint-acceptance-pipeline.ts';
import { toHint, makeProvenanceEntry, mergeHints } from '../modules/domain/hint-types.ts';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.ts';

installBrowserStubs();

const { prepLevel } = await import('../modules/solver/prep.js');
const { normalizeRawLevel } = await import('../modules/solver/normalization.js');
const { enumerateFromGate, anchoredFromSeed } = await import('../modules/solver/hint-enumeration.js');
const { readLevelsWithHints, writeLevelsWithHints, parseLevelSelector } = await import('./level-data-io.mjs');

const ROOT = new URL('..', import.meta.url).pathname;

// path.join(ROOT, p) unconditionally prefixes ROOT even when p is already absolute (path.join
// doesn't special-case absolute later segments), silently producing a wrong nested path — mirror
// hint-workbench.mjs's path.isAbsolute check instead.
const resolveFromRoot = p => (path.isAbsolute(p) ? p : path.join(ROOT, p));

// Best-effort git commit SHA (Component 12: lets a report alone say which solver/codebase state
// produced its candidates). Must not fail the run if git is unavailable, e.g. a packaged/CI
// context without .git.
const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

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
    const raw = JSON.parse(readFileSync(resolveFromRoot(ratingsPath), 'utf8'));
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

    // Shared dedupe -> validate -> canonicalize -> policy-decide sequence (Component 12 of the
    // hint-workbench plan) — see modules/domain/hint-acceptance-pipeline.ts. Exact-duplicate and
    // canonical-duplicate both surface as their own distinct reason strings now (previously both
    // bucketed under 'duplicate' here); nothing downstream parses these reason strings.
    const consider = (candidate, technique) => {
        considered++;
        const outcome = evaluateCandidateAcceptance(
            level, { ...raw, hints: pool }, candidate, poolSigs,
            (levelForPolicy, canonicalPath) => decideCandidateAcceptance(levelForPolicy, canonicalPath, gateOpts),
        );
        if (outcome.stage !== 'policy') {
            rejected.set(outcome.reason, (rejected.get(outcome.reason) || 0) + 1);
            return;
        }
        validSeen++;
        if (outcome.accept) {
            poolSigs.add(outcome.pathSignature);
            pool.push(outcome.path);
            accepted.push({ path: outcome.path, reason: outcome.reason, heatmapScore: outcome.evaluation.heatmap.score, newCells: outcome.evaluation.heatmap.newCells, technique, profile: orderProfile });
            stagnation = 0;
        } else {
            rejected.set(outcome.reason, (rejected.get(outcome.reason) || 0) + 1);
            stagnation++; // valid but rejected — counts toward stagnation
        }
    };

    const enumOrderOpts = { orderBy: opts.enumOrder, tieBreakProfile: opts.enumTieBreak ? {} : null };
    // Mirrors variety-search.ts's identical suffix/profile convention (see VarietySavedMeta's own
    // doc) — without this, a hint found via --enum-order=admissible-slack is indistinguishable in
    // its persisted provenance from one found via plain random order.
    const orderSuffix = opts.enumOrder === 'admissible-slack' ? ':admissible-slack' : '';
    const orderProfile = opts.enumOrder === 'admissible-slack' ? (opts.enumTieBreak ? 'flat' : null) : null;

    // Generator A: randomized-restart enumeration, round-robin over gates.
    for (let r = 0; r < opts.restarts && !shouldStop(); r++) {
        for (const gateKey of level.gateKeys) {
            if (shouldStop()) break;
            nodes += (await enumerateFromGate(level, prep, gateKey, { rng: rnd, nodeBudget: opts.nodeBudget, onSolution: (p) => consider(p, 'enumerate-restart' + orderSuffix), shouldStop, ...enumOrderOpts })).nodes;
        }
    }
    // Generator B: prefix-anchored completion from a shuffled sample of seed hints, sweeping anchor depth.
    if (!shouldStop() && seedHints.length) {
        const seeds = shuffle(seedHints.slice(), rnd).slice(0, opts.seeds);
        for (const seed of seeds) {
            if (shouldStop()) break;
            const L = seed.length;
            for (let K = Math.max(1, Math.floor(L * 0.3)); K < L - 2 && !shouldStop(); K += Math.max(1, Math.floor(L * 0.12))) {
                nodes += (await anchoredFromSeed(level, prep, seed, K, { rng: rnd, nodeBudget: opts.nodeBudget, onSolution: (p) => consider(p, 'prefix-anchored' + orderSuffix), shouldStop, ...enumOrderOpts })).nodes;
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
        acceptedMeta: accepted.map(({ reason, heatmapScore, newCells, technique, profile }) => ({ reason, heatmapScore, newCells, technique, profile })),
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
            // 'admissible-slack' ordering is fully deterministic (never reads rnd) -- a second
            // restart lap over the same gate would retrace the identical tree and find nothing new,
            // so every restart past the first is pure waste under this mode. Same reasoning
            // variety-search.ts applies for the identical reason (see its own comment on this).
            restarts: argMap.get('--enum-order') === 'admissible-slack' ? 1 : Number(argMap.get('--restarts') || 24),
            nodeBudget: Number(argMap.get('--node-budget') || 120000),
            seeds: Number(argMap.get('--seeds') || 12),
            diversityFloor: Number(argMap.get('--diversity-floor') || 0.65),
            heatmapScoreFloor: Number(argMap.get('--heatmap-score-floor') || 1),
            // Threaded straight through to enumerateFromGate/anchoredFromSeed's EnumOptions -- see
            // that option's own doc in hint-enumeration.ts for what 'admissible-slack' changes
            // (ranking AND the full admissible pruning gauntlet together) and why. Default 'random'
            // leaves every existing call to this script byte-for-byte unaffected.
            enumOrder: argMap.get('--enum-order') === 'admissible-slack' ? 'admissible-slack' : 'random',
            enumTieBreak: argMap.get('--enum-tie-break') === 'true',
        },
        seedBase: Number(argMap.get('--seed') ?? 20260703),
    }
    : workerData;

const rawLevels = readLevelsWithHints(resolveFromRoot(cfg.levelsJsonPath));

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
    const levelNumbers = [...parseLevelSelector(rawLevels, argMap.get('--levels') || 'all')].sort((a, b) => a - b);
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
    // Level-shape fingerprint per level, for each hint's provenance.levelRevision. Precomputed
    // because applyResult (the single main-thread writer) is a synchronous callback — also invoked
    // from a Worker 'message' handler — and getLevelFingerprint is async, so a Map lookup keeps that
    // writer sync and race-free.
    const levelRevisionByNumber = new Map();
    if (writeLevels) {
        for (const { levelNumber } of jobs) {
            if (!levelRevisionByNumber.has(levelNumber)) {
                levelRevisionByNumber.set(levelNumber, await getLevelFingerprint(rawLevels[levelNumber - 1]));
            }
        }
    }

    const applyResult = (levelNumber, resultIndex, result) => {
        totalAccepted += result.acceptedCount;
        if (writeLevels && result.acceptedCount) {
            const raw = rawLevels[levelNumber - 1];
            raw.hints = [...(raw.hints || []), ...result.acceptedPaths];
            // Attach real provenance (which generator/technique found it) instead of leaving these
            // paths with an empty provenance list — this script previously only wrote `.hints`.
            const newRecords = result.acceptedPaths.map((p, i) => {
                const meta = result.acceptedMeta[i] || {};
                return toHint(p, [makeProvenanceEntry(meta.technique || 'unknown', {
                    termination: 'solved',
                    randomSeed: cfg.seedBase + levelNumber,
                    profile: meta.profile ?? null,
                    hintGuided: (meta.technique || '').startsWith('prefix-anchored'),
                    levelRevision: levelRevisionByNumber.get(levelNumber) ?? null,
                })]);
            });
            raw.hintRecords = mergeHints(raw.hintRecords || [], newRecords);
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
        provenance: { sourceCommit: getCommitSha() },
        options: cfg.opts, seedBase: cfg.seedBase, skipTags: [...skipTags],
        totalLevels: levelNumbers.length, skippedTag, skippedCap, totalAccepted,
        levels: results,
    };
    const output = argMap.get('--output') || 'reports/hint-discovery/expand-latest.json';
    await atomicWrite(resolveFromRoot(output), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nTotal accepted: ${totalAccepted} across ${levelNumbers.length - skippedTag - skippedCap} eligible level(s). `
        + `Skipped: ${skippedTag} garbage, ${skippedCap} at-cap. Report -> ${output}`);
    if (writeLevels && totalAccepted > 0) {
        writeLevelsWithHints(resolveFromRoot(cfg.levelsJsonPath), rawLevels);
        console.log(`Wrote ${totalAccepted} new hint(s) to ${cfg.levelsJsonPath}. Now run: npm run levels:generate-heatmaps && npm run check:level-data-validity && npm run test:hint-path-oracle`);
    }
}
