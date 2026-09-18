import assert from 'node:assert/strict';

import {
    buildResearchRelations,
    indexBy,
    leftJoin,
    queryRelation,
    summarizeIndependentSupport,
} from './research-relations-lib.mjs';

const model = {
    relations: {
        demo: [
            { id: 'A', state: 'active', tags: ['topology', 'separator'] },
            { id: 'B', state: 'closed-tested-form', tags: ['repair'] },
        ],
    },
};

assert.deepEqual(queryRelation(model, 'demo', { query: 'topology separator' }).rows.map(row => row.id), ['A']);
assert.deepEqual(queryRelation(model, 'demo', { status: 'closed' }).rows.map(row => row.id), ['B']);
assert.throws(() => indexBy([{ id: 'x' }, { id: 'x' }], 'id'), /duplicate relation identity/);

const joined = leftJoin(
    [{ id: 'x' }, { id: 'y' }],
    [{ parent: 'x', value: 1 }, { parent: 'x', value: 2 }],
    { leftKey: 'id', rightKey: 'parent', as: 'children' },
);
assert.equal(joined[0].children.length, 2);
assert.equal(joined[1].children.length, 0);

assert.deepEqual(summarizeIndependentSupport([
    { parent: 'P1' }, { parent: 'P1' }, { parent: 'P2' }, { parent: null },
], 'parent'), {
    rows: 4,
    independentUnits: 2,
    missingIndependentUnit: 1,
    largestUnitRows: 2,
    units: { P1: 2, P2: 1 },
});

const real = buildResearchRelations(process.cwd());
assert.ok(real.relations.questions.some(row => row.id === 'WS2-D1-PRODUCTION-INERT-OBSERVATION'));
assert.ok(real.relations.measurementOpportunities.some(row => row.id === 'MO-005'));
assert.ok(real.relations.premiseAdmissions.some(row => row.premiseId === 'P201'));
assert.ok(real.relations.assets.some(row => row.id === 'experiment-manifests'));
assert.ok(real.relations.questions.every(row => row._researchSource?.relation === 'questions'));

console.log('research-relations-node-test: ok');
