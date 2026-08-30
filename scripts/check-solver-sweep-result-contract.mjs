#!/usr/bin/env node
import fs from 'node:fs';

const workflows = [
  '.github/workflows/solver-stress-refresh.yml',
  '.github/workflows/solver-typical-budget-baseline.yml',
  '.github/workflows/solver-highbudget-unsolved-sweep.yml',
  '.github/workflows/solver-level-blind-targeted-sweep.yml',
  '.github/workflows/solver-broad-confirmation.yml',
  '.github/workflows/solver-residual-confirmation.yml',
  '.github/workflows/solver-routing-regime-sample-ab.yml',
  '.github/workflows/solver-early-repair-search-adaptive-sample-ab.yml',
  '.github/workflows/solver-repair-fallback-reserve-sample-ab.yml',
  '.github/workflows/technique-census.yml',
  '.github/workflows/method-probe-sweep.yml',
  '.github/workflows/cpsat-explicit-prefix-reference.yml',
  '.github/workflows/cpsat-hint-harvest-sweep-published.yml',
  '.github/workflows/cpsat-hint-harvest-sweep.yml',
  '.github/workflows/atlas-sweep.yml',
  '.github/workflows/family-wide-trove.yml',
  '.github/workflows/mitm-frontier-sweep.yml',
  '.github/workflows/solver-elite-prefix-dfs-retry-validate.yml',
];

const failures = [];
for (const file of workflows) {
  const source = fs.readFileSync(file, 'utf8');
  const artifactCount = (source.match(/\n\s+name:\s+solver-sweep-result\s*\n/g) || []).length;
  const publisherCount = (source.match(/publish-solver-sweep-result\.mjs/g) || []).length;
  const runNameCount = (source.match(/^run-name:/gm) || []).length;
  const expectedCount = (source.match(/--shards-expected=/g) || []).length;
  const observedCount = (source.match(/--shards-observed=/g) || []).length;
  if (artifactCount !== 1) failures.push(`${file}: expected exactly one solver-sweep-result artifact, found ${artifactCount}`);
  if (publisherCount !== 1) failures.push(`${file}: expected exactly one publisher invocation, found ${publisherCount}`);
  if (runNameCount !== 1) failures.push(`${file}: expected exactly one top-level run-name, found ${runNameCount}`);
  if (expectedCount !== 1 || observedCount !== 1) failures.push(`${file}: expected exactly one shard-completeness pair, found expected=${expectedCount} observed=${observedCount}`);
}
const helper = fs.readFileSync('scripts/publish-solver-sweep-result.mjs', 'utf8');
if (!helper.includes('GITHUB_STEP_SUMMARY')) failures.push('publisher must append to GITHUB_STEP_SUMMARY');
if (!helper.includes('GITHUB_EVENT_PATH')) failures.push('publisher must capture dispatch inputs from GITHUB_EVENT_PATH');
if (!helper.includes('shardCompleteness')) failures.push('publisher must emit shard completeness');
if (!helper.includes("kind: 'pathfinder-solver-sweep-result'")) failures.push('publisher manifest kind is missing');

const retriever = fs.readFileSync('scripts/fetch-gha-result.mjs', 'utf8');
if (!retriever.includes("'solver-sweep-result'")) failures.push('fetch-gha-result helper must request the standard artifact');
if (!retriever.includes("'--status', 'completed'")) failures.push('fetch-gha-result helper must resolve latest completed runs');

if (failures.length) {
  console.error('Solver sweep result contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Solver sweep result contract OK for ${workflows.length} maintained workflows.`);
