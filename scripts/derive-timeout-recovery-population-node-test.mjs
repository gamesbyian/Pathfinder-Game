#!/usr/bin/env node
/**
 * Coverage for scripts/derive-timeout-recovery-population.mjs: the gate deciding whether an
 * incomplete solver sweep population is safely auto-recoverable (missing ids only) versus a real
 * correctness problem (duplicates, unexpected ids, malformed rows, or no result at all) that must
 * never be silently retried.
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
    return execFile('node', ['scripts/derive-timeout-recovery-population.mjs', ...args], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
}

async function main() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'timeout-recovery-'));
    try {
        const expectedFile = path.join(tempDir, 'expected-ids.txt');
        await writeFile(expectedFile, ['R00001', 'R00002', 'R00003'].join('\n') + '\n');

        // Missing ids only -- recoverable.
        const missingOnlyResult = path.join(tempDir, 'missing-only.json');
        const missingOnlyOut = path.join(tempDir, 'missing-only-out.txt');
        await writeFile(missingOnlyResult, JSON.stringify({ levels: [{ id: 'R00001', ok: true }] }));
        const { stdout: okOut } = await run([`--expected-ids=${expectedFile}`, `--result=${missingOnlyResult}`, `--out=${missingOnlyOut}`]);
        assert.match(okOut, /RECOVERABLE: 2\/3 id\(s\) missing/);
        const missingIds = (await readFile(missingOnlyOut, 'utf8')).trim().split('\n').sort();
        assert.deepEqual(missingIds, ['R00002', 'R00003']);
        console.log('  ✓ missing-ids-only population is recoverable and writes exactly the missing ids');

        // Already complete -- recoverable trivially, with an empty (not missing) --out.
        const completeResult = path.join(tempDir, 'complete.json');
        const completeOut = path.join(tempDir, 'complete-out.txt');
        await writeFile(completeResult, JSON.stringify({ levels: [{ id: 'R00001' }, { id: 'R00002' }, { id: 'R00003' }] }));
        const { stdout: completeStdout } = await run([`--expected-ids=${expectedFile}`, `--result=${completeResult}`, `--out=${completeOut}`]);
        assert.match(completeStdout, /nothing to recover/);
        assert.equal((await readFile(completeOut, 'utf8')).trim(), '');
        console.log('  ✓ an already-complete population reports recoverable-with-nothing-to-recover');

        // Duplicate results -- NOT recoverable, exit 3, no --out written.
        const dupResult = path.join(tempDir, 'dup.json');
        const dupOut = path.join(tempDir, 'dup-out.txt');
        await writeFile(dupResult, JSON.stringify({ levels: [{ id: 'R00001' }, { id: 'R00001' }] }));
        await assert.rejects(
            () => run([`--expected-ids=${expectedFile}`, `--result=${dupResult}`, `--out=${dupOut}`]),
            (error) => { assert.equal(error.code, 3); assert.match(error.stderr, /NOT RECOVERABLE.*duplicate/s); return true; },
        );
        console.log('  ✓ duplicate results are NOT recoverable (genuine correctness problem)');

        // Unexpected results -- NOT recoverable.
        const unexpectedResult = path.join(tempDir, 'unexpected.json');
        await writeFile(unexpectedResult, JSON.stringify({ levels: [{ id: 'R00001' }, { id: 'R09999' }] }));
        await assert.rejects(
            () => run([`--expected-ids=${expectedFile}`, `--result=${unexpectedResult}`, `--out=${path.join(tempDir, 'unexpected-out.txt')}`]),
            (error) => { assert.equal(error.code, 3); assert.match(error.stderr, /NOT RECOVERABLE.*unexpected/s); return true; },
        );
        console.log('  ✓ unexpected results are NOT recoverable (genuine correctness problem)');

        // Malformed rows -- NOT recoverable.
        const malformedResult = path.join(tempDir, 'malformed.json');
        await writeFile(malformedResult, JSON.stringify({ levels: [{ ok: true }] }));
        await assert.rejects(
            () => run([`--expected-ids=${expectedFile}`, `--result=${malformedResult}`, `--out=${path.join(tempDir, 'malformed-out.txt')}`]),
            (error) => { assert.equal(error.code, 3); assert.match(error.stderr, /NOT RECOVERABLE.*malformed/s); return true; },
        );
        console.log('  ✓ malformed rows (no level id) are NOT recoverable');

        // No result file at all -- NOT recoverable (every shard likely crashed).
        await assert.rejects(
            () => run([`--expected-ids=${expectedFile}`, `--result=${path.join(tempDir, 'does-not-exist.json')}`, `--out=${path.join(tempDir, 'none-out.txt')}`]),
            (error) => { assert.equal(error.code, 4); assert.match(error.stderr, /NOT RECOVERABLE.*does not exist/s); return true; },
        );
        console.log('  ✓ a missing result file is NOT recoverable (exit 4, distinct from a correctness failure)');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
