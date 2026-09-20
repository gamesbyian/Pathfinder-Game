#!/usr/bin/env node
/**
 * WS6 observer-only reopen: compare current-state projections immediately after matched exact
 * DEAD/LIVE divergence where Lane E already proved the exact point of no return equals that
 * divergence. No CP-SAT, no search, no repair treatment.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const corpusPath = arg('corpus', 'data/stress/stress-levels-random.json');
const pairPath = arg('pairs', 'reports/stress/lane-e-multi-pick-bisection-2026-09-17.json');
const statesPath = arg('states', 'reports/stress/class5-multi-pick-lane-e-input-2026-09-17.json');
const outPath = arg('out', null);

const pairDoc = JSON.parse(readFileSync(path.resolve(ROOT, pairPath), 'utf8'));
const statesDoc = JSON.parse(readFileSync(path.resolve(ROOT, statesPath), 'utf8'));
const corpusDoc = JSON.parse(readFileSync(path.resolve(ROOT, corpusPath), 'utf8'));
const rawLevels = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
if (!Array.isArray(rawLevels)) throw new Error(`${corpusPath} has no level array`);
const rawById = new Map(rawLevels.map(level => [String(level.id), level]));
const stateByRole = new Map((statesDoc.states ?? []).map(row => [String(row.role), row]));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();

const pack = ([x, y]) => api.PACK(Number(x) - 1, Number(y) - 1);
const unpack = key => [(key & 0xffff) + 1, (key >>> 16) + 1];
const popcount = value => {
    let n = value >>> 0;
    let count = 0;
    while (n) { n &= n - 1; count += 1; }
    return count;
};

function prepare(levelId) {
    const raw = rawById.get(String(levelId));
    if (!raw) throw new Error(`missing raw level ${levelId}`);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = api.prepLevel(level);
    prep._cfg = null;
    return { raw, level, prep };
}

function directionToken(from, to, level) {
    const portal = level.portalMap.get(from);
    if (portal?.dest === to) return 'portal';
    const [fx, fy] = unpack(from), [tx, ty] = unpack(to);
    if (tx === fx + 1 && ty === fy) return 'E';
    if (tx === fx - 1 && ty === fy) return 'W';
    if (ty === fy + 1 && tx === fx) return 'S';
    if (ty === fy - 1 && tx === fx) return 'N';
    return 'non-cardinal';
}

function usedPortalPairs(prefix, level) {
    const pairs = [];
    const seen = new Set();
    for (let i = 1; i < prefix.length; i++) {
        const from = prefix[i - 1], to = prefix[i];
        const portal = level.portalMap.get(from);
        if (!portal || portal.dest !== to) continue;
        const key = [from, to].sort((a, b) => a - b).join(':');
        if (!seen.has(key)) { seen.add(key); pairs.push(key); }
    }
    return pairs.sort();
}

function replayToDepth(prefixXY, depth, level, prep) {
    const prefix = prefixXY.slice(0, depth + 1).map(pack);
    if (prefix.length < 2) throw new Error('observer requires a branch move');
    const state = api.createState(prefix[0], level, prep);
    let targetWasVisited = false;
    let targetPriorEdgeUsage = 0;
    let branchWasPortal = false;
    for (let i = 1; i < prefix.length; i++) {
        const from = prefix[i - 1], to = prefix[i];
        const portal = level.portalMap.get(from);
        const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === to);
        if (i === prefix.length - 1) {
            targetWasVisited = state.visited[to] > 0;
            targetPriorEdgeUsage = state.edgeUsage[to];
            branchWasPortal = isPortalJump;
        }
        api.applyMove(to, state, level, prep, isPortalJump);
    }
    return { state, prefix, targetWasVisited, targetPriorEdgeUsage, branchWasPortal };
}

function pathResourceCounts(state, level) {
    let uniqueVisitedCells = 0;
    let revisitedCells = 0;
    let horizontalUsedCells = 0;
    let verticalUsedCells = 0;
    let bothAxesUsedCells = 0;
    for (let y = 0; y < level.grid.h; y++) {
        for (let x = 0; x < level.grid.w; x++) {
            const key = api.PACK(x, y);
            const visits = state.visited[key];
            if (visits > 0) uniqueVisitedCells += 1;
            if (visits > 1) revisitedCells += 1;
            const usage = state.edgeUsage[key];
            if (usage & 1) horizontalUsedCells += 1;
            if (usage & 2) verticalUsedCells += 1;
            if ((usage & 3) === 3) bothAxesUsedCells += 1;
        }
    }
    return { uniqueVisitedCells, revisitedCells, horizontalUsedCells, verticalUsedCells, bothAxesUsedCells };
}

function snapshot(levelId, row, depth) {
    const { level, prep } = prepare(levelId);
    const replay = replayToDepth(row.prefixXY, depth, level, prep);
    const { state, prefix } = replay;
    const next = prefix.at(-1);
    const previous = prefix.at(-2);
    const diagnostics = { reached: {}, rejected: {} };
    const realLen = api.getRealLengthFromState(state);
    const hardPruneVerdict = api.evaluatePrunedMove(next, realLen, state, level, prep, null, true, { diagnostics });
    const neighbors = api.getNeighbors(next, state, level, prep);
    const pendingMustPass = Math.max(0, level.mustPassKeys.length - popcount(state.mpVisitedMask));
    const accounting = {
        countedLengthUsed: realLen,
        countedLengthRemaining: level.requiredLength - realLen,
        intersectionsUsed: state.ints,
        intersectionsRemaining: level.requiredIntersections - state.ints,
        pendingMustPass,
        pendingMustCross: popcount(state.mustCrossMask),
        pendingMustTurn: popcount(state.mustTurnMask ?? 0),
        pendingSurround: popcount(state.surroundMask ?? 0),
        pendingAdjacentTurn: popcount(state.adjTurnMask ?? 0),
        flipperUsedMask: state.flipperUsedMask,
        portalJumps: state.portalJumps,
        usedPortalPairs: usedPortalPairs(prefix, level),
    };
    const relational = {
        mustPassLowerBound: level.mustPassKeys.length ? api.mustPassLowerBound(next, state, level, prep) : 0,
        mustCrossLowerBound: state.mustCrossMask ? api.mustCrossLowerBound(next, state, level, prep) : 0,
        jointObligationVerdicts: api.evaluateObligationClusters(next, state, level, prep).map(v => ({
            kind: v.kind, verdict: v.verdict, reasonFamily: v.reasonFamily,
        })),
    };
    return {
        role: row.role,
        exactLabel: row.exactLabel,
        depth,
        branch: {
            from: unpack(previous),
            to: unpack(next),
            direction: directionToken(previous, next, level),
            targetWasVisited: replay.targetWasVisited,
            targetPriorEdgeUsage: replay.targetPriorEdgeUsage,
            portalJump: replay.branchWasPortal,
        },
        accounting,
        pathResources: {
            ...pathResourceCounts(state, level),
            legalSuccessorCount: neighbors.length,
        },
        relational,
        hardPrune: {
            verdict: hardPruneVerdict,
            reached: Object.keys(diagnostics.reached).filter(key => diagnostics.reached[key] > 0).sort(),
            rejected: Object.keys(diagnostics.rejected).filter(key => diagnostics.rejected[key] > 0).sort(),
        },
    };
}

function stable(value) { return JSON.stringify(value); }
function compareSnapshots(dead, live) {
    const families = {
        accounting: stable(dead.accounting) !== stable(live.accounting),
        pathResourceCounts: stable(dead.pathResources) !== stable(live.pathResources),
        relationalBounds: stable(dead.relational) !== stable(live.relational),
        hardPrune: stable(dead.hardPrune) !== stable(live.hardPrune),
    };
    const liveAlarm = live.hardPrune.verdict === 'reject';
    const existingHardFact = dead.hardPrune.verdict === 'reject' && live.hardPrune.verdict !== 'reject';
    const semanticFamilies = Object.entries(families).filter(([, changed]) => changed).map(([name]) => name);
    const classification = liveAlarm ? 'blocked'
        : existingHardFact ? 'existing-hard-fact'
            : semanticFamilies.length ? 'bounded-semantic-delta'
                : 'geometry/history-only-at-this-resolution';
    return { families, semanticFamilies, liveAlarm, existingHardFact, classification };
}

const comparisons = [];
for (const result of pairDoc.results ?? []) {
    const deathDepth = result.pointOfNoReturn?.infeasibleDepth;
    if (!Number.isInteger(deathDepth) || deathDepth !== result.naiveFirstDivergence) continue;
    const dead = stateByRole.get(String(result.role));
    if (!dead || dead.exactLabel !== 'dead') throw new Error(`missing exact-DEAD source state for ${result.role}`);

    for (const divergence of result.divergences ?? []) {
        if (divergence.commonPrefix !== deathDepth) continue;
        const live = stateByRole.get(String(divergence.role));
        if (!live || live.exactLabel !== 'live') throw new Error(`missing exact-LIVE source state for ${divergence.role}`);
        for (let i = 0; i < deathDepth; i++) {
            if (stable(dead.prefixXY[i]) !== stable(live.prefixXY[i])) {
                throw new Error(`${result.role}/${divergence.role}: stored common prefix disagrees before depth ${deathDepth}`);
            }
        }
        if (stable(dead.prefixXY[deathDepth]) === stable(live.prefixXY[deathDepth])) {
            throw new Error(`${result.role}/${divergence.role}: no divergence at claimed death depth ${deathDepth}`);
        }
        const deadSnapshot = snapshot(result.levelId, dead, deathDepth);
        const liveSnapshot = snapshot(result.levelId, live, deathDepth);
        const comparison = compareSnapshots(deadSnapshot, liveSnapshot);
        const divergenceKey = JSON.stringify({
            levelId: result.levelId,
            sharedPrefix: dead.prefixXY.slice(0, deathDepth),
            deadMove: dead.prefixXY[deathDepth],
            liveMove: live.prefixXY[deathDepth],
        });
        comparisons.push({
            levelId: result.levelId,
            deadRole: dead.role,
            liveRole: live.role,
            deathDepth,
            divergenceKey,
            dead: deadSnapshot,
            live: liveSnapshot,
            comparison,
        });
    }
}

if (!comparisons.length) throw new Error('no eligible matched divergence comparisons');

const byDivergence = new Map();
for (const row of comparisons) {
    if (!byDivergence.has(row.divergenceKey)) byDivergence.set(row.divergenceKey, []);
    byDivergence.get(row.divergenceKey).push(row);
}
const independent = [...byDivergence.values()].map(rows => ({
    representative: rows[0],
    corroboratingComparisons: rows.length,
    allClassifications: [...new Set(rows.map(row => row.comparison.classification))].sort(),
    semanticFamilies: [...new Set(rows.flatMap(row => row.comparison.semanticFamilies))].sort(),
}));
const blocked = independent.filter(row => row.allClassifications.includes('blocked'));
const coherentSemanticFamilies = independent.length
    ? independent.map(row => new Set(row.semanticFamilies)).reduce((acc, set) =>
        new Set([...acc].filter(value => set.has(value))))
    : new Set();
const advancementEligible = blocked.length === 0 && coherentSemanticFamilies.size > 0;
const output = {
    schemaVersion: 1,
    kind: 'pathfinder-ws6-dependency-interface-observer',
    source: {
        pairs: pairPath,
        states: statesPath,
        corpus: corpusPath,
        evidenceReuse: 'retained exact labels and Lane E bisection only; no solver search or CP-SAT queries',
    },
    comparisonCount: comparisons.length,
    independentDivergencePoints: independent.length,
    classifications: Object.fromEntries(
        ['existing-hard-fact', 'bounded-semantic-delta', 'geometry/history-only-at-this-resolution', 'blocked']
            .map(kind => [kind, independent.filter(row => row.allClassifications.includes(kind)).length])),
    coherentSemanticFamilies: [...coherentSemanticFamilies].sort(),
    advancementEligible,
    interpretation: advancementEligible
        ? 'development nomination only: coherent non-positional semantic family differs at every independent divergence point; broader independent-parent observer required before any repair consumer'
        : 'no coherent bounded semantic family across all independent divergence points; leave dependency-conditioned repair dormant unless a materially different retained population supplies one',
    comparisons,
};
console.log(JSON.stringify({
    comparisonCount: output.comparisonCount,
    independentDivergencePoints: output.independentDivergencePoints,
    classifications: output.classifications,
    coherentSemanticFamilies: output.coherentSemanticFamilies,
    advancementEligible: output.advancementEligible,
    independent: independent.map(row => ({
        deadRole: row.representative.deadRole,
        liveRole: row.representative.liveRole,
        corroboratingComparisons: row.corroboratingComparisons,
        classifications: row.allClassifications,
        semanticFamilies: row.semanticFamilies,
        deadBranch: row.representative.dead.branch,
        liveBranch: row.representative.live.branch,
        deadAccounting: row.representative.dead.accounting,
        liveAccounting: row.representative.live.accounting,
        deadResources: row.representative.dead.pathResources,
        liveResources: row.representative.live.pathResources,
        deadRelational: row.representative.dead.relational,
        liveRelational: row.representative.live.relational,
        deadHardPrune: row.representative.dead.hardPrune,
        liveHardPrune: row.representative.live.hardPrune,
    })),
}, null, 2));
if (outPath) writeFileSync(path.resolve(ROOT, outPath), `${JSON.stringify(output, null, 2)}\n`);
