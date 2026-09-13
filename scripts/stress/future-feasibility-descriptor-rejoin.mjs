#!/usr/bin/env node
/**
 * Read-only WS2 future-feasibility descriptor rejoin.
 *
 * Replays the prespecified exact-labelled B2 extinction cases plus the frozen R03229 microscope
 * cases through real search-state primitives, then measures a tiny fixed descriptor set. This
 * script never influences search. Exact labels are offline truth only.
 *
 * B1 remains the historical precedent for this mechanism class; B2's committed case file plus its
 * 2026-08-15 flipping-filter rerun provide the reproducible executable label population here.
 *
 * Candidate families are bounded by
 * reports/2026-09-12-future-feasibility-premise-rejoin-001.md:
 *   1. exact-resource attainable capacity,
 *   2. residual topology scarcity,
 *   3. joint-obligation compatibility.
 * Progress/resource state is emitted only as context/negative control.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [k, ...v] = x.split('='); return [k, v.join('=')];
}));
const B2_CASES = args.get('--b2-cases') ?? 'reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json';
const R03229_CASES = args.get('--r03229-cases') ?? 'tmp/r03229-microscope-cases.json';
const OUT = args.get('--out') ?? 'tmp/future-feasibility-descriptor-rejoin.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const { prepLevel, createState, applyMove, PACK, getRealLengthFromState, evaluateObligationClusters } = api;

const popcount = n => { let x = n >>> 0, c = 0; while (x) { x &= x - 1; c++; } return c; };
const load = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const levelCache = new Map();
function levelEntry(corpusFile, levelId) {
    const key = path.resolve(corpusFile);
    if (!levelCache.has(key)) levelCache.set(key, readLevelsWithHints(corpusFile));
    const entry = levelCache.get(key).find(x => String(x.id) === String(levelId));
    if (!entry) throw new Error(`${levelId} not found in ${corpusFile}`);
    return entry;
}
function roleOf(c) {
    if (c.source?.role) return c.source.role;
    if (String(c.id).includes('culled-supported')) return 'witness-culled';
    if (String(c.id).includes('top-rank1')) return 'top-rank1';
    if (String(c.id).includes('retained-near-cutoff')) return 'cutoff-survivor';
    return 'other';
}

// Decision table from reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md, including the
// 2026-08-15 flipping-filter rerun. Null/timeout rows are intentionally absent.
const B2_EXACT = new Map(Object.entries({
    S00001: { 'top-rank1': 'dead', 'witness-culled': 'live' },
    S00028: { 'top-rank1': 'live', 'witness-culled': 'live' },
    S00030: { 'top-rank1': 'dead', 'witness-culled': 'live', 'cutoff-survivor': 'live' },
    S00035: { 'witness-culled': 'live' },
    S00048: { 'top-rank1': 'dead', 'witness-culled': 'live', 'cutoff-survivor': 'live' },
    S00095: { 'top-rank1': 'live', 'witness-culled': 'live' },
    S00099: { 'witness-culled': 'live' },
    S00108: { 'top-rank1': 'live', 'witness-culled': 'live' },
    S00120: { 'top-rank1': 'live', 'witness-culled': 'live' },
    S00140: { 'top-rank1': 'live', 'witness-culled': 'live' },
    R00058: { 'top-rank1': 'live', 'witness-culled': 'live' },
    R00060: { 'top-rank1': 'live', 'witness-culled': 'live' },
    R00064: { 'top-rank1': 'live', 'witness-culled': 'live' },
    R00104: { 'top-rank1': 'dead', 'witness-culled': 'live' },
}));
function exactLabel(c) {
    const role = roleOf(c);
    if (c.levelId === 'R03229') {
        if (role === 'witness-culled') return 'live';
        if (role === 'top-rank1' || role === 'cutoff-survivor') return 'dead';
        return null;
    }
    return B2_EXACT.get(c.levelId)?.[role] ?? null;
}
function keysOf(prefix) {
    if (!Array.isArray(prefix) || prefix.length === 0) throw new Error('empty prefix');
    return Array.isArray(prefix[0]) ? prefix.map(([x,y]) => PACK(x - 1, y - 1)) : prefix.map(Number);
}
function replay(raw, prefix) {
    const { id: _id, stressMeta: _stressMeta, hints: _hints, ...levelRaw } = raw;
    const level = Solver.prepareLevelForSolver(levelRaw, { source: 'raw' });
    const prep = prepLevel(level); prep._cfg = null;
    const keys = keysOf(prefix);
    const state = createState(keys[0], level, prep);
    for (let i = 1; i < keys.length; i++) {
        const from = state.path.at(-1), next = keys[i];
        const portal = level.portalMap.get(from);
        applyMove(next, state, level, prep, !!(portal && portal.dest === next));
    }
    return { level, prep, state, pos: state.path.at(-1) };
}

// Optimistic opportunity for future intersections: each non-terminal visited cell with an unused
// axis and no categorical single-use block counts once. Predictive summary only, never a prune.
function revisitOpportunityCount(level, prep, state, pos) {
    let n = 0;
    const { w, h } = level.grid;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = PACK(x, y);
        if (k === pos || state.visited[k] === 0 || k === level.goalKey || prep.gateFlags[k]) continue;
        if (state.edgeUsage[k] === 3) continue;
        const fi = prep.flipperIndexMap ? prep.flipperIndexMap[k] - 1 : -1;
        if (fi !== -1 && (state.flipperUsedMask & (1 << fi))) continue;
        if (level.portalMap.has(k)) continue;
        n++;
    }
    return n;
}

// Topology-scarcity proxy: pending must-pass/must-cross cells with few cardinal neighbours that are
// not categorical hard walls. This is deliberately not a degree prune; prior work showed that form
// is unsound.
function pendingLowDegree(level, prep, state, pos) {
    const pending = [];
    for (let i = 0; i < level.mustPassKeys.length; i++) if ((state.mpVisitedMask & (1 << i)) === 0) pending.push(level.mustPassKeys[i]);
    for (let i = 0; i < level.mustCrossKeys.length; i++) if (state.mustCrossMask & (1 << i)) pending.push(level.mustCrossKeys[i]);
    let low2 = 0, minDegree = 4;
    for (const k of pending) {
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        const candidates = [];
        if (x + 1 < level.grid.w) candidates.push(k + 1);
        if (x > 0) candidates.push(k - 1);
        if (y + 1 < level.grid.h) candidates.push(k + 0x10000);
        if (y > 0) candidates.push(k - 0x10000);
        let degree = 0;
        for (const nk of candidates) {
            if (prep.reachBlockedArr[nk] !== 0) continue;
            if (nk !== pos && state.edgeUsage[nk] === 3) continue;
            const fi = prep.flipperIndexMap ? prep.flipperIndexMap[nk] - 1 : -1;
            if (fi !== -1 && (state.flipperUsedMask & (1 << fi))) continue;
            if (level.portalMap.has(nk) && state.visited[nk] > 0 && nk !== pos) continue;
            degree++;
        }
        minDegree = Math.min(minDegree, degree);
        if (degree <= 2) low2++;
    }
    return { pendingCount: pending.length, lowDegree2: low2, minPendingDegree: pending.length ? minDegree : null };
}

const b2 = load(B2_CASES);
const r32 = load(R03229_CASES);
const selected = [...b2.cases.filter(c => exactLabel(c)), ...r32.cases.filter(c => exactLabel(c))];
const rows = [];
for (const c of selected) {
    const corpus = c.levelId === 'R03229' ? r32.corpus : b2.corpus;
    const raw = levelEntry(corpus, c.levelId);
    const { level, prep, state, pos } = replay(raw, c.prefix);
    const remainingIntersections = level.requiredIntersections - state.ints;
    const reservedMustCross = popcount(state.mustCrossMask);
    const revisitCapacity = revisitOpportunityCount(level, prep, state, pos);
    const topo = pendingLowDegree(level, prep, state, pos);
    const joint = evaluateObligationClusters(pos, state, level, prep);
    rows.push({
        caseId: c.id, levelId: c.levelId, role: roleOf(c), exact: exactLabel(c),
        depth: state.path.length - 1,
        descriptors: {
            intersectionCapacitySlack: revisitCapacity - remainingIntersections,
            freeIntersectionSlackAfterMustCross: remainingIntersections - reservedMustCross,
            pendingLowDegree2: topo.lowDegree2,
            minPendingDegree: topo.minPendingDegree,
            activeJointClusters: joint.length,
            jointRejects: joint.filter(x => x.verdict === 'reject').length,
            remainingIntersections,
            pendingMustCross: reservedMustCross,
            pendingMustPass: level.mustPassKeys.length - popcount(state.mpVisitedMask),
            realLength: getRealLengthFromState(state),
        },
    });
}

const descriptorNames = ['intersectionCapacitySlack','freeIntersectionSlackAfterMustCross','pendingLowDegree2','minPendingDegree','activeJointClusters','jointRejects'];
const byDescriptor = {};
for (const name of descriptorNames) {
    const usable = rows.filter(r => Number.isFinite(r.descriptors[name]));
    const live = usable.filter(r => r.exact === 'live').map(r => r.descriptors[name]);
    const dead = usable.filter(r => r.exact === 'dead').map(r => r.descriptors[name]);
    byDescriptor[name] = {
        live, dead,
        liveMean: live.length ? live.reduce((a,b)=>a+b,0)/live.length : null,
        deadMean: dead.length ? dead.reduce((a,b)=>a+b,0)/dead.length : null,
        exactValueSeparation: live.length && dead.length ? !live.some(v => dead.includes(v)) : false,
    };
}
const out = {
    schemaVersion: 2,
    evidenceRole: 'read-only future-feasibility premise rejoin',
    sourceCases: [B2_CASES, R03229_CASES],
    labelAuthority: 'reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md plus R03229 reconciliation',
    selectedCaseCount: rows.length,
    levelCount: new Set(rows.map(r => r.levelId)).size,
    rows,
    byDescriptor,
    interpretationGuard: 'Descriptor separation is premise evidence only. No runtime policy or treatment is licensed without an independent phenotype-matched test.',
};
mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ selectedCaseCount: out.selectedCaseCount, levelCount: out.levelCount, byDescriptor }, null, 2));
console.log(`Wrote ${OUT}`);
