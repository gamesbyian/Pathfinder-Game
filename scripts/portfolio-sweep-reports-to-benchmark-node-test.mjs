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

        // Duplicate ids across batches mean ranges/inputs overlap. Picking a winner would silently
        // discard a real run (the same failure family as the cross-corpus R02000 collision).
        const batch1Again = path.join(tempDir, 'batch-01-again.json');
        await writeFile(batch1Again, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R00001', ok: false, status: 'timeout', totalMs: 8000, elapsedMs: 8000, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));
        await assert.rejects(() => run([`--in=${batch1},${batch1Again}`, `--out=${path.join(tempDir, 'combined-dup.json')}`]), /Duplicate level id R00001/);
        console.log('  ✓ rejects duplicate level ids across overlapping batches');

        const duplicatePosition = path.join(tempDir, 'batch-position-overlap.json');
        await writeFile(duplicatePosition, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R99999', ok: false, status: 'timeout' }],
        })));
        await assert.rejects(() => run([`--in=${batch1},${duplicatePosition}`, `--out=${outFile}`]), /Duplicate level position 1/);
        console.log('  ✓ rejects duplicate level positions even when ids differ');

        // The combined report is what becomes an official baseline `source`, and it used to keep
        // ONLY budgetMs -- dropping nodeBudget/repairBudgetFraction/adaptiveBudget entirely. That
        // made every combined report's per-attempt nodesExpanded uninterpretable (no ceiling to read
        // it against) and made two sweeps' costs incomparable. Measured 2026-07-29 on the 240-shard
        // high-budget sweep, whose combined report records no node budget at all.
        const nb1 = path.join(tempDir, 'nb-01.json');
        const nb2 = path.join(tempDir, 'nb-02.json');
        const nbOut = path.join(tempDir, 'combined-nb.json');
        await writeFile(nb1, JSON.stringify(batchReport({
            summary: { nodeBudget: 20000000, repairBudgetFraction: 0 },
            levels: [{ level: 1, id: 'R00001', ok: true }],
        })));
        await writeFile(nb2, JSON.stringify(batchReport({
            summary: { nodeBudget: 20000000, repairBudgetFraction: 0 },
            levels: [{ level: 2, id: 'R00002', ok: false }],
        })));
        await run([`--in=${nb1},${nb2}`, `--out=${nbOut}`]);
        const nbCombined = JSON.parse(await readFile(nbOut, 'utf8'));
        assert.equal(nbCombined.nodeBudget, 20000000, 'agreed nodeBudget carried through as a scalar');
        assert.equal(nbCombined.repairBudgetFraction, 0, 'repairBudgetFraction carried through');
        console.log('  ✓ carries nodeBudget/repairBudgetFraction through when every shard agrees');

        // Differing node budgets are LEGITIMATE (solver-highbudget-unsolved-sweep.yml shards with
        // weighted per-shard budgets), so unlike budgetMs this must not throw -- but collapsing to
        // the first shard's value would misreport every other shard, so record the distinct set.
        const nb3 = path.join(tempDir, 'nb-03.json');
        const nbMixedOut = path.join(tempDir, 'combined-nb-mixed.json');
        await writeFile(nb3, JSON.stringify(batchReport({
            summary: { nodeBudget: 120000000 },
            levels: [{ level: 3, id: 'R00003', ok: false }],
        })));
        await run([`--in=${nb1},${nb3}`, `--out=${nbMixedOut}`]);
        const nbMixed = JSON.parse(await readFile(nbMixedOut, 'utf8'));
        assert.deepEqual(nbMixed.nodeBudget, [20000000, 120000000], 'differing node budgets recorded as a set, not silently collapsed');
        console.log('  ✓ records differing per-shard node budgets instead of collapsing or throwing');

        // A sweep run with no node budget at all must still say so explicitly (null), so a reader
        // can distinguish "unbounded" from "this combiner forgot to record it".
        const noNbOut = path.join(tempDir, 'combined-no-nb.json');
        await run([`--in=${batch1},${batch2}`, `--out=${noNbOut}`]);
        const noNb = JSON.parse(await readFile(noNbOut, 'utf8'));
        assert.equal(noNb.nodeBudget, null, 'absent node budget recorded as explicit null');
        assert.ok(!('repairBudgetFraction' in noNb), 'absent repairBudgetFraction omitted, not null-filled');
        console.log('  ✓ records an absent node budget as explicit null');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
