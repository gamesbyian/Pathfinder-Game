#!/usr/bin/env node
/**
 * Freezes the H1 event-feasibility query list per
 * reports/2026-09-16-h1-event-feasibility-prespec-001.md's "Frozen event vocabulary" and
 * "Selection rule" -- BEFORE any CP-SAT compute. Read-only with respect to the existing B2
 * exact-label population: this script never solves, never inspects a new exact label, and never
 * chooses which queries to run based on any label (the join to `class5B2ExactLabel` is only used
 * to select which of the case file's 32 cases belong to the already-resolved 28-state population;
 * the label VALUE itself never influences which events get enumerated for a state).
 *
 * For each of the 28 frozen B2 states (one-step-extended prefixes: prefix + the case's own child
 * move, already folded into the case file's own `prefix` field), replays the state through the
 * native solver's own createState/applyMove primitives (SOLVER_TESTING_API) to determine which
 * obligations are still PENDING at that state, then enumerates:
 *   - E-CROSS-VIA(axis, entryCell): one query per pending must-cross axis x each of its board
 *     (static-adjacency) legal entry cells;
 *   - E-PASS-VIA(cell, entryCell): one query per pending must-pass cell x legal entry cell;
 *   - E-FLIP-ORDER(i, j): one query per PAIR of adjacent-rank pending flippers, ranked by board
 *     (Manhattan) distance from the state's current position -- not all C(n,2) pairs, per the
 *     prespec's explicit "no feature sweep" bound;
 *   - E-PORTAL-PAIR(pairId): one query per pending (not-yet-used) portal pair.
 * E-ORDER is intentionally omitted: the prespec requires an accepted-path artifact to nominate a
 * specific cross-mechanic pair before this event type activates, and no such nomination exists for
 * this population.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { CLASS5_B2_EXACT_LABEL_PROJECTION, class5B2ExactLabel, class5B2ExactLabelCount, verifyClass5B2ExactLabelProjection } from './class5-b2-exact-prefix-labels.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const casesFile = args.get('--cases') ?? 'reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json';
const outFile = args.get('--out') ?? 'reports/stress/h1-event-feasibility-queries.json';

function role(id) {
    if (id.includes('culled-supported')) return 'witness-culled';
    if (id.includes('top-rank1')) return 'top-rank1';
    if (id.includes('retained-near-cutoff')) return 'cutoff-survivor';
    return 'other';
}

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const authorityMarkdown = readFileSync(CLASS5_B2_EXACT_LABEL_PROJECTION.authorityReport, 'utf8');
verifyClass5B2ExactLabelProjection(authorityMarkdown);
if (class5B2ExactLabelCount() !== CLASS5_B2_EXACT_LABEL_PROJECTION.exactLabelledPrefixes) {
    throw new Error('B2 exact-label projection count disagrees with its authoritative artifact declaration');
}

const source = JSON.parse(readFileSync(casesFile, 'utf8'));
const rawDoc = JSON.parse(readFileSync(source.corpus, 'utf8'));
const rawLevels = Array.isArray(rawDoc) ? rawDoc : rawDoc.levels;
const rawById = new Map(rawLevels.map(l => [String(l.id), l]));

const packRaw = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));
const unpackToXY = key => [(key & 0xffff) + 1, ((key >>> 16) & 0xffff) + 1];

const preparedCache = new Map();
function prepared(levelId) {
    if (!preparedCache.has(levelId)) {
        const raw = rawById.get(levelId);
        if (!raw) throw new Error(`${levelId} not found in ${source.corpus}`);
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const prep = api.prepLevel(level);
        preparedCache.set(levelId, { raw, level, prep });
    }
    return preparedCache.get(levelId);
}

/** Static board adjacency only (matches cpsat-reference-probe.py's own impassable set: blocks,
 * geese, false goals -- not full dynamic move legality, per the prespec's "actual legal neighbors
 * on that level's board"). */
function boardNeighbors(level, key) {
    const x = key & 0xffff, y = (key >>> 16) & 0xffff;
    const { w, h } = level.grid;
    const impassable = c => level.blockSet.has(c) || level.gooseSet.has(c) || level.falseGoalKeys.has(c);
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ((ny << 16) | nx) >>> 0;
        if (impassable(nk)) continue;
        out.push(nk);
    }
    return out;
}

