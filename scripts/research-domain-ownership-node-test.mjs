import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(path, 'utf8');

const blockLineage = source('scripts/solver-research-block-lineage.mjs');
assert.doesNotMatch(blockLineage, /from ['"]\.\/solver-experiment-contract\.mjs['"]/u);
assert.match(blockLineage, /research-semantic-identity-lib\.mjs/u);
assert.match(blockLineage, /research-evaluation-evidence-role-lib\.mjs/u);

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


const evaluationEvidenceRole = source('scripts/research-evaluation-evidence-role-lib.mjs');
assert.match(evaluationEvidenceRole, /RESEARCH_EVALUATION_EVIDENCE_ROLES/u);
const evaluationEvidenceDoc = source('docs/solver-evaluation-evidence.md');
assert.match(evaluationEvidenceDoc, /topology-generation-support-lib\.mjs/u,
  'evaluation evidence docs must point to the producer-owned topology support envelope');
assert.doesNotMatch(evaluationEvidenceRole, /forensic|historical/u,
  'shared evaluation evidence roles must not absorb broader report-role vocabulary');

for (const path of [
  'scripts/research-level-generation-lib.mjs',
  'scripts/stress/generate.mjs',
  'scripts/stress/generate-random.mjs',
  'scripts/stress/generate-topology.mjs',
  'scripts/research-integration-audit-lib.mjs',
]) {
  const consumer = source(path);
  assert.match(consumer, /research-evaluation-evidence-role-lib\.mjs/u,
    `${path} must use the shared evaluation evidence-role owner`);
  assert.doesNotMatch(consumer, /\[['"]development['"],\s*['"]confirmation['"],\s*['"]transfer['"]\]/u,
    `${path} must not redeclare the shared evaluation evidence-role vocabulary`);
}

const statusIndex = source('scripts/research-status-index-lib.mjs');
assert.match(statusIndex, /WORKSTREAM_EXECUTION_STATES/u);
assert.match(statusIndex, /EXPERIMENT_PROMOTION_STATES/u);
assert.doesNotMatch(
  statusIndex.slice(statusIndex.indexOf('const experiments =')),
  /normalizedLegacyWorkstreamState\(disposition\)/u,
  'current experiment lifecycle must not be inferred from disposition prose',
);

const integrationAudit = source('scripts/research-integration-audit-lib.mjs');
assert.doesNotMatch(integrationAudit, /startsWith\(['"]active['"]\)|\^\(\?:closed\|concluded/u,
  'question lifecycle conformance must use the explicit state classifier rather than prose/prefix inference');

const questionRelations = source('scripts/research-question-relations-lib.mjs');
assert.match(questionRelations, /RESEARCH_QUESTION_STATES/u);
assert.match(questionRelations, /researchQuestionLifecycleClass/u);

const questionAuthorityAudit = source('scripts/research-question-authority-audit-lib.mjs');
assert.match(questionAuthorityAudit, /researchQuestionLifecycleClass/u);
assert.doesNotMatch(questionAuthorityAudit, /startsWith\(['"]active['"]\)/u,
  'question authority audit must use lifecycle semantics, not state-name prefix inference');

const resolutionEnvelope = source('scripts/research-resolution-envelope-lib.mjs');
assert.match(resolutionEnvelope, /RESEARCH_OBSERVABILITY_AXES/u);
assert.match(resolutionEnvelope, /resolutionStatus/u);
assert.doesNotMatch(resolutionEnvelope, /first-loss|reserve-starvation|producer-consumer-2x2/u,
  'shared resolution envelope must not absorb specialist route or mechanism semantics');

const independenceVector = source('scripts/research-independence-vector-lib.mjs');
assert.match(independenceVector, /RESEARCH_INDEPENDENCE_AXES/u);
assert.doesNotMatch(independenceVector, /D1|reserve-starvation|failure-response/u,
  'shared independence vector must not absorb specialist study semantics');

const unitTopology = source('scripts/research-unit-topology-lib.mjs');
assert.match(unitTopology, /RESEARCH_UNIT_TOPOLOGY_FIELDS/u);
assert.doesNotMatch(unitTopology, /WS2|Class-3|failure-response|reserve-starvation/u,
  'shared unit topology must own structural vocabulary only, not specialist unit meanings');

assert.match(ws2AnalysisContract, /research-unit-topology-lib\.mjs/u,
  'WS2 contract must use the shared unit-topology shape');

const class3DoseAnalysis = source('scripts/analyze-class3-dose-exposure.mjs');
assert.match(class3DoseAnalysis, /research-unit-topology-lib\.mjs/u,
  'Class-3 dose analysis must validate its frozen unit topology');

const ws2Recon = source('scripts/ws2-failure-response-reconnaissance.mjs');
assert.match(ws2Recon, /research-resolution-envelope-lib\.mjs/u);

const ws2AnalysisContract = source('scripts/ws2-failure-response-analysis-contract-lib.mjs');
assert.match(ws2AnalysisContract, /research-independence-vector-lib\.mjs/u);

const reserveStarvation = source('scripts/analyze-reserve-starvation-probe.mjs');
assert.match(reserveStarvation, /research-resolution-envelope-lib\.mjs/u);
assert.match(reserveStarvation, /research-independence-vector-lib\.mjs/u);

console.log('research domain ownership contract tests passed');
