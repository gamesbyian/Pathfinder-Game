import assert from 'node:assert/strict';

import {
  buildResearchResolutionEnvelope,
  RESEARCH_OBSERVABILITY_AXES,
  researchResolutionEnvelopeIssues,
  validateResearchResolutionEnvelope,
} from './research-resolution-envelope-lib.mjs';

const ready = buildResearchResolutionEnvelope({
  questionId: 'Q1',
  liveRivals: ['allocation', 'representation'],
  discriminatingObservable: 'decision-point exposure and counterfactual retention',
  requiredAxes: ['eligibility', 'reach', 'participation', 'measurementSupport'],
  axes: {
    eligibility: { status: 'satisfied', reason: 'target population is in scope' },
    reach: { status: 'satisfied' },
    participation: { status: 'satisfied' },
    measurementSupport: { status: 'satisfied' },
  },
  negativeInterpretationPolicy: 'negative only resolves the prespecified rival contrast',
});
assert.equal(ready.resolutionStatus, 'resolution-ready');
assert.deepEqual(ready.blockers, []);
assert.deepEqual(Object.keys(ready.axes), RESEARCH_OBSERVABILITY_AXES);
assert.equal(ready.axes.coverage.status, 'not-required');

const blocked = buildResearchResolutionEnvelope({
  questionId: 'Q2',
  liveRivals: ['absent', 'underdosed'],
  discriminatingObservable: 'bounded work-response curve',
  requiredAxes: ['eligibility', 'participation', 'censoring'],
  axes: {
    eligibility: { status: 'satisfied' },
    participation: { status: 'unknown', reason: 'target stage telemetry missing' },
    censoring: { status: 'blocked', reason: 'deadline bound' },
  },
  negativeInterpretationPolicy: 'do not interpret null as absent capability while blocked',
});
assert.equal(blocked.resolutionStatus, 'observability-blocked');
assert.deepEqual(blocked.blockers.map(row => row.axis), ['participation', 'censoring']);
assert.deepEqual(blocked.blockers.map(row => row.remediation), [
  'allocation-or-wiring',
  'work-envelope-or-recovery',
]);

assert.deepEqual(researchResolutionEnvelopeIssues({
  ...ready,
  liveRivals: ['one'],
}), ['resolution.liveRivals']);

assert.throws(() => validateResearchResolutionEnvelope({
  ...ready,
  axes: { ...ready.axes, inventedAxis: { status: 'satisfied' } },
}), /resolution\.axes\.inventedAxis/u);

assert.throws(() => validateResearchResolutionEnvelope({
  ...ready,
  resolutionStatus: 'observability-blocked',
}), /resolution\.resolutionStatus/u);

assert.throws(() => validateResearchResolutionEnvelope({
  ...blocked,
  blockers: [],
}), /resolution\.blockers/u);

console.log('research resolution envelope tests passed');
