import {
  validateResearchResolutionEnvelope,
} from './research-resolution-envelope-lib.mjs';
import { validateResearchIndependenceVector } from './research-independence-vector-lib.mjs';

export function extractResearchResolutionEnvelope(document) {
  const envelope = document?.resolution ?? document?.scientificDisposition?.resolution ?? null;
  if (!envelope) return null;
  return validateResearchResolutionEnvelope(envelope);
}

export function extractResearchIndependenceVector(document) {
  const vector = document?.independenceVector ?? document?.scientificDisposition?.independenceVector ?? null;
  if (!vector) return null;
  return validateResearchIndependenceVector(vector);
}

export function compactResearchResolution(envelope, { source = null } = {}) {
  validateResearchResolutionEnvelope(envelope);
  return {
    questionId: envelope.questionId,
    resolutionStatus: envelope.resolutionStatus,
    liveRivals: envelope.liveRivals,
    discriminatingObservable: envelope.discriminatingObservable,
    requiredAxes: envelope.requiredAxes,
    blockers: envelope.blockers ?? [],
    remediation: [...new Set((envelope.blockers ?? []).map(row => row.remediation).filter(Boolean))],
    negativeInterpretationPolicy: envelope.negativeInterpretationPolicy,
    source,
  };
}

export function summarizeResearchResolutionDocuments(entries) {
  return entries.map(({ source = null, document }) => {
    const envelope = extractResearchResolutionEnvelope(document);
    const independenceVector = extractResearchIndependenceVector(document);
    if (!envelope) {
      return {
        source,
        questionId: document?.questionId ?? null,
        resolutionStatus: 'no-resolution-envelope',
        blockers: [],
        remediation: [],
        independenceVector,
      };
    }
    return {
      ...compactResearchResolution(envelope, { source }),
      independenceVector,
    };
  });
}
