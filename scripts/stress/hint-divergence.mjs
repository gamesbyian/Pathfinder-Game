#!/usr/bin/env node
/**
 * Differential diagnosis for a SPECIFIC candidate path against a level's REAL production search,
 * not the generic default baseline. Generalizes witness-divergence.mjs (which replays a stress
 * corpus's hidden witness under `SCORING_PROFILES.default` with no structural ordering bias, for corpus-wide
 * comparability) in two ways this tool needs instead:
 *
 *   1. The target path is any already-known hint on a PUBLISHED level (selected by id, or by
 *      geometric similarity to a group's median shape — see --target-group), not a stress-corpus
 *      witness.
 *   2. Replay runs under the level's OWN actually-resolved winning attempt scoring-profile+ordering-bias
 *      (read back from that hint's own provenance and matched against the level's current
 *      `getAttemptConfigs()`), not the generic baseline — the exact gap the 2026-07-17 taxonomy
 *      correction flagged as more informative than the common-baseline replay ("per-level
 *      witness-divergence using each level's own actually-selected attempt-policy profile").
 *
 * Reports, in order:
 *   - cumulativeDiscrepancy under the real winning scoring profile / ordering bias (rank-sum of the target
 *     path's own moves among scoreAndSort's greedy ordering at each step — 0 = greedy-optimal).
 *   - Per-flag SCORE_* ablation: which single scoring term, if any, is the dominant driver of that
 *     discrepancy (the R02248 methodology: disable one flag at a time, see which one collapses the
 *     discrepancy). A LARGE, ISOLATED delta on one flag is the signature that justified the
 *     attraction-diversity pass; near-uniform small deltas mean no single term is responsible.
 *   - The same replay under every OTHER scoring profile with NO ordering-bias forcing, to separate "a rigid
 *     ordering bias's own bonus term explains the gap" (expected, not a bug — see SCORE_ORDERING_BIAS_BONUS)
 *     from "free scoring also can't find this shape" (would be the more interesting finding).
 *
 * This is a diagnostic, not a fix generator. See reports/2026-07-29-hint-shape-divergence-diagnosis.md
 * for the worked example (P00001/P00004/P00068/P00133) and CLAUDE.md's provenance section for why
 * "no-provenance" hints are a legitimate source of diverse target paths to diagnose against.
 *
 * Usage (published corpus only — this reads data/hints/<id>.json, not the stress artifacts):
 *   node scripts/run-bundled.mjs scripts/stress/hint-divergence.mjs P00133
 *   node scripts/run-bundled.mjs scripts/stress/hint-divergence.mjs P00133 --target-group=with-provenance
 *   node scripts/run-bundled.mjs scripts/stress/hint-divergence.mjs P00133 --target-path=262144,327680,...
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { FEATURES } from '../../modules/solver/ablation-config.js';
import { packedToPair, witnessDescriptors } from './features.mjs';
import { tracePathRanks } from './divergence-lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const LEVEL_ID = args.find(a => !a.startsWith('--'));
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const eq = a.indexOf('=');
    return [a.slice(0, eq), a.slice(eq + 1)];
}));
if (!LEVEL_ID) {
    console.error('Usage: hint-divergence.mjs <levelId> [--target-group=no-provenance|with-provenance] [--target-path=k1,k2,...]');
    process.exit(2);
}
const TARGET_GROUP = argMap.get('--target-group') || 'no-provenance';
const TARGET_PATH_ARG = argMap.get('--target-path');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const Solver = createSolver();
const {
    prepLevel, createState, getNeighbors, applyMove, scoreAndSort, isSolutionState,
    SCORING_PROFILES, getAttemptConfigs, normalizeAblationConfig,
} = SOLVER_TESTING_API;

const levels = JSON.parse(readFileSync(path.resolve(ROOT, 'data/levels.json'), 'utf8'));
const raw = levels.find(l => l.id === LEVEL_ID);
if (!raw) { console.error(`Level ${LEVEL_ID} not found in data/levels.json`); process.exit(1); }
const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
const prep = prepLevel(level);
const W = level.grid.w, H = level.grid.h;

const hintPath = path.resolve(ROOT, `data/hints/${LEVEL_ID}.json`);
const doc = JSON.parse(readFileSync(hintPath, 'utf8'));

// --- Pick the replay CONTEXT: the level's real cold-production winner (technique/scoring-profile/ordering-bias) ---
const coldTechniques = new Set(['dfs', 'beam']);
const coldWinner = doc.hints.flatMap(h => (h.provenance || []).map(p => ({ h, p })))
    .find(({ p }) => coldTechniques.has((p.solver.technique || '').split(':')[0]) && !p.context?.hintGuided);
if (!coldWinner) {
    console.error(`No cold dfs/beam provenance entry found for ${LEVEL_ID} — this tool needs a known production winner to replay against.`);
    process.exit(1);
}
const winnerScoringProfileId = coldWinner.p.solver.scoringProfileId ?? coldWinner.p.solver.profile;
const winnerOrderingBiasId = coldWinner.p.solver.orderingBiasId ?? coldWinner.p.solver.template ?? null;
console.log(`Cold production winner: technique=${coldWinner.p.solver.technique} scoringProfileId=${winnerScoringProfileId} orderingBiasId=${winnerOrderingBiasId ?? 'none'}`);

const configs = getAttemptConfigs(level);
const matchedConfig = configs.find(c => c.scoringProfileId === winnerScoringProfileId
    && (c.orderingBias?.id ?? null) === winnerOrderingBiasId);
if (!matchedConfig) {
    console.error(`No matching config in current getAttemptConfigs() for scoringProfileId=${winnerScoringProfileId}` +
        ` orderingBiasId=${winnerOrderingBiasId} — level features may have changed since this hint was found.`);
    process.exit(1);
}
const winningProfile = SCORING_PROFILES[matchedConfig.scoringProfileId];
const winningOrderingBias = matchedConfig.orderingBias ?? null;
console.log(`Replaying under: scoringProfileId=${matchedConfig.scoringProfileId}, orderingBiasId=${winningOrderingBias?.id ?? 'none'}`);

// --- Pick the TARGET path to diagnose ---
let targetPath;
if (TARGET_PATH_ARG) {
    targetPath = TARGET_PATH_ARG.split(',').map(Number);
} else {
    const pool = doc.hints.filter(h => TARGET_GROUP === 'no-provenance' ? !h.provenance?.length : !!h.provenance?.length);
    if (!pool.length) { console.error(`No hints in group "${TARGET_GROUP}" for ${LEVEL_ID}.`); process.exit(1); }
    const descs = pool.map(h => ({ h, d: witnessDescriptors(h.path.map(packedToPair), W, H) }));
    const med = arr => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    const medTurnRate = med(descs.map(x => x.d.turnRate));
    const closest = descs.reduce((best, x) => Math.abs(x.d.turnRate - medTurnRate) < Math.abs(best.d.turnRate - medTurnRate) ? x : best);
    targetPath = closest.h.path;
    console.log(`Target (${TARGET_GROUP}, closest to group median turnRate=${medTurnRate.toFixed(3)}): ` +
        `turnRate=${closest.d.turnRate.toFixed(3)}, perimeterFrac=${closest.d.perimeterFrac.toFixed(3)}, ${targetPath.length} steps`);
}

// --- Replay: rank of the target's own move among scoreAndSort's greedy ordering, per step ---
function traceRankOnly(cfgOverride, profileOverride = winningProfile, orderingBiasOverride = winningOrderingBias) {
    const result = tracePathRanks({ api: { createState, getNeighbors, applyMove, scoreAndSort, isSolutionState }, level, prep, path: targetPath,
        scoringProfile: profileOverride, orderingBias: orderingBiasOverride, configOverride: cfgOverride });
    return { ...result, finalIsSolution: result.finalIsSolution };
}

const baseline = traceRankOnly(null);
console.log(`\nBASELINE (winning scoring profile / ordering bias, all scoring on): cumulativeDiscrepancy=${baseline.cumulativeDiscrepancy}, ` +
    `finalIsSolution=${baseline.finalIsSolution}`);
const worst = [...baseline.perStep].filter(s => !s.invalid).sort((a, b) => b.rank - a.rank).slice(0, 8);
console.log(`Worst-ranked steps: ${worst.map(s => `step${s.step}(rank=${s.rank}/${s.nCandidates})`).join(', ')}`);

// --- Per-flag SCORE_* ablation: which term, if any, is the dominant driver of the discrepancy ---
// FEATURES is used only to ENUMERATE which SCORE_* flags exist (what to test) — the override
// object itself is built via normalizeAblationConfig (orchestration.ts), the same Proxy-based
// mechanism production funnels every opts.ablation through, so every flag OTHER than the one
// being tested correctly defaults to enabled regardless of flag family (SCORE_/PRUNE_/STRATEGY_/
// TEMPLATE_/PROFILE_), with no need to hand-list them here. An earlier version of this tool built
// a plain object from FEATURES filtered to SCORE_* only — correct for this tool's CURRENT call
// path (getNeighbors/applyMove/isSolutionState never read prep._cfg; evaluatePrunedMove, the
// PRUNE_ reader, is only invoked from the real search loops, never from here) but a latent
// instance of the exact "sparse config silently disables every other flag" footgun CLAUDE.md
// documents, waiting for a future extension (e.g. adding an evaluatePrunedMove check) to trigger
// it. normalizeAblationConfig removes the risk by construction instead of by manually tracing
// every current call path.
const scoreFlags = Object.keys(FEATURES).filter(k => k.startsWith('SCORE_'));
console.log(`\nPer-flag ablation (${scoreFlags.length} SCORE_* flags), ` +
    `cumulativeDiscrepancy delta from baseline (${baseline.cumulativeDiscrepancy}):`);
const deltas = scoreFlags.map(flag => {
    const r = traceRankOnly(normalizeAblationConfig({ [flag]: false }));
    return { flag, discrepancy: r.cumulativeDiscrepancy, delta: r.cumulativeDiscrepancy - baseline.cumulativeDiscrepancy };
}).sort((a, b) => a.delta - b.delta);
deltas.forEach(d => console.log(`  ${d.flag.padEnd(30)} disabled -> discrepancy=${String(d.discrepancy).padStart(4)}  ` +
    `delta=${d.delta >= 0 ? '+' : ''}${d.delta}`));

// --- Untemplated comparison: does free scoring (no structural ordering bias) do any better? ---
console.log(`\n=== SCORING PROFILES WITHOUT ORDERING BIAS ===`);
for (const scoringProfileId of Object.keys(SCORING_PROFILES)) {
    if (scoringProfileId === 'repair') continue; // repair reuses objectiveFirst's weights, not a distinct comparison
    const r = traceRankOnly(null, SCORING_PROFILES[scoringProfileId], null);
    console.log(`  scoringProfileId=${scoringProfileId.padEnd(20)} orderingBiasId=none  cumulativeDiscrepancy=${r.cumulativeDiscrepancy}  finalIsSolution=${r.finalIsSolution}`);
}
