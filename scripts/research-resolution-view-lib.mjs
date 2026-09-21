import {
  RESEARCH_OBSERVABILITY_AXES,
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

export function summarizeResearchResolutionComposition(entries) {
  const resolved = entries.flatMap(({ source = null, document }, index) => {
    const envelope = extractResearchResolutionEnvelope(document);
    if (!envelope) return [];
    return [{
      source,
      sourceIndex: index,
      envelope,
      compact: compactResearchResolution(envelope, { source }),
    }];
  });
  const byQuestion = new Map();
  for (const row of resolved) {
    if (!byQuestion.has(row.envelope.questionId)) byQuestion.set(row.envelope.questionId, []);
    byQuestion.get(row.envelope.questionId).push(row);
  }

  return [...byQuestion.entries()].map(([questionId, rows]) => {
    const signatures = new Set(rows.map(({ compact }) => JSON.stringify({
      liveRivals: compact.liveRivals ?? [],
      discriminatingObservable: compact.discriminatingObservable ?? null,
      requiredAxes: compact.requiredAxes ?? [],
      negativeInterpretationPolicy: compact.negativeInterpretationPolicy ?? null,
    })));
    const axes = {};
    for (const axis of RESEARCH_OBSERVABILITY_AXES) {
      const statuses = rows.map(({ source, sourceIndex, envelope }) => ({
        source,
        sourceIndex,
        status: envelope.axes?.[axis]?.status ?? 'unknown',
      }));
      axes[axis] = {
        statuses,
        satisfiedSources: statuses.filter(item => item.status === 'satisfied')
          .map(({ source, sourceIndex }) => ({ source, sourceIndex })),
        blockedSources: statuses.filter(item => item.status === 'blocked')
          .map(({ source, sourceIndex }) => ({ source, sourceIndex })),
        unknownSources: statuses.filter(item => item.status === 'unknown')
          .map(({ source, sourceIndex }) => ({ source, sourceIndex })),
      };
    }
    return {
      questionId,
      sources: rows.map(({ source, sourceIndex }) => ({ source, sourceIndex })),
      compatibleInterpretationContract: signatures.size === 1,
      interpretationContractVariants: signatures.size,
      axisCoverage: axes,
      compositionStatus: 'diagnostic-only',
      decisionEntitlement: 'none',
      note: 'Axis coverage across sources does not compose into resolution readiness without an explicit compatibility contract.',
    };
  }).sort((a, b) => String(a.questionId).localeCompare(String(b.questionId)));
}
