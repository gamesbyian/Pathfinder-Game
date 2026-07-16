#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/portfolio-sweep-reports-to-benchmark.mjs: combines N
 * portfolio-solve-sweep.mjs report files ({summary, levels} shape) into ONE
 * stress:benchmark.mjs-shaped flat report. Uses hand-built synthetic fixtures so budgetMs
 * mismatch/duplicate-id handling is exercised deterministically.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(args) {
    return execFile('node', ['scripts/portfolio-sweep-reports-to-benchmark.mjs', ...args], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
}

function batchReport(overrides = {}) {
    return {
        summary: { commit: 'abc123', corpus: 'data/stress/stress-levels-random.json', schedulerMode: 'legacy', budgetMs: 8000, ...overrides.summary },
        levels: overrides.levels ?? [],
    };
}

async function main() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'portfolio-sweep-merge-'));
    try {
        const batch1 = path.join(tempDir, 'batch-01.json');
        const batch2 = path.join(tempDir, 'batch-02.json');
        const outFile = path.join(tempDir, 'combined.json');

        await writeFile(batch1, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R00001', ok: true, status: 'success', totalMs: 100, elapsedMs: 100, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));
        await writeFile(batch2, JSON.stringify(batchReport({
            levels: [{ level: 2, id: 'R00002', ok: false, status: 'timeout', totalMs: 8000, elapsedMs: 8000, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));

        await run([`--in=${batch1},${batch2}`, `--out=${outFile}`]);
        const combined = JSON.parse(await readFile(outFile, 'utf8'));
        assert.equal(combined.budgetMs, 8000, 'budgetMs flattened to top level');
        assert.equal(combined.corpus, 'data/stress/stress-levels-random.json');
        assert.equal(combined.levels.length, 2);
        assert.equal(combined.solved, 1);
        assert.equal(combined.failed, 1);
        assert.equal(combined.total, 2);
        console.log('  ✓ merges two batches into one flat, budgetMs-bearing report');

        // Mismatched budgetMs across batches must fail loudly, not silently average/pick one --
        // rank-levels.mjs/classify-stability.mjs would divide by a single wrong budgetMs otherwise.
        const batch3 = path.join(tempDir, 'batch-03-mismatch.json');
        await writeFile(batch3, JSON.stringify(batchReport({ summary: { budgetMs: 20000 }, levels: [{ level: 3, id: 'R00003', ok: true }] })));
        await assert.rejects(() => run([`--in=${batch1},${batch3}`, `--out=${outFile}`]), /Mismatched budgetMs/);
        console.log('  ✓ rejects mismatched budgetMs across batches');

        // Duplicate ids across batches (shouldn't happen for disjoint batch ranges, but a corrupted
        // re-run could produce one) keep the later file's row rather than silently duplicating it.
        const batch1Again = path.join(tempDir, 'batch-01-again.json');
        await writeFile(batch1Again, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R00001', ok: false, status: 'timeout', totalMs: 8000, elapsedMs: 8000, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));
        const dupOut = path.join(tempDir, 'combined-dup.json');
        await run([`--in=${batch1},${batch1Again}`, `--out=${dupOut}`]);
        const dupCombined = JSON.parse(await readFile(dupOut, 'utf8'));
        assert.equal(dupCombined.levels.length, 1, 'duplicate id collapses to one row');
        assert.equal(dupCombined.levels[0].ok, false, 'later file wins on duplicate id');
        console.log('  ✓ duplicate level id across batches keeps the later row, does not double-count');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
