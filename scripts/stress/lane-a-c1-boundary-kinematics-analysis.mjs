#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { readLevelsWithHints } from '../level-data-io.mjs';
import { summarizeSignatureCollisions } from '../signature-collision-analysis-lib.mjs';
import { laneABoundaryKinematics, laneABoundaryKinematicsSignature } from './lane-a-boundary-kinematics-lib.mjs';
import { deriveLaneAC0Cases, laneAProjectionRows } from './lane-a-c0-population-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const inputPath = arg('in');
const casesPath = arg('cases', null);
const populationPath = arg('population', 'reports/stress/lane-a-frozen-prefix-population-2026-09-18.json');
const geometryPath = arg('geometry', 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json');
const outPath = arg('out', null);
if (!inputPath) {
    throw new Error('Usage: lane-a-c1-boundary-kinematics-analysis.mjs --in=<combined-reference.json> [--cases=<cases.json>] [--out=<analysis.json>]');
}

const input = JSON.parse(readFileSync(path.resolve(ROOT, inputPath), 'utf8'));
const geometryDocument = JSON.parse(readFileSync(path.resolve(ROOT, geometryPath), 'utf8'));
const casesDocument = casesPath && existsSync(path.resolve(ROOT, casesPath))
    ? JSON.parse(readFileSync(path.resolve(ROOT, casesPath), 'utf8'))
    : deriveLaneAC0Cases(
        JSON.parse(readFileSync(path.resolve(ROOT, populationPath), 'utf8')),
        geometryDocument,
    );
const geometryByLevel = new Map((geometryDocument.levels ?? []).map(row => [String(row.id), row]));
if (!Array.isArray(casesDocument.cases) || !casesDocument.cases.length) throw new Error(`no Lane A C0 cases available from ${casesPath ?? populationPath}`);
const caseById = new Map(casesDocument.cases.map(row => [String(row.id), row]));
if (caseById.size !== casesDocument.cases.length) throw new Error(`duplicate case id in ${casesPath}`);

function rowsFromInput(document) {
    const direct = document.rows ?? document.levels ?? document.results ?? null;
    if (Array.isArray(direct) && direct.length > 0) return direct;
    return laneAProjectionRows(document, casesDocument);
}

const rows = rowsFromInput(input);

const corpusPath = casesDocument.corpus;
if (typeof corpusPath !== 'string' || !corpusPath) throw new Error(`${casesPath ?? populationPath} does not declare corpus`);
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
    const geometryLevel = geometryByLevel.get(String(row.levelId));
    if (!geometryLevel) throw new Error(`missing Lane-A geometry level ${row.levelId}`);
    const interfaceGeometry = (geometryLevel.interfaces ?? []).find(candidate =>
        candidate.target === frozenCase.source?.interfaceTarget
        && Number(candidate.targetKey) === Number(frozenCase.source?.interfaceTargetKey));
    if (!interfaceGeometry) throw new Error(`missing Lane-A interface geometry for ${row.caseId}`);
    const kinematics = laneABoundaryKinematics({
        levelId: row.levelId,
        interfaceGeometry,
        prefix,
        level,
    });
    const signature = laneABoundaryKinematicsSignature({
        levelId: row.levelId,
        interfaceGeometry,
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
const crossingEventCounts = decisive.map(row => row.c1BoundaryKinematics.crossingEvents.length);
const cutVisitCounts = decisive.map(row => row.c1BoundaryKinematics.cutIncidence.reduce((sum, cell) => sum + cell.visits.length, 0));
const prefixLengths = decisive.map(row => row.prefix?.length ?? caseFor(row).prefix.length);
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const output = {
    schemaVersion: 1,
    kind: 'lane-a-c1-boundary-kinematics-analysis',
    source: {
        exactLabels: inputPath,
        frozenCases: casesPath ?? `derived:${populationPath}+${geometryPath}`,
        corpus: corpusPath,
        geometry: geometryPath,
        labelReuse: 'reuses frozen C0 exact labels; no new reference/solver queries',
    },
    signatureDefinition: {
        contract: 'C1 boundary kinematics',
        fields: 'C0 cut identity + endpoint side, plus unordered side-to-side crossing-event shapes, cut-cell local incidence, and crossing-relevant portal-pair use state',
        portalSemantics: 'portal transitions are identified from the level portal map before cardinal geometry; only portal pairs spanning interface regions enter C1 state',
        omittedByDesign: [
            'global temporal ordering among crossing events',
            'full prefix history',
            'length/intersection accounting',
            'outstanding obligation accounting',
            'mutable mechanic runtime state outside crossing-relevant portal-pair use',
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
    crossingEventCount: {
        min: crossingEventCounts.length ? Math.min(...crossingEventCounts) : 0,
        max: crossingEventCounts.length ? Math.max(...crossingEventCounts) : 0,
        mean: mean(crossingEventCounts),
    },
    cutVisitCount: {
        min: cutVisitCounts.length ? Math.min(...cutVisitCounts) : 0,
        max: cutVisitCounts.length ? Math.max(...cutVisitCounts) : 0,
        mean: mean(cutVisitCounts),
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
    crossingEventCount: output.crossingEventCount,
    cutVisitCount: output.cutVisitCount,
    prefixLength: output.prefixLength,
};
console.log(JSON.stringify(concise, null, 2));

if (outPath) {
    writeFileSync(path.resolve(ROOT, outPath), `${JSON.stringify(output, null, 2)}\n`);
}
