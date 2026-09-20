import assert from 'node:assert/strict';
import {
    summarizeCapabilityInventionDemand,
    validateCapabilityInventionDemand,
} from './capability-invention-demand.mjs';

const baseRow = {
    id: 'CID-0001',
    subject: {
        levelId: 'R00001',
        population: 'test population',
        corpus: 'Corpus 2',
        parentId: 'R00001',
    },
    diagnosisStatus: 'resolved',
    firstLossClass: 'F7',
    workClass: 'HARVEST',
    evidenceStrength: 'confirmation',
    evidenceRefs: ['reports/example.md'],
    unresolvedEarlierClasses: [],
    minimalCounterfactual: 'give the existing action enough work',
    demand: 'existing capability is underdeployed',
    atlasDimensions: ['action', 'reachability'],
    smallestProbe: {
        question: 'does matched-work reallocation recover the solve?',
        decisionSeam: 'stage budget',
        advanceIf: 'net gain',
        stopIf: 'displacement only',
    },
    recurrenceScope: 'multiple-independent-parents',
    notes: null,
};

const valid = {
    schemaVersion: 1,
    purpose: 'test register',
    productionBoundary: 'abc',
    updatedAt: '2026-09-20',
    rows: [
        baseRow,
        {
            ...baseRow,
            id: 'CID-0002',
            subject: { ...baseRow.subject, levelId: 'R00002', parentId: 'R00002' },
            diagnosisStatus: 'partial',
            firstLossClass: 'F4',
            workClass: 'INVENTION',
            recurrenceScope: 'multiple-independent-parents',
            demand: 'solver lacks a causal explanation primitive',
        },
    ],
};

assert.deepEqual(validateCapabilityInventionDemand(valid), []);

const summary = summarizeCapabilityInventionDemand(valid);
assert.deepEqual(summary.byWorkClass, { HARVEST: 1, INVENTION: 1 });
assert.deepEqual(summary.byFirstLossClass, { F7: 1, F4: 1 });
assert.deepEqual(summary.byDiagnosisStatus, { resolved: 1, partial: 1 });
assert.deepEqual(summary.recurrentAcquisition, ['CID-0002']);

const duplicate = {
    ...valid,
    rows: [baseRow, { ...baseRow }],
};
assert.ok(validateCapabilityInventionDemand(duplicate).some(error => error.includes('duplicates')));

const unresolvedWrongClass = {
    ...valid,
    rows: [{
        ...baseRow,
        diagnosisStatus: 'unresolved',
        firstLossClass: 'F7',
        workClass: 'UNKNOWN',
    }],
};
assert.ok(validateCapabilityInventionDemand(unresolvedWrongClass).some(error =>
    error.includes('UNRESOLVED_EARLIER_CLASS')));

const resolvedUnknown = {
    ...valid,
    rows: [{
        ...baseRow,
        workClass: 'UNKNOWN',
    }],
};
assert.ok(validateCapabilityInventionDemand(resolvedUnknown).some(error =>
    error.includes('resolved diagnosis should not retain UNKNOWN')));

console.log('capability-invention-demand-node-test: ok');
