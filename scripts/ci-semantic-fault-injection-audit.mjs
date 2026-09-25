#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { classifyPaths } from './ci-impact-classifier.mjs';
import { planValidation } from './ci-validation-plan.mjs';

const ROOT = process.cwd();

const cases = [
  {
    id: 'game-editor-port-miswire',
    target: 'modules/app.ts',
    from: '        switchMode:              engine.switchMode,',
    to:   '        switchMode:              engine.clearHintPaths,',
    detector: ['node_modules/vitest/vitest.mjs', 'run', 'modules/app.test.ts'],
    expectedSurfaces: ['game'],
    expectedCapabilities: ['build', 'lint', 'unit-coverage'],
  },
  {
    id: 'persistence-auth-token-drop',
    target: 'modules/persistence.ts',
    from: '        initialAuthToken: runtimeConfig.initialAuthToken,',
    to:   '        initialAuthToken: undefined,',
    detector: ['node_modules/vitest/vitest.mjs', 'run', 'modules/persistence.test.ts'],
    expectedSurfaces: ['game', 'persistence'],
    expectedCapabilities: ['build', 'firestore-boundary', 'lint', 'unit-coverage'],
  },
  {
    id: 'solver-gate-interleaving-disabled',
    target: 'modules/solver/orchestration.ts',
    from: '    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);',
    to:   '    const useInterleaving = false;',
    detector: [
      'node_modules/vitest/vitest.mjs',
      'run',
      'modules/solver/orchestration-core.test.ts',
      'modules/solver/routing-regime.test.ts',
      'modules/solver/production-default-equivalence.test.ts',
    ],
    expectedSurfaces: ['research', 'solver'],
    expectedCapabilities: ['build', 'deep-proofs', 'lint', 'unit-coverage'],
  },
  {
    id: 'router-solver-deep-proof-drop',
    target: 'scripts/ci-validation-plan.json',
    from: '        "deep-proofs",\n',
    to: '',
    detector: ['scripts/ci-validation-plan-node-test.mjs'],
    expectedFull: true,
    expectedCapabilities: ['build', 'deep-proofs', 'firestore-boundary', 'lint', 'unit-coverage'],
  },
];

function replaceExactlyOnce(file, from, to) {
  const text = fs.readFileSync(file, 'utf8');
  const occurrences = text.split(from).length - 1;
  assert.equal(occurrences, 1, `mutation anchor count for ${file}: expected 1, got ${occurrences}`);
  fs.writeFileSync(file, text.replace(from, to));
}

function runDetector(worktree, detector) {
  const [entrypoint, ...args] = detector;
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: worktree,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: [path.join(worktree, 'node_modules', '.bin'), process.env.PATH ?? ''].filter(Boolean).join(path.delimiter),
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function routeFor(testCase) {
  const impact = classifyPaths([testCase.target]);
  if (testCase.expectedFull) {
    assert.equal(impact.full, true, `${testCase.id}: router authority must escalate to full`);
  } else {
    assert.equal(impact.full, false, `${testCase.id}: unexpectedly escalated to full`);
    assert.deepEqual(impact.surfaces, [...testCase.expectedSurfaces].sort(), `${testCase.id}: routed surfaces`);
  }
  const plan = planValidation(impact.surfaces);
  for (const capability of testCase.expectedCapabilities) {
    assert.ok(plan.capabilities.includes(capability), `${testCase.id}: missing capability ${capability}`);
  }
  return { impact, plan };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pathfinder-ci-fault-injection-'));
const results = [];

try {
  for (const testCase of cases) {
    const worktree = path.join(tempRoot, testCase.id);
    execFileSync('git', ['worktree', 'add', '--detach', worktree, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
    try {
      fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(worktree, 'node_modules'), 'dir');
      replaceExactlyOnce(path.join(worktree, testCase.target), testCase.from, testCase.to);
      const routing = routeFor(testCase);
      const detector = runDetector(worktree, testCase.detector);
      const caught = detector.status !== 0;
      results.push({
        id: testCase.id,
        target: testCase.target,
        caught,
        detectorStatus: detector.status,
        detectorSignal: detector.signal,
        routedFull: routing.impact.full,
        surfaces: routing.impact.surfaces,
        validatorGroups: routing.plan.validatorGroups,
        nodeTestGroups: routing.plan.nodeTestGroups,
        capabilities: routing.plan.capabilities,
        detectorOutputTail: `${detector.stdout}\n${detector.stderr}`.trim().split(/\r?\n/u).slice(-30),
      });
    } finally {
      execFileSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT, stdio: 'ignore' });
    }
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  try { execFileSync('git', ['worktree', 'prune'], { cwd: ROOT, stdio: 'ignore' }); } catch {}
}

const failed = results.filter(result => !result.caught);
const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  cases: results,
  summary: {
    total: results.length,
    caught: results.length - failed.length,
    missed: failed.length,
    missedIds: failed.map(result => result.id),
  },
};

fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'tmp', 'ci-semantic-fault-injection-audit.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
);

console.log(JSON.stringify(payload, null, 2));
if (failed.length) {
  console.error(`Semantic fault-injection misses: ${failed.map(result => result.id).join(', ')}`);
  process.exit(1);
}
