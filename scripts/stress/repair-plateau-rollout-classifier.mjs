#!/usr/bin/env node
/**
 * Repair-plateau rollout classifier (docs/future-work.md item 4: "characterize the plateau, not
 * the allocation" — the direction reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md's
 * three-arm A/B closed off the allocation lane for).
 *
 * **Status (2026-08-15): the core (CP-SAT-free) hypothesis this tool was built to test is CLOSED
 * NEGATIVE at pilot scale — see reports/2026-08-15-repair-plateau-rollout-proxy-negative.md.** Do
 * not scale the CP-SAT-free `--only`/`--sample-*` mode up to a larger population run expecting it
 * to discriminate "narrow trap" vs. "wide plateau" levels; the pilot already shows it doesn't.
 *
 * **CP-SAT-anchored mode added (2026-08-15, `--retreat-file`)**: reads
 * repair-retreat-binary-search.mjs's own output directly (no new schema) and anchors the rollout
 * ladder at each elite's CP-SAT-verified boundary (`low` = deepest feasible depth, `high` = shallowest
 * infeasible depth) instead of the elite's own raw dead end. This is the actual version the negative
 * report's "what's still worth keeping" section called for — see reports/2026-08-15-repair-retreat-cpsat-anchored-rollout.md
 * once run for results.
 *
 * Original motivation, for context: reports/2026-08-12-repair-retreat-cpsat.md's own n=2 finding
 * (R00648 vs. R03176) found repair's own `searchCompletionFromPartialPath` and 2,000 randomized rollouts both fail
 * to close R00648's residual from a CP-SAT-VERIFIED feasible point (0/2000 solved, avg 4.3
 * nodes/trial, best depth 60/141) while the *same* diagnostic on R03176's own verified point gets
 * much further (best depth 134/141) despite neither one closing — i.e. the two levels' near-miss
 * neighborhoods differ sharply in how "forgiving" they are to blind construction, independent of
 * whether an exact completion exists. This script tried to measure that same forgivingness signal
 * from a repair elite's own stuck point WITHOUT a CP-SAT oracle (using generic backoff points
 * instead of a verified-feasible one) — the negative-result report explains why that substitution
 * doesn't work: without feasibility grounding, escape depth is dominated by which specific
 * dead-end trajectory (elite) you happen to sample, not by level identity.
 *
 * Rollouts start from a LADDER of backoff points relative to each level's best (lowest-badness)
 * repair elite's own stored path, not the elite's own endpoint itself. A discovered elite's final
 * cell is, by construction, a genuine zero-degree dead end (repair-search.ts's takePly returns
 * 'deadend' precisely when `neighbors.length === 0` or `survivors.length === 0` there) — an
 * empirically confirmed sanity-check finding of this script's own first draft (see git history):
 * rolling out from the exact endpoint always measures 0 escape depth on every level, elite or not,
 * because there is nothing left to roll out from. --backoffs (default a Fibonacci-ish ladder) steps
 * back from the elite's end and asks, at each depth: how far do blind rollouts get from here? The
 * hope was that sweeping several depths would reveal a "recovery frontier" without needing a
 * CP-SAT oracle — the negative-result report found this ladder does NOT reliably distinguish
 * R00648 from R03176 at 4 of 5 tested depths (per-elite variance swamps any level-level signal).
 *
 * Purely observational: no solver behavior change, no production code touched. Reuses
 * repair-elite-path-dump.mjs's exact elite-selection convention (dedupe by path, sort by badness
 * asc / path length desc; top --elites-per-level, default 3 — not just the single global best, so
 * one weak run doesn't stand in for the level) so results are directly comparable to that tool's
 * own output, and `select-early-repair-search-adaptive-sample.mjs`'s `looksRepairGated` approximation for
 * sampling the currently-unsolved population (sample-selection-only heuristic, not a solver input).
 * Elites here are NOT guaranteed to match any specific elite id from an earlier report (a different
 * node budget/run naturally surfaces different near-misses). The --sample-* population-sampling
 * flags below still work, but per the status note above, running them at scale with the CURRENT
 * (CP-SAT-free) method is not expected to produce a reliable per-level signal — they're kept for a
 * future CP-SAT-anchored version, not because a population sweep is currently recommended.
 *
 * `--close-gap-node-budget=<n>` (default 0 = skip, --retreat-file mode only): also invokes the
 * real searchCompletionFromPartialPath operator directly from each elite's verified-feasible depth (floor=0, the
 * full backtrack range to the gate) — the same named-operator reconstruction question the
 * 2026-08-12 R00648/R03176 diagnostic asked by hand (reports/2026-08-12-repair-retreat-cpsat.md),
 * now reusable for any other CP-SAT-verified boundary this file's --retreat-file already reads.
 * The original diagnostic used 2,000,000 (500x searchCompletionFromPartialPath's own production 4,000-node budget).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json \
 *     [--only=R00648,R03176] [--sample-repair-winners=8] [--sample-admissible-winners=8]
 *     [--sample-unsolved=10] [--seed=<string>] \
 *     [--elite-node-budget=500000] [--rollout-trials=100] [--rollout-node-cap=5000] \
 *     [--backoffs=1,2,3,5,8,13,21,34] [--close-gap-node-budget=0] \
 *     [--out=reports/stress/repair-plateau-rollout-classifier.json]
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { levelFeatures } from './features.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const corpusFile = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const onlyIds = args.has('--only') ? new Set(args.get('--only').split(',').map(s => s.trim()).filter(Boolean)) : null;
const sampleRepairWinners = Number(args.get('--sample-repair-winners') ?? 8);
const sampleAdmissibleWinners = Number(args.get('--sample-admissible-winners') ?? 8);
const sampleUnsolved = Number(args.get('--sample-unsolved') ?? 10);
const seedStr = args.get('--seed') || 'repair-plateau-rollout-2026-08-15';
const eliteNodeBudget = Number(args.get('--elite-node-budget') ?? 500000);
const rolloutTrials = Number(args.get('--rollout-trials') ?? 100);
const rolloutNodeCap = Number(args.get('--rollout-node-cap') ?? 5000);
const retreatFile = args.get('--retreat-file') || null;
// 0 (default) = skip. When set (--retreat-file mode only), also invokes the real searchCompletionFromPartialPath
// operator directly from each elite's verified-feasible depth (floor=0, full backtrack range) —
// see closeGapAtDepth's own comment. The 2026-08-12 R00648/R03176 diagnostic used 2,000,000 (500x
// searchCompletionFromPartialPath's own production LENGTH_GAP_CLOSE_NODE_BUDGET of 4,000).
const closeGapNodeBudget = Number(args.get('--close-gap-node-budget') ?? 0);
const defaultBackoffs = retreatFile ? '0,1,2,3' : '1,2,3,5,8,13,21,34';
const backoffs = (args.get('--backoffs') ?? defaultBackoffs).split(',').map(Number).filter(n => Number.isFinite(n) && n >= 0);
const elitesPerLevel = Number(args.get('--elites-per-level') ?? 3);
const outFile = args.get('--out') || 'reports/stress/repair-plateau-rollout-classifier.json';

// ─── Deterministic sampling (same FNV-1a -> mulberry32 -> Fisher-Yates convention as
//     scripts/stress/benchmark.mjs / select-early-repair-search-adaptive-sample.mjs) ───
function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
}
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function sampleDeterministic(items, n, seed) {
    const rand = mulberry32(seed);
    const pool = items.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(n, pool.length));
}

// Sample-selection-only approximation of attempts.ts's needsRepairFallback — see
// select-early-repair-search-adaptive-sample.mjs's own identical comment. Not a solver input.
function looksRepairGated(mc, reqInt) {
    return (mc && ((mc.mustCross >= 2 && mc.mustPass >= 3) || false)) || reqInt >= 7;
}

// ─── Build the sample ───
const parsedCorpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const rawLevels = Array.isArray(parsedCorpus) ? parsedCorpus : parsedCorpus.levels;
const byId = new Map(rawLevels.map(lv => [lv.id, lv]));

let targetIds = [];
const provenance = {};
if (retreatFile) {
    // Target selection is driven entirely by the retreat file's own levels below; skip sampling.
} else if (onlyIds) {
    targetIds = [...onlyIds].filter(id => byId.has(id));
    for (const id of targetIds) provenance[id] = 'explicit --only';
} else {
    const repairWinners = JSON.parse(readFileSync('reports/stress/repair-winner-levels-2026-08-13.json', 'utf8'));
    const admissibleWinners = JSON.parse(readFileSync('reports/stress/admissible-order-default-winner-levels-2026-08-13.json', 'utf8'));
    const unsolvedIds = new Set();
    for (const file of readdirSync('logs/solver-corpus2-batches')) {
        if (!file.endsWith('.checkpoint.jsonl')) continue;
        for (const line of readFileSync(path.join('logs/solver-corpus2-batches', file), 'utf8').split('\n')) {
            if (!line.trim()) continue;
            try {
                const row = JSON.parse(line);
                if (row.ok === false && row.id) unsolvedIds.add(row.id);
            } catch { /* skip malformed line */ }
        }
    }
    const unsolvedRepairGated = [...unsolvedIds].filter(id => {
        const lv = byId.get(id);
        if (!lv) return false;
        return looksRepairGated(lv.stressMeta?.mechanicCounts, lv.reqInt ?? 0);
    });

    const repairSample = sampleDeterministic(repairWinners.filter(id => byId.has(id)), sampleRepairWinners, hashSeed(`${seedStr}:repair-winners`));
    const admissibleSample = sampleDeterministic(admissibleWinners.filter(id => byId.has(id)), sampleAdmissibleWinners, hashSeed(`${seedStr}:admissible-winners`));
    const unsolvedSample = sampleDeterministic(unsolvedRepairGated, sampleUnsolved, hashSeed(`${seedStr}:unsolved`));
    for (const id of repairSample) provenance[id] = 'cold repair winner (2026-08-13 mining)';
    for (const id of admissibleSample) provenance[id] = 'cold admissible-order winner (2026-08-13 mining)';
    for (const id of unsolvedSample) provenance[id] = 'currently unsolved, repair-gated (approx.)';
    targetIds = [...new Set([...repairSample, ...admissibleSample, ...unsolvedSample])];
}

