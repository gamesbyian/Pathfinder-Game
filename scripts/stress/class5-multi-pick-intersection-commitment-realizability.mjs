#!/usr/bin/env node
/**
 * Lane D question 1 (future-intersection commitment realizability, docs/solver-per-instance-
 * relational-feasibility-preflight.md) re-run at real scale on the fresh multi-pick population.
 * The original result (reports/2026-09-17-lane-d-intersection-commitment-realizability-result-001.md)
 * was a clean positive -- every exact-DEAD state had zero confirmed-feasible future-intersection
 * commitments while every exact-LIVE sibling had >=1 -- but on only 2 matched parents (population
 * exhausted, needing the same blocked sibling constructor as Lanes B/E/G2).
 *
 * R03147's multi-pick population (2 live/23 dead, one real production search frontier, depth-
 * fraction 0.1) supplies a MUCH larger matched set: 19 of the 23 exact-DEAD states share the
 * IDENTICAL remaining-intersection-deficit (ints=0, requiredIntersections=7) and remaining length
 * (all captured at the same depth-11 checkpoint) as both exact-LIVE siblings -- the exact matching
 * criterion the original question used, now at real scale instead of n=1 dead state.
 *
 * Method: unchanged from the original script -- for each matched state, cpsat-reference-probe.py's
 * --pin-revisit hook asks whether completion remains feasible while forcing a second visit to each
 * already-visited candidate cell individually (excluding gate/goal/portal/filter cells). Every
 * claimed-feasible witness is referee-validated before being counted.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-multi-pick-intersection-commitment-realizability.mjs -- \
 *     --labels=reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json \
 *     --time-limit=45 --out=reports/stress/class5-multi-pick-intersection-commitment-realizability-2026-09-17.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const LABELS_FILE = arg('labels', 'reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json');
const TIME_LIMIT = Number(arg('time-limit', 45));
const OUT_FILE = arg('out', null);
const SHARD_INDEX = Number(arg('shard-index', 1));
const SHARD_COUNT = Number(arg('shard-count', 1));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const readJson = (f) => JSON.parse(readFileSync(path.resolve(ROOT, f), 'utf8'));
const labelsDoc = readJson(LABELS_FILE);
const rows = labelsDoc.rows.filter((r) => r.referenceLabel === 'live' || r.referenceLabel === 'dead');

const pack = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));

function prepareLevel(corpus, levelId) {
    const doc = JSON.parse(readFileSync(path.resolve(ROOT, corpus), 'utf8'));
    const list = Array.isArray(doc) ? doc : doc.levels;
    const raw = list.find((l) => String(l.id) === String(levelId));
    const { id: _id, stressMeta: _sm, ...rawLevel } = raw;
    return Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
}
const levelCache = new Map();
function getLevel(corpus, levelId) {
    const key = `${corpus}\0${levelId}`;
    if (!levelCache.has(key)) levelCache.set(key, prepareLevel(corpus, levelId));
    return levelCache.get(key);
}

function stateInts(level, prefixXY) {
    const prep = api.prepLevel(level);
    prep._cfg = null;
    const keys = prefixXY.map(pack);
    const state = api.createState(keys[0], level, prep);
    for (let i = 1; i < keys.length; i++) {
        const prev = keys[i - 1];
        const portal = level.portalMap.get(prev);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === keys[i]);
        api.applyMove(keys[i], state, level, prep, isJump);
    }
    return state.ints;
}

function candidateCells(prefixXY, level, prep) {
    const seen = new Set();
    const out = [];
    for (const [x, y] of prefixXY) {
        const k = pack([x, y]);
        if (seen.has(k)) continue;
        seen.add(k);
        if (prep.gateFlags[k]) continue;
        if (k === level.goalKey) continue;
        if (level.portalMap.has(k)) continue;
        if (level.filterMap.has(k) || level.flippingFilterMap.has(k)) continue;
        out.push([x, y]);
    }
    return out;
}

// Group by parent so the matching (identical ints AND prefix length) is computed per parent, not
// globally -- required-length/ints scalars are level-specific, so cross-parent matching would be
// meaningless even if the numbers happened to coincide.
const byParent = new Map();
for (const r of rows) {
    if (!byParent.has(r.levelId)) byParent.set(r.levelId, []);
    byParent.get(r.levelId).push(r);
}

const matched = [];
for (const [levelId, parentRows] of byParent) {
    const level = getLevel(parentRows[0].corpus, levelId);
    const withInts = parentRows.map((r) => ({ ...r, ints: stateInts(level, r.prefix), prefixLen: r.prefix.length }));
    const live = withInts.filter((r) => r.referenceLabel === 'live');
    if (live.length === 0) continue;
    for (const r of withInts) {
        const matchingLive = live.filter((l) => l.ints === r.ints && l.prefixLen === r.prefixLen);
        if (r.referenceLabel === 'dead' && matchingLive.length > 0) matched.push({ ...r, matchedLiveRoles: matchingLive.map((l) => l.caseId) });
        else if (r.referenceLabel === 'live') matched.push({ ...r, matchedLiveRoles: null });
    }
}
console.log(`Matched (identical remaining-intersection-deficit and remaining length): ${matched.filter((m) => m.referenceLabel === 'dead').length} dead + ${matched.filter((m) => m.referenceLabel === 'live').length} live across ${byParent.size} parents.`);

const queries = [];
for (const m of matched) {
    const level = getLevel(m.corpus, m.levelId);
    const prep = api.prepLevel(level);
    prep._cfg = null;
    const candidates = candidateCells(m.prefix, level, prep);
    for (const cell of candidates) queries.push({ caseId: m.caseId, levelId: m.levelId, corpus: m.corpus, exactLabel: m.referenceLabel, prefixXY: m.prefix, cell });
}
const sharded = queries.filter((_, i) => i % SHARD_COUNT === SHARD_INDEX - 1);
console.log(`Shard ${SHARD_INDEX}/${SHARD_COUNT}: ${sharded.length}/${queries.length} pin-revisit queries.`);
if (arg('count-only', null)) process.exit(0);

const byCase = new Map();
for (const q of sharded) {
    if (!byCase.has(q.caseId)) byCase.set(q.caseId, { caseId: q.caseId, levelId: q.levelId, exactLabel: q.exactLabel, candidateCount: 0, feasible: [], infeasible: [], indeterminate: [] });
    const bucket = byCase.get(q.caseId);
    bucket.candidateCount++;
    const prefixJson = JSON.stringify(q.prefixXY);
    const result = spawnSync('python3', [
        'scripts/stress/cpsat-reference-probe.py', q.levelId, String(TIME_LIMIT),
        '--emit-path', `--corpus=${q.corpus}`, `--prefix=${prefixJson}`, `--pin-revisit=${JSON.stringify([q.cell])}`,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    if (classified.label === 'live') {
        const emitted = parseEmittedPath(result.stdout ?? '');
        let refereeValid = false;
        if (emitted) {
            const level = getLevel(q.corpus, q.levelId);
            const verdict = Solver.validateCandidatePath(level, emitted.map(pack));
            refereeValid = verdict.ok;
        }
        if (refereeValid) bucket.feasible.push(q.cell);
        else bucket.indeterminate.push({ cell: q.cell, reason: 'referee-rejected-claimed-live-witness' });
    } else if (classified.label === 'dead') {
        bucket.infeasible.push(q.cell);
    } else {
        bucket.indeterminate.push({ cell: q.cell, reason: 'cpsat-timeout-or-abstain' });
    }
    console.log(`${q.caseId} (${q.exactLabel}) pin-revisit ${JSON.stringify(q.cell)}: ${classified.label}`);
}

const results = [...byCase.values()];
const summary = {
    deadStatesWithZeroFeasibleCommitments: results.filter((r) => r.exactLabel === 'dead' && r.feasible.length === 0 && r.candidateCount > 0).length,
    deadStatesTotal: results.filter((r) => r.exactLabel === 'dead').length,
    liveStatesWithAtLeastOneFeasibleCommitment: results.filter((r) => r.exactLabel === 'live' && r.feasible.length > 0).length,
    liveStatesTotal: results.filter((r) => r.exactLabel === 'live').length,
    correctnessAlarms: results.reduce((a, r) => a + r.indeterminate.filter((i) => i.reason === 'referee-rejected-claimed-live-witness').length, 0),
    totalQueries: sharded.length,
};

const document = {
    schemaVersion: 1, kind: 'class5-multi-pick-intersection-commitment-realizability', generatedAt: new Date().toISOString(), solverRef,
    sourceLabels: LABELS_FILE, shardIndex: SHARD_INDEX, shardCount: SHARD_COUNT, timeLimit: TIME_LIMIT,
    selectionRule: 'same-parent LIVE/DEAD states with identical remaining-intersection-deficit AND remaining length, from the multi-pick exact-labelled population',
    summary, results,
};
console.log(JSON.stringify(summary, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`Wrote ${OUT_FILE}`);
}