function manhattan(a, b) {
    const ax = a & 0xffff, ay = (a >>> 16) & 0xffff, bx = b & 0xffff, by = (b >>> 16) & 0xffff;
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

const states = [];
for (const c of source.cases) {
    if (c.levelId === 'R00087') continue; // no resolved exact label; excluded per the prespec
    const roleName = role(c.id);
    const exactLabel = class5B2ExactLabel(c.levelId, roleName);
    if (!exactLabel) continue; // e.g. S00035/S00099 top-rank1: unresolved, not in the frozen 28
    states.push({ caseId: c.id, levelId: c.levelId, role: roleName, exactLabel, prefixXY: c.prefix });
}
if (states.length !== CLASS5_B2_EXACT_LABEL_PROJECTION.exactLabelledPrefixes) {
    throw new Error(`expected ${CLASS5_B2_EXACT_LABEL_PROJECTION.exactLabelledPrefixes} resolved B2 states, joined ${states.length}`);
}

const frozenStates = states.map(state => {
    const { level, prep, raw } = prepared(state.levelId);
    const prefixKeys = state.prefixXY.map(packRaw);
    const stateApi = api.createState(prefixKeys[0], level, prep);
    for (let i = 1; i < prefixKeys.length; i++) {
        const from = stateApi.path.at(-1);
        const portal = level.portalMap.get(from);
        api.applyMove(prefixKeys[i], stateApi, level, prep, !!(portal && portal.dest === prefixKeys[i]));
    }
    const position = stateApi.path.at(-1);

    const pendingMustCross = level.mustCrossKeys.filter((_, i) => (stateApi.mustCrossMask & (1 << i)) !== 0);
    const pendingMustPass = level.mustPassKeys.filter((_, i) => (stateApi.mpVisitedMask & (1 << i)) === 0);
    const flipperKeys = Array.from(prep.flipperKeys ?? []);
    const pendingFlippers = flipperKeys.filter((_, i) => (stateApi.flipperUsedMask & (1 << i)) === 0);

    const rawPortals = (raw.portals ?? []).map(p => [packRaw([p.x1, p.y1]), packRaw([p.x2, p.y2])]);
    const usedPairIds = new Set();
    for (let i = 1; i < prefixKeys.length; i++) {
        const from = prefixKeys[i - 1], to = prefixKeys[i];
        rawPortals.forEach(([a, b], pairId) => {
            if ((from === a && to === b) || (from === b && to === a)) usedPairIds.add(pairId);
        });
    }
    const pendingPortalPairs = rawPortals.map((_, pairId) => pairId).filter(pairId => !usedPairIds.has(pairId));

    const queries = [];
    for (const axisKey of pendingMustCross) {
        for (const entry of boardNeighbors(level, axisKey)) {
            queries.push({ type: 'cross-via', axis: unpackToXY(axisKey), entry: unpackToXY(entry) });
        }
    }
    for (const cellKey of pendingMustPass) {
        for (const entry of boardNeighbors(level, cellKey)) {
            queries.push({ type: 'pass-via', cell: unpackToXY(cellKey), entry: unpackToXY(entry) });
        }
    }
    if (pendingFlippers.length >= 2) {
        const ranked = pendingFlippers
            .map(key => ({ key, dist: manhattan(position, key) }))
            .sort((a, b) => a.dist - b.dist || a.key - b.key);
        for (let r = 0; r + 1 < ranked.length; r++) {
            const i = flipperKeys.indexOf(ranked[r].key);
            const j = flipperKeys.indexOf(ranked[r + 1].key);
            queries.push({ type: 'flip-order', i, j, rankPair: [r, r + 1] });
        }
    }
    for (const pairId of pendingPortalPairs) {
        queries.push({ type: 'portal-pair', pairId });
    }

    return {
        caseId: state.caseId, levelId: state.levelId, role: state.role, exactLabel: state.exactLabel,
        corpus: source.corpus, prefixXY: state.prefixXY,
        pendingCounts: { mustCross: pendingMustCross.length, mustPass: pendingMustPass.length, flippers: pendingFlippers.length, portalPairs: pendingPortalPairs.length },
        queryCount: queries.length,
        queries,
    };
});

const document = {
    schemaVersion: 1,
    kind: 'h1-event-feasibility-frozen-queries',
    generatedAt: new Date().toISOString(),
    solverRef,
    prespec: 'reports/2026-09-16-h1-event-feasibility-prespec-001.md',
    sourceCases: casesFile,
    exactLabelProvenance: { sourceId: 'class5-b2-exact-label-projection-v1', ...CLASS5_B2_EXACT_LABEL_PROJECTION },
    eventTypesImplemented: ['cross-via', 'pass-via', 'flip-order', 'portal-pair'],
    eventTypesOmitted: [{ type: 'order', reason: 'no accepted-path artifact nominates a specific cross-mechanic pair for any of these 28 states; stays inactive per the prespec' }],
    stateCount: frozenStates.length,
    totalQueryCount: frozenStates.reduce((sum, s) => sum + s.queryCount, 0),
    states: frozenStates,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ stateCount: document.stateCount, totalQueryCount: document.totalQueryCount,
    perState: frozenStates.map(s => ({ caseId: s.caseId, exactLabel: s.exactLabel, queryCount: s.queryCount, pending: s.pendingCounts })) }, null, 2));
