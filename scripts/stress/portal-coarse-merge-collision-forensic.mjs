#!/usr/bin/env node
/**
 * Gate-2 forensic (docs/solver-optimization-workstreams.md, docs/solver-opt-in-experiment-ledger.md
 * STRATEGY_PORTAL_COARSE_STATE_MERGE): reproduce one level's exact control-winning attempt under the
 * SAME must-cross-neighbor-prune-disabled-retry ablation the orchestration ladder actually uses
 * (`PRUNE_MC_NEIGHBOR_BUDGET: false`, via the same `buildRetryTierAblationOverride` proxy
 * `runWholeLadderRetryTier` installs), once with the portal coarse-state merge off (control) and
 * once with it on (treatment), using the existing beam research observer already wired into
 * `search.ts` (`coarse-state-merge-removed`). No new instrumentation.
 *
 * For the treatment run, finds the earliest coarse-merge collision after which the known control
 * solution's live prefix is no longer present among any surviving candidate, then reconstructs full
 * `SolverSearchState` for the removed and kept paths and diffs exactly the fields the coarse key
 * omits (visited-cell identity, edgeUsage, crossCounts, portalJumps/lastWasPortalJump,
 * surroundNeighborRemainingMasks) — the same first-diff method
 * `2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md` specifies.
 *
 * Usage (bundled; the beam search primitives are TypeScript):
 *   node scripts/run-bundled.mjs scripts/stress/portal-coarse-merge-collision-forensic.mjs -- \
 *     --level=R01273 --gate=524296 --profile=objectiveFirst --bias=none --width=5000 \
 *     --mechanic-buckets=true --node-budget=2000000 --corpus=corpus2 [--out=<file>]
 *
 * The default gate/profile/width/mechanic-buckets values are R01273's own recorded control winner
 * (data/stress/hints-random/R01273.json, forcing.retryTier=must-cross-neighbor-prune-disabled-retry,
 * nodesExpanded=404434) so a bare `--level=R01273` run reproduces it without extra flags.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');
const { beamSearchFromGate } = await import('../../modules/solver/search.js');
const { SCORING_PROFILES } = await import('../../modules/solver/policy.js');
const { buildRetryTierAblationOverride } = await import('../../modules/solver/stage-executors.js');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();

const CORPORA = {
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
    published: 'data/levels.json',
};

const LEVEL_ID = args.get('--level') || 'R01273';
const CORPUS = args.get('--corpus') || 'corpus2';
const GATE = args.has('--gate') ? Number(args.get('--gate')) : 524296;
const PROFILE = args.get('--profile') || 'objectiveFirst';
const BIAS = (args.get('--bias') || 'none') === 'none' ? null : args.get('--bias');
const WIDTH = args.has('--width') ? Number(args.get('--width')) : 5000;
const MECHANIC_BUCKETS = (args.get('--mechanic-buckets') ?? 'true') === 'true';
const NODE_BUDGET = Number(args.get('--node-budget') || 2_000_000);
const TIME_BUDGET_MS = 120_000;
const OUT = args.get('--out') || null;

const rawFile = JSON.parse(readFileSync(path.join(root, CORPORA[CORPUS]), 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;
const raw = rawLevels.find(l => l.id === LEVEL_ID);
if (!raw) throw new Error(`${LEVEL_ID} not found in ${CORPUS}`);

const level = normalizeRawLevel(raw);
const profile = SCORING_PROFILES[PROFILE];
if (!profile) throw new Error(`Unknown scoring profile ${PROFILE}`);

/** Replay a reconstructed candidate path from the gate through real search-state primitives. */
function replayPath(pathKeys) {
    const state = createState(pathKeys[0], level, prep);
    for (let i = 1; i < pathKeys.length; i++) {
        const from = pathKeys[i - 1], to = pathKeys[i];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === to);
        applyMove(to, state, level, prep, isJump);
    }
    return state;
}

function stateSnapshot(state) {
    return {
        path: [...state.path],
        visited: [...state.visited].map((v, i) => [i, v]).filter(([, v]) => v > 0),
        edgeUsage: [...state.edgeUsage].map((v, i) => [i, v]).filter(([, v]) => v > 0),
        crossCounts: [...state.crossCounts].map((v, i) => [i, v]).filter(([, v]) => v > 0),
        portalJumps: state.portalJumps,
        lastWasPortalJump: state.lastWasPortalJump,
        surroundNeighborRemainingMasks: [...state.surroundNeighborRemainingMasks].map((v, i) => [i, v]).filter(([, v]) => v !== 0),
        // coarse-key fields, included for cross-check only (should match by construction)
        ints: state.ints, mpVisitedMask: state.mpVisitedMask, mustCrossMask: state.mustCrossMask,
        flipperUsedMask: state.flipperUsedMask, surroundMask: state.surroundMask,
        mustTurnMask: state.mustTurnMask, adjTurnMask: state.adjTurnMask,
    };
}