if (!retreatFile && targetIds.length === 0) {
    console.error('No target levels resolved (check --only ids exist in --corpus, or that the mined winner-list/checkpoint artifacts are present).');
    process.exit(2);
}
if (!retreatFile) console.error(`Sampled ${targetIds.length} levels: ${targetIds.join(', ')}`);

// ─── Solver internals ───
installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { repairSearchFromGate, __takePlyForTests: takePly, __searchCompletionFromPartialPathForTests: searchCompletionFromPartialPath } = await import('../../modules/solver/repair-search.ts');
const Solver = createSolver();

const EPSILON_CHOICES = [0.15, 0.35, 0.6]; // same values as repair-search.ts's own EPSILON_LADDER

/** Replays `pathKeys` (gate-first) onto a freshly created state via the real applyMove, mirroring
 *  repair-search.ts's own (module-private) replayToPrefix's portal-jump determination exactly.
 *  Returns the live undo stack too (needed by searchCompletionFromPartialPath, which backtracks by popping it). */
function buildStateAtPath(pathKeys, level, prep) {
    const state = api.createState(pathKeys[0], level, prep);
    const liveUndo = [];
    for (let i = 1; i < pathKeys.length; i++) {
        const from = pathKeys[i - 1], to = pathKeys[i];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === to);
        liveUndo.push(api.applyMove(to, state, level, prep, isJump));
    }
    return { state, liveUndo };
}

