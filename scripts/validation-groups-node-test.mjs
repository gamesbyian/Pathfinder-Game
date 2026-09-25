#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

function list(family, ...surfaces) {
  const stdout = execFileSync(process.execPath, [
    'scripts/validation-groups.mjs',
    family,
    ...surfaces,
    '--list',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  return JSON.parse(stdout);
}

const research = list('nodeTests', 'research');
assert.ok(research.selected.includes('test:production-search-frontier-sampler'));
assert.ok(research.selected.includes('test:signature-collision-analysis'));
assert.ok(research.selected.includes('test:portfolio-solve-sweep-worker'));
assert.ok(!research.selected.includes('test:startup-smoke'));

const solver = list('nodeTests', 'solver');
assert.ok(solver.selected.includes('test:portfolio-solve-sweep-lib'));
assert.ok(solver.selected.includes('test:divergence-lib'));
assert.ok(!solver.selected.includes('test:signature-collision-analysis'));
assert.ok(!solver.selected.includes('test:sweep-publish'));

const data = list('nodeTests', 'data');
assert.ok(data.selected.includes('test:collect-known-solution-prefix-survival-cli'));
assert.ok(data.selected.includes('test:cpsat-explicit-prefix-reference-lib'));
assert.ok(!data.selected.includes('test:divergence-lib'));

const shared = list('nodeTests', 'shared');
for (const member of [
  'test:signature-collision-analysis',
  'test:production-search-frontier-sampler',
  'test:sweep-publish',
  'test:known-prefix-oracle-set-manifest',
  'test:method-probe-staging-lib',
  'test:cpsat-branch-label-eligibility',
  'test:verify-canary-cell',
  'test:portfolio-solve-sweep-lib',
  'test:portfolio-solve-sweep-worker',
  'test:collect-known-solution-prefix-survival-cli',
  'test:analyze-known-solution-prefix-survival-cli',
  'test:divergence-lib',
  'test:analyze-structural-holdout-replication',
  'test:analyze-ew1-static-portfolio',
  'test:build-static-portfolio-plan',
  'test:select-random-sample',
  'test:equal-work-production-reach',
  'test:operational-similarity-lib',
  'test:cpsat-explicit-prefix-reference-pipeline',
  'test:cpsat-explicit-prefix-reference-lib',
  'test:cpsat-prefix-reference-integrity',
  'test:select-highbudget-gap-fill-ids',
  'test:known-support-extinction',
  'test:class3-dose-exposure',
  'test:class3-dose-expectations',
  'test:hint-provenance-surface-audit-detector',
]) {
  assert.ok(shared.selected.includes(member), `shared fallback lost ${member}`);
}
// Was 25 pre-merge on main; grew to 49 after merging origin/main's hint-evidence-consolidation
// history, then to 51 after merging the portfolio-harvester/v4-codec branch (chatgpt/hint-
// consolidation-final-push-2026-09-24), which added its own two shared-surface entries, then to
// 54 after the hostile completion audit added central-persistence, published-import enrichment and
// physical-decode invariants, then to 55 after hardening the physical-reader detector against
// staged read/parse refactors.
assert.equal(shared.selected.length, 55);

const combined = list('nodeTests', 'solver', 'research');
assert.equal(new Set(combined.selected).size, combined.selected.length, 'multi-surface selection must dedupe commands');

console.log('validation-groups semantic surface selection: all tests passed');
