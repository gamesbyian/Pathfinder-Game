#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';
import { summarizeSignatureCollisions } from '../signature-collision-analysis-lib.mjs';
import { laneABoundaryKinematics } from './lane-a-boundary-kinematics-lib.mjs';
import { deriveLaneAC0Cases, laneAProjectionRows } from './lane-a-c0-population-lib.mjs';
import { laneAGlobalAccounting } from './lane-a-global-accounting-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const inputPath = arg('in', 'reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json');
const casesPath = arg('cases', null);
const populationPath = arg('population', 'reports/stress/lane-a-frozen-prefix-population-2026-09-18.json');
const geometryPath = arg('geometry', 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json');
const outPath = arg('out', null);

const input = JSON.parse(readFileSync(path.resolve(ROOT, inputPath), 'utf8'));
const geometryDocument = JSON.parse(readFileSync(path.resolve(ROOT, geometryPath), 'utf8'));
const casesDocument = casesPath && existsSync(path.resolve(ROOT, casesPath))
    ? JSON.parse(readFileSync(path.resolve(ROOT, casesPath), 'utf8'))
    : deriveLaneAC0Cases(
        JSON.parse(readFileSync(path.resolve(ROOT, populationPath), 'utf8')),
        geometryDocument,
    );
if (!Array.isArray(casesDocument.cases) || !casesDocument.cases.length) throw new Error('no Lane A frozen cases');
const caseById = new Map(casesDocument.cases.map(row => [String(row.id), row]));
const geometryByLevel = new Map((geometryDocument.levels ?? []).map(row => [String(row.id), row]));

function rowsFromInput(document) {
    const direct = document.rows ?? document.levels ?? document.results ?? null;
    if (Array.isArray(direct) && direct.length > 0) return direct;
    return laneAProjectionRows(document, casesDocument);
}

const rows = rowsFromInput(input);
const corpusPath = casesDocument.corpus;
if (typeof corpusPath !== 'string' || !corpusPath) throw new Error('Lane A cases do not declare corpus');
const { levels } = readLevelCorpusDocumentWithHints(path.resolve(ROOT, corpusPath));
const levelById = new Map(levels.map(level => [String(level.id), level]));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const { prepLevel, createState, applyMove } = api;

function interfaceFor(frozenCase) {
    const geometryLevel = geometryByLevel.get(String(frozenCase.levelId));
    if (!geometryLevel) throw new Error(`missing Lane-A geometry level ${frozenCase.levelId}`);
    const found = (geometryLevel.interfaces ?? []).find(candidate =>
        candidate.target === frozenCase.source?.interfaceTarget &&
        Number(candidate.targetKey) === Number(frozenCase.source?.interfaceTargetKey));
    if (!found) throw new Error(`missing Lane-A interface geometry for ${frozenCase.id}`);
    return found;
}

function preparedLevel(raw) {
    const { id: _id, stressMeta: _stressMeta, hints: _hints, hintRecords: _hintRecords, ...rawLevel } = raw;
    return Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
}

function replayPrefix(prefix, level, prep, caseId) {
    if (!Array.isArray(prefix) || prefix.length === 0) throw new Error(`${caseId}: empty prefix`);
    const state = createState(prefix[0], level, prep);
    for (let i = 1; i < prefix.length; i++) {
        const from = prefix[i - 1];
        const to = prefix[i];
        const portal = level.portalMap.get(from);
        const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === to);
        applyMove(to, state, level, prep, isPortalJump);
    }
    if (state.path.length !== prefix.length || state.path.some((key, i) => key !== prefix[i])) {
        throw new Error(`${caseId}: canonical replay path disagrees with frozen prefix`);
    }
    return state;
}

