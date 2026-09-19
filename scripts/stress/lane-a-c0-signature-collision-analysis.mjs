#!/usr/bin/env node
/**
 * Applies the precommitted analysis for the Lane A C0 signature-collision experiment
 * (reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md) to a combined
 * cpsat-explicit-prefix-reference.yml result: groups labelled rows by their true C0 signature
 * (levelId + sorted cutCells) and reports mixing/purity per group, independent-unit-deduplicated.
 *
 * The combined result's own row.caseId does not carry the cutSignature as a separate field (the
 * shard runner only forwards {caseId, levelId, corpus, prefix, depth, sourceLabel, referenceLabel,
 * ...}, not the input case's `source` object) -- but the dispatched id was deliberately built as
 * `${cutSignature}::${originalCaseId}` (PR #1902's collision fix), so the signature is recovered by
 * splitting the id on its first `::`, with no re-derivation from the geometry census needed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { summarizeSignatureCollisions } from '../signature-collision-analysis-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const IN = arg('in', null);
if (!IN) throw new Error('Usage: lane-a-c0-signature-collision-analysis.mjs --in=<combined.json>');

const document = JSON.parse(readFileSync(path.resolve(ROOT, IN), 'utf8'));
const rows = document.rows ?? document.levels ?? document.results ?? [];
if (!Array.isArray(rows) || rows.length === 0) throw new Error(`no rows found in ${IN}`);

const cutSignature = row => {
    const marker = String(row.caseId ?? '').indexOf('::');
    if (marker === -1) throw new Error(`case id missing cutSignature disambiguator: ${row.caseId}`);
    return row.caseId.slice(0, marker);
};

const decisive = rows.filter(row => row.referenceLabel === 'live' || row.referenceLabel === 'dead');
const abstain = rows.filter(row => row.referenceLabel === 'timeout/abstain');
const alarmed = rows.filter(row => row.correctnessAlarm || row.inputAlarm);

const summary = summarizeSignatureCollisions(decisive, {
    signature: cutSignature,
    label: row => row.referenceLabel,
    independentUnit: row => row.levelId,
    rowId: row => row.caseId,
    includeMembers: true,
});

const output = {
    schemaVersion: 1,
    kind: 'lane-a-c0-signature-collision-analysis',
    source: IN,
    totalRows: rows.length,
    decisiveRows: decisive.length,
    abstainRows: abstain.length,
    abstainRate: rows.length ? abstain.length / rows.length : 0,
    alarmedRows: alarmed.length,
    ...summary,
};

console.log(JSON.stringify({
    totalRows: output.totalRows,
    decisiveRows: output.decisiveRows,
    abstainRows: output.abstainRows,
    abstainRate: output.abstainRate,
    alarmedRows: output.alarmedRows,
    distinctSignatures: output.distinctSignatures,
    multiMemberGroups: output.multiMemberGroups,
    mixedGroups: output.mixedGroups,
    crossUnitMultiMemberGroups: output.crossUnitMultiMemberGroups,
    crossUnitMixedGroups: output.crossUnitMixedGroups,
    sameUnitMixedGroups: output.sameUnitMixedGroups,
    rowsInMultiMemberGroups: output.rowsInMultiMemberGroups,
    rowsInMixedGroups: output.rowsInMixedGroups,
    largestGroupRows: output.largestGroupRows,
}, null, 2));

const OUT = arg('out', null);
if (OUT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(output, null, 2)}\n`);
}