function diffOmittedState(removedSnap, keptSnap) {
    const diff = {};
    if (JSON.stringify(removedSnap.visited) !== JSON.stringify(keptSnap.visited))
        diff.visited = { removed: removedSnap.visited, kept: keptSnap.visited };
    if (JSON.stringify(removedSnap.edgeUsage) !== JSON.stringify(keptSnap.edgeUsage))
        diff.edgeUsage = { removed: removedSnap.edgeUsage, kept: keptSnap.edgeUsage };
    if (JSON.stringify(removedSnap.crossCounts) !== JSON.stringify(keptSnap.crossCounts))
        diff.crossCounts = { removed: removedSnap.crossCounts, kept: keptSnap.crossCounts };
    if (removedSnap.portalJumps !== keptSnap.portalJumps)
        diff.portalJumps = { removed: removedSnap.portalJumps, kept: keptSnap.portalJumps };
    if (removedSnap.lastWasPortalJump !== keptSnap.lastWasPortalJump)
        diff.lastWasPortalJump = { removed: removedSnap.lastWasPortalJump, kept: keptSnap.lastWasPortalJump };
    if (JSON.stringify(removedSnap.surroundNeighborRemainingMasks) !== JSON.stringify(keptSnap.surroundNeighborRemainingMasks))
        diff.surroundNeighborRemainingMasks = { removed: removedSnap.surroundNeighborRemainingMasks, kept: keptSnap.surroundNeighborRemainingMasks };
    // Sanity: coarse-key fields must match (that's WHY they collided).
    for (const f of ['ints', 'mpVisitedMask', 'mustCrossMask', 'flipperUsedMask', 'surroundMask', 'mustTurnMask', 'adjTurnMask']) {
        if (removedSnap[f] !== keptSnap[f]) diff[`UNEXPECTED_KEY_MISMATCH_${f}`] = { removed: removedSnap[f], kept: keptSnap[f] };
    }
    return diff;
}

let prep = prepLevel(level);
prep._metrics = { nodesExpanded: 0 };

// --- control: PRUNE_MC_NEIGHBOR_BUDGET disabled (matches the retry tier), merge off (default) ---
prep._cfg = buildRetryTierAblationOverride(null, { PRUNE_MC_NEIGHBOR_BUDGET: false });
prep._beamResearchObserver = null;
const controlOut = {};
const controlSolution = await beamSearchFromGate(GATE, level, prep, profile, TIME_BUDGET_MS, Date.now(),
    BIAS, WIDTH, null, MECHANIC_BUCKETS, controlOut, NODE_BUDGET);
const controlNodes = prep._metrics.nodesExpanded;
console.log(`CONTROL: ${controlSolution ? 'SOLVED' : 'FAILED'} at ${controlNodes} nodes` +
    (controlSolution ? ` (path length ${controlSolution.length})` : ''));
if (!controlSolution) {
    console.error('Control did not solve with the given attempt parameters; cannot proceed. Check --gate/--profile/--width/--mechanic-buckets against the level\'s own hint provenance.');
    process.exit(2);
}

// --- treatment: same ablation PLUS portal coarse-state merge enabled ---
// Coarse-merge "removed" alone does not mean dead: near-tie retention (COARSE_STATE_NEAR_TIE_
// RETENTION_MARGIN) or mechanic-bucket selection can re-admit or re-cull a candidate at later
// stages of the SAME phase. The true death point is the first depth at which the control
// solution's own prefix was actually generated this phase (present in 'post-hard-prune') but is
// absent from the phase's FINAL frontier ('post-mechanic-bucket-selection' or
// 'post-score-width-cull', whichever this attempt's retention mode uses) — i.e. the first point
// after which the known-live continuation is no longer carried into the next phase at all,
// regardless of which specific step (merge, near-tie eviction, or width/bucket cull) did it.
prep = prepLevel(level);
prep._metrics = { nodesExpanded: 0 };
prep._cfg = buildRetryTierAblationOverride(null, { PRUNE_MC_NEIGHBOR_BUDGET: false, STRATEGY_PORTAL_COARSE_STATE_MERGE: true });
const removalEvents = [];
const generatedAtDepth = new Map(); // depth -> Set(full path string)
const frontierAtDepth = new Map(); // depth -> Set(full path string)
prep._beamResearchObserver = {
    observe(record) {
        if (record.stage === 'coarse-state-merge-removed') {
            const removals = record.details?.removals ?? [];
            for (const r of removals) removalEvents.push({ depth: record.depth, work: record.work, ...r });
            return;
        }
        if (record.stage === 'post-hard-prune') {
            generatedAtDepth.set(record.depth, new Set((record.paths ?? []).map(p => p.join(','))));
            return;
        }
        if (record.stage === 'post-mechanic-bucket-selection' || record.stage === 'post-score-width-cull') {
            frontierAtDepth.set(record.depth, new Set((record.paths ?? []).map(p => p.join(','))));
        }
    },
};
const treatmentOut = {};
const treatmentSolution = await beamSearchFromGate(GATE, level, prep, profile, TIME_BUDGET_MS, Date.now(),
    BIAS, WIDTH, null, MECHANIC_BUCKETS, treatmentOut, NODE_BUDGET);
