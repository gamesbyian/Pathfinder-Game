#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(pkg.scripts['solver:regression'], 'node scripts/run-bundled.mjs scripts/solver-bench.mjs');
assert.equal(pkg.scripts['solver:measure-speed'], 'node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs');
assert.equal(pkg.scripts['stress:measure-solver'], 'node scripts/run-bundled.mjs scripts/stress/benchmark.mjs');
assert.equal(pkg.scripts['stress:measure-solver:raced'], 'node scripts/run-bundled.mjs scripts/solver-parallel/benchmark.mjs',
    'raced benchmark is a distinct package identity, not an alias of the sequential benchmark');
assert.equal(pkg.scripts['solver:direct'], 'node scripts/run-bundled.mjs scripts/run-solver-direct.mjs');
assert.equal(pkg.scripts['solver:combine-sweep-reports'], 'node scripts/combine-solver-sweep-reports.mjs');
for (const removed of ['solver:bench', 'solver:speed-probe', 'stress:benchmark', 'solver:combine-corpus2-batches']) {
    assert.equal(pkg.scripts[removed], undefined, `deprecated package alias ${removed} is retired`);
}

const dir = mkdtempSync(path.join(tmpdir(), 'phase9-command-smoke-'));
try {
    const out = path.join(dir, 'speed-probe.json');
    execFileSync('npm', ['run', 'solver:measure-speed', '--', '--count=0', `--out=${out}`], {
        cwd: process.cwd(), stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
    });
    const report = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(report.corpus, 'published');
    assert.equal(report.count, 0);
    assert.deepEqual(report.rows, []);
} finally {
    rmSync(dir, { recursive: true, force: true });
}
console.log('Phase-9 package identities and real zero-work speed-probe invocation are valid.');
