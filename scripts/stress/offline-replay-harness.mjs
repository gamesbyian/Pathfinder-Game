#!/usr/bin/env node
/**
 * Shared evaluation harness for "middle-layer" solver reasoners. The current contract is
 * docs/solver-offline-replay-harness.md; historical prototype context is frozen under
 * docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md. Every candidate reasoner
 * runs against the SAME labelled states and is scored on the SAME telemetry, instead of each
 * probe script growing its own bespoke comparison harness (the pattern axis-reach-probe.mjs /
 * backward-exact-probe.mjs / pocket-bridge-probe.mjs had each independently repeated).
 *
 * DATA SOURCE. Consumes the labelled branch set ALREADY produced by
 * scripts/stress/prune-gap-probe.mjs (reports/stress/prune-gap-*.json — 16 levels / ~623
 * CP-SAT-labelled branches as of 2026-08-05, see that script's own doc for the oracle-labelling
 * method). No new CP-SAT calls here: replays each labelled branch through the real solver-state
 * primitives (same getNeighbors/applyMove/undoMove a live search would use) to reconstruct the
 * exact SolverSearchState at that decision point, cheaply, in-process. This is what makes the
 * harness itself fast — the expensive oracle-labelling step already happened once, upstream, and
 * its answer is reused for every probe this harness will ever be asked to score.
 *
 * PROBE CONTRACT. A probe module exports:
 *   export const name = '<short id>';
 *   export const soundnessClass = '<class, e.g. "sound prune">';
 *   export function evaluate({ level, prep, state, pos }) -> {
 *     verdict: 'reject' | 'pass',
 *     abstained?: boolean,   // true = "couldn't decide", counted separately from a real 'pass'
 *     ...any extra explanation fields for the report
 *   }
 * `state` is positioned AT `pos` (the alt move already applied) — mirrors exactly how
 * evaluatePrunedMove itself is invoked (hard-prune-pipeline.ts), so a probe reads state the same way the
 * real gauntlet would.
 *
 * TELEMETRY. Per probe: catch-on-dead, false-reject-on-live (must be zero to claim "sound"),
 * unique catch beyond the existing gauntlet's own verdict (branch.pruned), overlap with the
 * existing gauntlet, abstain rate, and per-branch depth (branch.step) so catches can be weighted by
 * how early they fire. Deliberately NOT reduced to one leaderboard number; see
 * docs/solver-offline-replay-harness.md.
 *
 * PERSISTENCE. Writes --out after EVERY prune-gap file, following scripts/README.md's rule that long
 * batch tools persist recoverable progress incrementally.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/offline-replay-harness.mjs -- \
 *     --prune-gap-dir=reports/stress --probes=scripts/stress/probes/separator-resource-probe.mjs \
 *     --out=reports/stress/interface-probe-harness-results.json
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { undoMove } from '../../modules/solver/search-state.ts';
import { PROBE_REGISTRY } from './probes/index.mjs';

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    return d;
})();
const CORPUS = path.join(root, 'data/stress/stress-levels-random.json');

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const PRUNE_GAP_DIR = arg('prune-gap-dir', 'reports/stress');
const PROBE_NAMES = (arg('probes', [...PROBE_REGISTRY.keys()].join(','))).split(',').map(s => s.trim()).filter(Boolean);
const OUT_FILE = arg('out', null);

const probes = PROBE_NAMES.map((n) => {
    const mod = PROBE_REGISTRY.get(n);
    if (!mod) throw new Error(`--probes: unknown probe "${n}". Known: ${[...PROBE_REGISTRY.keys()].join(', ')} (see scripts/stress/probes/index.mjs)`);
    return { name: mod.name, soundnessClass: mod.soundnessClass || 'UNLABELLED — fix the probe module', evaluate: mod.evaluate };
});
console.log(`interface-probe-harness: ${probes.length} probe(s): ${probes.map(p => p.name).join(', ')}`);

const pruneGapFiles = readdirSync(path.resolve(root, PRUNE_GAP_DIR)).filter(f => /^prune-gap-.*\.json$/.test(f));
if (pruneGapFiles.length === 0) { console.error(`No prune-gap-*.json files found under ${PRUNE_GAP_DIR}.`); process.exit(1); }

const packXY = ([x, y]) => (((y - 1) << 16) | (x - 1)) >>> 0;
const corpusLevels = readLevelsWithHints(CORPUS);

function freshTally() {
    return { deadCaught: 0, deadMissed: 0, aliveFalseReject: 0, aliveOk: 0, abstained: 0, uniqueCatch: 0, overlapWithGauntlet: 0, total: 0 };
}

const perProbe = new Map(probes.map(p => [p.name, { tally: freshTally(), falseRejects: [], catchesByDepth: [] }]));
const results = { pruneGapDir: PRUNE_GAP_DIR, probes: probes.map(p => ({ name: p.name, soundnessClass: p.soundnessClass })), perFile: [], summary: null };

function persist() {
    if (!OUT_FILE) return;
    const abs = path.resolve(root, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    results.summary = summarize();
    writeFileSync(abs, JSON.stringify(results, null, 1));
}

function summarize() {
    const out = {};
    for (const [probeName, { tally, catchesByDepth }] of perProbe) {
        const dead = tally.deadCaught + tally.deadMissed;
        const alive = tally.aliveFalseReject + tally.aliveOk;
        out[probeName] = {
            ...tally,
            dead, alive,
            deadCatchRate: dead ? tally.deadCaught / dead : null,
            soundnessViolated: tally.aliveFalseReject > 0,
            meanCatchDepth: catchesByDepth.length ? catchesByDepth.reduce((a, b) => a + b, 0) / catchesByDepth.length : null,
        };
    }
    return out;
}

for (const file of pruneGapFiles.sort()) {
    const atlas = JSON.parse(readFileSync(path.resolve(root, PRUNE_GAP_DIR, file), 'utf8'));
    const levelId = atlas.level;
    const idx = corpusLevels.findIndex(l => l.id === levelId);
    if (idx < 0) { console.warn(`${file}: level ${levelId} not found in corpus, skipping.`); continue; }
    const raw = corpusLevels[idx];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: idx + 1 });
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const solution = (raw.hintRecords || [])[0]?.path;
    if (!solution) { console.warn(`${file}: ${levelId} has no stored hint to replay, skipping.`); continue; }

    const state = createState(solution[0], level, prep);
    const branchesByStep = new Map();
    for (const b of atlas.branches || []) {
        if (!branchesByStep.has(b.step)) branchesByStep.set(b.step, []);
        branchesByStep.get(b.step).push(b);
    }

    let fileEvaluated = 0;
    for (let step = 1; step < solution.length; step++) {
        const pos = solution[step - 1];
        const branchesHere = branchesByStep.get(step) || [];
        for (const branch of branchesHere) {
            const altKey = packXY(branch.alt);
            const pAtPos = level.portalMap.get(pos);
            const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === altKey);
            const undo = applyMove(altKey, state, level, prep, isJump);
            for (const probe of probes) {
                const verdict = probe.evaluate({ level, prep, state, pos: altKey });
                const t = perProbe.get(probe.name);
                t.tally.total++;
                if (verdict.abstained) { t.tally.abstained++; continue; }
                const rejected = verdict.verdict === 'reject';
                if (branch.dead) {
                    if (rejected) {
                        t.tally.deadCaught++;
                        t.catchesByDepth.push(branch.step);
                        if (branch.pruned) t.tally.overlapWithGauntlet++; else t.tally.uniqueCatch++;
                    } else {
                        t.tally.deadMissed++;
                    }
                } else {
                    if (rejected) { t.tally.aliveFalseReject++; t.falseRejects.push({ level: levelId, step: branch.step, alt: branch.alt, explanation: verdict.reason }); }
                    else t.tally.aliveOk++;
                }
            }
            undoMove(undo, state);
            fileEvaluated++;
        }
        const pAtPos = level.portalMap.get(pos);
        applyMove(solution[step], state, level, prep, !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === solution[step]));
    }

    results.perFile.push({ file, level: levelId, branchesEvaluated: fileEvaluated });
    console.log(`  ${file}: ${fileEvaluated} branch(es) replayed`);
    persist();
}

console.log('\ninterface-probe-harness summary:');
for (const [probeName, s] of Object.entries(summarize())) {
    console.log(`  ${probeName} (${probes.find(p => p.name === probeName).soundnessClass}):`);
    console.log(`    dead: ${s.deadCaught}/${s.dead} caught (${s.deadCatchRate !== null ? (100 * s.deadCatchRate).toFixed(1) + '%' : 'n/a'}), unique beyond gauntlet: ${s.uniqueCatch}, overlap: ${s.overlapWithGauntlet}`);
    console.log(`    alive: ${s.aliveOk}/${s.alive} correctly passed, FALSE REJECTS: ${s.aliveFalseReject}${s.soundnessViolated ? '  !! SOUNDNESS VIOLATED !!' : ''}`);
    console.log(`    abstained: ${s.abstained}/${s.total}`);
}
persist();
if (OUT_FILE) console.log(`\nWrote ${OUT_FILE}`);

const anyUnsound = [...perProbe.values()].some(p => p.tally.aliveFalseReject > 0);
if (anyUnsound) {
    console.error('\n!! At least one probe produced a false reject on a live branch — see falseRejects in the output for details.');
    process.exitCode = 1;
}