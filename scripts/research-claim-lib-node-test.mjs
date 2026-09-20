import assert from 'node:assert/strict';

import {
  buildResearchClaimCapsule,
  researchClaimIdentity,
  researchClaimInvalidationImpact,
} from './research-claim-lib.mjs';

const claim = buildResearchClaimCapsule({
  kind: 'pathfinder-test-claim-capsule',
  questionId: 'TEST-QUESTION',
  claimType: 'mechanism-discriminator',
  evidenceRole: 'development',
  analysisContractIdentity: `sha256:${'1'.repeat(64)}`,
  analysisIdentity: `sha256:${'2'.repeat(64)}`,
  populationScope: { populationIdentity: `sha256:${'3'.repeat(64)}` },
  instrument: { kind: 'test-instrument' },
  observedResult: { signal: 'present' },
  scientificDisposition: { status: 'supports-tested-form' },
  decisionDisposition: { action: 'continue-test-line' },
  derivationEdges: [
    {
      kind: 'input-artifact',
      ref: 'fixture.json',
      relation: 'material-evidence-input',
      affects: ['scientific-claim'],
    },
    {
      kind: 'analysis-contract',
      ref: 'fixture-contract.json',
      relation: 'interpretation-contract',
      affects: ['scientific-claim', 'decision'],
    },
  ],
});

assert.match(claim.claimIdentity, /^sha256:[0-9a-f]{64}$/u);
assert.equal(claim.claimIdentity, researchClaimIdentity(claim));
assert.equal(claim.reverseInvalidation.policy, 'flag-material-descendants-do-not-auto-rewrite');

const impact = researchClaimInvalidationImpact(claim, {
  kind: 'analysis-contract',
  ref: 'fixture-contract.json',
});
assert.deepEqual(impact.affected.map(item => item.target).sort(), ['decision', 'scientific-claim']);
assert.equal(impact.automaticRewrite, false);

const unrelated = researchClaimInvalidationImpact(claim, {
  kind: 'input-artifact',
  ref: 'other.json',
});
assert.deepEqual(unrelated.affected, []);

const reordered = {
  ...claim,
  scientificDisposition: { status: 'supports-tested-form' },
};
assert.equal(researchClaimIdentity(reordered), claim.claimIdentity,
  'identity must be stable under object key insertion/order differences');

const tampered = {
  ...claim,
  decisionDisposition: { action: 'different-action' },
};
assert.throws(() => researchClaimInvalidationImpact(tampered, {
  kind: 'analysis-contract',
  ref: 'fixture-contract.json',
}), /valid claimIdentity matching claim content/u);

assert.throws(() => buildResearchClaimCapsule({
  ...claim,
  claimIdentity: undefined,
  derivationEdges: [{ kind: 'input-artifact', ref: 'fixture.json', relation: 'material-evidence-input', affects: [] }],
}), /affects must contain non-empty strings/u);

console.log('research claim dependency primitive tests passed');
