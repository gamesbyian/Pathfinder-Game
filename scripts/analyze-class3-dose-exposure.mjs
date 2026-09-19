#!/usr/bin/env node
/** Join frozen Class-3 expectations to protocol-compatible compact shared-production attempts. */
import { readFileSync, writeFileSync } from 'node:fs';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const separator = arg.indexOf('=');
    return [arg.slice(2, separator), arg.slice(separator + 1)];
}));
const expectationFile = args.get('expectations');
const inputFiles = (args.get('in') ?? '').split(',').filter(Boolean);
const output = args.get('out');
if (!expectationFile || inputFiles.length === 0) {
    throw new Error('Usage: analyze-class3-dose-exposure.mjs --expectations=<json> --in=<compact.json,...> [--protocol=HASH] [--solver-ref=REF] [--out=FILE]');
}

const expectations = JSON.parse(readFileSync(expectationFile, 'utf8'));
if (expectations.kind !== 'pathfinder-class3-dose-expectations' || !Array.isArray(expectations.parents)) {
    throw new Error('invalid Class-3 expectation document');
}
const documents = inputFiles.map(file => validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8'))));
function identityValues(field) {
    return new Set(documents.flatMap(document => [
        document[field],
        ...document.records.map(record => record[field]),
    ]).filter(Boolean));
}
const protocols = identityValues('protocolHash');
const solverRefs = identityValues('solverRef');
if (protocols.size !== 1 || solverRefs.size !== 1) {
    throw new Error(`incompatible compact evidence: require exactly one known protocolHash and solverRef; protocols=${[...protocols]} solverRefs=${[...solverRefs]}`);
}
if (args.get('protocol') && !protocols.has(args.get('protocol'))) {
    throw new Error(`protocolHash mismatch: expected ${args.get('protocol')}`);
}
if (args.get('solver-ref') && !solverRefs.has(args.get('solver-ref'))) {
    throw new Error(`solverRef mismatch: expected ${args.get('solver-ref')}`);
}

const rowsByParent = new Map();
for (const row of documents.flatMap(document => document.records)) {
    const parentId = String(row.parentId ?? row.identity);
    const rows = rowsByParent.get(parentId) ?? [];
    rows.push(row);
    rowsByParent.set(parentId, rows);
}
const missingParents = expectations.parents.map(row => row.parentId).filter(id => !rowsByParent.has(id));
if (missingParents.length) {
    throw new Error(`compact evidence is incomplete for frozen parents: ${missingParents.join(',')}`);
}

function attemptMatches(attempt, identity) {
    return attempt?.configKey === identity
        || attempt?.actionKey === identity
        || String(attempt?.actionKey ?? '').includes(`|${identity}`);
}
function classify(attempts) {
    if (attempts.length === 0) return 'exact-not-participated';
    if (attempts.some(attempt => attempt.outcome === 'solved')) return 'exact-participated-solved';
    if (attempts.some(attempt => attempt.deadlineTruncated === true
        || attempt.timedOut === true
        || ['deadline-truncated', 'node-limited', 'work-limited'].includes(attempt.outcome))) {
        return 'exact-participated-censored';
    }
    const doseKnown = attempts.some(attempt => Number.isFinite(attempt.workSpent) || Number.isFinite(attempt.nodesExpanded));
    if (!doseKnown) return 'exact-participated-dose-unknown';
    if (attempts.every(attempt => attempt.outcome === 'exhausted')) return 'exact-participated-exhausted-negative';
    return 'exact-participated-indeterminate';
}
function sumKnown(attempts, field) {
    const known = attempts.map(attempt => attempt[field]).filter(Number.isFinite);
    return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

const parents = expectations.parents.map(expected => {
    const rows = rowsByParent.get(expected.parentId);
    const actions = expected.expectations.map(expectation => {
        const attempts = rows.flatMap(row => row.attempts ?? [])
            .filter(attempt => attemptMatches(attempt, expectation.actionIdentity));
        return {
            ...expectation,
            classification: classify(attempts),
            attemptCount: attempts.length,
            workSpent: sumKnown(attempts, 'workSpent'),
            nodesExpanded: sumKnown(attempts, 'nodesExpanded'),
        };
    });
    return { parentId: expected.parentId, observedRows: rows.length, actions };
});
const classificationCounts = {};
for (const parent of parents) {
    for (const action of parent.actions) {
        classificationCounts[action.classification] = (classificationCounts[action.classification] ?? 0) + 1;
    }
}
const result = {
    schemaVersion: 1,
    kind: 'pathfinder-class3-dose-analysis',
    protocolHash: [...protocols][0],
    solverRef: [...solverRefs][0],
    independentUnit: 'parentId',
    parentCount: parents.length,
    observedParentCount: parents.filter(parent => parent.observedRows > 0).length,
    classificationCounts,
    parents,
    interpretation: 'Mechanical exposure/dose classification only. Isolated census nodes are context and are not shared-production dose.',
};
const json = `${JSON.stringify(result, null, 2)}\n`;
if (output) writeFileSync(output, json);
else process.stdout.write(json);
