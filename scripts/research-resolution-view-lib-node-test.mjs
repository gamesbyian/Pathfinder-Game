import assert from 'node:assert/strict';

import {
  compactResearchResolution,
  extractResearchResolutionEnvelope,
  summarizeResearchResolutionDocuments,
} from './research-resolution-view-lib.mjs';
import { buildResearchResolutionEnvelope } from './research-resolution-envelope-lib.mjs';

const ready = buildResearchResolutionEnvelope({
  questionId: 'Q-READY',
  liveRivals: ['a', 'b'],
  discriminatingObservable: 'x',
  requiredAxes: ['eligibility'],
  axes: { eligibility: { status: 'satisfied' } },
  negativeInterpretationPolicy: 'bounded negative only',
});
const blocked = buildResearchResolutionEnvelope({
  questionId: 'Q-BLOCKED',
  liveRivals: ['c', 'd'],
  discriminatingObservable: 'y',
  requiredAxes: ['participation', 'censoring'],
  axes: {
    participation: { status: 'blocked', reason: 'target action did no work' },
    censoring: { status: 'blocked', reason: 'deadline bound' },
  },
  negativeInterpretationPolicy: 'null is uninterpretable while blocked',
});

assert.equal(extractResearchResolutionEnvelope({ resolution: ready }).questionId, 'Q-READY');
assert.equal(extractResearchResolutionEnvelope({
  scientificDisposition: { resolution: blocked },
}).questionId, 'Q-BLOCKED');
assert.equal(extractResearchResolutionEnvelope({ questionId: 'Q-NONE' }), null);

const compact = compactResearchResolution(blocked, { source: 'blocked.json' });
assert.equal(compact.resolutionStatus, 'observability-blocked');
assert.deepEqual(compact.remediation, ['allocation-or-wiring', 'work-envelope-or-recovery']);
assert.equal(compact.source, 'blocked.json');

const summary = summarizeResearchResolutionDocuments([
  { source: 'ready.json', document: { scientificDisposition: { resolution: ready } } },
  { source: 'blocked.json', document: { resolution: blocked } },
  { source: 'legacy.json', document: { questionId: 'Q-LEGACY' } },
]);
assert.deepEqual(summary.map(row => row.resolutionStatus), [
  'resolution-ready',
  'observability-blocked',
  'no-resolution-envelope',
]);
assert.equal(summary[2].questionId, 'Q-LEGACY');

console.log('research resolution view tests passed');
