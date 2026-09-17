#!/usr/bin/env node
/**
 * DEAD-core relaxation on the multi-pick population (see docs/solver-fresh-dead-sibling-harvest-
 * preflight.md's "First consumer: DEAD-core confirmation"), run on the cleanest matched population
 * this investigation has produced: reports/stress/class5-production-search-frontier-multi-pick-
 * exact-labels-2026-09-17.json -- 2 exact-LIVE and 23 exact-DEAD siblings, ALL drawn from the SAME
 * real production beam-search frontier at the SAME depth (R01600/R03147, depth-fraction 0.1),
 * rather than post-hoc scalar-matched siblings the way the exhausted B2 population was.
 *
 * For each exact-DEAD state, relaxes exactly ONE pending must-cross/must-pass commitment at a time
 * via cpsat-reference-probe.py's existing --relax hook (same size-1 causal-core test the B2 pilot
 * and the fresh-harvest pilot both used -- no new relaxation machinery). Pending obligations are
 * recovered by replaying each case's own prefix with the real createState/applyMove primitives
 * (this population's exact-labels file carries the full raw-XY prefix already; no separate harvest-
 * metadata join is needed, unlike class5-fresh-dead-core-relaxation.mjs's B2/naive-harvest form).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-multi-pick-dead-core-relaxation.mjs -- \
 *     --labels=reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json \
 *     --time-limit=45 --out=reports/stress/class5-multi-pick-dead-core-relaxation-2026-09-17.json
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
const SHARD_INDEX = Number(arg('shard-index', 1));
const SHARD_COUNT = Number(arg('shard-count', 1));
const OUT_FILE = arg('out', null);
const LEVEL_FILTER = arg('levels', null) ? new Set(arg('levels', null).split(',')) : null;

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const readJson = (f) => JSON.parse(readFileSync(path.resolve(ROOT, f), 'utf8'));
const labelsDoc = readJson(LABELS_FILE);
const inFilter = (r) => !LEVEL_FILTER || LEVEL_FILTER.has(r.levelId);
const deadRows = labelsDoc.rows.filter((r) => r.referenceLabel === 'dead' && inFilter(r));
const liveRows = labelsDoc.rows.filter((r) => r.referenceLabel === 'live' && inFilter(r));

const corpusCache = new Map();
function getRawLevel(corpus, levelId) {
    if (!corpusCache.has(corpus)) {
        const doc = JSON.parse(readFileSync(path.resolve(ROOT, corpus), 'utf8'));
        const rows = Array.isArray(doc) ? doc : doc.levels;
        corpusCache.set(corpus, new Map(rows.map((r) => [String(r.id), r])));
    }
    return corpusCache.get(corpus).get(String(levelId));
}
function prepareLevel(corpus, levelId) {
    const raw = getRawLevel(corpus, levelId);
    const { id: _id, stressMeta: _sm, ...rawLevel } = raw;
    return Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
}

function packCell([x, y]) { return ((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16); }
function unpackToXY(key) { return [(key & 0xffff) + 1, (key >>> 16) + 1]; }

function pendingObligationsXY(level, prefixXY) {
    const prefix = prefixXY.map(packCell);
    const prep = prepLevel(level);
    prep._cfg = null;
    const state = createState(prefix[0], level, prep);
    for (let i = 1; i < prefix.length; i++) {
        const prev = prefix[i - 1];
        const portal = level.portalMap.get(prev);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === prefix[i]);
        applyMove(prefix[i], state, level, prep, isJump);
    }
    const mustCrossXY = [];
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask >> i) & 1) mustCrossXY.push(unpackToXY(level.mustCrossKeys[i]));
    }
    const mustPassXY = [];
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!((state.mpVisitedMask >> i) & 1)) mustPassXY.push(unpackToXY(level.mustPassKeys[i]));
    }
    return { mustCrossXY, mustPassXY };
}

// Build one relax query per pending commitment per DEAD case.
const cases = [];
for (const row of deadRows) {
    const level = prepareLevel(row.corpus, row.levelId);
    const { mustCrossXY, mustPassXY } = pendingObligationsXY(level, row.prefix);
    for (const cell of mustCrossXY) cases.push({ caseId: row.caseId, levelId: row.levelId, corpus: row.corpus, prefixXY: row.prefix, commitment: 'mustCross', cell, relax: { mustCross: [cell] } });
    for (const cell of mustPassXY) cases.push({ caseId: row.caseId, levelId: row.levelId, corpus: row.corpus, prefixXY: row.prefix, commitment: 'mustPass', cell, relax: { mustPass: [cell] } });
}
const sharded = cases.filter((_, i) => i % SHARD_COUNT === SHARD_INDEX - 1);
console.log(`Multi-pick DEAD-core relaxation shard ${SHARD_INDEX}/${SHARD_COUNT}: ${sharded.length}/${cases.length} single-commitment queries across ${deadRows.length} DEAD states (${liveRows.length} LIVE siblings held out for the specificity check).`);
if (arg('count-only', null)) process.exit(0);

const rows = [];
for (const item of sharded) {
    const prefixJson = JSON.stringify(item.prefixXY);
    const result = spawnSync('python3', [
        'scripts/stress/cpsat-reference-probe.py', item.levelId, String(TIME_LIMIT),
        '--emit-path', `--corpus=${item.corpus}`, `--prefix=${prefixJson}`, `--relax=${JSON.stringify(item.relax)}`,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    const row = {
        caseId: item.caseId, levelId: item.levelId, commitment: item.commitment, cell: item.cell,
        cpSatStatus: classified.status ?? null, causesFlipToFeasible: classified.label === 'live',
        timeLimitSec: TIME_LIMIT, exitCode,
    };
    if (classified.label === 'live') {
        const emitted = parseEmittedPath(result.stdout ?? '');
        if (!emitted) { row.emittedPathMissing = true; }
        else {
            const level = prepareLevel(item.corpus, item.levelId);
            const verdict = Solver.validateCandidatePath(level, emitted.map(packCell));
            row.refereeValid = verdict.ok;
            if (verdict.ok) row.correctnessAlarm = true;
        }
    } else if (classified.label !== 'dead') {
        row.indeterminate = true;
    }
    rows.push(row);
    console.log(`${item.caseId} relax(${item.commitment} ${JSON.stringify(item.cell)}): cpSatStatus=${row.cpSatStatus}${row.causesFlipToFeasible ? ' (CAUSAL: flips to feasible)' : ''}`);
}

const summary = {
    total: rows.length,
    distinctDeadStatesTested: new Set(sharded.map((c) => c.caseId)).size,
    flippedToLive: rows.filter((r) => r.causesFlipToFeasible === true).length,
    stayedDead: rows.filter((r) => r.causesFlipToFeasible === false).length,
    indeterminate: rows.filter((r) => r.indeterminate).length,
    correctnessAlarms: rows.filter((r) => r.correctnessAlarm).length,
    statesWithAnySize1Core: new Set(rows.filter((r) => r.causesFlipToFeasible).map((r) => r.caseId)).size,
};

const document = {
    schemaVersion: 1, kind: 'class5-multi-pick-dead-core-relaxation', generatedAt: new Date().toISOString(), solverRef,
    sourceLabels: LABELS_FILE, shardIndex: SHARD_INDEX, shardCount: SHARD_COUNT, timeLimit: TIME_LIMIT,
    liveHoldout: liveRows.map((r) => ({ caseId: r.caseId, levelId: r.levelId })),
    summary, rows,
};
console.log(JSON.stringify(summary, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`Wrote ${OUT_FILE}`);
}
