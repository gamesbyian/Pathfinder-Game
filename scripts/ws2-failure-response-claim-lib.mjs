import { createHash } from 'node:crypto';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function hash(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')}`;
}

export function buildWs2FailureResponseClaimCapsule(analysis) {
  if (!analysis || analysis.kind !== 'pathfinder-ws2-failure-response-reconnaissance-analysis') {
    throw new Error('WS2 claim capsule requires a WS2 reconnaissance analysis');
  }
  if (analysis.scientificDisposition?.status !== 'eligible-for-prespecified-routing') {
    throw new Error('WS2 claim capsule requires scientifically eligible evidence');
  }
  if (analysis.decision?.status !== 'selected' || !analysis.decision?.route) {
    throw new Error('WS2 claim capsule requires an explicit selected routing decision');
  }
  const route = analysis.decision.route;
  const analysisIdentity = hash(analysis);
  return {
    schemaVersion: 1,
    kind: 'pathfinder-ws2-failure-response-claim-capsule',
    questionId: analysis.questionId,
    claimType: 'routing-discriminator',
    evidenceRole: analysis.analysisContract.evidenceRole,
    analysisContractIdentity: analysis.analysisContract.identityHash,
    analysisIdentity,
    populationScope: {
      independentUnit: analysis.scientificDisposition.independentUnit,
      unitTopology: analysis.scientificDisposition.unitTopology,
      protocolHashes: analysis.scientificDisposition.protocolHashes,
      solverRefs: analysis.scientificDisposition.solverRefs,
      applicability: analysis.scientificDisposition.currentApplicability,
    },
    instrument: analysis.scientificDisposition.instrument,
    observedResult: {
      independentParents: analysis.observation?.summary?.independentParents ?? null,
      solvedParents: analysis.observation?.summary?.solvedParents ?? null,
      nonSolvedParents: analysis.observation?.summary?.nonSolvedParents ?? null,
      protocolPartitions: analysis.observation?.summary?.protocolPartitions ?? null,
      participation: analysis.observation?.summary?.participation ?? null,
      reached: analysis.observation?.summary?.reached ?? null,
    },
    scientificDisposition: {
      status: 'supports-prespecified-routing-decision',
      inferenceScope: 'current residual parents under the recorded compatible solver/protocol boundary',
      limitations: [
        'This is discriminator-selection evidence, not solver-efficacy evidence.',
        'Attempt/record counts are not independent prevalence units; parent is the analysis/dependence unit.',
        'Unreported fields remain unknown and censoring remains indeterminate rather than negative.',
        'The claim does not transfer automatically across changed solver, protocol, residual-population, or instrument semantics.',
      ],
    },
    decisionDisposition: {
      action: 'select-next-ws2-discriminator',
      route,
      consequence: route === 'none'
        ? 'No expensive WS2 follow-up is earned by this reconnaissance.'
        : `Only the prespecified ${route} route is nominated for the next WS2 design step; no production solver change is licensed.`,
    },
    derivation: {
      inputArtifacts: analysis.execution.inputFiles,
      analysisImplementation: analysis.execution.implementation,
      analysisContractPath: analysis.analysisContract.path,
      dependencies: [
        'pathfinder-compact-failure-response semantics',
        'parent-level dependence semantics',
        'protocol/solver identity compatibility',
        'WS2 reconnaissance routing preflight',
      ],
    },
    reverseInvalidation: {
      materialTriggers: [
        'an input compact-response artifact is invalidated or its population integrity changes',
        'the frozen analysis contract is revised',
        'failure-response reducer semantics materially change',
        'protocol/solver identity was misclassified',
        'parent/dependence semantics are found incorrect',
      ],
      action: 're-evaluate this claim and downstream routing decision; do not automatically rewrite either disposition',
    },
  };
}
