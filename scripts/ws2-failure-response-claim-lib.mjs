import { createHash } from 'node:crypto';
import { validateWs2FailureResponseAnalysisEnvelope, ws2FailureResponseAnalysisIdentity } from './ws2-failure-response-analysis-contract-lib.mjs';

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

const ROUTE_CONSEQUENCE = Object.freeze({
  'rejection-counterfactual': 'Freeze a bounded typed-rejection counterfactual design at the existing semantic owner; do not disable broad pruning.',
  'first-loss': 'Invoke the existing search-loss Phase-9 first-loss procedure; do not create a competing protocol.',
  'producer-consumer-2x2': 'Predeclare all four producer/consumer arms under matched total work before treatment outcomes.',
  'allocation-specific-follow-up': 'Freeze the nominated exact action/stage allocation question and comparable-work follow-up before outcomes.',
  'none': 'No expensive WS2 follow-up is earned by this reconnaissance.',
  'unresolved-needs-compact-diagnostics': 'Freeze a bounded Stage-B compact-diagnostic population/protocol before inspecting prune/flow/progress outcomes.',
});

export function buildWs2FailureResponseClaimCapsule(analysis) {
  validateWs2FailureResponseAnalysisEnvelope(analysis);
  if (!analysis || analysis.kind !== 'pathfinder-ws2-failure-response-reconnaissance-analysis') {
    throw new Error('WS2 claim capsule requires a WS2 reconnaissance analysis');
  }
  if (analysis.scientificDisposition?.status !== 'eligible-for-prespecified-routing') {
    throw new Error('WS2 claim capsule requires scientifically eligible evidence');
  }
  if (analysis.decision?.status !== 'selected' || !analysis.decision?.route) {
    throw new Error('WS2 claim capsule requires an explicit selected routing decision');
  }
  const expectedAnalysisIdentity = ws2FailureResponseAnalysisIdentity(analysis);
  if (analysis.analysisIdentity !== expectedAnalysisIdentity) {
    throw new Error('WS2 claim capsule requires a valid analysisIdentity matching analysis content');
  }
  const route = analysis.decision.route;
  const analysisIdentity = expectedAnalysisIdentity;
  const capsuleCore = {
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
      selection: analysis.scientificDisposition.populationSelection,
      targetEnvelope: analysis.scientificDisposition.targetEnvelope,
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
      primaryDiscriminator: analysis.scientificDisposition.primaryDiscriminator,
      negativeResolution: analysis.scientificDisposition.negativeResolution,
      reproducibility: analysis.scientificDisposition.reproducibility,
      inferenceScope: 'current residual parents under the recorded compatible solver/protocol boundary',
      adaptiveLineage: analysis.scientificDisposition.adaptiveLineage,
      independenceVector: analysis.scientificDisposition.independenceVector,
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
      rationale: analysis.decision.rationale,
      consequence: ROUTE_CONSEQUENCE[route],
      productionChangeLicensed: false,
    },
    derivation: {
      edges: [
        ...(analysis.execution.inputArtifacts ?? analysis.execution.inputFiles.map(path => ({ path, contentHash: null }))).map(item => ({
          kind: 'input-artifact',
          ref: item.path,
          contentHash: item.contentHash ?? null,
          relation: 'material-evidence-input',
          affects: ['scientific-claim', 'routing-decision'],
        })),
        {
          kind: 'analysis-contract',
          ref: analysis.analysisContract.path,
          identityHash: analysis.analysisContract.identityHash,
          relation: 'interpretation-contract',
          affects: ['scientific-claim', 'routing-decision'],
        },
        {
          kind: 'analysis-implementation',
          ref: analysis.execution.implementation,
          contentHash: analysis.execution.implementationHash ?? null,
          relation: 'observation-transform',
          affects: ['scientific-claim', 'routing-decision'],
        },
        ...analysis.scientificDisposition.protocolHashes.map(ref => ({
          kind: 'protocol-hash',
          ref,
          relation: 'comparability-boundary',
          affects: ['scientific-claim', 'routing-decision'],
        })),
        ...analysis.scientificDisposition.solverRefs.map(ref => ({
          kind: 'solver-ref',
          ref,
          relation: 'architecture-applicability-boundary',
          affects: ['scientific-claim', 'routing-decision'],
        })),
        {
          kind: 'semantic-contract',
          ref: 'parent-level-dependence',
          relation: 'independence-assumption',
          affects: ['scientific-claim', 'routing-decision'],
        },
      ],
    },
    reverseInvalidation: {
      policy: 'flag-material-descendants-do-not-auto-rewrite',
      action: 're-evaluate this claim and downstream routing decision; do not automatically rewrite either disposition',
    },
  };
  return { ...capsuleCore, claimIdentity: hash(capsuleCore) };
}

export function ws2FailureResponseClaimIdentity(capsule) {
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) {
    throw new Error('claim capsule must be an object');
  }
  const { claimIdentity: _identity, ...core } = capsule;
  return hash(core);
}


export function ws2FailureResponseInvalidationImpact(capsule, { kind, ref }) {
  if (!capsule || capsule.kind !== 'pathfinder-ws2-failure-response-claim-capsule') {
    throw new Error('WS2 invalidation query requires a WS2 claim capsule');
  }
  if (capsule.claimIdentity !== ws2FailureResponseClaimIdentity(capsule)) {
    throw new Error('WS2 invalidation query requires a valid claimIdentity matching claim content');
  }
  if (typeof kind !== 'string' || !kind || typeof ref !== 'string' || !ref) {
    throw new Error('invalidation kind/ref must be non-empty strings');
  }
  const matches = (capsule.derivation?.edges ?? []).filter(edge => edge.kind === kind && edge.ref === ref);
  return {
    invalidated: { kind, ref },
    affected: matches.flatMap(edge => edge.affects.map(target => ({
      target,
      relation: edge.relation,
      dependencyKind: edge.kind,
      dependencyRef: edge.ref,
    }))),
    bounded: true,
    automaticRewrite: false,
  };
}
