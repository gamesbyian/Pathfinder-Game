import assert from 'node:assert/strict';

import { auditResearchQuestionAuthorities, parseWorkstreamQuestionStates, queueQuestionLifecycleIssues } from './research-question-authority-audit-lib.mjs';

const fixtureTable = `
| ID | Workstream | Execution state | Gate class | State / context | Next gate | Stable question ref |
|---:|---|---|---|---|---|---|
| 1 | live | \`active\` | \`implementation\` | x | y | \`Q-TERMINAL\` |
| 2 | done | \`closed\` | \`reopen-only\` | x | y | \`Q-ACTIVE\` |
| 3 | dormant | \`on-demand\` | \`reopen-only\` | x | y | \`Q-DEFERRED\` |
`;
const fixtureRegistry = {
  questions: [
    { id: 'Q-TERMINAL', state: 'concluded-positive' },
    { id: 'Q-ACTIVE', state: 'active-candidate' },
    { id: 'Q-DEFERRED', state: 'deferred-reopen' },
  ],
};
assert.equal(parseWorkstreamQuestionStates(fixtureTable).length, 3);
const lifecycleIssues = queueQuestionLifecycleIssues(fixtureTable, fixtureRegistry);
assert.ok(lifecycleIssues.some(issue => issue.includes('workstream 1 is active') && issue.includes('terminal')));
assert.ok(lifecycleIssues.some(issue => issue.includes('workstream 2 is closed') && issue.includes('active-candidate')));
assert.equal(lifecycleIssues.some(issue => issue.includes('workstream 3')), false,
  'on-demand reopen-only work may legitimately point at a deferred-reopen question');

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