const treatmentNodes = prep._metrics.nodesExpanded;
console.log(`TREATMENT: ${treatmentSolution ? 'SOLVED' : 'FAILED'} at ${treatmentNodes} nodes, ${removalEvents.length} coarse-merge removal event(s) observed`);

if (treatmentSolution) {
    console.log('Treatment solved too under this exact attempt reproduction; no regression to diagnose here (the loss may come from a different attempt/stage for this level).');
    if (OUT) writeFileSync(path.join(root, OUT), JSON.stringify({ level: LEVEL_ID, controlNodes, treatmentNodes, treatmentSolved: true }, null, 2));
    process.exit(0);
}

// --- find the earliest depth after which the control solution's live prefix leaves the frontier --
const solutionPrefixAtDepth = depth => controlSolution.slice(0, depth + 1).join(',');
let deathDepth = null;
for (let depth = 1; depth < controlSolution.length; depth++) {
    const liveStr = solutionPrefixAtDepth(depth);
    const generated = generatedAtDepth.get(depth);
    const frontier = frontierAtDepth.get(depth);
    if (!generated || !generated.has(liveStr)) break; // parent already died at an earlier depth (should not happen if loop is sequential and earlier depths all confirmed live)
    if (!frontier || !frontier.has(liveStr)) { deathDepth = depth; break; }
}

if (deathDepth == null) {
    console.log('The control solution\'s own prefix was never observed to leave the frontier at any tracked depth (it may die at a depth this run did not reach before the node budget/solve, or observer stage coverage missed a step). Dumping stage coverage for manual inspection.');
    console.log(`generatedAtDepth keys: ${[...generatedAtDepth.keys()].sort((a, b) => a - b).join(',')}`);
    console.log(`frontierAtDepth keys: ${[...frontierAtDepth.keys()].sort((a, b) => a - b).join(',')}`);
    if (OUT) writeFileSync(path.join(root, OUT), JSON.stringify({ level: LEVEL_ID, controlNodes, treatmentNodes, treatmentSolved: false, controlSolution, removalEventCount: removalEvents.length, deathDepthFound: false }, null, 2));
    process.exit(1);
}

console.log(`\nTRUE DEATH DEPTH: ${deathDepth} (control prefix generated this phase but absent from the resulting frontier)`);
// Find the coarse-merge removal event(s) at this depth whose removedPath IS the live prefix — the
// direct mechanistic step, even though (as this depth's frontier absence already proves) any
// near-tie retention did not save it this time.
const liveStr = solutionPrefixAtDepth(deathDepth);
const directRemovals = removalEvents.filter(e => e.depth === deathDepth && e.removedPath.join(',') === liveStr);
let culprit = directRemovals[0] ?? null;
if (!culprit) {
    console.log('Live prefix left the frontier at this depth without ever appearing as a coarse-merge "removed" path itself — it must have been culled at the width/bucket-selection step after surviving merge, or its own parent path at depth-1 changed identity through mechanic-bucket selection. Dumping removal events at this depth for manual inspection.');
    console.log(JSON.stringify(removalEvents.filter(e => e.depth === deathDepth).slice(0, 5), null, 1));
    if (OUT) writeFileSync(path.join(root, OUT), JSON.stringify({ level: LEVEL_ID, controlNodes, treatmentNodes, treatmentSolved: false, controlSolution, deathDepth, culpritFound: false, removalsAtDeathDepth: removalEvents.filter(e => e.depth === deathDepth) }, null, 2));
    process.exit(1);
}

console.log(`\nCULPRIT COLLISION at depth=${culprit.depth} work=${culprit.work} key=${culprit.key}`);
console.log(`  removed (live control prefix): ${JSON.stringify(culprit.removedPath)} score=${culprit.removedScore}`);
console.log(`  kept (competitor):              ${JSON.stringify(culprit.competitorPath)} score=${culprit.keptScore}`);

const removedState = replayPath(culprit.removedPath);
const keptState = replayPath(culprit.competitorPath);
const removedSnap = stateSnapshot(removedState);
const keptSnap = stateSnapshot(keptState);
const diff = diffOmittedState(removedSnap, keptSnap);

console.log('\nSTATE DIFF (fields omitted from the coarse key):');
console.log(JSON.stringify(diff, null, 1));

const result = {
    level: LEVEL_ID, gate: GATE, profile: PROFILE, bias: BIAS, width: WIDTH, mechanicBuckets: MECHANIC_BUCKETS,
    controlNodes, controlSolution, treatmentNodes, treatmentSolved: false,
    removalEventCount: removalEvents.length, culprit, removedSnap, keptSnap, diff,
};
if (OUT) {
    writeFileSync(path.join(root, OUT), JSON.stringify(result, null, 2));
    console.log(`\nWrote ${OUT}`);
}
