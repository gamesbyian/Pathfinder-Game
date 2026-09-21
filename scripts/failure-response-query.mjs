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
 *   --attempt-action=KEY --attempt-stage=ID
 *   --min-work=N --max-work=N
 */
import { existsSync, readFileSync } from 'node:fs';

import { failureResponseIdentityView, validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

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
    ...failureResponseIdentityView(record),
    protocolHash: record.protocolHash ?? document.protocolHash ?? null,
    solverRef: record.solverRef ?? document.solverRef ?? null,
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
if (args.has('attempt-action')) {
    const expected = args.get('attempt-action');
    rows = rows.filter(row => (row.attempts ?? []).some(attempt => String(attempt.actionKey ?? '') === expected));
}
if (args.has('attempt-stage')) {
    const expected = args.get('attempt-stage');
    rows = rows.filter(row => (row.attempts ?? []).some(attempt => String(attempt.stageId ?? '') === expected));
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
function numericStats(values) {
    const known = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!known.length) return { count: 0, min: null, max: null, mean: null, median: null, total: 0 };
    const total = known.reduce((sum, value) => sum + value, 0);
    const middle = Math.floor(known.length / 2);
    const median = known.length % 2 ? known[middle] : (known[middle - 1] + known[middle]) / 2;
    return {
        count: known.length,
        min: known[0],
        max: known[known.length - 1],
        mean: total / known.length,
        median,
        total,
    };
}
function parentOutcome(list) {
    const outcomes = new Set(list.map(row => row.outcome));
    for (const outcome of ['solved', 'harnessError', 'deadlineTruncated', 'workLimited', 'nodeLimited', 'exhaustedNegative', 'malformed', 'missing', 'unknown']) {
        if (outcomes.has(outcome)) return outcome;
    }
    return 'unknown';
}
function addAttemptGroup(map, key, attempt) {
    const normalized = key == null || key === '' ? 'unknown' : String(key);
    const group = map.get(normalized) ?? { attempts: 0, outcomes: new Map(), work: [], nodes: [] };
    group.attempts += 1;
    increment(group.outcomes, attempt.outcome);
    if (Number.isFinite(attempt.workSpent)) group.work.push(attempt.workSpent);
    if (Number.isFinite(attempt.nodesExpanded)) group.nodes.push(attempt.nodesExpanded);
    map.set(normalized, group);
}
function finalizeAttemptGroups(map) {
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, group]) => [key, {
        attempts: group.attempts,
        outcomes: objectFrom(group.outcomes),
        work: numericStats(group.work),
        nodes: numericStats(group.nodes),
    }]));
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
const solverRefCounts = new Map();
const parentOutcomeCounts = new Map();
const attemptOutcomeCounts = new Map();
const attemptActionCounts = new Map();
const attemptStageCounts = new Map();
const attemptGroupsByAction = new Map();
const attemptGroupsByStage = new Map();
let attemptRecords = 0;
let rowsWithWork = 0;
let totalWorkSpent = 0;
const rowWorkValues = [];
const rowNodeValues = [];
const bestBadnessValues = [];
const finalBadnessValues = [];
const badnessDeltaValues = [];
let participatedTrue = 0;
let participatedFalse = 0;
let reachedTrue = 0;
let reachedFalse = 0;
for (const row of rows) {
    increment(outcomeCounts, row.outcome);
    increment(actionCounts, row.actionKey);
    increment(stageCounts, row.stageId);
    increment(runCounts, row.runId);
    increment(protocolCounts, row.protocolHash);
    increment(solverRefCounts, row.solverRef);
    if (Number.isFinite(row.workSpent)) rowWorkValues.push(row.workSpent);
    if (Number.isFinite(row.nodesExpanded)) rowNodeValues.push(row.nodesExpanded);
    if (Number.isFinite(row.bestBadness)) bestBadnessValues.push(row.bestBadness);
    if (Number.isFinite(row.finalBadness)) finalBadnessValues.push(row.finalBadness);
    if (Number.isFinite(row.bestBadness) && Number.isFinite(row.finalBadness)) badnessDeltaValues.push(row.finalBadness - row.bestBadness);
    if (row.participated === true) participatedTrue++;
    else if (row.participated === false) participatedFalse++;
    if (row.reached === true) reachedTrue++;
    else if (row.reached === false) reachedFalse++;
    if (Number.isFinite(row.workSpent)) {
        rowsWithWork++;
        totalWorkSpent += row.workSpent;
    }
    for (const attempt of row.attempts ?? []) {
        attemptRecords++;
        increment(attemptOutcomeCounts, attempt.outcome);
        increment(attemptActionCounts, attempt.actionKey);
        increment(attemptStageCounts, attempt.stageId);
        addAttemptGroup(attemptGroupsByAction, attempt.actionKey, attempt);
        addAttemptGroup(attemptGroupsByStage, attempt.stageId, attempt);
    }
}

