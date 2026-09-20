#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { readLevelsWithHints } from '../level-data-io.mjs';
import { summarizeSignatureCollisions } from '../signature-collision-analysis-lib.mjs';
import { laneABoundaryKinematics, laneABoundaryKinematicsSignature } from './lane-a-boundary-kinematics-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const inputPath = arg('in');
const casesPath = arg('cases', 'reports/stress/lane-a-c0-signature-collision-cases-2026-09-19.json');
const outPath = arg('out', null);
if (!inputPath) {
    throw new Error('Usage: lane-a-c1-boundary-kinematics-analysis.mjs --in=<combined-reference.json> [--cases=<cases.json>] [--out=<analysis.json>]');
}

const input = JSON.parse(readFileSync(path.resolve(ROOT, inputPath), 'utf8'));
const rows = input.rows ?? input.levels ?? input.results ?? [];
if (!Array.isArray(rows) || rows.length === 0) throw new Error(`no rows found in ${inputPath}`);

const casesDocument = JSON.parse(readFileSync(path.resolve(ROOT, casesPath), 'utf8'));
if (!Array.isArray(casesDocument.cases) || !casesDocument.cases.length) throw new Error(`no cases found in ${casesPath}`);
const caseById = new Map(casesDocument.cases.map(row => [String(row.id), row]));
if (caseById.size !== casesDocument.cases.length) throw new Error(`duplicate case id in ${casesPath}`);

const corpusPath = casesDocument.corpus;
if (typeof corpusPath !== 'string' || !corpusPath) throw new Error(`${casesPath} does not declare corpus`);
const levels = readLevelsWithHints(path.resolve(ROOT, corpusPath));
const levelById = new Map(levels.map(level => [String(level.id), level]));

function caseFor(row) {
    const id = String(row.caseId ?? row.id ?? '');
    const found = caseById.get(id);
    if (!found) throw new Error(`combined row does not resolve to frozen Lane-A case: ${id}`);
    if (String(found.levelId) !== String(row.levelId)) {
        throw new Error(`case/combined level mismatch for ${id}: ${found.levelId} != ${row.levelId}`);
    }
    return found;
}

const enriched = rows.map(row => {
    const frozenCase = caseFor(row);
    const level = levelById.get(String(row.levelId));
    if (!level) throw new Error(`missing corpus level ${row.levelId}`);
    const prefix = row.prefix ?? frozenCase.prefix;
    const kinematics = laneABoundaryKinematics({
        levelId: row.levelId,
        cutCells: frozenCase.source?.cutCells,
        prefix,
        level,
    });
    const signature = laneABoundaryKinematicsSignature({
        levelId: row.levelId,
        cutCells: frozenCase.source?.cutCells,
        prefix,
        level,
    });
    return {
        ...row,
        c0CutSignature: frozenCase.source?.cutSignature ?? null,
        c1BoundaryKinematics: kinematics,
        c1Signature: signature,
    };
});

const decisive = enriched.filter(row => row.referenceLabel === 'live' || row.referenceLabel === 'dead');
const abstain = enriched.filter(row => row.referenceLabel === 'timeout/abstain');
const alarmed = enriched.filter(row => row.correctnessAlarm || row.inputAlarm);
const summary = summarizeSignatureCollisions(decisive, {
    signature: row => row.c1Signature,
    label: row => row.referenceLabel,
    independentUnit: row => row.levelId,
    rowId: row => row.caseId,
    includeMembers: true,
});
const multiParentIds = new Set(summary.groups
    .filter(group => group.rows > 1)
    .flatMap(group => group.members.map(member => String(member.independentUnit))));
const boundaryVisitCounts = decisive.map(row => row.c1BoundaryKinematics.boundaryVisitCount);
const prefixLengths = decisive.map(row => row.prefix?.length ?? caseFor(row).prefix.length);
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const output = {
    schemaVersion: 1,
    kind: 'lane-a-c1-boundary-kinematics-analysis',
    source: {
        exactLabels: inputPath,
        frozenCases: casesPath,
        corpus: corpusPath,
        labelReuse: 'reuses frozen C0 exact labels; no new reference/solver queries',
    },
    signatureDefinition: {
        contract: 'C1 boundary kinematics',
        fields: 'C0 level+sorted cut cells plus per-cut-cell used state and unordered local entry/exit tokens N/S/E/W/portal/start/end',
        portalSemantics: 'portal transitions are identified from the level portal map before cardinal geometry',
        omittedByDesign: [
            'global crossing temporal order',
            'full prefix history',
            'length/intersection accounting',
            'outstanding obligation accounting',
            'mutable mechanic runtime state outside boundary transition kind',
            'topology/path-history token',
        ],
    },
    totalRows: enriched.length,
    decisiveRows: decisive.length,
    abstainRows: abstain.length,
    abstainRate: enriched.length ? abstain.length / enriched.length : 0,
    alarmedRows: alarmed.length,
    independentParentsAcrossMultiMemberGroups: multiParentIds.size,
    repeatedRowFraction: decisive.length ? summary.rowsInMultiMemberGroups / decisive.length : 0,
    boundaryVisitCount: {
        min: boundaryVisitCounts.length ? Math.min(...boundaryVisitCounts) : 0,
        max: boundaryVisitCounts.length ? Math.max(...boundaryVisitCounts) : 0,
        mean: mean(boundaryVisitCounts),
    },
    prefixLength: {
        min: prefixLengths.length ? Math.min(...prefixLengths) : 0,
        max: prefixLengths.length ? Math.max(...prefixLengths) : 0,
        mean: mean(prefixLengths),
    },
    ...summary,
};

const concise = {
    totalRows: output.totalRows,
    decisiveRows: output.decisiveRows,
    abstainRows: output.abstainRows,
    alarmedRows: output.alarmedRows,
    distinctSignatures: output.distinctSignatures,
    multiMemberGroups: output.multiMemberGroups,
    rowsInMultiMemberGroups: output.rowsInMultiMemberGroups,
    repeatedRowFraction: output.repeatedRowFraction,
    independentParentsAcrossMultiMemberGroups: output.independentParentsAcrossMultiMemberGroups,
    mixedGroups: output.mixedGroups,
    rowsInMixedGroups: output.rowsInMixedGroups,
    mixedGroupDetail: output.groups.filter(group => group.mixed),
    signatureBytes: output.signatureBytes,
    boundaryVisitCount: output.boundaryVisitCount,
    prefixLength: output.prefixLength,
};
console.log(JSON.stringify(concise, null, 2));

if (outPath) {
    writeFileSync(path.resolve(ROOT, outPath), `${JSON.stringify(output, null, 2)}\n`);
}
