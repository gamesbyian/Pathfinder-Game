#!/usr/bin/env node
/**
 * Applies the precommitted analysis for the Lane A C0 signature-collision experiment
 * (reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md) to a combined
 * cpsat-explicit-prefix-reference.yml result: groups labelled rows by their true C0 signature
 * (levelId + sorted cutCells) and reports mixing/purity per group, independent-unit-deduplicated.
 *
 * Current schema-v2 rows preserve the input case's structured `source.cutSignature`, which is
 * the semantic identity used by this analysis. Historical rows produced before that transport fix
 * remain readable because their dispatched id was built as `${cutSignature}::${originalCaseId}`
 * (PR #1902); only that frozen compatibility path recovers the signature from the first `::`.
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
    const structured = row?.source?.cutSignature;
    if (typeof structured === 'string' && structured) return structured;
    // Historical schema-v2 rows produced before structured source metadata was preserved recover
    // the frozen C0 signature from the legacy case-id disambiguator. New rows must not depend on
    // this delimiter encoding as their semantic identity boundary.
    const marker = String(row.caseId ?? '').indexOf('::');
    if (marker === -1) throw new Error(`row has no structured source.cutSignature or legacy case-id disambiguator: ${row.caseId}`);
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
    mixedGroupDetail: output.groups.filter(g => g.mixed),
    independentUnitsAcrossMultiMemberGroups: new Set(
        output.groups.filter(g => g.rows > 1).flatMap(g => g.members.map(m => m.independentUnit)),
    ).size,
}, null, 2));

const OUT = arg('out', null);
if (OUT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(output, null, 2)}\n`);
}
