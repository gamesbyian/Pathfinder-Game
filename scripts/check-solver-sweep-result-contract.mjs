#!/usr/bin/env node
import fs from 'node:fs';

const workflows = [
  '.github/workflows/solver-stress-refresh.yml',
  '.github/workflows/solver-typical-budget-baseline.yml',
  '.github/workflows/solver-highbudget-unsolved-sweep.yml',
  '.github/workflows/solver-level-blind-targeted-sweep.yml',
  '.github/workflows/solver-broad-confirmation.yml',
  '.github/workflows/solver-residual-confirmation.yml',
  '.github/workflows/solver-archetype-sample-ab.yml',
  '.github/workflows/solver-repair-probe-adaptive-sample-ab.yml',
  '.github/workflows/solver-repair-fallback-reserve-sample-ab.yml',
  '.github/workflows/technique-census.yml',
  '.github/workflows/method-probe-sweep.yml',
  '.github/workflows/cpsat-hint-harvest-sweep.yml',
  '.github/workflows/atlas-sweep.yml',
  '.github/workflows/family-wide-trove.yml',
];

const failures = [];
for (const file of workflows) {
  const source = fs.readFileSync(file, 'utf8');
  const artifactCount = (source.match(/\n\s+name:\s+solver-sweep-result\s*\n/g) || []).length;
  const publisherCount = (source.match(/publish-solver-sweep-result\.mjs/g) || []).length;
  if (artifactCount !== 1) failures.push(`${file}: expected exactly one solver-sweep-result artifact, found ${artifactCount}`);
  if (publisherCount !== 1) failures.push(`${file}: expected exactly one publisher invocation, found ${publisherCount}`);
}
const helper = fs.readFileSync('scripts/publish-solver-sweep-result.mjs', 'utf8');
if (!helper.includes('GITHUB_STEP_SUMMARY')) failures.push('publisher must append to GITHUB_STEP_SUMMARY');
if (!helper.includes("kind: 'pathfinder-solver-sweep-result'")) failures.push('publisher manifest kind is missing');

if (failures.length) {
  console.error('Solver sweep result contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Solver sweep result contract OK for ${workflows.length} maintained workflows.`);
