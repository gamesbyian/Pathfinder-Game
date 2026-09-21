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
  const summaries = summarizeResearchResolutionDocuments(entries);
  const byQuestion = new Map();
  for (const row of summaries) {
    if (!row.questionId || row.resolutionStatus === 'no-resolution-envelope') continue;
    if (!byQuestion.has(row.questionId)) byQuestion.set(row.questionId, []);
    byQuestion.get(row.questionId).push(row);
  }

  return [...byQuestion.entries()].map(([questionId, rows]) => {
    const signatures = new Set(rows.map(row => JSON.stringify({
      liveRivals: row.liveRivals ?? [],
      discriminatingObservable: row.discriminatingObservable ?? null,
      requiredAxes: row.requiredAxes ?? [],
      negativeInterpretationPolicy: row.negativeInterpretationPolicy ?? null,
    })));
    const axes = {};
    for (const axis of RESEARCH_OBSERVABILITY_AXES) {
      const statuses = rows.map(row => {
        const envelope = extractResearchResolutionEnvelope(entries.find(entry => entry.source === row.source)?.document);
        return {
          source: row.source,
          status: envelope?.axes?.[axis]?.status ?? 'unknown',
        };
      });
      axes[axis] = {
        statuses,
        satisfiedSources: statuses.filter(item => item.status === 'satisfied').map(item => item.source),
        blockedSources: statuses.filter(item => item.status === 'blocked').map(item => item.source),
        unknownSources: statuses.filter(item => item.status === 'unknown').map(item => item.source),
      };
    }
    return {
      questionId,
      sources: rows.map(row => row.source),
      compatibleInterpretationContract: signatures.size === 1,
      interpretationContractVariants: signatures.size,
      axisCoverage: axes,
      compositionStatus: 'diagnostic-only',
      decisionEntitlement: 'none',
      note: 'Axis coverage across sources does not compose into resolution readiness without an explicit compatibility contract.',
    };
  }).sort((a, b) => String(a.questionId).localeCompare(String(b.questionId)));
}
