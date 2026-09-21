#!/usr/bin/env node
/**
 * Applies the precommitted analysis for the Lane A C0 signature-collision experiment
 * (reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md) to a combined
 * cpsat-explicit-prefix-reference.yml result: groups labelled rows by their true C0 signature
 * (levelId + sorted cutCells) and reports mixing/purity per group, independent-unit-deduplicated.
 *
 * Current schema-v2 rows preserve the input case's structured `source.cutSignature`, which is
 * the semantic identity used by this analysis. Historical rows produced before that transport fix
 * remain readable only when explicitly requested with --allow-historical-case-id; that archive
 * decoder owns the old `${cutSignature}::${originalCaseId}` convention outside current analysis.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { summarizeSignatureCollisions } from '../signature-collision-analysis-lib.mjs';
import { deriveLaneAC0Cases } from './lane-a-c0-population-lib.mjs';
import { laneACutSignature } from './lane-a-cut-identity-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const IN = arg('in', null);
const CASES = arg('cases', null);
const ALLOW_HISTORICAL_CASE_ID = argv.includes('--allow-historical-case-id');
const POPULATION = arg('population', 'reports/stress/lane-a-frozen-prefix-population-2026-09-18.json');
const GEOMETRY = arg('geometry', 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json');
if (!IN) throw new Error('Usage: lane-a-c0-signature-collision-analysis.mjs --in=<combined.json> [--cases=<cases.json>] [--geometry=<geometry.json>] [--allow-historical-case-id]');

const document = JSON.parse(readFileSync(path.resolve(ROOT, IN), 'utf8'));
const geometryDocument = JSON.parse(readFileSync(path.resolve(ROOT, GEOMETRY), 'utf8'));
const casesDocument = CASES && existsSync(path.resolve(ROOT, CASES))
    ? JSON.parse(readFileSync(path.resolve(ROOT, CASES), 'utf8'))
    : deriveLaneAC0Cases(
        JSON.parse(readFileSync(path.resolve(ROOT, POPULATION), 'utf8')),
        geometryDocument,
    );
const caseById = new Map((casesDocument.cases ?? []).map(row => [String(row.id), row]));
const geometryByLevel = new Map((geometryDocument.levels ?? []).map(row => [String(row.id), row]));
const rows = document.rows ?? document.levels ?? document.results ?? [];
if (!Array.isArray(rows) || rows.length === 0) throw new Error(`no rows found in ${IN}`);

const frozenCaseFor = row => {
    const id = String(row.caseId ?? row.id ?? '');
    const frozenCase = caseById.get(id);
    if (!frozenCase) throw new Error(`row does not resolve to frozen Lane-A case: ${id}`);
    return frozenCase;
};

const cutSignature = row => laneACutSignature(row, frozenCaseFor(row), {
    allowHistoricalCaseId: ALLOW_HISTORICAL_CASE_ID,
});

const endpointSide = row => {
    const frozenCase = frozenCaseFor(row);
    const level = geometryByLevel.get(String(row.levelId));
    if (!level) throw new Error(`missing Lane-A geometry for level ${row.levelId}`);
    const iface = (level.interfaces ?? []).find(candidate =>
        candidate.target === frozenCase.source?.interfaceTarget
        && Number(candidate.targetKey) === Number(frozenCase.source?.interfaceTargetKey));
    if (!iface) throw new Error(`missing Lane-A interface geometry for ${row.caseId}`);
    const prefix = row.prefix ?? frozenCase.prefix;
    if (!Array.isArray(prefix) || prefix.length === 0) throw new Error(`row has no prefix: ${row.caseId}`);
    const end = prefix[prefix.length - 1];
    if ((iface.gateSideCells ?? []).includes(end)) return 'gate';
    if ((iface.remainderSideCells ?? []).includes(end)) return 'remainder';
    if ((iface.cutCells ?? []).includes(end)) return 'cut';
    throw new Error(`prefix endpoint is outside frozen Lane-A interface partition: ${row.caseId}`);
};

const c0Signature = row => JSON.stringify([cutSignature(row), endpointSide(row)]);

const decisive = rows.filter(row => row.referenceLabel === 'live' || row.referenceLabel === 'dead');
const abstain = rows.filter(row => row.referenceLabel === 'timeout/abstain');
const alarmed = rows.filter(row => row.correctnessAlarm || row.inputAlarm);

const summary = summarizeSignatureCollisions(decisive, {
    signature: c0Signature,
    label: row => row.referenceLabel,
    independentUnit: row => row.levelId,
    rowId: row => row.caseId,
    includeMembers: true,
});

const output = {
    schemaVersion: 1,
    kind: 'lane-a-c0-signature-collision-analysis',
    source: IN,
    frozenCases: CASES,
    geometry: GEOMETRY,
    signatureDefinition: 'C0 = geometric cut identity + current prefix endpoint side/region',
    endpointSideCounts: Object.fromEntries(['gate', 'remainder', 'cut'].map(side => [side, decisive.filter(row => endpointSide(row) === side).length])),
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
    endpointSideCounts: output.endpointSideCounts,
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