/** Invokes the real searchCompletionFromPartialPath operator directly from a frozen CP-SAT-verified-feasible
 *  prefix, with floor=0 (full backtrack range, all the way to the gate) — the same "does an
 *  existing native reconstruction operator solve from this exact-live prefix" question the
 *  2026-08-12 R00648/R03176 diagnostic asked (reports/2026-08-12-repair-retreat-cpsat.md), reused
 *  here via this file's own --retreat-file plumbing instead of another ad hoc script. */
function closeGapAtDepth(elitePath, depth, level, prep, nodeBudget) {
    const branchPrefix = elitePath.slice(0, depth + 1);
    const { state, liveUndo } = buildStateAtPath(branchPrefix, level, prep);
    return searchCompletionFromPartialPath(state, level, prep, api.SCORING_PROFILES.repair, null, prep._cfg, liveUndo, 0, nodeBudget);
}

/** Runs `trials` rollouts from ONE fixed branch point (elitePath truncated to `depth` cells). */
function rolloutsAtDepth(elitePath, depth, level, prep, trials, seedBase, nodeCap) {
    const branchPrefix = elitePath.slice(0, depth + 1);
    const results = [];
    for (let t = 0; t < trials; t++) {
        const { state } = buildStateAtPath(branchPrefix, level, prep);
        const rand = mulberry32((seedBase ^ Math.imul(t + 1, 2654435761)) >>> 0);
        const epsilon = EPSILON_CHOICES[t % EPSILON_CHOICES.length];
        let outcome = 'continue';
        let nodes = 0;
        while (outcome === 'continue' && nodes < nodeCap) {
            outcome = takePly(state, level, prep, api.SCORING_PROFILES.repair, null, rand, null, epsilon, [], null, null, false);
            nodes++;
        }
        results.push({ outcome, nodes, depthReached: state.path.length - 1 });
    }
    return results;
}

