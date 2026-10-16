#!/usr/bin/env node
/**
 * PG-G selected symmetry-pair path replay.
 *
 * This is a forensic mechanism microscope, not a solver treatment. It replays frozen successful
 * paths through a parent and a symmetry sibling and separates:
 *   - semantic candidate/score/slack equivariance,
 *   - raw E/W/S/N neighbour-order equivariance,
 *   - DFS stable-tie ordering,
 *   - admissible-order no-tie stable ordering,
 *   - repair's coordinate-derived deterministic seed.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { inverseTransformPoint, transformPoint } from '../../modules/domain/geometry.ts';
import { PACK, UNPACK } from '../../modules/domain/cell-key.ts';
import { getLevelFingerprint } from '../../modules/domain/level-fingerprint.ts';
import { rankByAdmissibleSlack } from '../../modules/solver/admissible-order-search.ts';
import { admissibleRemainingBound } from '../../modules/solver/lower-bounds.ts';
import { repairPrimarySeed } from '../../modules/solver/repair-search.ts';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const eq = arg.indexOf('=');
    return eq < 0 ? [arg, 'true'] : [arg.slice(0, eq), arg.slice(eq + 1)];
}));
const required = key => {
    const value = args.get(key);
    if (!value) throw new Error(`${key}=... is required`);
    return value;
};
const specFile = path.resolve(required('--spec'));
const historicalRoot = path.resolve(required('--historical-root'));
const parentRoot = path.resolve(args.get('--parent-root') ?? '.');
const outFile = path.resolve(args.get('--out') ?? 'tmp/pg-g-symmetry-ordering-microscope/result.json');
const spec = JSON.parse(readFileSync(specFile, 'utf8'));

let historicalHead;
try {
    historicalHead = execFileSync('git', ['-C', historicalRoot, 'rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
} catch (error) {
    throw new Error(`cannot verify historical dataset git identity: ${error?.message ?? error}`);
}
if (historicalHead !== spec.historicalDatasetRef) {
    throw new Error(`historical dataset mismatch: expected ${spec.historicalDatasetRef}, got ${historicalHead}`);
}

const currentHead = (() => {
    try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim(); }
    catch { return 'local'; }
})();

const levelsOf = file => {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error(`${file} has no level array`);
    return levels;
};
const idOf = level => String(level?.id ?? '');
const numEq = (a, b) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9);
const sameArray = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const sameSet = (a, b) => {
    const aa = [...a].sort((x, y) => x - y);
    const bb = [...b].sort((x, y) => x - y);
    return sameArray(aa, bb);
};
const directionName = (from, to) => {
    const a = UNPACK(from), b = UNPACK(to);
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 1 && dy === 0) return 'E';
    if (dx === -1 && dy === 0) return 'W';
    if (dx === 0 && dy === 1) return 'S';
    if (dx === 0 && dy === -1) return 'N';
    return 'portal';
};
const directionOrder = (from, order) => order.map(key => directionName(from, key));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const scoringProfile = api.SCORING_PROFILES[spec.scoringProfileId ?? 'default'];
if (!scoringProfile) throw new Error(`unknown scoring profile ${spec.scoringProfileId}`);

function mapParentKey(key, orientation, parentRaw) {
    const { x, y } = UNPACK(key);
    const { tx, ty } = transformPoint(x, y, orientation, parentRaw.grid.w, parentRaw.grid.h);
    return PACK(tx, ty);
}
function unmapVariantKey(key, orientation, parentRaw) {
    const { x, y } = UNPACK(key);
    const point = inverseTransformPoint(x, y, orientation, parentRaw.grid.w, parentRaw.grid.h);
    return PACK(point.x, point.y);
}
function scoreRows(level, prep, state, candidates) {
    const pos = state.path.at(-1);
    const realLen = api.getRealLengthFromState(state);
    const portal = level.portalMap.get(pos);
    const ctx = api.buildCurUrgencyContext(pos, state, level, prep, true, scoringProfile);
    return candidates.map(candidate => {
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === candidate);
        const remaining = level.requiredLength - realLen - (isJump ? 0 : 1);
        return { key:candidate, score:api.scoreMove(candidate, pos, state, level, prep, scoringProfile, remaining, null, ctx) };
    });
}
function admissibleRows(level, prep, state, candidates) {
    // rankByAdmissibleSlack deliberately returns immediately for 0/1 candidates, before the
    // research observer runs. Handle that cheap case directly with the SAME canonical bound
    // helper rather than treating "nothing to rank" as missing evidence.
    if (candidates.length <= 1) {
        const slacks = candidates.map(candidate => {
            const from = state.path.at(-1);
            const portal = level.portalMap.get(from);
            const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === candidate);
            const undo = api.applyMove(candidate, state, level, prep, isJump);
            const rSteps = level.requiredLength - api.getRealLengthFromState(state);
            const h = admissibleRemainingBound(candidate, state, level, prep);
            const slack = Number.isFinite(h) ? rSteps - h : Number.POSITIVE_INFINITY;
            api.undoMove(undo, state);
            return { key:candidate, slack };
        });
        return { order:[...candidates], slacks };
    }
    let observation = null;
    prep._orderingResearchObserver = {
        policies:[{ id:'none', scoringProfile:null }],
        observe(value) { observation = value; },
    };
    const order = rankByAdmissibleSlack([...candidates], level, prep, state, null);
    prep._orderingResearchObserver = null;
    if (!observation?.admissibleSlack) throw new Error('admissible-order research observer did not emit slack rows');
    return {
        order,
        slacks: observation.admissibleSlack.map(row => ({ key:row.candidate, slack:row.slack })),
    };
}
function mappedValueEquivariance(parentRows, variantRows, mapKey, valueField) {
    const variantByKey = new Map(variantRows.map(row => [row.key, row[valueField]]));
    for (const row of parentRows) {
        const mapped = mapKey(row.key);
        if (!variantByKey.has(mapped) || !numEq(row[valueField], variantByKey.get(mapped))) return false;
    }
    return parentRows.length === variantRows.length;
}
function compactStep(depth, parentPosMapped, variantPos, mappedParentOrder, variantOrder, extra = {}) {
    return {
        depth,
        parentPosMapped,
        variantPos,
        parentOrderMapped:mappedParentOrder,
        variantOrder,
        parentDirections:directionOrder(parentPosMapped, mappedParentOrder),
        variantDirections:directionOrder(variantPos, variantOrder),
        ...extra,
    };
}
function applyNext(level, prep, state, next) {
    const pos = state.path.at(-1);
    const portal = level.portalMap.get(pos);
    api.applyMove(next, state, level, prep, !!(portal && !state.lastWasPortalJump && portal.dest === next));
}

const cases = [];
for (const item of spec.cases ?? []) {
    const base = `family-${item.parentId}-${item.familyToken}`;
    const manifestFile = path.join(historicalRoot, 'data', 'families', `${base}-manifest.json`);
    const variantFile = path.join(historicalRoot, 'data', 'families', `${base}.json`);
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    const edge = (manifest.variants ?? []).find(row => String(row.variantId) === String(item.variantId));
    if (!edge) throw new Error(`${item.id}: variant absent from manifest`);
    if ((edge.relation ?? manifest.familyMode) !== 'symmetry') throw new Error(`${item.id}: expected symmetry relation`);
    const orientation = Number(edge.mutationManifest?.variant);
    if (!Number.isInteger(orientation) || orientation < 0 || orientation > 7) throw new Error(`${item.id}: invalid orientation`);

    const parentFile = path.resolve(parentRoot, manifest.parentCorpus);
    const parentRaw = levelsOf(parentFile).find(level => idOf(level) === String(item.parentId));
    const variantRaw = levelsOf(variantFile).find(level => idOf(level) === String(item.variantId));
    if (!parentRaw || !variantRaw) throw new Error(`${item.id}: parent or variant raw level missing`);
    const currentParentHash = await getLevelFingerprint(parentRaw);
    if (manifest.parentContentHash && currentParentHash !== manifest.parentContentHash) {
        throw new Error(`${item.id}: current parent content does not match historical manifest`);
    }

    const variantPath = item.variantPath.map(Number);
    const parentPath = variantPath.map(key => unmapVariantKey(key, orientation, parentRaw));
    const parent = Solver.prepareLevelForSolver(parentRaw, { source:'raw' });
    const variant = Solver.prepareLevelForSolver(variantRaw, { source:'raw' });
    const parentValidation = Solver.validateCandidatePath(parent, parentPath);
    const variantValidation = Solver.validateCandidatePath(variant, variantPath);
    if (!parentValidation.ok || !variantValidation.ok) {
        throw new Error(`${item.id}: frozen mapped path validation failed (parent=${parentValidation.ok}, variant=${variantValidation.ok})`);
    }

    const parentPrep = api.prepLevel(parent);
    const variantPrep = api.prepLevel(variant);
    const parentState = api.createState(parentPath[0], parent, parentPrep);
    const variantState = api.createState(variantPath[0], variant, variantPrep);
    const mapKey = key => mapParentKey(key, orientation, parentRaw);

    const summary = {
        checkedPrefixes:0,
        legalSetMismatchCount:0,
        rawOrderMismatchCount:0,
        dfsScoreNonEquivariantCount:0,
        dfsOrderMismatchCount:0,
        dfsTieOrderMismatchCount:0,
        admissibleSlackNonEquivariantCount:0,
        admissibleOrderMismatchCount:0,
        admissibleTieOrderMismatchCount:0,
    };
    const first = {
        legalSetMismatch:null,
        rawOrderMismatch:null,
        dfsScoreNonEquivariant:null,
        dfsOrderMismatch:null,
        dfsTieOrderMismatch:null,
        admissibleSlackNonEquivariant:null,
        admissibleOrderMismatch:null,
        admissibleTieOrderMismatch:null,
    };

    for (let depth = 0; depth < variantPath.length - 1; depth++) {
        summary.checkedPrefixes++;
        const parentPos = parentState.path.at(-1);
        const variantPos = variantState.path.at(-1);
        const mappedParentPos = mapKey(parentPos);
        if (mappedParentPos !== variantPos) throw new Error(`${item.id}: path position map mismatch at depth ${depth}`);

        const parentLegal = api.getNeighbors(parentPos, parentState, parent, parentPrep);
        const variantLegal = api.getNeighbors(variantPos, variantState, variant, variantPrep);
        const mappedParentRaw = parentLegal.map(mapKey);
        const legalSetEqual = sameSet(mappedParentRaw, variantLegal);
        const rawOrderEqual = sameArray(mappedParentRaw, variantLegal);
        if (!legalSetEqual) {
            summary.legalSetMismatchCount++;
            first.legalSetMismatch ??= compactStep(depth, mappedParentPos, variantPos, mappedParentRaw, variantLegal);
        }
        if (legalSetEqual && !rawOrderEqual) {
            summary.rawOrderMismatchCount++;
            first.rawOrderMismatch ??= compactStep(depth, mappedParentPos, variantPos, mappedParentRaw, variantLegal);
        }

        const parentScores = scoreRows(parent, parentPrep, parentState, parentLegal);
        const variantScores = scoreRows(variant, variantPrep, variantState, variantLegal);
        const scoresEquivariant = legalSetEqual && mappedValueEquivariance(parentScores, variantScores, mapKey, 'score');
        if (!scoresEquivariant) {
            summary.dfsScoreNonEquivariantCount++;
            first.dfsScoreNonEquivariant ??= { depth, parentScoresMapped:parentScores.map(row => ({ key:mapKey(row.key), score:row.score })),
                variantScores };
        }
        const parentDfsOrder = [...parentLegal];
        const variantDfsOrder = [...variantLegal];
        api.scoreAndSort(parentDfsOrder, parentPos, parentState, parent, parentPrep, scoringProfile, null);
        api.scoreAndSort(variantDfsOrder, variantPos, variantState, variant, variantPrep, scoringProfile, null);
        const mappedParentDfs = parentDfsOrder.map(mapKey);
        if (legalSetEqual && !sameArray(mappedParentDfs, variantDfsOrder)) {
            summary.dfsOrderMismatchCount++;
            const row = compactStep(depth, mappedParentPos, variantPos, mappedParentDfs, variantDfsOrder, { scoresEquivariant });
            first.dfsOrderMismatch ??= row;
            if (scoresEquivariant) {
                summary.dfsTieOrderMismatchCount++;
                first.dfsTieOrderMismatch ??= row;
            }
        }

        const parentAdm = admissibleRows(parent, parentPrep, parentState, parentLegal);
        const variantAdm = admissibleRows(variant, variantPrep, variantState, variantLegal);
        const slackEquivariant = legalSetEqual && mappedValueEquivariance(parentAdm.slacks, variantAdm.slacks, mapKey, 'slack');
        if (!slackEquivariant) {
            summary.admissibleSlackNonEquivariantCount++;
            first.admissibleSlackNonEquivariant ??= { depth, parentSlacksMapped:parentAdm.slacks.map(row => ({ key:mapKey(row.key), slack:row.slack })),
                variantSlacks:variantAdm.slacks };
        }
        const mappedParentAdm = parentAdm.order.map(mapKey);
        if (legalSetEqual && !sameArray(mappedParentAdm, variantAdm.order)) {
            summary.admissibleOrderMismatchCount++;
            const row = compactStep(depth, mappedParentPos, variantPos, mappedParentAdm, variantAdm.order, { slackEquivariant });
            first.admissibleOrderMismatch ??= row;
            if (slackEquivariant) {
                summary.admissibleTieOrderMismatchCount++;
                first.admissibleTieOrderMismatch ??= row;
            }
        }

        applyNext(parent, parentPrep, parentState, parentPath[depth + 1]);
        applyNext(variant, variantPrep, variantState, variantPath[depth + 1]);
    }

    const parentSeed = repairPrimarySeed(parentPath[0], 0);
    const variantSeed = repairPrimarySeed(variantPath[0], 0);
    cases.push({
        id:item.id,
        parentId:item.parentId,
        variantId:item.variantId,
        orientation,
        transformKind:edge.mutationManifest?.kind ?? null,
        selectionNote:item.selectionNote,
        pathTechnique:item.pathTechnique,
        pathLength:variantPath.length,
        parentContentHash:currentParentHash,
        pathValidation:{ parent:parentValidation.ok, variant:variantValidation.ok },
        repairSeed:{ parent:parentSeed, variant:variantSeed, equal:parentSeed === variantSeed },
        summary,
        first,
    });
}

const aggregate = {
    cases:cases.length,
    checkedPrefixes:cases.reduce((n, row) => n + row.summary.checkedPrefixes, 0),
    casesWithLegalSetMismatch:cases.filter(row => row.summary.legalSetMismatchCount > 0).length,
    casesWithRawOrderMismatch:cases.filter(row => row.summary.rawOrderMismatchCount > 0).length,
    casesWithDfsScoreNonEquivariance:cases.filter(row => row.summary.dfsScoreNonEquivariantCount > 0).length,
    casesWithDfsTieOrderMismatch:cases.filter(row => row.summary.dfsTieOrderMismatchCount > 0).length,
    casesWithAdmissibleSlackNonEquivariance:cases.filter(row => row.summary.admissibleSlackNonEquivariantCount > 0).length,
    casesWithAdmissibleTieOrderMismatch:cases.filter(row => row.summary.admissibleTieOrderMismatchCount > 0).length,
    casesWithRepairSeedDrift:cases.filter(row => !row.repairSeed.equal).length,
};
const output = {
    schemaVersion:1,
    kind:'pathfinder-pg-g-symmetry-ordering-microscope-result',
    generatedAt:new Date().toISOString(),
    sourceRef:currentHead,
    historicalDatasetRef:historicalHead,
    sourceSpec:path.relative(process.cwd(), specFile),
    evidenceRole:spec.evidenceRole,
    selection:spec.selection,
    aggregate,
    cases,
};
mkdirSync(path.dirname(outFile), { recursive:true });
writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(aggregate));
