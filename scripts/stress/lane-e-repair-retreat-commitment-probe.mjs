#!/usr/bin/env node
/**
 * Lane E first bounded observer: dependency-defined causal revision, per
 * docs/solver-dependency-defined-revision-preflight.md. "Which earlier commitment made this later
 * state unrecoverable, and can that commitment be revised without discarding unrelated useful
 * structure?" -- tested via matched exact-labelled dead/rescuable pairs, per the preflight's own
 * "use already exact-labelled repair-retreat/LIVE-DEAD cases before generating new data."
 *
 * This reopens H3 (reports/2026-09-17-h3-repair-commitment-interface-result-001.md, closed
 * negative on Card-E's 156-row PROXY-labelled population) on a materially different, EXACT
 * CP-SAT-labelled population (B2), per H3's own reopensOn clause ("a different repair-retreat
 * population (not Card-E's)"). Unlike H3's cross-sectional feature-correlation design, this uses a
 * within-trajectory bisection: for each B2 dead state that shares a literal common prefix with a
 * same-parent LIVE sibling (same board, identical cells up to the divergence index), CP-SAT
 * bisection (reusing scripts/stress/repair-retreat-binary-search.mjs's already-tested monotone
 * --prefix technique) finds the EXACT index along the dead trajectory's own continuation where
 * feasibility flips from LIVE to DEAD -- the true "point of no return" -- rather than assuming the
 * naive first-divergence-from-a-sibling point is itself causal.
 *
 * Population: the same 28-state/14-parent B2 set used throughout Lane D
 * (reports/stress/h1-event-feasibility-queries-2026-09-16.json). Only same-parent dead/live pairs
 * with a common prefix >= MIN_COMMON_PREFIX qualify (a short/zero common prefix gives no
 * meaningful "how much later than naive divergence" question to ask).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/lane-e-repair-retreat-commitment-probe.mjs -- \
 *     --corpus=data/stress/stress-levels.json --b2=reports/stress/h1-event-feasibility-queries-2026-09-16.json \
 *     --min-common-prefix=8 --time-limit=120 \
 *     --out=reports/stress/lane-e-repair-retreat-commitment-probe-2026-09-17.json
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels.json');
const B2_FILE = arg('b2', 'reports/stress/h1-event-feasibility-queries-2026-09-16.json');
const MIN_COMMON_PREFIX = Number(arg('min-common-prefix', 8));
const TIME_LIMIT = Number(arg('time-limit', 120));
const OUT_FILE = arg('out', null);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const pack = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));
const unpackToRaw = (key) => [(key & 0xffff) + 1, (key >>> 16) + 1];

function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i][0] === b[i][0] && a[i][1] === b[i][1]) i++;
    return i;
}

const b2 = JSON.parse(readFileSync(path.resolve(ROOT, B2_FILE), 'utf8'));
const byParent = new Map();
for (const s of b2.states) {
    if (!byParent.has(s.levelId)) byParent.set(s.levelId, []);
    byParent.get(s.levelId).push(s);
}

/** One dead trajectory can pair with multiple live siblings; only the DEAD state needs bisecting
 * once, using the deepest (tightest) known-feasible common-prefix depth across all its live
 * siblings as the bisection's starting lower bound. */
const candidates = [];
for (const [levelId, states] of byParent) {
    const dead = states.filter((s) => s.exactLabel === 'dead');
    const live = states.filter((s) => s.exactLabel === 'live');
    for (const d of dead) {
        const divergences = live.map((l) => ({ role: l.role, commonPrefix: commonPrefixLen(d.prefixXY, l.prefixXY) }))
            .filter((x) => x.commonPrefix >= MIN_COMMON_PREFIX);
        if (divergences.length) candidates.push({ levelId, role: d.role, state: d, divergences, knownFeasibleDepth: Math.max(...divergences.map((x) => x.commonPrefix)) - 1 });
    }
}

const rawLevels = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const levelList = Array.isArray(rawLevels) ? rawLevels : rawLevels.levels;
const levelCache = new Map();
function prepareReplay(levelId) {
    if (!levelCache.has(levelId)) {
        const raw = levelList.find((l) => String(l.id) === String(levelId));
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const prep = api.prepLevel(level);
        prep._cfg = null;
        levelCache.set(levelId, { level, prep });
    }
    return levelCache.get(levelId);
}

