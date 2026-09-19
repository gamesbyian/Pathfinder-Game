#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    classifyHintTermination,
    summarizeHintTerminationClasses,
} from './hint-termination-semantics-lib.mjs';

assert.equal(classifyHintTermination('solved'), 'solved');
assert.equal(classifyHintTermination('success'), 'solved');
assert.equal(classifyHintTermination('exhaustive'), 'complete-enumeration',
    'successful enumeration must not collapse into exhausted-negative failure semantics');
assert.equal(classifyHintTermination('node-budget-reached'), 'node-limited');
assert.equal(classifyHintTermination('work-budget-reached'), 'work-limited');
assert.equal(classifyHintTermination('timed-out'), 'deadline-truncated');
assert.equal(classifyHintTermination('harness-error'), 'error');
assert.equal(classifyHintTermination('something-historical'), 'unknown');

const summary = summarizeHintTerminationClasses([
    { path: [1, 2], provenance: [
        { search: { termination: 'solved' } },
        { search: { termination: 'exhaustive' } },
    ] },
    { path: [1, 3], provenance: [
        { search: { termination: 'node-budget-reached' } },
        { search: { termination: 'timeout' } },
    ] },
]);
assert.equal(summary.events, 4);
assert.equal(summary.counts.solved, 1);
assert.equal(summary.counts['complete-enumeration'], 1);
assert.equal(summary.counts['node-limited'], 1);
assert.equal(summary.counts['deadline-truncated'], 1);

console.log('hint-termination-semantics-lib-node-test: ok');
