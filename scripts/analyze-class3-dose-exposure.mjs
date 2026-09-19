#!/usr/bin/env node
/**
 * Mechanical Class-3 exact-action dose reducer.
 *
 * Input compact-response documents must be protocol-compatible. The expectation file freezes the
 * parent -> exact rescuer identity relation before solver outcomes are inspected.
 *
 * Usage:
 *   node scripts/analyze-class3-dose-exposure.mjs \
 *     --in=<failure-response.json>[,<more.json>] \
 *     --expectations=<class3-expectations.json> [--out=<analysis.json>]
 *
 * Expectation shape:
 * {
 *   "schemaVersion": 1,
 *   "kind": "pathfinder-class3-dose-expectations",
 *   "parents": [
 *     { "parentId": "R00001", "rescuers": [{ "actionKey": "...", "stageId": "optional" }] }
 *   ]
 * }
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const index = arg.indexOf('=');
    return [arg.slice(2, index), arg.slice(index + 1)];
}));
const input = args.get('in');
const expectationsPath = args.get('expectations');
if (!input || !expectationsPath) {
    console.error('Usage: node scripts/analyze-class3-dose-exposure.mjs --in=<doc1>[,<doc2>...] --expectations=<file> [--out=<file>]');
    process.exit(2);
}

const inputFiles = input.split(',').map(value => value.trim()).filter(Boolean);
for (const file of [...inputFiles, expectationsPath]) {
    if (!existsSync(file)) throw new Error(`missing input: ${file}`);
}

const documents = inputFiles.map(file => {
    const document = validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8')));
    return { file, document };
});
const expectations = JSON.parse(readFileSync(expectationsPath, 'utf8'));
if (expectations?.schemaVersion !== 1 || expectations?.kind !== 'pathfinder-class3-dose-expectations' || !Array.isArray(expectations?.parents)) {
    throw new Error('invalid Class-3 expectation file');
}

const parentExpectations = new Map();
for (const [index, parent] of expectations.parents.entries()) {
    if (!parent || typeof parent.parentId !== 'string' || !parent.parentId || !Array.isArray(parent.rescuers) || !parent.rescuers.length) {
        throw new Error(`invalid expectations.parents[${index}]`);
    }
    if (parentExpectations.has(parent.parentId)) throw new Error(`duplicate expected parent: ${parent.parentId}`);
    const seen = new Set();
    const rescuers = parent.rescuers.map((rescuer, rescuerIndex) => {
        if (!rescuer || typeof rescuer.actionKey !== 'string' || !rescuer.actionKey) {
            throw new Error(`invalid expectations.parents[${index}].rescuers[${rescuerIndex}]`);
        }
        const stageId = typeof rescuer.stageId === 'string' && rescuer.stageId.length ? rescuer.stageId : null;
        const identity = `${rescuer.actionKey}\n${stageId ?? ''}`;
        if (seen.has(identity)) throw new Error(`duplicate rescuer for ${parent.parentId}: ${rescuer.actionKey}`);
        seen.add(identity);
        return { actionKey: rescuer.actionKey, stageId };
    });
    parentExpectations.set(parent.parentId, rescuers);
}

const rows = documents.flatMap(({ file, document }) => document.records.map(record => ({
    ...record,
    protocolHash: record.protocolHash ?? document.protocolHash ?? null,
    solverRef: record.solverRef ?? document.solverRef ?? null,
    __sourceFile: file,
})));

const expectedIds = new Set(parentExpectations.keys());
const expectedRows = rows.filter(row => expectedIds.has(String(row.parentId ?? row.identity)));
const protocols = new Set(expectedRows.map(row => row.protocolHash).filter(Boolean));
const solvers = new Set(expectedRows.map(row => row.solverRef).filter(Boolean));
const unknownProtocolRows = expectedRows.filter(row => !row.protocolHash).length;
const unknownSolverRows = expectedRows.filter(row => !row.solverRef).length;
if (unknownProtocolRows || protocols.size !== 1) {
    throw new Error(`Class-3 analysis requires one known protocolHash across expected rows; known=${protocols.size}, unknownRows=${unknownProtocolRows}`);
}
if (unknownSolverRows || solvers.size !== 1) {
    throw new Error(`Class-3 analysis requires one known solverRef across expected rows; known=${solvers.size}, unknownRows=${unknownSolverRows}`);
}

function numericStats(values) {
    const known = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!known.length) return { count: 0, min: null, max: null, median: null };
    const middle = Math.floor(known.length / 2);
    return {
        count: known.length,
        min: known[0],
        max: known[known.length - 1],
        median: known.length % 2 ? known[middle] : (known[middle - 1] + known[middle]) / 2,
    };
}
function countBy(values) {
    const map = new Map();
    for (const value of values) {
        const key = value == null || value === '' ? 'unknown' : String(value);
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
function matchingAttempts(parentRows, rescuer) {
    return parentRows.flatMap(row => row.attempts ?? []).filter(attempt =>
        attempt.actionKey === rescuer.actionKey && (rescuer.stageId == null || attempt.stageId === rescuer.stageId));
}
function classifyAttempts(attempts) {
    if (!attempts.length) return 'exact-not-participated';
    if (attempts.some(attempt => attempt.outcome === 'solved')) return 'exact-participated-solved';
    const withDose = attempts.filter(attempt => Number.isFinite(attempt.workSpent) || Number.isFinite(attempt.nodesExpanded));
    if (!withDose.length) return 'exact-participated-dose-unknown';
    const negative = withDose.some(attempt => ['exhausted', 'failed'].includes(attempt.outcome));
    if (negative) return 'exact-participated-exhausted-negative';
    const censored = withDose.some(attempt => ['node-limited', 'work-limited', 'deadline-truncated'].includes(attempt.outcome));
    const allInterpretable = withDose.every(attempt => ['node-limited', 'work-limited', 'deadline-truncated', 'error', 'unknown'].includes(attempt.outcome));
    if (censored && allInterpretable && !withDose.some(attempt => ['error', 'unknown'].includes(attempt.outcome))) {
        return 'exact-participated-censored';
    }
    return 'exact-participated-indeterminate';
}

const rowsByParent = new Map();
for (const row of expectedRows) {
    const parentId = String(row.parentId ?? row.identity);
    const list = rowsByParent.get(parentId) ?? [];
    list.push(row);
    rowsByParent.set(parentId, list);
}

const rescuerRows = [];
const parentRows = [];
for (const [parentId, rescuers] of parentExpectations) {
    const sourceRows = rowsByParent.get(parentId) ?? [];
    const rescuerResults = rescuers.map(rescuer => {
        const attempts = matchingAttempts(sourceRows, rescuer);
        return {
            parentId,
            ...rescuer,
            disposition: classifyAttempts(attempts),
            attemptCount: attempts.length,
            outcomes: countBy(attempts.map(attempt => attempt.outcome)),
            workSpent: numericStats(attempts.map(attempt => attempt.workSpent)),
            nodesExpanded: numericStats(attempts.map(attempt => attempt.nodesExpanded)),
            nodeCeilings: numericStats(attempts.map(attempt => attempt.nodeCeiling)),
            workCeilings: numericStats(attempts.map(attempt => attempt.workCeiling)),
        };
    });
    rescuerRows.push(...rescuerResults);

    const dispositions = rescuerResults.map(result => result.disposition);
    let parentDisposition = 'exposure-complete-exhausted-negative';
    if (!sourceRows.length) parentDisposition = 'missing-parent';
    else if (dispositions.includes('exact-participated-solved')) parentDisposition = 'refreshed-current-solve';
    else if (dispositions.includes('exact-not-participated')) parentDisposition = 'exposure-gap';
    else if (dispositions.includes('exact-participated-dose-unknown') || dispositions.includes('exact-participated-indeterminate')) parentDisposition = 'dose-or-outcome-unknown';
    else if (dispositions.every(value => value === 'exact-participated-censored')) parentDisposition = 'censored-dose';
    else if (dispositions.some(value => value === 'exact-participated-exhausted-negative')) parentDisposition = 'exposed-and-negative';

    parentRows.push({
        parentId,
        sourceRecordCount: sourceRows.length,
        rescuerCount: rescuerResults.length,
        disposition: parentDisposition,
        rescuerDispositions: countBy(dispositions),
    });
}

const byAction = new Map();
for (const row of rescuerRows) {
    const group = byAction.get(row.actionKey) ?? { parents: new Set(), attempts: 0, outcomes: [], work: [], nodes: [], dispositions: [] };
    group.parents.add(row.parentId);
    group.attempts += row.attemptCount;
    group.outcomes.push(...Object.entries(row.outcomes).flatMap(([outcome, count]) => Array(count).fill(outcome)));
    if (row.workSpent.count) group.work.push(...matchingAttempts(rowsByParent.get(row.parentId) ?? [], row).map(attempt => attempt.workSpent).filter(Number.isFinite));
    if (row.nodesExpanded.count) group.nodes.push(...matchingAttempts(rowsByParent.get(row.parentId) ?? [], row).map(attempt => attempt.nodesExpanded).filter(Number.isFinite));
    group.dispositions.push(row.disposition);
    byAction.set(row.actionKey, group);
}
const byActionSummary = Object.fromEntries([...byAction.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([actionKey, group]) => [actionKey, {
    parents: group.parents.size,
    attempts: group.attempts,
    outcomes: countBy(group.outcomes),
    dispositions: countBy(group.dispositions),
    workSpent: numericStats(group.work),
    nodesExpanded: numericStats(group.nodes),
}]));

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-class3-dose-exposure-analysis',
    inputs: inputFiles,
    expectations: expectationsPath,
    protocolHash: [...protocols][0] ?? null,
    solverRef: [...solvers][0] ?? null,
    expectedParents: parentExpectations.size,
    observedExpectedParents: rowsByParent.size,
    missingParents: [...parentExpectations.keys()].filter(id => !rowsByParent.has(id)),
    parentDispositions: countBy(parentRows.map(row => row.disposition)),
    rescuerDispositions: countBy(rescuerRows.map(row => row.disposition)),
    byAction: byActionSummary,
    parents: parentRows,
    rescuers: rescuerRows,
    denominatorNote: 'Parent is the independent unit. Rescuer/attempt counts are dependent support diagnostics.',
};

const output = JSON.stringify(result, null, 2) + '\n';
if (args.get('out')) writeFileSync(args.get('out'), output);
else process.stdout.write(output);
