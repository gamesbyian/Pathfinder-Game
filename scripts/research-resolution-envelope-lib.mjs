export const RESEARCH_OBSERVABILITY_AXES = Object.freeze([
  'eligibility',
  'opportunity',
  'reach',
  'participation',
  'measurementSupport',
  'coverage',
  'censoring',
]);

export const RESEARCH_OBSERVABILITY_AXIS_STATUSES = Object.freeze([
  'satisfied',
  'blocked',
  'unknown',
  'not-required',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function researchResolutionEnvelopeIssues(envelope, { path = 'resolution' } = {}) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return [path];
  const issues = [];
  if (envelope.schemaVersion !== 1) issues.push(`${path}.schemaVersion`);
  if (envelope.kind !== 'pathfinder-research-resolution-envelope') issues.push(`${path}.kind`);
  if (!nonEmpty(envelope.questionId)) issues.push(`${path}.questionId`);
  if (!Array.isArray(envelope.liveRivals) || envelope.liveRivals.length < 2
      || envelope.liveRivals.some(value => !nonEmpty(value))) {
    issues.push(`${path}.liveRivals`);
  }
  if (!nonEmpty(envelope.discriminatingObservable)) issues.push(`${path}.discriminatingObservable`);

  if (!Array.isArray(envelope.requiredAxes)
      || envelope.requiredAxes.some(axis => !RESEARCH_OBSERVABILITY_AXES.includes(axis))
      || new Set(envelope.requiredAxes).size !== envelope.requiredAxes.length) {
    issues.push(`${path}.requiredAxes`);
  }

  if (!envelope.axes || typeof envelope.axes !== 'object' || Array.isArray(envelope.axes)) {
    issues.push(`${path}.axes`);
  } else {
    for (const axis of RESEARCH_OBSERVABILITY_AXES) {
      const record = envelope.axes[axis];
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        issues.push(`${path}.axes.${axis}`);
        continue;
      }
      if (!RESEARCH_OBSERVABILITY_AXIS_STATUSES.includes(record.status)) {
        issues.push(`${path}.axes.${axis}.status`);
      }
      if (record.reason != null && !nonEmpty(record.reason)) issues.push(`${path}.axes.${axis}.reason`);
    }
    for (const axis of Object.keys(envelope.axes)) {
      if (!RESEARCH_OBSERVABILITY_AXES.includes(axis)) issues.push(`${path}.axes.${axis}`);
    }
  }

  if (!nonEmpty(envelope.negativeInterpretationPolicy)) {
    issues.push(`${path}.negativeInterpretationPolicy`);
  }
  return [...new Set(issues)];
}

export function validateResearchResolutionEnvelope(envelope, options = {}) {
  const issues = researchResolutionEnvelopeIssues(envelope, options);
  if (issues.length) throw new Error(`invalid research resolution envelope: ${issues.join(', ')}`);
  return envelope;
}

export function buildResearchResolutionEnvelope({
  questionId,
  liveRivals,
  discriminatingObservable,
  requiredAxes,
  axes,
  negativeInterpretationPolicy,
  outcomeInterpretation = null,
  source = null,
}) {
  const normalizedAxes = {};
  for (const axis of RESEARCH_OBSERVABILITY_AXES) {
    const supplied = axes?.[axis] ?? {};
    normalizedAxes[axis] = {
      status: supplied.status ?? (requiredAxes?.includes(axis) ? 'unknown' : 'not-required'),
      ...(supplied.reason != null ? { reason: supplied.reason } : {}),
      ...(supplied.evidence != null ? { evidence: supplied.evidence } : {}),
    };
  }

  const envelope = {
    schemaVersion: 1,
    kind: 'pathfinder-research-resolution-envelope',
    questionId,
    liveRivals: [...(liveRivals ?? [])],
    discriminatingObservable,
    outcomeInterpretation,
    requiredAxes: [...(requiredAxes ?? [])],
    axes: normalizedAxes,
    negativeInterpretationPolicy,
    source,
  };
  validateResearchResolutionEnvelope(envelope);

  const blockers = envelope.requiredAxes
    .filter(axis => envelope.axes[axis].status !== 'satisfied')
    .map(axis => ({
      axis,
      status: envelope.axes[axis].status,
      reason: envelope.axes[axis].reason ?? null,
    }));

  return {
    ...envelope,
    blockers,
    resolutionStatus: blockers.length ? 'observability-blocked' : 'resolution-ready',
  };
}
