import assert from 'node:assert/strict';

import {
  compactResearchResolution,
  extractResearchResolutionEnvelope,
  extractResearchIndependenceVector,
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

const independenceVector = {
  reference: 'relative-to-development-lineage',
  sampleData: 'independent fresh sample',
  parentFamily: 'independent parent units',
  sourceConstruction: 'shared generator family',
  decisionSeam: 'different consumer seam',
  instrumentImplementation: 'shared implementation',
  analysisMethod: 'shared reduction family',
  analystModel: 'not claimed',
  taskFramingPrompt: 'shared framing',
  authorityContextExposure: 'shared authority context',
  ontologyVocabulary: 'shared vocabulary',
  criticalLibraryCode: 'shared common-mode code',
};


assert.equal(extractResearchResolutionEnvelope({ resolution: ready }).questionId, 'Q-READY');
assert.equal(extractResearchResolutionEnvelope({
  scientificDisposition: { resolution: blocked },
}).questionId, 'Q-BLOCKED');
assert.equal(extractResearchResolutionEnvelope({ questionId: 'Q-NONE' }), null);
assert.equal(extractResearchIndependenceVector({
  scientificDisposition: { independenceVector },
}).sourceConstruction, 'shared generator family');
assert.equal(extractResearchIndependenceVector({ questionId: 'Q-NONE' }), null);

const compact = compactResearchResolution(blocked, { source: 'blocked.json' });
assert.equal(compact.resolutionStatus, 'observability-blocked');
assert.deepEqual(compact.remediation, ['allocation-or-wiring', 'work-envelope-or-recovery']);
assert.equal(compact.source, 'blocked.json');

const summary = summarizeResearchResolutionDocuments([
  { source: 'ready.json', document: { scientificDisposition: { resolution: ready, independenceVector } } },
  { source: 'blocked.json', document: { resolution: blocked, independenceVector } },
  { source: 'legacy.json', document: { questionId: 'Q-LEGACY' } },
]);
assert.deepEqual(summary.map(row => row.resolutionStatus), [
  'resolution-ready',
  'observability-blocked',
  'no-resolution-envelope',
]);
assert.equal(summary[0].independenceVector.sampleData, 'independent fresh sample');
assert.equal(summary[0].independenceVector.instrumentImplementation, 'shared implementation');
assert.equal(summary[1].resolutionStatus, 'observability-blocked');
assert.equal(summary[1].independenceVector.sourceConstruction, 'shared generator family');
assert.equal(summary[2].questionId, 'Q-LEGACY');
assert.equal(summary[2].independenceVector, null);

console.log('research resolution view tests passed');