let solvedParents = 0;
let nonSolvedParents = 0;
let solvedControlsWithFailedAttempts = 0;
let parentsWithUnknownProtocol = 0;
let parentsWithMultipleKnownProtocols = 0;
let multiRecordParents = 0;
let multiRunParents = 0;
let protocolComparableMultiRunParents = 0;
const recordsPerParent = [];
const protocolPartitions = new Map();
for (const list of parentRows.values()) {
    recordsPerParent.push(list.length);
    if (list.length > 1) multiRecordParents++;
    if (list.some(row => row.outcome === 'solved')) {
        solvedParents++;
        if (list.some(row => row.solvedWithFailedAttempt === true)) solvedControlsWithFailedAttempts++;
    } else nonSolvedParents++;
    increment(parentOutcomeCounts, parentOutcome(list));
    const known = new Set(list.map(row => row.protocolHash).filter(Boolean));
    const knownRuns = new Set(list.map(row => row.runId).filter(Boolean));
    const hasUnknownProtocol = list.some(row => !row.protocolHash);
    if (hasUnknownProtocol) parentsWithUnknownProtocol++;
    if (known.size > 1) parentsWithMultipleKnownProtocols++;
    if (knownRuns.size > 1) {
        multiRunParents++;
        if (known.size === 1 && !hasUnknownProtocol) protocolComparableMultiRunParents++;
    }
    const partition = known.size === 1 && !hasUnknownProtocol ? [...known][0] : 'unknown-or-mixed';
    const current = protocolPartitions.get(partition) ?? { parents: 0, solvedParents: 0, nonSolvedParents: 0 };
    current.parents += 1;
    if (list.some(row => row.outcome === 'solved')) current.solvedParents += 1;
    else current.nonSolvedParents += 1;
    protocolPartitions.set(partition, current);
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
        parentOutcomes: objectFrom(parentOutcomeCounts),
        actions: objectFrom(actionCounts),
        stages: objectFrom(stageCounts),
        runs: objectFrom(runCounts),
        protocols: objectFrom(protocolCounts),
        solverRefs: objectFrom(solverRefCounts),
        protocolPartitions: Object.fromEntries([...protocolPartitions.entries()].sort(([a], [b]) => a.localeCompare(b))),
        protocolComparability: {
            parentsWithUnknownProtocol,
            parentsWithMultipleKnownProtocols,
            note: 'Only rows sharing a known protocolHash are protocol-comparable by this reducer; unknown or mixed protocol identity is descriptive only.',
        },
        repeatedObservations: {
            multiRecordParents,
            multiRunParents,
            protocolComparableMultiRunParents,
            recordsPerParent: numericStats(recordsPerParent),
            note: 'Multi-record is not longitudinal recurrence. Multi-run parents require distinct known runId values; protocolComparableMultiRunParents additionally require one known shared protocolHash.',
        },
        participation: { true: participatedTrue, false: participatedFalse, unknown: rows.length - participatedTrue - participatedFalse },
        reached: { true: reachedTrue, false: reachedFalse, unknown: rows.length - reachedTrue - reachedFalse },
        work: { rowsWithWork, totalWorkSpent, stats: numericStats(rowWorkValues) },
        nodes: { stats: numericStats(rowNodeValues) },
        badness: {
            best: numericStats(bestBadnessValues),
            final: numericStats(finalBadnessValues),
            finalMinusBest: numericStats(badnessDeltaValues),
            interpretation: 'Descriptive support only; no directionality or causal meaning is inferred from badness deltas.',
        },
        attempts: {
            records: attemptRecords,
            outcomes: objectFrom(attemptOutcomeCounts),
            actions: objectFrom(attemptActionCounts),
            stages: objectFrom(attemptStageCounts),
            byAction: finalizeAttemptGroups(attemptGroupsByAction),
            byStage: finalizeAttemptGroups(attemptGroupsByStage),
        },
        denominatorNote: 'Parent-level counts are the default independent-unit denominator; record/attempt counts are support diagnostics.',
    },
};
console.log(JSON.stringify(result, null, 2));
