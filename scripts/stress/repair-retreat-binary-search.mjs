#!/usr/bin/env node
/** Drives the item-C binary search (exact minimum repair-retreat rollback) to convergence for a
 * fixed set of elites, using the same cpsat-full-probe.py oracle and native-prefix replay/referee
 * checks as cpsat-explicit-prefix-oracle.mjs/cpsat-explicit-prefix-round-builder.mjs — just without
 * a GitHub Actions round trip per probe. Monotonicity (a prefix that has no exact completion stays
 * infeasible for every deeper prefix along the same elite trajectory) is what makes bisection valid
 * here; see reports/2026-08-12-repair-retreat-cpsat.md for the argument. */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-oracle-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const dumpFile = args.get('--dump') ?? '/tmp/elite-paths.json';
const corpus = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
const timeLimit = Number(args.get('--time-limit') ?? 60);
const eliteIds = (args.get('--elites') ?? '').split(',').filter(Boolean);
const outFile = args.get('--out');
if (!eliteIds.length) throw new Error('--elites=id1,id2,... required');
if (!outFile) throw new Error('--out required');

const dump = JSON.parse(readFileSync(dumpFile, 'utf8'));
const eliteById = new Map();
for (const lvl of dump.levels) for (const e of lvl.elites) eliteById.set(e.id, { ...e, levelId: lvl.levelId, reqLen: lvl.reqLen });

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');
const levelCache = new Map();
const prepCache = new Map();
const loadRaw = (levelId) => {
    const doc = JSON.parse(readFileSync(corpus, 'utf8'));
    const levels = Array.isArray(doc) ? doc : doc.levels;
    const raw = levels.find(l => String(l.id) === String(levelId));
    if (!raw) throw new Error(`${levelId} not found in ${corpus}`);
    return raw;
};
const prepareReplay = (levelId) => {
    if (!levelCache.has(levelId)) levelCache.set(levelId, Solver.prepareLevelForSolver(loadRaw(levelId), { source: 'raw' }));
    const level = levelCache.get(levelId);
    if (!prepCache.has(levelId)) { const prep = api.prepLevel(level); prep._cfg = null; prepCache.set(levelId, prep); }
    return { level, prep: prepCache.get(levelId) };
};
const replayPrefix = (levelId, keys) => {
    const { level, prep } = prepareReplay(levelId);
    if (!prep.gateFlags[keys[0]]) return { ok: false, reason: 'prefix-does-not-start-at-gate' };
    const state = api.createState(keys[0], level, prep);
    for (let i = 1; i < keys.length; i++) {
        const from = state.path.at(-1), next = keys[i];
        if (!api.getNeighbors(from, state, level, prep).includes(next)) return { ok: false, reason: 'illegal-native-step', invalidAt: i, from, next };
        const portal = level.portalMap.get(from);
        api.applyMove(next, state, level, prep, !!(portal && portal.dest === next));
    }
    return { ok: true };
};

const probePath = 'scripts/stress/cpsat-full-probe.py';
// cpsat-full-probe.py's --prefix consumes raw 1-based [x,y] pairs (the witness/CLI convention),
// not internal packed solver keys — same conversion cpsat-explicit-prefix-oracle.mjs's packRaw does.
const unpackToRaw = key => [(key & 0xffff) + 1, (key >>> 16) + 1];
function oracleProbe(elite, depth) {
    const prefix = elite.path.slice(0, depth + 1);
    const legality = replayPrefix(elite.levelId, prefix);
    if (!legality.ok) throw new Error(`INVALID PREFIX ${elite.id} depth=${depth}: ${JSON.stringify(legality)}`);
    const prefixJson = JSON.stringify(prefix.map(unpackToRaw));
    const result = spawnSync('python3', [probePath, elite.levelId, String(timeLimit), '--emit-path', `--corpus=${corpus}`, `--prefix=${prefixJson}`], {
        encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    const row = { depth, prefix, oracleLabel: classified.label, oracleReason: classified.reason, cpSatStatus: classified.status ?? null };
    if (classified.label === 'live') {
        const emitted = parseEmittedPath(result.stdout ?? '');
        if (!emitted) { row.oracleLabel = 'timeout/abstain'; row.oracleReason = 'sat-without-emitted-path'; row.correctnessAlarm = true; }
        else {
            const packRaw = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));
            const { level } = prepareReplay(elite.levelId);
            const verdict = Solver.validateCandidatePath(level, emitted.map(packRaw));
            row.refereeValid = verdict.ok; row.refereeReason = verdict.ok ? null : verdict.reason; row.emittedPath = emitted;
            if (!verdict.ok) { row.oracleLabel = 'timeout/abstain'; row.oracleReason = 'sat-witness-referee-rejected'; row.correctnessAlarm = true; }
        }
    }
    return row;
}

const results = {};
for (const eliteId of eliteIds) {
    const elite = eliteById.get(eliteId);
    if (!elite) throw new Error(`unknown elite ${eliteId}`);
    const lo = elite.commonPrefixSteps - 1; // known-feasible depth, no oracle call needed
    let low = lo, high = elite.eliteLength;
    const trace = [];
    console.error(`\n=== ${eliteId} (levelId=${elite.levelId}, reqLen=${elite.reqLen}, eliteLength=${elite.eliteLength}, knownFeasibleDepth=${lo}) ===`);
    // Confirm the full elite length first.
    let probe = oracleProbe(elite, high);
    trace.push(probe);
    console.error(`  depth=${high} (full): ${probe.oracleLabel} (${probe.oracleReason})`);
    if (probe.oracleLabel === 'live') {
        results[eliteId] = { elite, low: high, high: null, trace, note: 'full elite length is itself CP-SAT feasible; no rollback needed beyond original stuck length' };
        continue;
    }
    if (probe.oracleLabel !== 'dead') {
        results[eliteId] = { elite, low, high, trace, note: `abstain at full length (${probe.oracleReason}); cannot bisect` };
        continue;
    }
    // Bisect.
    let abstained = false;
    while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        const r = oracleProbe(elite, mid);
        trace.push(r);
        console.error(`  depth=${mid}: ${r.oracleLabel} (${r.oracleReason})`);
        if (r.oracleLabel === 'live') low = mid;
        else if (r.oracleLabel === 'dead') high = mid;
        else { abstained = true; break; }
    }
    results[eliteId] = { elite, low, high, trace, abstained, note: abstained ? 'bisection hit an abstention before converging' : 'converged: low=max feasible depth, high=min infeasible depth (adjacent)' };
    console.error(`  => ${eliteId}: exact boundary low=${low} (feasible) high=${high} (infeasible)`);
}

writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), solverRef, corpus, timeLimit, results }, null, 2));
console.log(`\nWrote ${outFile}`);
