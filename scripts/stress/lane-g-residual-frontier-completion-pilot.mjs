#!/usr/bin/env node
/**
 * Direct test of Lane G's actual payoff question on the current residual: does completing from a
 * REAL production beam-search frontier state (not a naive greedy construction) via the solver's
 * own existing searchCompletionFromPartialPath repair operator produce a genuine new solve on a
 * level that is currently unsolved in production?
 *
 * This is deliberately the smallest, most direct test of Lane G's premise -- no Jaccard-distance
 * proxy, no comparison to a known solution (there isn't one; these levels are unsolved). Either
 * the completion attempt referee-validates as a real solution, or it does not.
 *
 * Reuses two already-tested, unmodified pieces of solver machinery, no new solver code:
 *  - beamSearchFromGate's own pause/frontier-readout mechanism (already shipped for
 *    production-search-frontier-sampler.mjs and other research questions)
 *  - repair-search.ts's own __searchCompletionFromPartialPathForTests, invoked exactly as
 *    scripts/stress/repair-plateau-rollout-classifier.mjs already does for Card-E's own
 *    already-published seeded-operator-reachability step (buildStateAtPath / closeGapAtDepth
 *    pattern, copied verbatim here rather than reinvented).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { reconstructBeamPath, seededRng } from './production-search-frontier-sampler-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const RESIDUAL_FILE = arg('residual', 'reports/stress/capability-runs/35066677597/per-level-corpus2.json');
const SAMPLE_SIZE = Number(arg('sample-size', 15));
const DEPTH_FRACTIONS = arg('depth-fractions', '0.7,0.8,0.9').split(',').map(Number);
const WIDTH = Number(arg('width', 2000));
const PROFILE_NAME = arg('profile', 'intersectionHarvest');
const BUDGET_MS = Number(arg('budget-ms', 60_000));
const CLOSE_GAP_NODE_BUDGET = Number(arg('close-gap-node-budget', 2_000_000));
const SEED = arg('seed', 'lane-g-residual-frontier-completion-pilot-2026-09-19');
const PICK = arg('pick', 'random'); // 'random' or 'top' (highest node.score in the frontier)
const PICKS_PER_LEVEL = Number(arg('picks-per-level', 1));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { __searchCompletionFromPartialPathForTests: searchCompletionFromPartialPath } = await import('../../modules/solver/repair-search.ts');
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES, createState, applyMove } = api;
const profile = SCORING_PROFILES[PROFILE_NAME];
if (!profile) throw new Error(`unknown scoring profile: ${PROFILE_NAME}`);

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function seededRngLocal(seedStr) { const h = xmur3(seedStr); return mulberry32(h()); }
function shuffleWithSeed(arr, seedStr) {
    const rng = seededRngLocal(seedStr);
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function buildStateAtPath(pathKeys, level, prep) {
    const state = createState(pathKeys[0], level, prep);
    const liveUndo = [];
    for (let i = 1; i < pathKeys.length; i++) {
        const from = pathKeys[i - 1], to = pathKeys[i];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === to);
        liveUndo.push(applyMove(to, state, level, prep, isJump));
    }
    return { state, liveUndo };
}

const residual = JSON.parse(readFileSync(path.resolve(ROOT, RESIDUAL_FILE), 'utf8'));
const unsolvedIds = residual.rows.filter(r => !r.ok).map(r => r.id);
const sampledIds = shuffleWithSeed(unsolvedIds, `${SEED}:sample`).slice(0, SAMPLE_SIZE);

const corpusDoc = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const corpusById = new Map(corpusRows.map(row => [String(row.id), row]));

const results = [];
for (const levelId of sampledIds) {
    const raw = corpusById.get(levelId);
    if (!raw) { results.push({ levelId, status: 'missing-from-corpus' }); continue; }
    const { id: _id, stressMeta: _sm, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const gate = level.gateKeys[0];

    for (const depthFraction of DEPTH_FRACTIONS) {
        const prep = prepLevel(level);
        prep._cfg = null;
        prep._metrics = { nodesExpanded: 0 };
        const pauseAfterPhases = Math.max(1, Math.round(level.requiredLength * depthFraction));
        const out = {};
        const solvedDuringBeam = await beamSearchFromGate(
            gate, level, prep, profile, BUDGET_MS, Date.now(), null, WIDTH,
            null, false, out, Infinity, undefined, pauseAfterPhases,
        );
        if (solvedDuringBeam) {
            results.push({ levelId, depthFraction, status: 'solved-during-beam-itself' });
            console.log(`  ${levelId} @ ${depthFraction}: SOLVED DURING BEAM (unexpected -- was reported unsolved in ${RESIDUAL_FILE})`);
            continue;
        }
        if (!out.pausedContinuation) {
            results.push({ levelId, depthFraction, status: 'exhausted-before-checkpoint' });
            console.log(`  ${levelId} @ ${depthFraction}: exhausted-before-checkpoint`);
            continue;
        }
        const frontier = out.pausedContinuation.frontier;
        let pickIndices;
        if (PICK === 'top') {
            pickIndices = frontier.map((node, i) => i).sort((a, b) => frontier[b].score - frontier[a].score).slice(0, PICKS_PER_LEVEL);
        } else {
            const rng = seededRng(`${SEED}:${levelId}:${depthFraction}:pick`);
            const seen = new Set();
            pickIndices = [];
            while (pickIndices.length < Math.min(PICKS_PER_LEVEL, frontier.length)) {
                const idx = Math.floor(rng() * frontier.length);
                if (!seen.has(idx)) { seen.add(idx); pickIndices.push(idx); }
            }
        }

        for (const pickIndex of pickIndices) {
            const candidatePath = reconstructBeamPath(frontier[pickIndex]);
            const { state, liveUndo } = buildStateAtPath(candidatePath, level, prepLevel(level));
            const freshPrep = prepLevel(level);
            freshPrep._cfg = null;
            const completion = searchCompletionFromPartialPath(
                state, level, freshPrep, SCORING_PROFILES.repair, null, freshPrep._cfg, liveUndo, 0, CLOSE_GAP_NODE_BUDGET,
            );
            if (completion.solved) {
                const finalPath = state.path.slice();
                const referee = Solver.validateCandidatePath(level, finalPath);
                results.push({
                    levelId, depthFraction, pickIndex, status: 'COMPLETION-SOLVED',
                    candidateLength: candidatePath.length, frontierSize: frontier.length,
                    completionNodes: completion.nodes, refereeValid: referee.ok, refereeReason: referee.ok ? null : referee.reason,
                    finalPath,
                });
                console.log(`  ${levelId} @ ${depthFraction} pick=${pickIndex}: *** COMPLETION-SOLVED *** nodes=${completion.nodes} refereeValid=${referee.ok}`);
            } else {
                results.push({ levelId, depthFraction, pickIndex, status: 'completion-failed', candidateLength: candidatePath.length, frontierSize: frontier.length, completionNodes: completion.nodes });
                console.log(`  ${levelId} @ ${depthFraction} pick=${pickIndex}: completion-failed (candidateLen=${candidatePath.length}/${level.requiredLength}, nodes=${completion.nodes})`);
            }
        }
    }
}

const solves = results.filter(r => r.status === 'COMPLETION-SOLVED' && r.refereeValid);
console.log(JSON.stringify({
    sampledLevels: sampledIds.length,
    depthFractionsTried: DEPTH_FRACTIONS,
    totalAttempts: results.length,
    refereeValidSolves: solves.length,
    solvedLevelIds: [...new Set(solves.map(r => r.levelId))],
}, null, 2));

const OUT_FILE = arg('out', null);
if (OUT_FILE) {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const absolute = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify({ seed: SEED, sampledIds, depthFractions: DEPTH_FRACTIONS, results }, null, 2)}\n`);
}
