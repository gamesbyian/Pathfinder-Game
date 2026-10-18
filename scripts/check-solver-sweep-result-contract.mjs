#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workflowDir = '.github/workflows';
const lifecycle = JSON.parse(fs.readFileSync('docs/solver-workflow-lifecycle.json', 'utf8'));
const maintainedEvidenceWorkflows = lifecycle.workflows
  .filter(row => row.role === 'evidence-producing' && row.status === 'maintained');
const failures = [];
for (const row of maintainedEvidenceWorkflows) {
  const name = row.workflow;
  const file = path.join(workflowDir, name);
  if (!fs.existsSync(file)) {
    failures.push(`${name}: lifecycle ledger points at missing workflow`);
    continue;
  }
  const source = fs.readFileSync(file, 'utf8');
  if (row.evidenceTransport === 'specialized-artifact-only') {
    // A source-verified one-shot may deliberately retain a specialist schema rather than
    // pretending its rows satisfy the standard solver-sweep publisher. Require the explicit
    // lifecycle justification plus a real always-uploaded, named artifact with retention.
    if (!row.evidenceTransportReason) failures.push(`${name}: specialized transport missing justification`);
    if (!source.includes('actions/upload-artifact@') || !source.includes('retention-days:')
        || !source.includes('if: always()') && !source.includes('if: ${{ always()')) {
      failures.push(`${name}: specialized research workflow must upload partial-failure evidence`);
    }
  } else {
    if (row.evidenceTransport) failures.push(`${name}: unrecognized transport ${row.evidenceTransport}`);
    if (!['publish-solver-sweep-result.mjs', 'sweep-publish.mjs'].some(marker => source.includes(marker))) failures.push(`${name}: missing standard solver-sweep-result publisher`);
    if (!source.includes('name: solver-sweep-result')) failures.push(`${name}: missing standard solver-sweep-result artifact upload`);
  }
}

const helper = fs.readFileSync('scripts/publish-solver-sweep-result.mjs', 'utf8');
const wrapper = fs.readFileSync('scripts/sweep-publish.mjs', 'utf8');
if (!wrapper.includes('publish-solver-sweep-result.mjs')) failures.push('shared sweep wrapper must delegate to the standard publisher');
if (!helper.includes('GITHUB_EVENT_PATH')) failures.push('publisher must capture exact workflow_dispatch inputs from GITHUB_EVENT_PATH');
if (!helper.includes('artifactCoverage')) failures.push('publisher must emit artifact coverage');
if (!helper.includes('populationIntegrity')) failures.push('publisher must emit population integrity');
if (!helper.includes('decisionValidComplete')) failures.push('publisher must distinguish decision-valid integrity from structural coverage');
if (!helper.includes('decisionContractIssues')) failures.push('publisher must gate decision-bearing evidence on a complete experiment contract');
if (!helper.includes('controlled-contrast protocol proof is still required')) failures.push('generic publisher must not infer causal A/B authority from matched rows alone');
if (!helper.includes('EXPERIMENT_RESULT_KIND')) failures.push('publisher manifest kind is missing');
if (!helper.includes('researchOutcome')) failures.push('publisher must emit the declared research outcome');
if (!helper.includes('outcome-file')) failures.push('publisher must accept an explicit outcome file');

const contractHelper = fs.readFileSync('scripts/solver-experiment-contract.mjs', 'utf8');
for (const required of ['decisionContractIssues', 'isImmutableCommitSha', 'population.corpusIdentity']) {
  if (!contractHelper.includes(required)) failures.push(`experiment contract must expose/enforce ${required}`);
}
const observationIntegrityHelper = fs.readFileSync('scripts/research-observation-integrity-lib.mjs', 'utf8');
for (const required of ['coverageComplete', 'decisionValidComplete']) {
  if (!observationIntegrityHelper.includes(required)) failures.push(`shared observation-integrity owner must expose/enforce ${required}`);
}
const contractWriter = fs.readFileSync('scripts/write-solver-experiment-contract.mjs', 'utf8');
for (const required of ['git', 'rev-parse', 'HEAD', 'inferredPairedArms', 'immutable 40-character commit SHAs', 'population-seal.json']) {
  if (!contractWriter.includes(required)) failures.push(`experiment contract writer lacks immutable execution/population identity guard: ${required}`);
}
const routingPlanner = fs.readFileSync('scripts/plan-routing-regime-ab-shards.mjs', 'utf8');
for (const required of ['population-seal.json', 'treatment_ref', 'assertMatchingPopulationSeals']) {
  if (!routingPlanner.includes(required)) failures.push(`routing A/B planner lacks cross-ref population content seal: ${required}`);
}
const combiner = fs.readFileSync('scripts/combine-solver-sweep-reports.mjs', 'utf8');
if (!combiner.includes('intendedPopulationKnown ? expectedIds : levelIds')) failures.push('combiner population identity must use intended IDs when an expected population is supplied');

if (failures.length) {
  console.error('Solver sweep result contract check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Solver sweep result contract OK for ${maintainedEvidenceWorkflows.length} maintained workflows.`);
