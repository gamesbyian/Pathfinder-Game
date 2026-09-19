import assert from 'node:assert/strict';

import { auditExperimentResultDeclaredShape, declaredShapeIssues } from './experiment-result-contract-audit-lib.mjs';

const schema = {
    type: 'object',
    required: ['a'],
    properties: {
        a: { type: 'object', properties: { b: { type: 'string' } }, additionalProperties: false },
    },
    additionalProperties: false,
};
assert.deepEqual(declaredShapeIssues(schema, { a: { b: 'ok' } }), []);
assert.ok(declaredShapeIssues(schema, { a: { b: 'ok', c: 1 } }).some(issue => issue.includes('$.a.c')));
assert.ok(declaredShapeIssues(schema, { a: { b: 1 } }).some(issue => issue.includes('$.a.b')));
assert.ok(declaredShapeIssues(schema, {}).some(issue => issue.includes('$.a')));

const current = auditExperimentResultDeclaredShape(process.cwd());
assert.ok(current.artifactCount > 0, 'expected at least one durable v3 experiment-result manifest');
assert.deepEqual(
    current.results.filter(row => row.issueCount > 0),
    [],
    'durable v3 experiment-result manifests must conform to the declared schema shape',
);

console.log('experiment-result declared-shape audit tests passed');
