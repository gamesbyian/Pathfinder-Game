import assert from 'node:assert/strict';

import {
  INVESTIGATION_REPORT_STATUSES,
  RESEARCH_CLOSEOUT_SCHEMA,
  createResearchCloseoutCapsule,
  formatInvestigationReportStatusBlock,
  formatResearchCloseoutCapsule,
  parseResearchCloseoutCapsule,
} from './investigation-report-metadata.mjs';

for (const status of INVESTIGATION_REPORT_STATUSES) {
  const block = formatInvestigationReportStatusBlock({
    status,
    lastEvidenceDate: '2026-09-19',
    lastEvidenceSummary: 'fixture evidence',
    decision: 'fixture decision',
    remainingGate: 'none',
  });
  assert.match(block, new RegExp(`^> \\*\\*Status:\\*\\* ${status}$`, 'm'));
  assert.match(block, /^> **Last evidence:** 2026-09-19 — fixture evidence$/m);
}
assert.throws(() => formatInvestigationReportStatusBlock({
  status: 'basically done',
  lastEvidenceDate: '2026-09-19',
  lastEvidenceSummary: 'fixture',
  decision: 'fixture',
  remainingGate: 'none',
}), /unknown report status/);
assert.throws(() => formatInvestigationReportStatusBlock({
  status: 'active',
  lastEvidenceDate: '2026\/09\/19',
  lastEvidenceSummary: 'fixture',
  decision: 'fixture',
  remainingGate: 'none',
}), /YYYY-MM-DD/);
assert.throws(() => formatInvestigationReportStatusBlock({
  status: 'active',
  lastEvidenceDate: '2026-09-19',
  lastEvidenceSummary: 'line one\nline two',
  decision: 'fixture',
  remainingGate: 'none',
}), /single line/);

const closeoutInput = {
  status: 'concluded-negative',
  lastEvidenceDate: '2026-09-19',
  decision: 'close the tested form',
  remainingGate: 'none',
  researchQuestion: 'WS2-FIXTURE',
  premiseRefs: ['P032', 'P204'],
  measurementOpportunity: 'MO-002',
  evidenceRole: 'confirmation',
  populationIdentity: 'sha256:fixture-population',
  selection: 'prespecified outcome-blind fixture selection',
  inferenceScope: 'fixture parents under the recorded protocol',
  claimRefs: ['claim:fixture-1'],
  sourceArtifacts: ['reports/fixture-analysis.json'],
  expectation: 'the tested form should separate the fixture arms',
  surprise: 'none',
  anomaly: 'none',
};
const closeout = createResearchCloseoutCapsule(closeoutInput);
assert.equal(closeout.schema, RESEARCH_CLOSEOUT_SCHEMA);
assert.deepEqual(closeout.joins, {
  researchQuestion: 'WS2-FIXTURE',
  premiseRefs: ['P032', 'P204'],
  measurementOpportunity: 'MO-002',
});
assert.deepEqual(closeout.scope, {
  populationIdentity: 'sha256:fixture-population',
  selection: 'prespecified outcome-blind fixture selection',
  inferenceScope: 'fixture parents under the recorded protocol',
});
assert.deepEqual(closeout.claimRefs, ['claim:fixture-1']);
assert.deepEqual(closeout.sourceArtifacts, ['reports/fixture-analysis.json']);
assert.deepEqual(closeout.prospective, {
  expectation: 'the tested form should separate the fixture arms',
  surprise: 'none',
  anomaly: 'none',
});
const encodedCloseout = formatResearchCloseoutCapsule(closeoutInput);
assert.match(encodedCloseout, /^<!-- research-closeout \{/u);
assert.deepEqual(parseResearchCloseoutCapsule(`# Fixture\n\n${encodedCloseout}\n`), closeout);
assert.equal(parseResearchCloseoutCapsule('# Fixture\n'), null);

assert.throws(() => createResearchCloseoutCapsule({
  ...closeoutInput,
  premiseRefs: 'P032',
}), /premiseRefs must be an array/);
assert.throws(() => createResearchCloseoutCapsule({
  ...closeoutInput,
  claimRefs: 'claim:fixture-1',
}), /claimRefs must be an array/);
assert.throws(() => createResearchCloseoutCapsule({
  ...closeoutInput,
  inferenceScope: 'line one\nline two',
}), /single line/);
assert.throws(() => parseResearchCloseoutCapsule(
  '<!-- research-closeout {"schema":"pathfinder.research-closeout/v0"} -->'
), /unsupported research-closeout schema/);
assert.throws(() => parseResearchCloseoutCapsule(
  `${encodedCloseout}\n${encodedCloseout}`
), /multiple research-closeout capsules/);

console.log('investigation report metadata constructor tests passed');
