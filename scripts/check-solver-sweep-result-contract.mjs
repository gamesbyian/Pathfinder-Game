#!/usr/bin/env node
import fs from 'node:fs';

const workflows = [
  '.github/workflows/solver-stress-refresh.yml',
  '.github/workflows/solver-production-replay-baseline.yml',
  '.github/workflows/solver-highbudget-unsolved-sweep.yml',
  '.github/workflows/solver-level-blind-targeted-sweep.yml',
  '.github/workflows/solver-broad-confirmation.yml',
  '.github/workflows/solver-residual-confirmation.yml',
  '.github/workflows/solver-routing-regime-sample-ab.yml',
  '.github/workflows/technique-census.yml',
  '.github/workflows/static-portfolio-confirmation.yml',
  '.github/workflows/method-probe-sweep.yml',
  '.github/workflows/cpsat-explicit-prefix-reference.yml',
  '.github/workflows/cpsat-hint-harvest-sweep.yml',
  '.github/workflows/collect-prune-gap-labels.yml',
  '.github/workflows/collect-variant-family-dataset.yml',
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
  if (expectedCount !== 1 || observedCount !== 1) failures.push(`${file}: expected exactly one artifact-coverage pair, found expected=${expectedCount} observed=${observedCount}`);
}
const helper = fs.readFileSync('scripts/publish-solver-sweep-result.mjs', 'utf8');
if (!helper.includes('GITHUB_STEP_SUMMARY')) failures.push('publisher must append to GITHUB_STEP_SUMMARY');
if (!helper.includes('GITHUB_EVENT_PATH')) failures.push('publisher must capture dispatch inputs from GITHUB_EVENT_PATH');
if (!helper.includes('artifactCoverage')) failures.push('publisher must emit artifact coverage');
if (!helper.includes('populationIntegrity')) failures.push('publisher must emit population integrity');
if (!helper.includes('decisionValidComplete')) failures.push('publisher must distinguish decision-valid integrity from structural coverage');
if (!helper.includes('EXPERIMENT_RESULT_KIND')) failures.push('publisher manifest kind is missing');
if (!helper.includes('researchOutcome')) failures.push('publisher must emit the declared research outcome');
if (!helper.includes('outcome-file')) failures.push('publisher must accept an explicit outcome file');

const contractHelper = fs.readFileSync('scripts/solver-experiment-contract.mjs', 'utf8');
for (const required of ['coverageComplete', 'decisionValidComplete']) {
  if (!contractHelper.includes(required)) failures.push(`experiment contract must expose ${required}`);
}
const combiner = fs.readFileSync('scripts/combine-solver-sweep-reports.mjs', 'utf8');
if (!combiner.includes("intendedPopulationKnown ? expectedIds : levelIds")) failures.push('combiner population identity must use intended IDs when an expected population is supplied');

for (const file of [
  '.github/workflows/solver-broad-confirmation.yml',
  '.github/workflows/solver-residual-confirmation.yml',
  '.github/workflows/static-portfolio-confirmation.yml',
  '.github/workflows/method-probe-sweep.yml',
]) {
  if (!fs.readFileSync(file, 'utf8').includes('--outcome-file=')) {
    failures.push(`${file}: confirmation workflow must explicitly publish its experiment verdict`);
  }
  const source = fs.readFileSync(file, 'utf8');
  for (const failureOutcome of ['harness-error', 'infrastructure-error']) {
    if (!source.includes(`outcome=${failureOutcome}`)) {
      failures.push(`${file}: confirmation workflow must explicitly classify ${failureOutcome}`);
    }
  }
  if (!/needs\.[\w-]+\.result/u.test(source)) {
    failures.push(`${file}: outcome fallback must account for an upstream matrix failure`);
  }
}

for (const file of [
  '.github/workflows/solver-broad-confirmation.yml',
  '.github/workflows/solver-residual-confirmation.yml',
]) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('classify-paired-solver-outcome.mjs')) failures.push(`${file}: must use the tested paired-verdict classifier`);
  for (const input of ['min_gains:', 'max_losses:', 'max_work_delta_pct:']) {
    if (!source.includes(input)) failures.push(`${file}: missing frozen verdict input ${input}`);
  }
}

const retriever = fs.readFileSync('scripts/fetch-gha-result.mjs', 'utf8');
if (!retriever.includes("'solver-sweep-result'")) failures.push('fetch-gha-result helper must request the standard artifact');
if (!retriever.includes("'--status', 'completed'")) failures.push('fetch-gha-result helper must resolve latest completed runs');

const highbudget = fs.readFileSync('.github/workflows/solver-highbudget-unsolved-sweep.yml', 'utf8');
for (const required of ['--expected-ids=artifact-staging/plan/expected-corpus1-ids.txt', '--expected-ids=artifact-staging/plan/expected-corpus2-ids.txt', '--integrity-file="logs/solver-highbudget-sweep/population-integrity.json"', '--contract-file="logs/solver-highbudget-sweep/experiment-contract.json"']) {
  if (!highbudget.includes(required)) failures.push(`high-budget workflow lacks exact-population contract: ${required}`);
}
const replay = fs.readFileSync('.github/workflows/solver-production-replay-baseline.yml', 'utf8');
if (!replay.includes("steps.integrity.outputs.complete == 'true'")) failures.push('production replay must gate decision-bearing diff/commit on exact integrity');
if (!replay.includes('--integrity-file="logs/production-replay-baseline/population-integrity.json"')) failures.push('production replay must publish exact population integrity');
if (!replay.includes('--contract-file="logs/production-replay-baseline/experiment-contract.json"')) failures.push('production replay must publish normalized execution and side-effect semantics');
const reconciliation = fs.readFileSync('.github/workflows/solver-combine-sweep-runs.yml', 'utf8');
for (const required of ['validate-reconciliation-sources.mjs', '--expected-ids="${{ inputs.expected_ids_file }}"', '--integrity-out=logs/solver-combined/population-integrity.json', '--contract-file="logs/solver-combined/experiment-contract.json"']) {
  if (!reconciliation.includes(required)) failures.push(`cross-run reconciliation lacks provenance/integrity contract: ${required}`);
}
const methodProbe = fs.readFileSync('.github/workflows/method-probe-sweep.yml', 'utf8');
for (const required of ['--allow-incomplete', '--integrity-file="logs/method-probe-shards/population-integrity.json"', '--contract-file="logs/method-probe-shards/experiment-contract.json"']) {
  if (!methodProbe.includes(required)) failures.push(`method-probe workflow lacks derived-cardinality v3 contract: ${required}`);
}
const techniqueCensus = fs.readFileSync('.github/workflows/technique-census.yml', 'utf8');
for (const required of ['--rows-field=results', '--integrity-file="reports/stress/technique-census/${{ github.run_id }}/population-integrity.json"', '--contract-file="plan/experiment-contract.json"']) {
  if (!techniqueCensus.includes(required)) failures.push(`technique census lacks sealed-cell v3 contract: ${required}`);
}
const staticPortfolio = fs.readFileSync('.github/workflows/static-portfolio-confirmation.yml', 'utf8');
for (const required of ['--rows-field=results', '--integrity-file="logs/static-portfolio-confirmation/population-integrity.json"', '--contract-file="logs/static-portfolio-confirmation/experiment-contract.json"']) {
  if (!staticPortfolio.includes(required)) failures.push(`static portfolio lacks sealed-cell v3 contract: ${required}`);
}

if (failures.length) {
  console.error('Solver sweep result contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Solver sweep result contract OK for ${workflows.length} maintained workflows.`);
