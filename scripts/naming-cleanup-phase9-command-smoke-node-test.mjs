#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(pkg.scripts['solver:bench'], 'node scripts/run-bundled.mjs scripts/solver-bench.mjs');
assert.equal(pkg.scripts['solver:speed-probe'], 'node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs');
assert.equal(pkg.scripts['stress:benchmark'], 'node scripts/run-bundled.mjs scripts/stress/benchmark.mjs');
assert.equal(pkg.scripts['stress:benchmark:raced'], 'node scripts/run-bundled.mjs scripts/solver-parallel/benchmark.mjs',
    'raced benchmark is a distinct package identity, not an alias of the sequential benchmark');

const dir = mkdtempSync(path.join(tmpdir(), 'phase9-command-smoke-'));
try {
    const out = path.join(dir, 'speed-probe.json');
    execFileSync('npm', ['run', 'solver:speed-probe', '--', '--count=0', `--out=${out}`], {
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
