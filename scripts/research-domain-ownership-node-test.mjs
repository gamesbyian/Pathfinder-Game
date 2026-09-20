import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(path, 'utf8');

const blockLineage = source('scripts/solver-research-block-lineage.mjs');
assert.doesNotMatch(blockLineage, /from ['"]\.\/solver-experiment-contract\.mjs['"]/u);
assert.match(blockLineage, /research-semantic-identity-lib\.mjs/u);

const failureResponse = source('scripts/solver-failure-response-lib.mjs');
assert.doesNotMatch(failureResponse, /from ['"]\.\/solver-experiment-contract\.mjs['"]/u);
assert.match(failureResponse, /research-observation-integrity-lib\.mjs/u);

const sweepIntegrity = source('scripts/validate-solver-sweep-integrity.mjs');
assert.match(sweepIntegrity, /research-observation-integrity-lib\.mjs/u);
assert.match(sweepIntegrity, /research-population-identity-lib\.mjs/u);

const combineIntegrity = source('scripts/combine-population-integrity.mjs');
assert.match(combineIntegrity, /research-population-identity-lib\.mjs/u);

const cpsatIntegrity = source('scripts/cpsat-prefix-reference-integrity.mjs');
assert.match(cpsatIntegrity, /research-population-identity-lib\.mjs/u);

const publisher = source('scripts/publish-solver-sweep-result.mjs');
assert.match(publisher, /research-observation-integrity-lib\.mjs/u);
assert.match(publisher, /research-population-identity-lib\.mjs/u);
assert.match(publisher, /solver-experiment-contract\.mjs/u,
  'publisher still legitimately consumes experiment-contract decision semantics');

const manifest = source('scripts/experiment-manifest-lib.mjs');
assert.match(manifest, /research-question-contract-lib\.mjs/u);

const ws2Analysis = source('scripts/ws2-failure-response-analysis-contract-lib.mjs');
assert.match(ws2Analysis, /research-semantic-identity-lib\.mjs/u);

const ws2Claim = source('scripts/ws2-failure-response-claim-lib.mjs');
assert.match(ws2Claim, /research-claim-lib\.mjs/u);

const hintEvidence = source('scripts/stress/provenance-source-taxonomy.mjs');
const failureEvidence = source('scripts/failure-evidence-semantics-lib.mjs');
assert.match(hintEvidence, /research-evidence-applicability-lib\.mjs/u);
assert.match(failureEvidence, /research-evidence-applicability-lib\.mjs/u);

console.log('research domain ownership contract tests passed');