const enriched = rows.map(row => {
    const frozenCase = caseById.get(String(row.caseId ?? row.id ?? ''));
    if (!frozenCase) throw new Error(`row does not resolve to frozen Lane-A case: ${row.caseId}`);
    if (String(frozenCase.levelId) !== String(row.levelId)) throw new Error(`case/row level mismatch for ${row.caseId}`);
    const raw = levelById.get(String(row.levelId));
    if (!raw) throw new Error(`missing corpus level ${row.levelId}`);
    const level = preparedLevel(raw);
    const prep = prepLevel(level);
    prep._cfg = null;
    const prefix = row.prefix ?? frozenCase.prefix;
    const state = replayPrefix(prefix, level, prep, frozenCase.id);
    const interfaceGeometry = interfaceFor(frozenCase);
    const c1 = laneABoundaryKinematics({
        levelId: row.levelId,
        interfaceGeometry,
        prefix,
        level: raw,
    });
    const c2 = laneAGlobalAccounting({ state, level, prep, interfaceGeometry });
    return {
        ...row,
        c1BoundaryKinematics: c1,
        c2GlobalAccounting: c2,
        c2Signature: JSON.stringify({ c1, accounting: c2 }),
    };
});

const decisive = enriched.filter(row => row.referenceLabel === 'live' || row.referenceLabel === 'dead');
const abstain = enriched.filter(row => row.referenceLabel === 'timeout/abstain');
const alarmed = enriched.filter(row => row.correctnessAlarm || row.inputAlarm);
const summary = summarizeSignatureCollisions(decisive, {
    signature: row => row.c2Signature,
    label: row => row.referenceLabel,
    independentUnit: row => row.levelId,
    rowId: row => row.caseId,
    includeMembers: true,
});
const multiParents = new Set(summary.groups
    .filter(group => group.rows > 1)
    .flatMap(group => group.members.map(member => String(member.independentUnit))));
const repeatedRowFraction = decisive.length ? summary.rowsInMultiMemberGroups / decisive.length : 0;
const supportPass = repeatedRowFraction >= 0.20 && multiParents.size >= 10;
const decision = alarmed.length > 0
    ? 'blocked'
    : !supportPass
        ? 'representation-explosive-stop'
        : summary.mixedGroups > 0
            ? 'mixed-proceed-c3'
            : 'pure-repetition-supported-confirm';

const output = {
    schemaVersion: 1,
    kind: 'lane-a-c2-global-accounting-analysis',
    source: {
        exactLabels: inputPath,
        frozenCases: casesPath ?? `derived:${populationPath}+${geometryPath}`,
        corpus: corpusPath,
        geometry: geometryPath,
        labelReuse: 'reuses frozen C0/C1 exact labels; no new reference/solver search',
        replaySemantics: 'current solver prepareLevelForSolver + prepLevel + createState/applyMove',
    },
    signatureDefinition: {
        contract: 'C2 global accounting',
        c1: 'frozen C1 boundary kinematics unchanged',
        accounting: [
            'counted length used/remaining',
            'intersections used/remaining',
            'pending must-pass/must-cross/must-turn/surround/adjacent-turn counts by gate/cut/remainder/other interface region',
        ],
        mustPassAuthority: 'mpVisitedMask, not scoring mustMask',
        omittedByDesign: [
            'exact pending-obligation identities',
            'full prefix history',
            'mutable filter/flipper state',
            'non-crossing portal-consumption state',
            'topology/path-history tokens',
            'outstanding-obligation temporal ordering',
        ],
    },
    totalRows: enriched.length,
    decisiveRows: decisive.length,
    abstainRows: abstain.length,
    abstainRate: enriched.length ? abstain.length / enriched.length : 0,
    alarmedRows: alarmed.length,
    repeatedRowFraction,
    independentParentsAcrossMultiMemberGroups: multiParents.size,
    frozenDecision: {
        supportThresholds: {
            minimumRepeatedRowFraction: 0.20,
            minimumIndependentParentsAcrossMultiMemberGroups: 10,
        },
        supportPass,
        decision,
    },
    ...summary,
};

console.log(JSON.stringify({
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
    largestGroupRows: output.largestGroupRows,
    decision: output.frozenDecision,
    mixedGroupDetail: output.groups.filter(group => group.mixed),
}, null, 2));

if (outPath) writeFileSync(path.resolve(ROOT, outPath), `${JSON.stringify(output, null, 2)}\n`);