function referenceProbe(levelId, path, depth) {
    const prefix = path.slice(0, depth + 1);
    const prefixJson = JSON.stringify(prefix.map(unpackToRaw));
    const result = spawnSync('python3', [
        'scripts/stress/cpsat-reference-probe.py', levelId, String(TIME_LIMIT),
        '--emit-path', `--corpus=${CORPUS_FILE}`, `--prefix=${prefixJson}`,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    const row = { depth, referenceLabel: classified.label, referenceReason: classified.reason };
    if (classified.label === 'live') {
        const emitted = parseEmittedPath(result.stdout ?? '');
        if (!emitted) { row.referenceLabel = 'timeout/abstain'; row.referenceReason = 'sat-without-emitted-path'; row.correctnessAlarm = true; }
        else {
            const { level } = prepareReplay(levelId);
            const verdict = Solver.validateCandidatePath(level, emitted.map(pack));
            if (!verdict.ok) { row.referenceLabel = 'timeout/abstain'; row.referenceReason = 'sat-witness-referee-rejected'; row.correctnessAlarm = true; }
        }
    }
    return row;
}

/** Classify the commitment family of the move landing on path[idx] (the same obligation-tagging
 * approach used by Lane D3's commutativity observer -- mustPass/mustCross/portal-jump/revisit --
 * plus "plain" for a move that touches none of them). */
function classifyMove(levelId, path, idx) {
    const { level, prep } = prepareReplay(levelId);
    const mustPass = new Set(level.mustPassKeys);
    const mustCross = new Set(level.mustCrossKeys);
    const state = api.createState(path[0], level, prep);
    let wasVisitedBefore = false, isJump = false;
    for (let i = 1; i <= idx; i++) {
        const prev = path[i - 1];
        const pAtPrev = level.portalMap.get(prev);
        const jump = !!(pAtPrev && !state.lastWasPortalJump && pAtPrev.dest === path[i]);
        if (i === idx) { wasVisitedBefore = state.visited[path[i]] > 0; isJump = jump; }
        api.applyMove(path[i], state, level, prep, jump);
    }
    const cell = path[idx];
    const family = mustPass.has(cell) ? 'mustPass' : mustCross.has(cell) ? 'mustCross' : isJump ? 'portalJump' : wasVisitedBefore ? 'revisit/intersection' : 'plain';
    return { family, intsAfterMove: state.ints, requiredLength: level.requiredLength, requiredIntersections: level.requiredIntersections };
}

const results = [];
for (const c of candidates) {
    const path = c.state.prefixXY.map(pack);
    const eliteLength = path.length - 1;
    console.log(`\n=== ${c.levelId}:${c.role} (knownFeasibleDepth=${c.knownFeasibleDepth}, eliteLength=${eliteLength}, divergences=${JSON.stringify(c.divergences)}) ===`);

    let low = c.knownFeasibleDepth, high = eliteLength;
    const full = referenceProbe(c.levelId, path, high);
    console.log(`  depth=${high} (full): ${full.referenceLabel} (${full.referenceReason})`);
    if (full.referenceLabel === 'live') {
        results.push({ levelId: c.levelId, role: c.role, note: 'full dead-labelled trajectory is itself CP-SAT feasible -- correctness alarm', correctnessAlarm: true });
        continue;
    }
    if (full.referenceLabel !== 'dead') {
        results.push({ levelId: c.levelId, role: c.role, note: `abstain at full length (${full.referenceReason}); cannot bisect` });
        continue;
    }
    let abstained = false;
    while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        const r = referenceProbe(c.levelId, path, mid);
        console.log(`  depth=${mid}: ${r.referenceLabel} (${r.referenceReason})`);
        if (r.referenceLabel === 'live') low = mid;
        else if (r.referenceLabel === 'dead') high = mid;
        else { abstained = true; break; }
    }
    if (abstained) { results.push({ levelId: c.levelId, role: c.role, note: 'bisection hit an abstention before converging' }); continue; }

    const criticalMove = classifyMove(c.levelId, path, high);
    const naiveDivergence = Math.max(...c.divergences.map((x) => x.commonPrefix));
    console.log(`  => point of no return: low=${low} (feasible) high=${high} (infeasible); naive first divergence=${naiveDivergence}; rope=${high - naiveDivergence} moves; critical move family=${criticalMove.family}`);

    results.push({
        levelId: c.levelId, role: c.role, eliteLength,
        naiveFirstDivergence: naiveDivergence, divergences: c.divergences,
        pointOfNoReturn: { feasibleDepth: low, infeasibleDepth: high },
        ropeBeyondNaiveDivergence: high - naiveDivergence,
        rollbackDistanceFromEnd: eliteLength - high,
        criticalMove,
    });
}

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane E first bounded observer -- dependency-defined causal revision, within-trajectory CP-SAT bisection for the exact point of no return',
    corpus: CORPUS_FILE, b2Source: B2_FILE, minCommonPrefix: MIN_COMMON_PREFIX, timeLimit: TIME_LIMIT, solverRef,
    method: 'reuses scripts/stress/repair-retreat-binary-search.mjs\'s monotone --prefix CP-SAT bisection technique (reports/2026-08-12-repair-retreat-cpsat.md) against B2\'s exact-labelled dead states that share a literal common prefix with a same-parent live sibling',
    candidateCount: candidates.length,
    results,
};
console.log('\nSummary:', JSON.stringify(summary.results, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
