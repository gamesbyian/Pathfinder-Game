#!/usr/bin/env node
// Portal-parity census -- Stage 0 of the historical portal-parity gap analysis: before writing any
// new prune, measure whether the candidate necessary condition actually holds on real stored solutions.
//
// BACKGROUND. On a portal-free grid, every move flips (x+y)%2, so prune-gauntlet.ts's existing
// PRUNE_PARITY check rejects a state whose parity can't reach the goal in exactly the remaining
// step count -- but it's gated on `level.portalMap.size === 0` and never fires on portal levels.
// A portal jump is a free (zero-length) teleport; if its two terminals have DIFFERENT parity
// (a "twist" portal -- already identified per-level in prep.ts's parityPortalDistMaps, used only
// for soft scoring/guidance today, never for pruning), using it once flips the path's achievable
// end parity. trap-search.ts's isParityReachableEndpoint already uses this exact reasoning
// STATICALLY (any twist portal anywhere on the level makes both parities reachable, full stop --
// no budget/reachability check needed because it's a level-wide question, not a specific search
// state). The candidate DYNAMIC extension: at a specific search state with `rSteps` remaining
// counted moves, a parity mismatch is only provably fatal if EVERY twist portal pair has already
// been fully consumed (both its cells visited) -- if at least one twist portal pair remains
// entirely unused, the state should NOT be rejected on parity grounds, even without checking
// whether that portal is reachable within budget (checking existence only is strictly safe: it
// can only under-prune, never mis-prune, since skipping the reachability check just means some
// states that unbounded search *could* have rejected are let through — but per CLAUDE.md's "any
// new derivation of the shape 'cell/edge X is provably unusable' must be falsified against every
// stored solution before being trusted", this itself needs verifying, not assuming).
//
// METHOD. Replay every stored (referee-valid) solution on every level with >=1 twist portal pair.
// At each step, compute the naive portal-free parity mismatch test. Whenever it says "mismatch"
// (which prune-gauntlet.ts's own logic would reject on a portal-free level), check whether the
// existence-only conjecture ("some twist portal pair remains fully unused") ever comes back FALSE
// on a real solution's own path (i.e. would the naive existence-only prune have wrongly rejected
// a valid step of a real solution -- this MUST be 0/0 for the design to be sound, since it means
// the prune is not actually being tested by real data, or a real, reportable violation if >0).
// Also tracks how often "mismatch AND >=1 twist portal still unused" occurs at all (how often the
// state-dependent prune's existence check would matter/differ from the static-only check), and a
// secondary reachability-aware signal using prep's own parityPortalDistMaps (BFS distance to the
// NEAREST of a portal pair's two cells) as a loose proxy for "is it even plausible this portal
// fits in the remaining budget" -- NOT a rigorous reachability bound (that needs a proper
// dist(pos->a)+dist(b->goal) computation per endpoint, deliberately deferred to a follow-up shadow
// probe once this existence-only conjecture is confirmed safe).
//
// SCOPE. Levels with >=1 twist portal pair (parityPortalDistMaps.length > 0 after prep). No
// production code touched -- this is read-only census/instrumentation only.
//
// Usage:
//   node scripts/run-bundled.mjs scripts/stress/portal-parity-census.mjs -- \
//     --corpus=data/levels.json [--levels=SPEC] [--out=logs/portal-parity-census/published.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints, selectLevelsBySpec } from '../level-data-io.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { keyParity } from '../../modules/domain/cell-key.ts';
import { getDistanceFromArray } from '../../modules/solver/distance.ts';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/levels.json');
const LEVEL_SPEC = arg('levels', null);
const OUT_FILE = arg('out', null);
const SUMMARY_OUT_FILE = arg('summary-out', null);

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;

const corpusLevels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE));
const levels = LEVEL_SPEC ? selectLevelsBySpec(corpusLevels, LEVEL_SPEC) : corpusLevels;
console.log(`portal-parity-census: ${levels.length} level(s), corpus=${CORPUS_FILE}`);

let levelsWithTwistPortal = 0, levelsWithNoHint = 0, levelsChecked = 0;
let totalSteps = 0, mismatchSteps = 0, mismatchWithUnusedTwist = 0, violations = 0;
let mismatchWithPlausiblyReachableTwist = 0;
const violationDetails = [];
const perLevel = [];

