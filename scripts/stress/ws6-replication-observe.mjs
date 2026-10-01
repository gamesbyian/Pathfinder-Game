#!/usr/bin/env node
/**
 * WS6 independent-parent replication, step 3 (frozen by reports/2026-10-01-ws6-independent-parent-replication-preregistration-001.md).
 * Consumes the pair file, the merged CP-SAT labels for the DEAD branch prefixes, and computes the frozen features.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const pairsFile = args.get('--pairs') ?? 'data/stress/ws6-replication-pairs-001.json';
const labelFiles = (args.get('--labels') ?? '').split(',').filter(Boolean);
const outFile = args.get('--out') ?? 'reports/stress/ws6-replication-observe-001.json';
const ALPHA = 0.05 / 5;
const FEATURES = ['mustPassLowerBound', 'legalSuccessorCount', 'bothAxesUsedCells', 'horizontalUsedCells', 'verticalUsedCells'];

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const pairDoc = JSON.parse(readFileSync(pairsFile, 'utf8'));
const levels = new Map(readLevelCorpusDocumentWithHints(pairDoc.corpus).levels.map(l => [String(l.id), l]));
const labelById = new Map();
for (const f of labelFiles) for (const r of JSON.parse(readFileSync(f, 'utf8')).results ?? JSON.parse(readFileSync(f, 'utf8')).rows ?? []) labelById.set(String(r.caseId ?? r.id), r);

const popcount = v => { let n = v >>> 0, c = 0; while (n) { n &= n - 1; c++; } return c; };
const prepared = new Map();
function prep(levelId) {
    if (!prepared.has(levelId)) { const level = Solver.prepareLevelForSolver(levels.get(levelId), { source: 'raw' }); const p = api.prepLevel(level); p._cfg = null; prepared.set(levelId, { level, prep: p }); }
    return prepared.get(levelId);
}
function snapshot(levelId, prefix) {
    const { level, prep: p } = prep(levelId);
    const state = api.createState(prefix[0], level, p);
    for (let i = 1; i < prefix.length; i++) {
        const from = prefix[i - 1], to = prefix[i];
        const portal = level.portalMap.get(from);
        api.applyMove(to, state, level, p, !!(portal && !state.lastWasPortalJump && portal.dest === to));
    }
    const next = prefix.at(-1);
    let both = 0, horiz = 0, vert = 0;
    for (let y = 0; y < level.grid.h; y++) for (let x = 0; x < level.grid.w; x++) { const u = state.edgeUsage[api.PACK(x, y)]; if (u & 1) horiz++; if (u & 2) vert++; if ((u & 3) === 3) both++; }
    const realLen = api.getRealLengthFromState(state);
    const diag = { reached: {}, rejected: {} };
    const verdict = api.evaluatePrunedMove(next, realLen, state, level, p, null, true, { diagnostics: diag });
    return {
        accounting: JSON.stringify([realLen, state.ints, popcount(state.mpVisitedMask), popcount(state.mustCrossMask), popcount(state.mustTurnMask ?? 0), popcount(state.surroundMask ?? 0), popcount(state.adjTurnMask ?? 0), state.flipperUsedMask, state.portalJumps]),
        verdict, f: { mustPassLowerBound: level.mustPassKeys.length ? api.mustPassLowerBound(next, state, level, p) : 0, legalSuccessorCount: api.getNeighbors(next, state, level, p).length, bothAxesUsedCells: both, horizontalUsedCells: horiz, verticalUsedCells: vert },
    };
}
const sign = x => (x > 0) - (x < 0);
function binomTwoSided(k, n) { // exact two-sided sign test, p0 = 0.5
    if (n === 0) return 1;
    const logC = (a, b) => { let s = 0; for (let i = 1; i <= b; i++) s += Math.log(a - b + i) - Math.log(i); return s; };
    const pk = i => Math.exp(logC(n, i) - n * Math.log(2));
    const pObs = pk(k); let p = 0; for (let i = 0; i <= n; i++) if (pk(i) <= pObs + 1e-12) p += pk(i);
    return Math.min(1, p);
}
function analyse(rows) { // rows: {levelId, delta:{feature:number}}
    const byParent = new Map();
    for (const r of rows) { if (!byParent.has(r.levelId)) byParent.set(r.levelId, []); byParent.get(r.levelId).push(r); }
    const out = { parents: byParent.size, features: {} };
    for (const f of FEATURES) {
        let pos = 0, neg = 0, tie = 0;
        for (const rs of byParent.values()) { const m = rs.reduce((a, r) => a + sign(r.delta[f]), 0) / rs.length; if (m > 0) pos++; else if (m < 0) neg++; else tie++; }
        const n = pos + neg; out.features[f] = { deadHigher: pos, deadLower: neg, tie, p: binomTwoSided(Math.max(pos, neg), n), significant: n > 0 && binomTwoSided(Math.max(pos, neg), n) < ALPHA };
    }
    return out;
}

const counts = { candidate: pairDoc.pairs.length, deadByExact: 0, liveBySat: 0, abstain: 0, missingLabel: 0, accountingDiffers: 0, existingHardFact: 0, liveAlarm: 0, eligible: 0 };
const eligible = [];
for (const p of pairDoc.pairs) {
    const lab = labelById.get(p.pairId);
    if (!lab) { counts.missingLabel++; continue; }
    const label = lab.referenceLabel ?? lab.label;
    if (label === 'live') { counts.liveBySat++; continue; }
    if (label !== 'dead') { counts.abstain++; continue; }
    counts.deadByExact++;
    const d = snapshot(p.levelId, p.deadPrefix), l = snapshot(p.levelId, p.livePrefix);
    if (l.verdict === 'reject') { counts.liveAlarm++; continue; }
    if (d.verdict === 'reject') { counts.existingHardFact++; continue; }
    if (d.accounting !== l.accounting) { counts.accountingDiffers++; continue; }
    counts.eligible++;
    eligible.push({ levelId: p.levelId, pairId: p.pairId, delta: Object.fromEntries(FEATURES.map(f => [f, d.f[f] - l.f[f]])), dead: d.f, live: l.f });
}
// LIVE-LIVE null on the same parents
const parents = new Set(eligible.map(e => e.levelId));
const nullRows = [];
for (const levelId of parents) {
    const raw = levels.get(levelId); const { level } = prep(levelId);
    const hints = raw.hints.filter(h => Solver.validateCandidatePath(level, h).ok);
    for (let i = 0; i < hints.length; i++) for (let j = i + 1; j < hints.length; j++) {
        let c = 0; while (c < hints[i].length && c < hints[j].length && hints[i][c] === hints[j][c]) c++;
        if (c < 1 || c >= hints[i].length - 1 || c >= hints[j].length - 1) continue;
        const swap = ((levelId.length + c) & 1) === 1; const A = swap ? hints[j] : hints[i], B = swap ? hints[i] : hints[j];
        const a = snapshot(levelId, A.slice(0, c + 1)), b = snapshot(levelId, B.slice(0, c + 1));
        if (a.accounting !== b.accounting || a.verdict === 'reject' || b.verdict === 'reject') continue;
        nullRows.push({ levelId, delta: Object.fromEntries(FEATURES.map(f => [f, a.f[f] - b.f[f]])) });
    }
}
const result = { kind: 'pathfinder-ws6-replication-observe', alpha: ALPHA, counts, deadLive: analyse(eligible), liveLiveNull: { pairs: nullRows.length, ...analyse(nullRows) }, eligible };
const inconclusive = result.deadLive.parents < 12;
result.verdict = inconclusive ? 'inconclusive-insufficient-parents' : (FEATURES.filter(f => result.deadLive.features[f].significant && !result.liveLiveNull.features[f].significant).length ? 'nominate' : 'dormant-no-recurrent-interface');
writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ counts, verdict: result.verdict, deadLive: result.deadLive, nullPairs: nullRows.length, nullFeatures: result.liveLiveNull.features }, null, 1));
