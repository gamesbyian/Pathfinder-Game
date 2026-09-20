import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildResearchPortfolioRetrospective } from './research-portfolio-retrospective-lib.mjs';

const result = buildResearchPortfolioRetrospective(process.cwd(), {
  startDate: '2026-09-12',
  endDate: '2026-09-19',
});

assert.equal(result.schemaVersion, 1);
assert.equal(result.kind, 'pathfinder-research-portfolio-retrospective');
assert.deepEqual(result.frozenWindow, {
  startDate: '2026-09-12',
  endDate: '2026-09-19',
  basis: 'dated report references retained by current question relations',
});
assert.ok(result.counts.windowQuestions >= 6, 'recent window should include a non-trivial question population');
assert.equal(result.questions.length, result.counts.windowQuestions);
assert.ok(result.questions.some(row => row.id === 'WS2-WORK-LADDER-ECONOMICS'));
assert.ok(result.questions.some(row => row.id === 'WS2-FAILURE-RESPONSE-RECONNAISSANCE'));
assert.ok(result.questions.every(row => row.evidenceRefs.length > 0));
assert.equal(
  Object.values(result.counts.answerability).reduce((sum, value) => sum + value, 0),
  result.counts.windowQuestions,
);
assert.ok(result.measurementOpportunityUse.some(row => row.id === 'MO-004' && row.windowQuestionIds.length > 0));
assert.equal(result.capabilityGaps.some(row => row.questionId === 'WS2-FAILURE-RESPONSE-RECONNAISSANCE'), false,
  'concluded reconnaissance must no longer appear as a current capability gap');
assert.ok(Array.isArray(result.negativeIntersections));
assert.equal(result.independenceContext.sharedImplementationDependencySource,
  'research:system-inventory -- --view=architecture');
assert.ok(Array.isArray(result.explorationTriggers));
assert.ok(result.interpretationLimits.some(limit => /do not measure effort or productivity/u.test(limit)));
assert.ok(result.interpretationLimits.some(limit => /cannot prove that instruments caused the agenda/u.test(limit)));
const frozen = JSON.parse(readFileSync('reports/2026-09-19-research-portfolio-retrospective-data-001.json', 'utf8'));
assert.equal(frozen.kind, 'pathfinder-research-portfolio-retrospective');
assert.deepEqual(frozen.frozenWindow, result.frozenWindow,
  'dated snapshot and current reconstruction must describe the same frozen evidence window');
assert.ok(frozen.questions.length > 0 && frozen.counts.windowQuestions === frozen.questions.length,
  'checked-in dated retrospective must remain internally complete');
assert.ok(frozen.questions.some(row => row.id === 'WS2-FAILURE-RESPONSE-RECONNAISSANCE'),
  'dated snapshot preserves the question state visible when the artifact was frozen');
// Do not require bit identity with mutable current authorities: later question lifecycle changes
// are expected to alter answerability/current-gap derivations without rewriting dated evidence.

const narrow = buildResearchPortfolioRetrospective(process.cwd(), {
  startDate: '2026-09-19',
  endDate: '2026-09-19',
});
assert.ok(narrow.counts.windowQuestions <= result.counts.windowQuestions);

console.log('research portfolio retrospective tests passed');
