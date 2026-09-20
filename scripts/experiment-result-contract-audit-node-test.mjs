import assert from 'node:assert/strict';

import {
    auditExperimentResultDeclaredShape,
    declaredShapeIssues,
    schemaCoverageIssues,
} from './experiment-result-contract-audit-lib.mjs';

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

const richerSchema = {
    type: 'object',
    required: ['id', 'values', 'mode'],
    properties: {
        id: { $ref: '#/$defs/hash' },
        values: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'integer', minimum: 0 } },
        mode: { anyOf: [{ const: 'a' }, { const: 'b' }] },
    },
    additionalProperties: { enum: ['allowed-extra'] },
    $defs: { hash: { type: 'string', pattern: '^sha256:[0-9a-f]{4}$' } },
};
assert.deepEqual(schemaCoverageIssues(richerSchema), []);
assert.deepEqual(declaredShapeIssues(richerSchema, {
    id: 'sha256:abcd', values: [0, 1], mode: 'b', extra: 'allowed-extra',
}), []);
assert.ok(declaredShapeIssues(richerSchema, {
    id: 'bad', values: [1, 1], mode: 'c', extra: 'wrong',
}).length >= 4);
assert.ok(declaredShapeIssues(richerSchema, {
    id: 'sha256:abcd', values: [], mode: 'a', extra: 'allowed-extra',
}).some(issue => issue.includes('minItems')));
assert.ok(schemaCoverageIssues({ ...richerSchema, oneOf: [{ const: 1 }] })
    .some(issue => issue.includes('unsupported schema keyword oneOf')));

const current = auditExperimentResultDeclaredShape(process.cwd());
assert.ok(current.artifactCount > 0, 'expected at least one durable v3 experiment-result manifest');
assert.deepEqual(current.schemaCoverageIssues, [],
    'declared v3 schema must not outrun the local conformance checker');
assert.deepEqual(
    current.results.filter(row => row.issueCount > 0),
    [],
    'durable v3 experiment-result manifests must conform to the declared schema shape',
);

console.log('experiment-result declared-shape audit tests passed');
