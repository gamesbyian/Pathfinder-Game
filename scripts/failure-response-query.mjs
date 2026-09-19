#!/usr/bin/env node
/**
 * Query/reduce one or more pathfinder-compact-failure-response documents.
 *
 * Parent-level prevalence is the default denominator. Record/attempt counts are retained only as
 * support diagnostics; they are never presented as independent prevalence.
 *
 * Usage:
 *   node scripts/failure-response-query.mjs --in=<doc1>[,<doc2>...] [filters]
 *
 * Filters:
 *   --parent=ID --outcome=VALUE --action=KEY --stage=ID --producer=ID --run=ID
 *   --protocol=HASH --participated=true|false --reached=true|false
 *   --solved-with-failed-attempt=true|false --attempt-outcome=VALUE
 *   --min-work=N --max-work=N
 */
import { existsSync, readFileSync } from 'node:fs';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const i = a.indexOf('=');
    return [a.slice(2, i), a.slice(i + 1)];
}));
const input = args.get('in');
if (!input) {
    console.error('Usage: node scripts/failure-response-query.mjs --in=<doc1>[,<doc2>...] [filters]');
    process.exit(2);
}

const inputFiles = input.split(',').map(s => s.trim()).filter(Boolean);
const missingFiles = inputFiles.filter(file => !existsSync(file));
if (missingFiles.length) throw new Error(`missing compact failure-response input(s): ${missingFiles.join(', ')}`);

const documents = inputFiles.map(file => {
    const document = validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8')));
    return { file, document };
});
let rows = documents.flatMap(({ file, document }) => document.records.map(record => ({
    ...record,
    __sourceFile: file,
})));

function boolArg(name) {
    if (!args.has(name)) return null;
    const value = args.get(name);
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`--${name} must be true or false`);
}
function same(value, expected) {
    return String(value ?? '') === expected;
}
const directFilters = {
    parent: row => same(row.parentId ?? row.identity, args.get('parent')),
    outcome: row => same(row.outcome, args.get('outcome')),
    action: row => same(row.actionKey, args.get('action')),
    stage: row => same(row.stageId, args.get('stage')),
    producer: row => same(row.producer, args.get('producer')),
    run: row => same(row.runId, args.get('run')),
    protocol: row => same(row.protocolHash, args.get('protocol')),
};
for (const [name, predicate] of Object.entries(directFilters)) if (args.has(name)) rows = rows.filter(predicate);
for (const name of ['participated', 'reached', 'solved-with-failed-attempt']) {
    const expected = boolArg(name);
    if (expected === null) continue;
    const field = name === 'solved-with-failed-attempt' ? 'solvedWithFailedAttempt' : name;
    rows = rows.filter(row => row[field] === expected);
}
if (args.has('attempt-outcome')) {
    const expected = args.get('attempt-outcome');
    rows = rows.filter(row => (row.attempts ?? []).some(attempt => attempt.outcome === expected));
}
if (args.has('min-work')) {
    const min = Number(args.get('min-work'));
    if (!Number.isFinite(min)) throw new Error('--min-work must be numeric');
    rows = rows.filter(row => Number.isFinite(row.workSpent) && row.workSpent >= min);
}
if (args.has('max-work')) {
    const max = Number(args.get('max-work'));
    if (!Number.isFinite(max)) throw new Error('--max-work must be numeric');
    rows = rows.filter(row => Number.isFinite(row.workSpent) && row.workSpent <= max);
}

function increment(map, key, by = 1) {
    const normalized = key == null || key === '' ? 'unknown' : String(key);
    map.set(normalized, (map.get(normalized) ?? 0) + by);
}
function objectFrom(map) {
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
const parentRows = new Map();
for (const row of rows) {
    const parent = String(row.parentId ?? row.identity);
    const list = parentRows.get(parent) ?? [];
    list.push(row);
    parentRows.set(parent, list);
}
const outcomeCounts = new Map();
const actionCounts = new Map();
const stageCounts = new Map();
const runCounts = new Map();
const protocolCounts = new Map();
const attemptOutcomeCounts = new Map();
let attemptRecords = 0;
let rowsWithWork = 0;
let totalWorkSpent = 0;
let participatedTrue = 0;
let participatedFalse = 0;
let reachedTrue = 0;
let reachedFalse = 0;
let solvedControlsWithFailedAttempts = 0;
for (const row of rows) {
    increment(outcomeCounts, row.outcome);
    increment(actionCounts, row.actionKey);
    increment(stageCounts, row.stageId);
    increment(runCounts, row.runId);
    increment(protocolCounts, row.protocolHash);
    if (row.participated === true) participatedTrue++;
    else if (row.participated === false) participatedFalse++;
    if (row.reached === true) reachedTrue++;
    else if (row.reached === false) reachedFalse++;
    if (row.solvedWithFailedAttempt === true) solvedControlsWithFailedAttempts++;
    if (Number.isFinite(row.workSpent)) {
        rowsWithWork++;
        totalWorkSpent += row.workSpent;
    }
    for (const attempt of row.attempts ?? []) {
        attemptRecords++;
        increment(attemptOutcomeCounts, attempt.outcome);
    }
}

let solvedParents = 0;
let nonSolvedParents = 0;
let parentsWithUnknownProtocol = 0;
let parentsWithMultipleKnownProtocols = 0;
for (const list of parentRows.values()) {
    if (list.some(row => row.outcome === 'solved')) solvedParents++;
    else nonSolvedParents++;
    const known = new Set(list.map(row => row.protocolHash).filter(Boolean));
    if (list.some(row => !row.protocolHash)) parentsWithUnknownProtocol++;
    if (known.size > 1) parentsWithMultipleKnownProtocols++;
}

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-compact-failure-response-query',
    inputs: inputFiles,
    filters: Object.fromEntries(args),
    rows,
    summary: {
        records: rows.length,
        independentParents: parentRows.size,
        solvedParents,
        nonSolvedParents,
        solvedControlsWithFailedAttempts,
        outcomes: objectFrom(outcomeCounts),
        actions: objectFrom(actionCounts),
        stages: objectFrom(stageCounts),
        runs: objectFrom(runCounts),
        protocols: objectFrom(protocolCounts),
        protocolComparability: {
            parentsWithUnknownProtocol,
            parentsWithMultipleKnownProtocols,
            note: 'Only rows sharing a known protocolHash are protocol-comparable by this reducer; unknown or mixed protocol identity is descriptive only.',
        },
        participation: { true: participatedTrue, false: participatedFalse, unknown: rows.length - participatedTrue - participatedFalse },
        reached: { true: reachedTrue, false: reachedFalse, unknown: rows.length - reachedTrue - reachedFalse },
        work: { rowsWithWork, totalWorkSpent },
        attempts: { records: attemptRecords, outcomes: objectFrom(attemptOutcomeCounts) },
        denominatorNote: 'Parent-level counts are the default independent-unit denominator; record/attempt counts are support diagnostics.',
    },
};
console.log(JSON.stringify(result, null, 2));
