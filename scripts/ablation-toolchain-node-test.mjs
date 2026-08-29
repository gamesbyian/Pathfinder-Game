#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildExperimentList } from '../modules/solver/ablation-config.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const canonicalProfiles = buildExperimentList('scoring-profiles');
const legacyProfiles = buildExperimentList('profiles');
assert.ok(canonicalProfiles.length > 1, 'scoring-profiles must include more than baseline');
assert.deepEqual(legacyProfiles.map(x => x.name), canonicalProfiles.map(x => x.name),
    'legacy profiles selector must normalize to scoring-profiles');

const canonicalBiases = buildExperimentList('ordering-biases');
const legacyTemplates = buildExperimentList('templates');
assert.ok(canonicalBiases.length > 1, 'ordering-biases must include more than baseline');
assert.deepEqual(legacyTemplates.map(x => x.name), canonicalBiases.map(x => x.name),
    'legacy templates selector must normalize to ordering-biases');

const runnerSource = await readFile(path.join(repoRoot, 'scripts/run-ablation.mjs'), 'utf8');
assert.match(runnerSource, /Solver\.solveLevel\(/, 'ablation runner must use the canonical solver API');
assert.doesNotMatch(runnerSource, /Solver\.solve\(/, 'removed Solver.solve alias must not return');
assert.match(runnerSource, /solvedByScoringProfileId/, 'ablation output must qualify scoring-profile identity');

const dir = await mkdtemp(path.join(tmpdir(), 'pathfinder-ablation-test-'));
try {
    const input = path.join(dir, 'input.json');
    const output = path.join(dir, 'analysis.json');
    const summary = { solved: 1, failed: 0, errors: 0, total: 1, solveRate: 1, totalMs: 10, avgMs: 10, medianMs: 10, p95Ms: 10, nodesExpanded: 100, nodesPerSolved: 100, nodesPerFailed: 0 };
    const failedSummary = { ...summary, solved: 0, failed: 1, solveRate: 0, nodesPerSolved: 0, nodesPerFailed: 100 };
    const data = {
        budgetMs: 1000,
        phase: 'full',
        levelCount: 1,
        runs: [
            {
                name: 'baseline', label: 'Baseline', tags: ['baseline'], summary,
                solvedLevels: [1], failedLevels: [],
                levels: [{ level: 1, ok: true, elapsedMs: 10, nodesExpanded: 100,
                    solvedByScoringProfileId: 'default',
                    attempts: [{ ok: true, scoringProfileId: 'default', orderingBiasId: 'cornerHarvest' }] }],
            },
            {
                name: 'scoring-profile-off:default', label: 'Scoring profile removed: default',
                tags: ['scoring-profile', 'single-feature'], summary: failedSummary,
                solvedLevels: [], failedLevels: [1],
                levels: [{ level: 1, ok: false, elapsedMs: 10, nodesExpanded: 100 }],
            },
            {
                name: 'ordering-bias-off:cornerHarvest', label: 'Structural ordering bias removed: cornerHarvest',
                tags: ['ordering-bias', 'single-feature'], summary: failedSummary,
                solvedLevels: [], failedLevels: [1],
                levels: [{ level: 1, ok: false, elapsedMs: 10, nodesExpanded: 100 }],
            },
        ],
    };
    await writeFile(input, JSON.stringify(data));
    const run = spawnSync(process.execPath, ['scripts/analyze-ablation.mjs', `--input=${input}`, `--output=${output}`], {
        cwd: repoRoot, encoding: 'utf8',
    });
    assert.equal(run.status, 0, `analyzer failed:\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    const analysis = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(analysis.scoringProfileRanking[0]?.scoringProfileId, 'default');
    assert.equal(analysis.orderingBiasRanking[0]?.orderingBiasId, 'cornerHarvest');
    assert.equal('profileRanking' in analysis, false, 'current analyzer must single-write canonical ranking names');
    assert.equal('templateRanking' in analysis, false, 'current analyzer must single-write canonical ranking names');
} finally {
    await rm(dir, { recursive: true, force: true });
}

console.log('ablation toolchain node test: ok');