function summarizeAtDepth(depth, results, reqLen) {
    const residual = reqLen - depth;
    const depths = results.map(r => r.depthReached - depth).sort((a, b) => a - b);
    const nodes = results.map(r => r.nodes).sort((a, b) => a - b);
    const q = (arr, p) => arr.length ? arr[Math.floor(p * (arr.length - 1))] : null;
    const solved = results.filter(r => r.outcome === 'solved').length;
    return {
        branchDepth: depth,
        residual,
        trials: results.length,
        solvedInRollout: solved,
        progressMedian: q(depths, 0.5),
        progressP90: q(depths, 0.9),
        progressMax: depths.length ? depths[depths.length - 1] : null,
        progressFractionOfResidualMax: residual > 0 && depths.length ? Math.min(1, depths[depths.length - 1] / residual) : null,
        avgNodesPerTrial: nodes.length ? nodes.reduce((a, b) => a + b, 0) / nodes.length : null,
    };
}

/** Sweeps the backoff ladder (steps back from `anchorDepth`) and runs a rollout batch at each
 *  depth that's still >= 1 (need at least the gate cell to roll out from). `anchorDepth` is either
 *  the elite's own dead end (CP-SAT-free mode) or a CP-SAT-verified feasible depth (--retreat-file
 *  mode, where depth=anchor itself — backoff 0 — is the actually-interesting point). */
function rolloutLadder(elitePath, anchorDepth, level, prep, trials, seedBase, nodeCap, backoffList) {
    const depths = [...new Set(backoffList.map(b => anchorDepth - b).filter(d => d >= 1))].sort((a, b) => a - b);
    return depths.map(depth => {
        const results = rolloutsAtDepth(elitePath, depth, level, prep, trials, seedBase ^ depth, nodeCap);
        return summarizeAtDepth(depth, results, level.reqLen);
    });
}

function levelBase(id, raw, level) {
    const features = levelFeatures(raw);
    return {
        id, provenance: provenance[id] ?? 'unknown', reqLen: level.reqLen,
        blocks: features.blocks, blocksFraction: Number((features.blocks / features.area).toFixed(4)),
        mustCross: features.mustCross, reqInt: features.reqInt, requiredPathCoverageRatio: Number(features.requiredPathCoverageRatio.toFixed(4)),
    };
}

const levelResults = [];

