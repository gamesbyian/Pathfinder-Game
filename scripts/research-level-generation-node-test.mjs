import assert from 'node:assert/strict';
import {
  assessGenerationMethodSupport,
  compileGeneratorInvocation,
  crossConstructionStatus,
  normalizeMethodSelection,
  plannedParentCount,
  suiteDescriptor,
} from './research-level-generation-lib.mjs';

assert.deepEqual(normalizeMethodSelection({ suite: 'transfer-pair' }), ['random', 'topology']);
assert.deepEqual(suiteDescriptor('transfer-pair').defaultEvidenceRoles, { random: 'confirmation', topology: 'transfer' });
assert.deepEqual(normalizeMethodSelection({ methods: ['random', 'random', 'topology'] }), ['random', 'topology']);
assert.equal(crossConstructionStatus('targeted', 'random'), 'same-construction-family');
assert.equal(crossConstructionStatus('random', 'topology'), 'cross-construction');
assert.deepEqual(assessGenerationMethodSupport('topology', {
  requiredMechanics: ['must-cross', 'flipping-filter'],
}), {
  status: 'supported',
  requiredMechanics: ['must-cross', 'flipping-filter'],
  unsupported: [],
  unknown: [],
});
assert.deepEqual(assessGenerationMethodSupport('topology', {
  requiredMechanics: ['portal', 'must-pass'],
}), {
  status: 'unsupported',
  requiredMechanics: ['portal', 'must-pass'],
  unsupported: ['portal'],
  unknown: [],
});
assert.equal(assessGenerationMethodSupport('random', {
  requiredMechanics: ['portal'],
}).status, 'unknown');
assert.equal(plannedParentCount('random', 17), 17);
assert.equal(plannedParentCount('targeted', 17), 18);
assert.equal(plannedParentCount('targeted', 17, 4), 24);

const random = compileGeneratorInvocation({
  method: 'random',
  count: 12,
  masterSeed: 7,
  questionId: 'Q-test',
  evidenceRole: 'confirmation',
  outDir: 'tmp/x',
});
assert.equal(random.output, 'tmp/x/random.json');
assert.ok(random.args.includes('--count=12'));
assert.ok(random.args.includes('--question-id=Q-test'));
assert.ok(random.args.includes('--evidence-role=confirmation'));
assert.equal(random.supportEnvelope, null);

const targeted = compileGeneratorInvocation({
  method: 'targeted',
  count: 12,
  masterSeed: 8,
  outDir: 'tmp/x',
});
assert.ok(targeted.args.includes('--count-per-batch=2'));
assert.equal(targeted.plannedParentCount, 12);

const topology = compileGeneratorInvocation({
  method: 'topology',
  count: 4,
  masterSeed: 2,
});
assert.equal(topology.supportEnvelope.kind, 'pathfinder-generation-support-envelope');
assert.ok(topology.supportEnvelope.unsupportedMechanics.includes('portal'));

assert.throws(() => compileGeneratorInvocation({
  method: 'topology',
  count: 10,
  masterSeed: 1,
  envelopeCaps: true,
}), /not supported/);

console.log('research-level-generation-node-test: ok');