function persist() {
    if (!OUT_FILE) return;
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    const summary = {
        corpus: CORPUS_FILE, levelsTotal: levels.length, levelsWithTwistPortal, levelsWithNoHint,
        levelsChecked, totalSteps, mismatchSteps, mismatchWithUnusedTwist,
        mismatchWithPlausiblyReachableTwist, violations, violationDetails,
    };
    writeFileSync(abs, JSON.stringify({ summary, levels: perLevel }, null, 1));
    if (SUMMARY_OUT_FILE) {
        const pct = (n, d) => d ? (100 * n / d).toFixed(2) + '%' : 'n/a';
        const lines = [
            '# Portal-parity census', '',
            `Corpus: ${CORPUS_FILE} -- ${levels.length} level(s), ${levelsWithTwistPortal} with >=1 twist portal pair, ${levelsChecked} checked (had a stored solution), ${levelsWithNoHint} skipped (no hint).`,
            '',
            `Total replayed steps: ${totalSteps}`,
            `Naive portal-free parity MISMATCH (would be rejected by prune-gauntlet.ts's own PRUNE_PARITY logic if it ran on this portal level): ${mismatchSteps} (${pct(mismatchSteps, totalSteps)})`,
            `...of those, >=1 twist portal pair still fully unused (existence-only conjecture says "don't reject"): ${mismatchWithUnusedTwist} (${pct(mismatchWithUnusedTwist, mismatchSteps)})`,
            `...of those, the nearest such portal's BFS distance from pos looks plausibly reachable within rSteps (loose proxy, not a rigorous bound): ${mismatchWithPlausiblyReachableTwist} (${pct(mismatchWithPlausiblyReachableTwist, mismatchWithUnusedTwist)})`,
            '',
            `**VIOLATIONS of the existence-only conjecture (mismatch AND zero unused twist portals, on a REAL solution's own path -- this must be 0 for the design to be sound): ${violations}**`,
        ];
        if (violations > 0) {
            lines.push('', '## Violation detail (first 20)');
            for (const v of violationDetails.slice(0, 20)) lines.push(`- ${JSON.stringify(v)}`);
        }
        mkdirSync(path.dirname(path.resolve(ROOT, SUMMARY_OUT_FILE)), { recursive: true });
        writeFileSync(path.resolve(ROOT, SUMMARY_OUT_FILE), lines.join('\n') + '\n');
    }
}

for (let i = 0; i < levels.length; i++) {
    const raw = levels[i];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: i + 1 });
    const prep = prepLevel(level);
    prep._cfg = null;
    const twistPairs = prep.parityPortalDistMaps || [];
    if (twistPairs.length === 0) { perLevel.push({ id: raw.id ?? null, skipped: 'no-twist-portal' }); continue; }
    levelsWithTwistPortal++;

    const solution = (raw.hintRecords || [])[0]?.path;
    if (!solution) { levelsWithNoHint++; perLevel.push({ id: raw.id ?? null, skipped: 'no-hint', twistPairs: twistPairs.length }); persist(); continue; }
    levelsChecked++;

    const state = createState(solution[0], level, prep);
    const goalP = keyParity(level.goalKey);
    const lvl = { id: raw.id ?? null, twistPairs: twistPairs.length, steps: 0, mismatches: 0, mismatchesWithUnusedTwist: 0, violations: 0 };

    // PRODUCTION-SHAPE check being validated here (see prune-gauntlet.ts's real PRUNE_PARITY for
    // the pattern this mirrors): skip the mismatch check ENTIRELY whenever `pos` is itself ANY
    // portal cell (entry about to be force-jumped, OR the landing cell just arrived at via a
    // jump) -- both are transient/pass-through snapshots, not stable decision points, so a
    // pair's "already consumed" status is ambiguous exactly there (see this script's first
    // revision, which used raw state.visited without this guard and produced 8 false violations,
    // all traced to evaluating right at an in-flight portal cell). At every OTHER (non-portal)
    // `pos`, by the time the path has moved past a used pair, BOTH its terminals are guaranteed
    // state.visited>0 (entering either one forces landing at the other), so raw visited counts
    // are a safe, sufficient "already consumed" signal once the transient cells are excluded.
    let realLen = 0; // COUNTED length so far (portal jumps are free / don't count).
    for (let step = 0; step < solution.length; step++) {
        const pos = solution[step];
        const rSteps = level.reqLen - realLen;
        if (!level.portalMap.has(pos)) {
            const posP = keyParity(pos);
            const mismatch = (posP ^ goalP ^ (rSteps & 1)) !== 0;
            totalSteps++; lvl.steps++;
            if (mismatch) {
                mismatchSteps++; lvl.mismatches++;
                let anyUnused = false, anyPlausiblyReachable = false;
                for (const tp of twistPairs) {
                    const consumed = state.visited[tp.a] > 0 && state.visited[tp.b] > 0;
                    if (consumed) continue;
                    anyUnused = true;
                    const nearestDist = getDistanceFromArray(tp.dist, pos, level.grid.w);
                    if (Number.isFinite(nearestDist) && nearestDist <= rSteps) anyPlausiblyReachable = true;
                }
                if (anyUnused) { mismatchWithUnusedTwist++; lvl.mismatchesWithUnusedTwist++; }
                if (anyPlausiblyReachable) mismatchWithPlausiblyReachableTwist++;
                if (!anyUnused) {
                    violations++; lvl.violations++;
                    const detail = { id: raw.id ?? null, step, pos, rSteps, posP, goalP };
                    violationDetails.push(detail);
                    console.log(`  VIOLATION: ${JSON.stringify(detail)}`);
                }
            }
        }
        if (step + 1 < solution.length) {
            const pAtPos = level.portalMap.get(pos);
            const next = solution[step + 1];
            const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === next);
            applyMove(next, state, level, prep, isJump);
            if (!isJump) realLen++;
        }
    }
    perLevel.push(lvl);
    persist();
    console.log(`  [${i + 1}/${levels.length}] ${raw.id ?? '(no id)'}: ${lvl.mismatches}/${lvl.steps} mismatch steps, ${lvl.mismatchesWithUnusedTwist} with unused twist, ${lvl.violations} violation(s)`);
}

persist();
console.log(`\nDone. ${levelsWithTwistPortal}/${levels.length} levels had >=1 twist portal, ${levelsChecked} checked.`);
console.log(`Total: ${mismatchSteps}/${totalSteps} mismatch steps, ${mismatchWithUnusedTwist} with an unused twist portal, ${violations} VIOLATION(S) of the existence-only conjecture.`);
if (OUT_FILE) console.log(`Wrote ${OUT_FILE}`);
