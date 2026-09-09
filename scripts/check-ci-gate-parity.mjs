#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
const workflowPath = path.join(root, '.github', 'workflows', 'ci.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const errors = [];

function directRuns(scriptName) {
  const command = scripts[scriptName];
  if (typeof command !== 'string') {
    errors.push(`package.json is missing script ${scriptName}`);
    return [];
  }
  return [...command.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map(match => match[1]);
}

function closure(scriptName, seen = new Set()) {
  if (seen.has(scriptName)) return seen;
  seen.add(scriptName);
  for (const child of directRuns(scriptName)) closure(child, seen);
  return seen;
}

function requireMembers(label, actual, expected) {
  for (const value of expected) {
    if (!actual.has(value)) errors.push(`${label} no longer includes ${value}`);
  }
}

const checkClosure = closure('check');
requireMembers('check', checkClosure, ['check:dead-scripts', 'check:text-source-files', 'check:lint', 'check:validators']);

const nonlintClosure = closure('check:nonlint');
requireMembers('check:nonlint', nonlintClosure, ['check:dead-scripts', 'check:text-source-files', 'check:validators']);
if (nonlintClosure.has('check:lint')) errors.push('check:nonlint unexpectedly includes check:lint');

const fastClosure = closure('ci:fast');
requireMembers('ci:fast', fastClosure, ['check', 'check:lint', 'test:unit:fast', 'test:node']);

const fullClosure = closure('ci');
requireMembers('ci', fullClosure, ['check', 'check:lint', 'test:coverage', 'test:node']);

const workflowRuns = [...workflow.matchAll(/^\s*run:\s*npm run ([A-Za-z0-9:_-]+)\s*$/gm)].map(match => match[1]);
const expectedWorkflowRuns = [
  'check:nonlint',
  'check:lint',
  'test:node',
  'build',
  'test:coverage',
  'test:deep-proofs',
];
for (const expected of expectedWorkflowRuns) {
  if (!workflowRuns.includes(expected)) errors.push(`ci.yml no longer runs npm run ${expected}`);
}
for (const actual of workflowRuns) {
  if (!expectedWorkflowRuns.includes(actual)) {
    errors.push(`ci.yml added npm run ${actual}; classify it in the local/GHA parity contract`);
  }
}

if (!/SOLVER_DEADLOCK_PROOF_SKIP:\s*['"]1['"]/.test(workflow)) {
  errors.push('ci.yml coverage step no longer records SOLVER_DEADLOCK_PROOF_SKIP=1');
}
if (!/SOLVER_R02560_PROOF_SKIP:\s*['"]1['"]/.test(workflow)) {
  errors.push('ci.yml coverage step no longer records SOLVER_R02560_PROOF_SKIP=1');
}

// The local finish lines intentionally add the production build after the package-level
// ci/ci:fast commands. The Actions deep lane partitions four heavyweight proof files out of
// coverage and runs them explicitly, while local `ci` runs the unpartitioned coverage population.
// Keep these two documented equivalences explicit so a new deterministic Actions command cannot
// quietly become a GitHub-only rule.
const preflight = fs.readFileSync(path.join(root, 'docs', 'ci-preflight.md'), 'utf8');
if (!preflight.includes('npm run ci:fast && npm run build')) {
  errors.push('docs/ci-preflight.md must keep the ordinary local finish line at `npm run ci:fast && npm run build`');
}
if (!preflight.includes('npm run ci && npm run build')) {
  errors.push('docs/ci-preflight.md must keep the deep local finish line at `npm run ci && npm run build`');
}

if (errors.length > 0) {
  console.error('Local/GitHub Actions gate parity check failed:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nUpdate package scripts, ci.yml, and the local finish-line contract together.');
  process.exit(1);
}

console.log('Local finish lines and GitHub Actions deterministic gate commands are in parity.');
