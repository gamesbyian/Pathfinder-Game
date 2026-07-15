#!/usr/bin/env node
/**
 * Sharded, parallel, resumable complete enumeration (Component 8 of the hint-workbench plan,
 * docs/hint-workbench-implementation-plan.md). Exhaustively finds EVERY solution for each
 * requested level's every gate, by partitioning each gate's root children (first-move options)
 * into disjoint shards (modules/solver/hint-enumeration.ts's planGateShards/rootChildrenForGate)
 * and running each (gate, shard) pair as an independent job across a worker_threads pool.
 *
 * Why this needs its own script rather than living inside scripts/hint-workbench.mjs: sharded
 * dispatch needs worker_threads (a Node API), but hint-workbench.mjs's existing flow is a single
 * flat top-level script, not gated behind isMainThread the way a self-spawning worker pool
 * requires — retrofitting that structure was judged riskier than a small dedicated script that
 * follows scripts/hint-corpus-expand.mjs's already-proven self-spawn pattern exactly. The
 * workbench's own `enumerate-complete` step remains the simple/sequential (single-shard) path,
 * still useful for a quick per-level check; this script is for genuinely exhaustive, at-scale runs.
 *
 * Determinism (design principle 6): a gate's shard plan is a deterministic function of its root
 * children alone (sorted before round-robin assignment — see planGateShards), so the SAME set of
 * jobs is dispatched regardless of --parallel or which worker happens to pick up which job. Each
 * job's result (paths + exhausted flag) depends only on that job's own (level, gate, shard) — never
 * on execution order — so the final merged, sorted report is byte-stable between a sequential
 * (--parallel=1) and a parallel run, aside from the elapsedMs timing fields.
 *
 * Checkpoint/resume: pass --checkpoint=<path> to persist each job's result as it completes. A
 * re-run with the same --checkpoint skips already-completed (level, gate, shard) jobs and seeds
 * the merge from their already-recorded paths — an interrupted run is resumable without
 * re-computing finished work or duplicating candidates (a completed job's result is recorded
 * verbatim; the merge step's dedupe is on top of that, not a replacement for it).
 *
 * Usage:
 *   npm run hints:complete-sharded -- --levels=1-10 --parallel=4 --output=reports/hint-discovery/complete-sharded.json
 *   npm run hints:complete-sharded -- --levels=145 --parallel=4 --checkpoint=tmp/complete-145.checkpoint.json --write-levels
 *   npm run hints:complete-sharded -- --levels=145 --checkpoint=tmp/complete-145.checkpoint.json   # resume
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

installBrowserStubs();

const { prepLevel } = await import('../modules/solver/prep.js');
const { normalizeRawLevel } = await import('../modules/solver/normalization.js');
const { enumerateFromGate, rootChildrenForGate, planGateShards } = await import('../modules/solver/hint-enumeration.js');
const { pathSignature } = await import('../modules/domain/hint-novelty.ts');
const { readLevelsWithHints, writeLevelsWithHints, parseLevelSelector } = await import('./level-data-io.mjs');

const ROOT = new URL('..', import.meta.url).pathname;
const resolveFromRoot = p => (path.isAbsolute(p) ? p : path.join(ROOT, p));

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

function parseArgs(argv) {
    const args = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        args.set(key, rest.length ? rest.join('=') : 'true');
    }
    return args;
}

async function atomicWriteJson(filePath, data) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, abs);
}

async function loadCheckpoint(checkpointPath) {
    if (!checkpointPath) return new Map();
    try {
        const raw = JSON.parse(await readFile(resolveFromRoot(checkpointPath), 'utf8'));
        return new Map(Object.entries(raw.jobs || {}));
    } catch {
        return new Map(); // missing/corrupt checkpoint = start fresh, never a fatal error
    }
}

async function saveCheckpoint(checkpointPath, jobResults, parallel) {
    if (!checkpointPath) return;
    await atomicWriteJson(resolveFromRoot(checkpointPath), {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        parallel,
        jobs: Object.fromEntries(jobResults),
    });
}

function jobKey(levelNumber, gateKey, shardIndex) {
    return `${levelNumber}:${gateKey}:${shardIndex}`;
}

// Runs exactly one (level, gate, shard) job to completion — restricted to `job.shard`'s root
// children only (the whole point of sharding: without this, every "shard" would redundantly
// search the entire gate tree instead of its disjoint slice). Shared by both the worker-thread
// message handler below and the sequential (--parallel=1) path in main() — one implementation,
// same shape as hint-corpus-expand.mjs's processLevel() being called from both its worker branch
// and its own sequential loop.
async function runJob(job, nodeBudget) {
    const level = normalizeRawLevel(job.raw, job.levelNumber);
    const prep = prepLevel(level);
    const paths = [];
    const t0 = Date.now();
    const res = await enumerateFromGate(level, prep, job.gateKey, {
        onSolution: p => paths.push(p),
        rng: null, // deterministic order — required for a sound "exhausted" claim
        nodeBudget: nodeBudget > 0 ? nodeBudget : Infinity,
        rootChildren: job.shard,
    });
    return { paths, exhausted: res.exhausted, nodes: res.nodes, elapsedMs: Date.now() - t0 };
}

// ─── worker mode: run exactly one (level, gate, shard) job to completion, unbounded ────────────
if (!isMainThread) {
    parentPort.on('message', async (msg) => {
        if (msg?.type !== 'process') return;
        const result = await runJob({ levelNumber: msg.levelNumber, raw: msg.raw, gateKey: msg.gateKey, shard: msg.shard }, msg.nodeBudget);
        parentPort.postMessage({ type: 'result', levelNumber: msg.levelNumber, gateKey: msg.gateKey, shardIndex: msg.shardIndex, result });
    });
} else {
    await main();
}

async function main() {
    const argMap = parseArgs(process.argv.slice(2));
    const levelsJsonPath = argMap.get('--levels-json') || 'data/levels.json';
    const rawLevels = readLevelsWithHints(resolveFromRoot(levelsJsonPath));
    const levelNumbers = [...parseLevelSelector(rawLevels, argMap.get('--levels'))].sort((a, b) => a - b);
    const shardsPerGate = Math.max(1, Number(argMap.get('--shards-per-gate') || 4));
    const nodeBudget = Number(argMap.get('--node-budget') || 0); // 0 = unbounded (true "complete")
    const maxWallMs = Number(argMap.get('--max-wall-ms') || 0); // 0 = no overall deadline
    const checkpointPath = argMap.get('--checkpoint') || '';
    const output = argMap.get('--output') || 'reports/hint-discovery/complete-sharded-latest.json';
    const writeLevels = argMap.has('--write-levels');
    const parallelArg = argMap.has('--parallel')
        ? (argMap.get('--parallel') === '' ? Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1) : Number(argMap.get('--parallel')))
        : 1;

    // ─── build the full, deterministic job list ────────────────────────────────────────────────
    const jobs = []; // { levelNumber, raw, gateKey, shardIndex, shard }
    for (const levelNumber of levelNumbers) {
        const raw = rawLevels[levelNumber - 1];
        if (!raw) continue;
        const level = normalizeRawLevel(raw, levelNumber);
        const prep = prepLevel(level);
        for (const gateKey of level.gateKeys) {
            const children = rootChildrenForGate(level, prep, gateKey);
            const shards = planGateShards(children, shardsPerGate);
            shards.forEach((shard, shardIndex) => jobs.push({ levelNumber, raw, gateKey, shardIndex, shard }));
        }
    }
    jobs.sort((a, b) => a.levelNumber - b.levelNumber || a.gateKey - b.gateKey || a.shardIndex - b.shardIndex);

    // ─── resume: skip jobs the checkpoint already recorded a result for ────────────────────────
    const jobResults = await loadCheckpoint(checkpointPath); // jobKey -> { paths, exhausted, nodes }
    const pending = jobs.filter(j => !jobResults.has(jobKey(j.levelNumber, j.gateKey, j.shardIndex)));
    const skippedFromCheckpoint = jobs.length - pending.length;

    console.log(`Sharded complete enumeration: ${levelNumbers.length} level(s), ${jobs.length} job(s) `
        + `(${skippedFromCheckpoint} already done from checkpoint), ${shardsPerGate} shard(s)/gate, parallel=${parallelArg}`);

    const runStart = Date.now();
    const deadlineAt = maxWallMs > 0 ? runStart + maxWallMs : Infinity;
    let haltedByWallClock = false;

    const parallel = Math.max(1, Math.min(parallelArg, pending.length || 1));
    const recordAndCheckpoint = async (job, result) => {
        jobResults.set(jobKey(job.levelNumber, job.gateKey, job.shardIndex), result);
        await saveCheckpoint(checkpointPath, jobResults, parallelArg);
    };

    if (parallel === 1 || pending.length === 0) {
        for (const job of pending) {
            if (Date.now() >= deadlineAt) { haltedByWallClock = true; break; }
            const result = await runJob(job, nodeBudget);
            await recordAndCheckpoint(job, result);
            console.log(`  L${job.levelNumber} gate=${job.gateKey} shard=${job.shardIndex}: `
                + `${result.paths.length} solution(s), ${result.exhausted ? 'exhausted' : 'BUDGET-CUT'}, ${result.nodes} nodes, ${result.elapsedMs}ms`);
        }
    } else {
        console.log(`  parallel mode: ${parallel} worker(s) across ${pending.length} pending job(s).`);
        // dispatchedCount tracks jobs actually POSTED to a worker, not `pending.length` — the
        // wall-clock deadline only stops new dispatches; every already-dispatched job is always
        // allowed to run to completion and have its result recorded, so a deadline cutoff never
        // discards an in-flight job's about-to-arrive result (only unstarted jobs are skipped,
        // and those are exactly what --checkpoint lets a later run resume from).
        let nextJob = 0, dispatchedCount = 0, doneCount = 0;
        await new Promise((resolve, reject) => {
            const workers = [];
            const shutdown = () => workers.forEach(w => w.terminate());
            const dispatchNext = (worker) => {
                if (Date.now() >= deadlineAt) { haltedByWallClock = true; return false; }
                if (nextJob >= pending.length) return false;
                const job = pending[nextJob++];
                dispatchedCount++;
                worker.postMessage({ type: 'process', levelNumber: job.levelNumber, raw: job.raw, gateKey: job.gateKey, shardIndex: job.shardIndex, shard: job.shard, nodeBudget });
                return true;
            };
            for (let w = 0; w < parallel; w++) {
                const worker = new Worker(fileURLToPath(import.meta.url));
                workers.push(worker);
                worker.on('error', (err) => { shutdown(); reject(err); });
                worker.on('message', async (msg) => {
                    if (msg?.type !== 'result') return;
                    const job = pending.find(j => j.levelNumber === msg.levelNumber && j.gateKey === msg.gateKey && j.shardIndex === msg.shardIndex);
                    await recordAndCheckpoint(job, msg.result);
                    doneCount++;
                    console.log(`  L${msg.levelNumber} gate=${msg.gateKey} shard=${msg.shardIndex}: `
                        + `${msg.result.paths.length} solution(s), ${msg.result.exhausted ? 'exhausted' : 'BUDGET-CUT'}, ${msg.result.nodes} nodes, ${msg.result.elapsedMs}ms`);
                    if (!dispatchNext(worker) && doneCount === dispatchedCount) { shutdown(); resolve(); }
                });
                if (!dispatchNext(worker)) worker.terminate();
            }
            if (dispatchedCount === 0) resolve();
        });
    }

    // ─── merge: deterministic regardless of completion order — sort before dedupe/report ───────
    const levelReports = [];
    let totalNovel = 0;
    for (const levelNumber of levelNumbers) {
        const raw = rawLevels[levelNumber - 1];
        if (!raw) continue;
        const existingSigs = new Set((raw.hints || []).map(pathSignature));
        const level = normalizeRawLevel(raw, levelNumber);

        const levelJobs = jobs.filter(j => j.levelNumber === levelNumber);
        const merged = new Map(); // pathSignature -> path (shards are disjoint by construction, so
                                   // a collision here would indicate a sharding-soundness bug, not
                                   // legitimate overlap — Map dedup is a defensive backstop only).
        let allJobsHaveResults = true;
        let allExhausted = true;
        let totalNodes = 0;
        for (const job of levelJobs) {
            const key = jobKey(job.levelNumber, job.gateKey, job.shardIndex);
            const result = jobResults.get(key);
            if (!result) { allJobsHaveResults = false; allExhausted = false; continue; }
            if (!result.exhausted) allExhausted = false;
            totalNodes += result.nodes || 0;
            for (const p of result.paths) merged.set(pathSignature(p), p);
        }

        const sortedSigs = [...merged.keys()].sort();
        const novel = [];
        for (const sig of sortedSigs) {
            if (!existingSigs.has(sig)) novel.push(merged.get(sig));
        }
        totalNovel += novel.length;

        if (writeLevels && novel.length > 0) raw.hints = [...(raw.hints || []), ...novel];

        levelReports.push({
            level: levelNumber,
            gates: level.gateKeys.length,
            jobs: levelJobs.length,
            jobsCompleted: levelJobs.filter(j => jobResults.has(jobKey(j.levelNumber, j.gateKey, j.shardIndex))).length,
            totalSolutionsFound: merged.size,
            novelFound: novel.length,
            totalNodes,
            exhausted: allJobsHaveResults && allExhausted,
        });
        console.log(`L${levelNumber}: ${merged.size} total solution(s), +${novel.length} novel, `
            + `${allJobsHaveResults && allExhausted ? 'EXHAUSTIVE' : 'incomplete'}`);
    }

    if (writeLevels && totalNovel > 0) writeLevelsWithHints(resolveFromRoot(levelsJsonPath), rawLevels);

    const report = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        provenance: { sourceCommit: getCommitSha() },
        options: { levelsJsonPath, shardsPerGate, parallel: parallelArg, nodeBudget, maxWallMs, writeLevels, checkpoint: checkpointPath || null },
        totalMs: Date.now() - runStart,
        totalJobs: jobs.length,
        jobsSkippedFromCheckpoint: skippedFromCheckpoint,
        haltedByWallClock,
        totalNovel,
        levels: levelReports,
    };
    await atomicWriteJson(resolveFromRoot(output), report);
    console.log(`\nDone: ${totalNovel} novel hint(s) across ${levelReports.length} level(s). Report -> ${output}`);
    if (writeLevels && totalNovel > 0) console.log(`Updated -> ${levelsJsonPath}. Now run: npm run levels:generate-heatmaps && npm run check:hint-validity && npm run test:hint-path-oracle`);
    if (haltedByWallClock) console.log('Halted early: wall-clock cap reached. Re-run with the same --checkpoint to resume.');
}
