#!/usr/bin/env node
/**
 * Cross-process batch-parallelism wrapper for scripts/hint-workbench.mjs.
 *
 * hint-workbench.mjs itself is deliberately a flat, single-script step model (see its own
 * candidate-grid/ablation-full step comments and docs/hint-workbench.md's "Current limitations") —
 * the same reason scripts/hint-complete-enumeration-sharded.mjs and hint-corpus-expand.mjs's
 * `--parallel` stay separate scripts rather than being folded in: worker_threads self-spawning
 * needs an isMainThread-gated structure that conflicts with that flat model. This wrapper gets
 * cross-LEVEL parallelism without touching that structure at all: it partitions the requested
 * levels round-robin across N child PROCESSES (not in-process workers), each running an ordinary,
 * unmodified `node <bundle> --levels=<its own slice> --output=<its own shard report>` — sidesteps
 * the worker_threads/tsx-ESM-loader-hook problem entirely, since each child is a fresh process.
 *
 * Concurrent --write-levels is safe by construction, not by luck: writeLevelsWithHints
 * (level-data-io.mjs) only rewrites a level's per-level hints/<id>.json file when that level's own
 * in-memory .hints/.hintRecords identity changed since read, and levels.json itself never carries
 * hints at rest for a split corpus (see that file's own "concurrent processes over disjoint level
 * sets" comment) — so N children each touching a disjoint level slice never race on the same file
 * for the same level. This wrapper's own contribution is only ensuring the slices ARE disjoint.
 *
 * Usage:
 *   npm run hints:workbench-parallel -- --levels=all --parallel=4 --preset=enumerate-targeted \
 *     --policy=audit-only --audit-policy=novelty-gated --output=reports/hint-discovery/parallel.json
 *   npm run hints:workbench-parallel -- --levels=id:1-50 --parallel=8 --preset=full-practical-plus \
 *     --policy=novelty-gated --write-levels --yes=true --output=reports/hint-discovery/parallel.json
 *
 * Every flag other than --levels/--output/--parallel/--allow-artifact-output is passed straight
 * through to each child verbatim (e.g. --preset, --policy, --wall-ms, --seed, --write-levels).
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { buildBundle } from './run-bundled.mjs';
import { readLevelsWithHints, parseLevelSelector } from './level-data-io.mjs';

installBrowserStubs();

const ROOT = new URL('..', import.meta.url).pathname;
// --write-patch is wrapper-owned too, NOT just passed through: hint-workbench.mjs writes its patch
// file once, atomically, at the very end of its own run -- if every shard were given the SAME
// user-supplied --write-patch path verbatim, the last shard to finish would silently overwrite
// every earlier shard's patch (last-writer-wins, not a merge), losing their accepted candidates
// entirely. This wrapper instead gives each shard its own patch path and merges them below.
const WRAPPER_OWNED_FLAGS = new Set(['--levels', '--output', '--parallel', '--allow-artifact-output', '--write-patch', '--help']);

function parseArgs(argv) {
    const out = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        out.set(key, rest.length ? rest.join('=') : 'true');
    }
    return out;
}

function relativePath(filePath) {
    return path.relative(ROOT, filePath) || '.';
}

function isPathInside(child, parent) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// Mirrors hint-workbench.mjs's own assertSafeReportOutput — duplicated rather than imported since
// that script exports nothing (a flat top-level CLI, not a module); this is a small, self-contained
// guard, not shared logic worth a new abstraction for two call sites.
function assertSafeReportOutput(outputPath, allowArtifactOutput) {
    if (allowArtifactOutput) return;
    const absOutput = path.resolve(outputPath);
    const blockedDir = path.join(ROOT, 'data');
    if (isPathInside(absOutput, blockedDir)) {
        throw new Error(`Refusing to write report inside source-controlled artifact path ${relativePath(blockedDir)}. Use --allow-artifact-output=true to override.`);
    }
}

async function atomicWriteJson(filePath, data) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, abs);
}

function shardOutputPath(baseOutput, shardIndex) {
    const dir = path.dirname(baseOutput);
    const ext = path.extname(baseOutput);
    const stem = path.basename(baseOutput, ext);
    return path.join(dir, `${stem}.shard${shardIndex}${ext || '.json'}`);
}

// Round-robin, not contiguous blocks: levels have wildly different solve cost (per CLAUDE.md's
// "open board space is a puzzle variable in its own right" gotcha and general solver-difficulty
// variance), so interleaving spreads any systematic early/late-corpus cost skew evenly across
// shards instead of one shard drawing a run of unusually expensive (or cheap) neighboring levels.
function partitionRoundRobin(positions, shardCount) {
    const sorted = [...positions].sort((a, b) => a - b);
    const shards = Array.from({ length: shardCount }, () => []);
    sorted.forEach((pos, i) => shards[i % shardCount].push(pos));
    return shards.filter(shard => shard.length > 0);
}

function passthroughArgv(argv) {
    return argv.filter(arg => {
        const key = arg.split('=')[0];
        return !WRAPPER_OWNED_FLAGS.has(key);
    });
}

// Streams a child's stdout/stderr line-by-line with a shard-tag prefix, so progress from every
// shard is visible as it happens (never only at the end) -- per CLAUDE.md's batch-tool principle.
function pipeWithPrefix(stream, prefix, target) {
    createInterface({ input: stream }).on('line', (line) => target.write(`${prefix} ${line}\n`));
}

function runShard(bundlePath, shardArgv, shardIndex) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [bundlePath, ...shardArgv], { stdio: ['ignore', 'pipe', 'pipe'] });
        const prefix = `[shard ${shardIndex}]`;
        pipeWithPrefix(child.stdout, prefix, process.stdout);
        pipeWithPrefix(child.stderr, prefix, process.stderr);
        child.on('error', (err) => resolve({ shardIndex, exitCode: 1, error: err.message }));
        child.on('exit', (code, signal) => resolve({ shardIndex, exitCode: signal ? 1 : (code ?? 1), signal: signal ?? null }));
    });
}

async function main() {
    const argv = process.argv.slice(2);
    const args = parseArgs(argv);
    if (args.has('--help')) {
        console.log('Cross-process batch-parallelism wrapper for hint-workbench.mjs. See this file\'s header comment for usage.');
        process.exit(0);
    }

    const levelsJsonPath = args.get('--levels-json') || 'data/levels.json';
    const absLevelsJsonPath = path.isAbsolute(levelsJsonPath) ? levelsJsonPath : path.join(ROOT, levelsJsonPath);
    const rawLevels = readLevelsWithHints(absLevelsJsonPath);
    const positions = [...parseLevelSelector(rawLevels, args.get('--levels') || 'all')];
    if (positions.length === 0) { console.log('No levels matched --levels; nothing to do.'); return; }

    const output = args.get('--output') || 'reports/hint-discovery/workbench-parallel-latest.json';
    const allowArtifactOutput = args.get('--allow-artifact-output') === 'true';
    assertSafeReportOutput(output, allowArtifactOutput);
    const userWritePatch = args.get('--write-patch') || '';
    if (userWritePatch) assertSafeReportOutput(userWritePatch, allowArtifactOutput);

    const requestedParallel = args.has('--parallel')
        ? (args.get('--parallel') === '' ? Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1) : Number(args.get('--parallel')))
        : Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
    const shards = partitionRoundRobin(positions, Math.max(1, Math.min(requestedParallel, positions.length)));

    console.log(`hint-workbench-parallel: ${positions.length} level(s) across ${shards.length} shard(s).`);
    const bundlePath = buildBundle('scripts/hint-workbench.mjs');
    const basePassthrough = passthroughArgv(argv);

    const startedAt = Date.now();
    const shardOutputs = shards.map((_, i) => shardOutputPath(output, i));
    const shardPatches = userWritePatch ? shards.map((_, i) => shardOutputPath(userWritePatch, i)) : null;
    const runs = await Promise.all(shards.map((shardPositions, i) => {
        const shardArgv = [
            ...basePassthrough,
            `--levels=${shardPositions.map(p => `pos:${p}`).join(',')}`,
            `--output=${shardOutputs[i]}`,
            ...(shardPatches ? [`--write-patch=${shardPatches[i]}`] : []),
            ...(allowArtifactOutput ? ['--allow-artifact-output=true'] : []),
        ];
        return runShard(bundlePath, shardArgv, i);
    }));

    const failed = runs.filter(r => r.exitCode !== 0);
    let totalAccepted = 0;
    let totalDuplicateProvenance = 0;
    const changedFiles = new Set();
    const mergedPatchLevels = [];
    const shardReports = [];
    for (let i = 0; i < shards.length; i++) {
        const run = runs[i];
        if (run.exitCode !== 0) {
            shardReports.push({ shardIndex: i, levels: shards[i], exitCode: run.exitCode, signal: run.signal ?? null, error: run.error ?? null, report: null });
            continue;
        }
        let report = null;
        try {
            report = JSON.parse(await readFile(shardOutputs[i], 'utf8'));
        } catch (err) {
            console.error(`[shard ${i}] exited 0 but its report could not be read: ${err.message}`);
        }
        if (report) {
            totalAccepted += report.totalAccepted ?? 0;
            totalDuplicateProvenance += report.totalDuplicateProvenance ?? 0;
            for (const f of report.writes?.changedFiles ?? []) changedFiles.add(f);
        }
        if (shardPatches) {
            // A shard with nothing accepted never writes its patch file at all (hint-workbench.mjs's
            // own guard) — that's the expected common case, not an error.
            try {
                const shardPatch = JSON.parse(await readFile(shardPatches[i], 'utf8'));
                mergedPatchLevels.push(...(shardPatch.levels ?? []));
            } catch { /* no patch from this shard — nothing accepted */ }
        }
        shardReports.push({ shardIndex: i, levels: shards[i], exitCode: run.exitCode, report });
    }

    if (shardPatches && mergedPatchLevels.length > 0) {
        await atomicWriteJson(userWritePatch, {
            schemaVersion: 1,
            levelsPath: relativePath(absLevelsJsonPath),
            totalAccepted,
            totalDuplicateProvenance,
            levels: mergedPatchLevels,
        });
        console.log(`Merged patch -> ${userWritePatch}`);
    }

    await atomicWriteJson(output, {
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        totalMs: Date.now() - startedAt,
        totalLevels: positions.length,
        shardCount: shards.length,
        totalAccepted,
        totalDuplicateProvenance,
        failedShards: failed.map(r => r.shardIndex),
        changedFiles: [...changedFiles],
        mergedPatch: shardPatches && mergedPatchLevels.length > 0 ? relativePath(path.resolve(userWritePatch)) : null,
        shards: shardReports,
    });

    console.log(`\nDone: ${totalAccepted} accepted, ${totalDuplicateProvenance} duplicate-provenance merge(s) across ${shards.length} shard(s) (${failed.length} failed). Report -> ${output}`);
    if (changedFiles.size > 0) console.log('Post-write checks: npm run levels:generate-heatmaps && npm run check:hint-validity && npm run test:hint-path-validation');
    if (failed.length > 0) {
        console.error(`${failed.length} shard(s) failed: ${failed.map(r => `shard ${r.shardIndex} (exit ${r.exitCode}${r.error ? `, ${r.error}` : ''})`).join('; ')}`);
        process.exitCode = 1;
    }
}

await main();
