import { researchSemanticHash } from './research-semantic-identity-lib.mjs';

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  return value.trim();
}

function validateDerivationEdges(edges) {
  if (!Array.isArray(edges)) throw new Error('derivationEdges must be an array');
  return edges.map((edge, index) => {
    if (!edge || typeof edge !== 'object' || Array.isArray(edge)) {
      throw new Error(`derivationEdges[${index}] must be an object`);
    }
    const affects = edge.affects;
    if (!Array.isArray(affects) || affects.length === 0
        || affects.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error(`derivationEdges[${index}].affects must contain non-empty strings`);
    }
    return {
      ...edge,
      kind: nonEmptyString(edge.kind, `derivationEdges[${index}].kind`),
      ref: nonEmptyString(edge.ref, `derivationEdges[${index}].ref`),
      relation: nonEmptyString(edge.relation, `derivationEdges[${index}].relation`),
      affects: [...new Set(affects.map(value => value.trim()))],
    };
  });
}

export function buildResearchClaimCapsule({
  kind,
  questionId,
  claimType,
  evidenceRole,
  analysisContractIdentity,
  analysisIdentity,
  populationScope,
  instrument,
  observedResult,
  scientificDisposition,
  decisionDisposition,
  derivationEdges,
  reverseInvalidation = {
    policy: 'flag-material-descendants-do-not-auto-rewrite',
    action: 're-evaluate this claim and materially dependent descendants; do not automatically rewrite dispositions',
  },
  schemaVersion = 1,
} = {}) {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error('schemaVersion must be a positive integer');
  }
  const core = {
    schemaVersion,
    kind: nonEmptyString(kind, 'kind'),
    questionId: nonEmptyString(questionId, 'questionId'),
    claimType: nonEmptyString(claimType, 'claimType'),
    evidenceRole: nonEmptyString(evidenceRole, 'evidenceRole'),
    analysisContractIdentity: nonEmptyString(analysisContractIdentity, 'analysisContractIdentity'),
    analysisIdentity: nonEmptyString(analysisIdentity, 'analysisIdentity'),
    populationScope,
    instrument,
    observedResult,
    scientificDisposition,
    decisionDisposition,
    derivation: { edges: validateDerivationEdges(derivationEdges) },
    reverseInvalidation: {
      policy: nonEmptyString(reverseInvalidation?.policy, 'reverseInvalidation.policy'),
      action: nonEmptyString(reverseInvalidation?.action, 'reverseInvalidation.action'),
    },
  };
  return { ...core, claimIdentity: researchSemanticHash(core) };
}

export function researchClaimIdentity(capsule) {
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) {
    throw new Error('claim capsule must be an object');
  }
  const { claimIdentity: _identity, ...core } = capsule;
  return researchSemanticHash(core);
}

export function assertResearchClaimIdentity(capsule) {
  if (capsule?.claimIdentity !== researchClaimIdentity(capsule)) {
    throw new Error('research claim requires a valid claimIdentity matching claim content');
  }
  return capsule;
}

export function researchClaimInvalidationImpact(capsule, { kind, ref } = {}) {
  assertResearchClaimIdentity(capsule);
  const dependencyKind = nonEmptyString(kind, 'invalidation kind');
  const dependencyRef = nonEmptyString(ref, 'invalidation ref');
  const matches = (capsule.derivation?.edges ?? [])
    .filter(edge => edge.kind === dependencyKind && edge.ref === dependencyRef);
  return {
    invalidated: { kind: dependencyKind, ref: dependencyRef },
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
