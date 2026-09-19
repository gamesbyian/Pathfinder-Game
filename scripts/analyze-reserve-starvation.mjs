#!/usr/bin/env node
/** Reduce the precommitted default-profile probe without treating censored rows as failures. */
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_PROFILE = 'admissible-order|tieBreak=default|lds=off';
const CURRENT_RESERVE_NODES = 75_000_000;
const PROBE_CEILING_NODES = 300_000_000;

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const separator = arg.indexOf('=');
    return [arg.slice(2, separator), arg.slice(separator + 1)];
}));
const input = args.get('in');
const output = args.get('out');
const sampleFile = args.get('sample');
if (!input) {
    throw new Error('Usage: analyze-reserve-starvation.mjs --in=<combined.json> [--sample=<frozen.json>] [--out=<file>]');
}

const document = JSON.parse(readFileSync(input, 'utf8'));
const rows = document.levels ?? document.records;
if (!Array.isArray(rows)) throw new Error('input must contain levels[] or records[]');
if (document.only != null && document.only !== EXPECTED_PROFILE) {
    throw new Error(`incompatible probe profile: expected ${EXPECTED_PROFILE}, got ${document.only}`);
}
if (document.nodeBudget != null && document.nodeBudget !== PROBE_CEILING_NODES) {
    throw new Error(`incompatible node ceiling: expected ${PROBE_CEILING_NODES}, got ${document.nodeBudget}`);
}

const ids = rows.map(row => row.id ?? row.parentId);
if (ids.some(id => typeof id !== 'string' || !id)) throw new Error('every observation must have an id/parentId');
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`duplicate parent rows: ${[...new Set(duplicates)].join(',')}`);

if (sampleFile) {
    const sample = JSON.parse(readFileSync(sampleFile, 'utf8'));
    if (sample.kind !== 'pathfinder-reserve-starvation-confirmation-sample' || !Array.isArray(sample.ids)) {
        throw new Error('invalid reserve-starvation sample document');
    }
    const expected = new Set(sample.ids);
    const actual = new Set(ids);
    const missing = sample.ids.filter(id => !actual.has(id));
    const unexpected = ids.filter(id => !expected.has(id));
    if (missing.length || unexpected.length) {
        throw new Error(`frozen sample mismatch: missing=${missing.join(',')} unexpected=${unexpected.join(',')}`);
    }
}

function classify(row) {
    const id = row.id ?? row.parentId;
    const nodesExpanded = Number.isFinite(row.nodesExpanded) ? row.nodesExpanded : null;
    const terminal = row.outcome ?? row.status;
    const censored = row.deadlineTruncated === true
        || row.timedOut === true
        || row.error != null
        || ['deadlineTruncated', 'deadline-truncated', 'timed-out', 'harnessError', 'error'].includes(terminal);
    const solved = row.ok === true || terminal === 'solved' || terminal === 'success';
    let classification;
    if (censored) classification = 'censored';
    else if (solved && nodesExpanded != null && nodesExpanded > CURRENT_RESERVE_NODES && nodesExpanded <= PROBE_CEILING_NODES) {
        classification = 'reserve-starvation-opportunity';
    } else if (solved && nodesExpanded != null && nodesExpanded <= CURRENT_RESERVE_NODES) {
        classification = 'solved-within-current-reserve';
    } else if (solved) classification = 'solved-cost-unknown';
    else if (['exhaustedNegative', 'nodeLimited', 'exhausted', 'node-limited', 'node-budget-reached'].includes(terminal)) {
        classification = 'complete-negative';
    } else classification = 'indeterminate';
    return { id, nodesExpanded, classification };
}

const classified = rows.map(classify);
const count = classification => classified.filter(row => row.classification === classification).length;
const opportunities = count('reserve-starvation-opportunity');
const censoredOrIndeterminate = count('censored') + count('indeterminate') + count('solved-cost-unknown');
const decision = censoredOrIndeterminate > 0
    ? 'recover-censored-before-decision'
    : opportunities === 0
        ? 'close-first-screen-negative'
        : opportunities === 1
            ? 'inconclusive-acquire-disjoint-40'
            : 'justify-smallest-matched-total-work-reserve-fraction-ab';
const result = {
    schemaVersion: 1,
    kind: 'pathfinder-reserve-starvation-analysis',
    profile: EXPECTED_PROFILE,
    thresholds: { currentReserveNodes: CURRENT_RESERVE_NODES, probeCeilingNodes: PROBE_CEILING_NODES },
    independentUnit: 'parentId',
    rows: classified,
    summary: { observed: classified.length, opportunities, censoredOrIndeterminate, decision },
};
const json = `${JSON.stringify(result, null, 2)}\n`;
if (output) writeFileSync(output, json);
else process.stdout.write(json);
