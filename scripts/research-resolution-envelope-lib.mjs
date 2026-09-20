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

export const RESEARCH_OBSERVABILITY_DEFAULT_REMEDIATION = Object.freeze({
  eligibility: 'acquisition-or-scope',
  opportunity: 'population-conditioning',
  reach: 'routing-or-exposure',
  participation: 'allocation-or-wiring',
  measurementSupport: 'instrumentation-or-reference',
  coverage: 'acquisition-or-reconciliation',
  censoring: 'work-envelope-or-recovery',
});

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function projectedBlockers(envelope) {
  if (!Array.isArray(envelope?.requiredAxes) || !envelope?.axes || typeof envelope.axes !== 'object') return [];
  return envelope.requiredAxes
    .filter(axis => envelope.axes?.[axis]?.status !== 'satisfied')
    .map(axis => ({
      axis,
      status: envelope.axes?.[axis]?.status ?? 'unknown',
      reason: envelope.axes?.[axis]?.reason ?? null,
      remediation: envelope.axes?.[axis]?.remediation
        ?? RESEARCH_OBSERVABILITY_DEFAULT_REMEDIATION[axis],
    }));
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
      if (record.remediation != null && !nonEmpty(record.remediation)) issues.push(`${path}.axes.${axis}.remediation`);
    }
    for (const axis of Object.keys(envelope.axes)) {
      if (!RESEARCH_OBSERVABILITY_AXES.includes(axis)) issues.push(`${path}.axes.${axis}`);
    }
  }

  if (!nonEmpty(envelope.negativeInterpretationPolicy)) {
    issues.push(`${path}.negativeInterpretationPolicy`);
  }

  const expectedBlockers = projectedBlockers(envelope);
  const expectedResolutionStatus = expectedBlockers.length ? 'observability-blocked' : 'resolution-ready';
  if (envelope.resolutionStatus != null && envelope.resolutionStatus !== expectedResolutionStatus) {
    issues.push(`${path}.resolutionStatus`);
  }
  if (envelope.blockers != null) {
    if (!Array.isArray(envelope.blockers)) {
      issues.push(`${path}.blockers`);
    } else {
      const observed = envelope.blockers.map(row => ({
        axis: row?.axis ?? null,
        status: row?.status ?? null,
        reason: row?.reason ?? null,
        remediation: row?.remediation ?? null,
      }));
      if (JSON.stringify(observed) !== JSON.stringify(expectedBlockers)) issues.push(`${path}.blockers`);
    }
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
      ...(supplied.remediation != null ? { remediation: supplied.remediation } : {}),
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

  const blockers = projectedBlockers(envelope);

  return {
    ...envelope,
    blockers,
    resolutionStatus: blockers.length ? 'observability-blocked' : 'resolution-ready',
  };
}
