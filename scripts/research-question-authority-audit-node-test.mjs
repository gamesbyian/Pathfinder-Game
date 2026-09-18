import assert from 'node:assert/strict';

import { auditResearchQuestionAuthorities } from './research-question-authority-audit-lib.mjs';

const result = auditResearchQuestionAuthorities(process.cwd());
assert.equal(result.errorCount, 0, JSON.stringify(result.errors));
assert.ok(Number.isInteger(result.questionCount) && result.questionCount > 0);
assert.ok(Array.isArray(result.warnings));
console.log('research-question-authority-audit-node-test: ok');