if (retreatFile) {
    // ─── CP-SAT-anchored mode: reuse repair-retreat-binary-search.mjs's own output directly. Each
    // entry's `low` is the deepest depth CP-SAT proved still has an exact completion; that is the
    // point this mode actually tests blind rollout from, not a raw elite's own (unverified) dead
    // end. `elite.path` in that file's dump format is already the packed-key path this tool needs.
    const retreat = JSON.parse(readFileSync(retreatFile, 'utf8'));
    for (const [eliteId, r] of Object.entries(retreat.results ?? {})) {
        const { elite } = r;
        const id = elite.levelId;
        const raw = byId.get(id);
        if (!raw) { console.error(`${eliteId}: level ${id} not found in --corpus, skipping`); continue; }
        if (r.low == null || r.high == null) {
            console.error(`${eliteId}: no resolved boundary (${r.note}), skipping`);
            continue;
        }
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const prep = api.prepLevel(level);
        prep._cfg = null;
        prep._metrics = { nodesExpanded: 0 };

        const ladder = rolloutLadder(elite.path, r.low, level, prep, rolloutTrials, hashSeed(`${seedStr}:${eliteId}`), rolloutNodeCap, backoffs);
        console.error(`${eliteId}: verifiedFeasibleDepth=${r.low} verifiedInfeasibleDepth=${r.high} eliteLength=${elite.eliteLength}`);
        for (const row of ladder) {
            console.error(`  depth=${row.branchDepth} (verified-boundary backoff=${r.low - row.branchDepth}) residual=${row.residual} `
                + `progressMax=${row.progressMax} progressFractionMax=${row.progressFractionOfResidualMax?.toFixed(2)} solvedInRollout=${row.solvedInRollout}/${rolloutTrials}`);
        }
        let searchCompletionFromPartialPathResult = null;
        if (closeGapNodeBudget > 0) {
            searchCompletionFromPartialPathResult = closeGapAtDepth(elite.path, r.low, level, prep, closeGapNodeBudget);
            console.error(`  searchCompletionFromPartialPath(floor=0, nodeBudget=${closeGapNodeBudget}) from depth=${r.low}: `
                + `${searchCompletionFromPartialPathResult.solved ? 'SOLVED' : 'failed'} (${searchCompletionFromPartialPathResult.nodes} nodes)`);
        }
        levelResults.push({
            ...levelBase(id, raw, level), eliteId, verifiedFeasibleDepth: r.low, verifiedInfeasibleDepth: r.high,
            eliteLength: elite.eliteLength, badness: elite.badness, rolloutLadder: ladder, searchCompletionFromPartialPathResult,
        });
    }
} else {
    // ─── CP-SAT-free mode (closed negative at pilot scale, see file header) ───
    for (const id of targetIds) {
        const raw = byId.get(id);
        if (!raw) { console.error(`${id}: not found in corpus, skipping`); continue; }
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const prep = api.prepLevel(level);
        prep._cfg = null;
        prep._metrics = { nodesExpanded: 0 };
        const arrivals = [];
        prep._repairEliteResearchObserver = { observe: record => arrivals.push(record) };
        const gateKey = level.gateKeys[0];
        const solved = await repairSearchFromGate(gateKey, level, prep, api.SCORING_PROFILES.repair, 120000, Date.now(), null,
            null, false, eliteNodeBudget, {});

        const base = levelBase(id, raw, level);

        if (solved) {
            levelResults.push({ ...base, solvedDuringEliteGathering: true, elites: null });
            console.error(`${id}: solved directly during elite-gathering pass (${eliteNodeBudget}-node budget) — no plateau to characterize`);
            continue;
        }
        if (arrivals.length === 0) {
            levelResults.push({ ...base, solvedDuringEliteGathering: false, elites: null, note: 'no elite candidates recorded' });
            console.error(`${id}: no elite candidates recorded within budget, skipping rollout`);
            continue;
        }
        const unique = new Map();
        for (const record of arrivals) {
            const key = record.path.join(',');
            const prior = unique.get(key);
            if (!prior || record.badness < prior.badness) unique.set(key, record);
        }
        const topElites = [...unique.values()].sort((a, b) => a.badness - b.badness || b.path.length - a.path.length).slice(0, elitesPerLevel);

        const eliteResults = topElites.map((elite, i) => {
            const anchorDepth = elite.path.length - 1;
            const ladder = rolloutLadder(elite.path, anchorDepth, level, prep, rolloutTrials, hashSeed(`${seedStr}:${id}:${i}`), rolloutNodeCap, backoffs);
            console.error(`${id} elite[${i}]: badness=${elite.badness} eliteLength=${anchorDepth}`);
            for (const r of ladder) {
                console.error(`  backoff=${anchorDepth - r.branchDepth} depth=${r.branchDepth} residual=${r.residual} `
                    + `progressMax=${r.progressMax} progressFractionMax=${r.progressFractionOfResidualMax?.toFixed(2)} solvedInRollout=${r.solvedInRollout}/${rolloutTrials}`);
            }
            return { badness: elite.badness, eliteLength: anchorDepth, arrivalNodes: elite.arrivalNodes, rolloutLadder: ladder };
        });
        levelResults.push({ ...base, solvedDuringEliteGathering: false, elites: eliteResults });
    }
}

mkdirSync(path.dirname(outFile), { recursive: true });
const output = {
    generatedAt: new Date().toISOString(), corpus: corpusFile, eliteNodeBudget, rolloutTrials, rolloutNodeCap, seed: seedStr,
    retreatFile: retreatFile ?? null,
    method: retreatFile
        ? 'CP-SAT-anchored: rollouts start from a verified-feasible depth (repair-retreat-binary-search.mjs output), not a raw elite dead end'
        : 'observational only; no CP-SAT feasibility verification; rollout progress is a proxy for local-search forgivingness, not a completion-existence proof — see file header',
    levels: levelResults,
};
writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
