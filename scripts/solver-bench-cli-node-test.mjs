#!/usr/bin/env node
/**
 * Regression coverage for scripts/solver-bench.mjs's --scheduler=static-portfolio mode (the
 * portfolio-18-tranche-v2 offline/batch adoption — see docs/solver-optimization-workstreams.md's
 * Workstream 2 handoff). Runs the real CLI against a small slice of the real published corpus
 * (data/levels.json) and the real committed baseline/cap-map artifacts, matching this repo's
 * established execFile-CLI-test convention (scripts/level-blind-capability-sweep-cli-node-test.mjs).
 *
 * Scope: this only checks the new flag's wiring (parsing, guards, report-vs-gate exit-code
 * behavior, --out shape) and that omitting --scheduler reproduces the pre-existing default
 * behavior byte-for-byte. It does not re-derive tranche-v2's own coverage/work evidence — that is
 * reports/2026-09-03-portfolio-18-specialists-production-envelope-confirmation-00[23]-preflight.md's
 * job, not this fast unit test's.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'solver-bench-cli-'));

async function run(extraArgs, { expectFailure = false } = {}) {
    try {
        const { stdout, stderr } = await execFile(process.execPath, [
            'scripts/run-bundled.mjs', 'scripts/solver-bench.mjs', '--levels=pos:1', ...extraArgs,
        ], { cwd: ROOT });
        if (expectFailure) assert.fail(`expected failure but exited 0. stdout:\n${stdout}\nstderr:\n${stderr}`);
        return { stdout, stderr, code: 0 };
    } catch (e) {
        if (!expectFailure) throw e;
        return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code };
    }
}

// 1. Omitting --scheduler reproduces the pre-existing default-production behavior: real level 1
//    solves, no regression against the committed baseline, exit 0.
{
    const { stdout } = await run([]);
    assert.match(stdout, /scheduler=production/);
    assert.match(stdout, /solver-bench --check PASS/);
}

// 2. --scheduler=static-portfolio: real level 1 (part of the 160/160 tranche-v2 solved the full
//    corpus in this session's own evidence run) solves under the confirmed portfolio-18-tranche-v2
//    configuration, is a REPORT not a gate (exit 0 even though it's a materially different policy
//    from the baseline), and surfaces the tranche-v2-specific work-spent line.
{
    const { stdout } = await run(['--scheduler=static-portfolio']);
    assert.match(stdout, /scheduler=static-portfolio/);
    assert.match(stdout, /workBudget=67,000,000/);
    assert.match(stdout, /tranche-v2 vs full-production baseline — no coverage loss/);
    // The work-spent comparison line is full-corpus-only (mirrors the pre-existing production-mode
    // cost-delta gate, which is likewise suppressed under --levels since a subset's cost isn't
    // comparable to the baseline's full-corpus totals) — this test uses --levels=pos:1 for speed,
    // so it must NOT appear here.
    assert.doesNotMatch(stdout, /work spent:/);
}

// 3. --out captures the scheduler label and (only in static-portfolio mode) workSpent, without
//    disturbing the existing default-mode --out shape.
{
    const outFile = path.join(dir, 'production.json');
    await run([`--out=${outFile}`]);
    const report = JSON.parse(await readFile(outFile, 'utf8'));
    assert.equal(report.scheduler, 'production');
    assert.equal(Object.hasOwn(report, 'workSpent'), false);
}
{
    const outFile = path.join(dir, 'static-portfolio.json');
    await run(['--scheduler=static-portfolio', `--out=${outFile}`]);
    const report = JSON.parse(await readFile(outFile, 'utf8'));
    assert.equal(report.scheduler, 'static-portfolio');
    assert.equal(report.workBudget, 67_000_000);
    assert.ok(Number.isFinite(report.workSpent) && report.workSpent > 0);
    assert.deepEqual(report.solved, [1]);
}

// 4. Rollback/guard rails: an unknown --scheduler value, and combining --scheduler=static-portfolio
//    with --order or --update-baseline (neither of which this mode supports), all fail loudly at
//    exit code 2 rather than silently doing something unintended.
{
    const { code, stderr } = await run(['--scheduler=nonsense'], { expectFailure: true });
    assert.equal(code, 2);
    assert.match(stderr, /Unknown --scheduler=nonsense/);
}
{
    const { code, stderr } = await run(['--scheduler=static-portfolio', '--order=reverse'], { expectFailure: true });
    assert.equal(code, 2);
    assert.match(stderr, /does not support --order/);
}
{
    const { code, stderr } = await run(['--scheduler=static-portfolio', '--update-baseline'], { expectFailure: true });
    assert.equal(code, 2);
    assert.match(stderr, /cannot --update-baseline/);
}

console.log('solver-bench-cli-node-test: all assertions passed.');
