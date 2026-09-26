import assert from 'node:assert/strict';

import { auditResearchQuestionAuthorities } from './research-question-authority-audit-lib.mjs';

const result = auditResearchQuestionAuthorities(process.cwd());
assert.equal(result.errorCount, 0, JSON.stringify(result.errors));
assert.ok(Number.isInteger(result.questionCount) && result.questionCount > 0);
assert.ok(Array.isArray(result.warnings));
assert.ok(result.relationTopology.implicationEdges > 0);
assert.ok(result.relationTopology.triggerEdges > 0);
assert.ok(Array.isArray(result.relationTopology.mirroredEdges));
assert.ok(Array.isArray(result.relationTopology.implicationOnlyEdges));
assert.ok(Array.isArray(result.relationTopology.triggerOnlyEdges));
assert.ok(result.relationTopology.implicationOnlyEdges.length > 0,
  'current registry should retain authored implication edges that are not genealogy mirrors');
assert.ok(result.relationTopology.triggerOnlyEdges.length > 0,
  'current registry should retain genealogy edges that are not authored implications');
console.log('research-question-authority-audit-node-test: ok');
