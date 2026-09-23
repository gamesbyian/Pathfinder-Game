#!/usr/bin/env node
/**
 * Regression coverage for scripts/portfolio-solve-sweep.mjs's canonical solver-request identity
 * dual-write: proves the real bundled CLI (matching level-blind-capability-sweep-cli-node-test.mjs's
 * own execFile pattern) persists solverRequestProjection/solverRequestIdentity in its report summary,
 * alongside the existing legacy effectiveConfig/effectiveConfigDigest pair, and that a distinctive
 * --node-budget sentinel actually reaches the persisted projection rather than only proving shape.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'portfolio-solve-sweep-cli-'));
const corpusPath = path.join(dir, 'corpus.json');
const outFile = path.join(dir, 'report.json');
const summaryOutFile = path.join(dir, 'report-summary.md');
const checkpointPath = path.join(dir, 'checkpoint.jsonl');
await writeFile(corpusPath, JSON.stringify([{
    id: 'FIXTURE-1',
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 }, reqLen: 8, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
    filters: [], flippingFilters: [], portals: [],
}]));

// This tool is bundler-only by established convention (every workflow invokes it via
// `node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- ...`, never plain node
// directly), matching level-blind-capability-sweep-cli-node-test.mjs's own real-CLI contract.
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/portfolio-solve-sweep.mjs',
    `--corpus=${corpusPath}`, '--scheduler-mode=production', '--budget-ms=5000', '--node-budget=12345',
    `--checkpoint=${checkpointPath}`,
    `--out=${outFile}`, `--summary-out=${summaryOutFile}`,
], { cwd: ROOT });

const report = JSON.parse(await readFile(outFile, 'utf8'));
assert.equal(report.levels.length, 1);
assert.equal(report.levels[0].ok, true, 'fixture level must be solvable for this to be a meaningful check');

// Canonical solver-request identity dual-write (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 3.2): proves the value actually reaches the real bundled invocation
// boundary and round-trips through the plain-Node digest owner, not merely that the fields exist.
assert.equal(report.summary.solverRequestProjection?.kind, 'pathfinder-solver-request-projection');
assert.equal(report.summary.solverRequestProjection?.resourceEnvelope?.timeBudgetMs, 5000,
    '--budget-ms=5000 must reach the canonical projection unchanged');
assert.equal(report.summary.solverRequestProjection?.resourceEnvelope?.nodeBudget, 12345,
    '--node-budget=12345 must reach the canonical projection unchanged');
assert.equal(report.summary.solverRequestProjection?.scheduler?.mode, 'production');
assert.equal(
    report.summary.solverRequestIdentity,
    solverRequestIdentityFromProjection(report.summary.solverRequestProjection),
    'the persisted identity must match a fresh recomputation from the persisted projection',
);
assert.notEqual(report.summary.solverRequestIdentity, report.summary.effectiveConfigDigest,
    'canonical solver-request identity and the legacy effectiveConfig digest are different identities and must not collapse to the same value');
assert.ok(typeof report.summary.effectiveConfig === 'object' && report.summary.effectiveConfig,
    'legacy effectiveConfig must still be present; this is a dual-write, not a replacement');

console.log('portfolio-solve-sweep CLI: solver request identity dual-write verified');
