#!/usr/bin/env node
/**
 * Winning-path archaeology (Tier 1, item 2 of
 * docs/solver-next-frontier-multilingual-research-update-2026-08-02.md's section 16 revised
 * ranking) — "establish the evidence engine" before Tier 2 item 7 (depth-reservoir beam /
 * Rectangle Search), which that same ranking explicitly gates on this measurement existing first.
 *
 * WHAT THIS MEASURES (a deliberately narrower v1 than section 9.1's full spec — see SCOPE below):
 * for each sampled level with a known, PLAY-valid winning path (a stored hint, any provenance),
 * replay the path step by step through the REAL production primitives (getNeighbors/scoreMove/
 * applyMove/undoMove, POLICY_PROFILES.default — the exact functions dfsFromGate/beamSearchFromGate
 * themselves call) and record, at each step:
 *   - candidateCount: how many legal moves scoreMove was asked to rank from this position;
 *   - rank: the known winning move's 1-indexed rank among those candidates sorted by score
 *     descending (matching production's own `pool.sort((a, b) => b.score - a.score)` convention);
 *   - scoreGap: score(rank-1 candidate) - score(winning candidate), 0 when the winner IS rank 1.
 * Levels are also cold-solved (via the same Solver.solve() production entrypoint, a modest
 * exploratory budget — see BUDGET below, NOT the authoritative corpus baseline) so results can be
 * bucketed by solved-vs-unsolved and compared.
 *
 * SCOPE (why this is "local child rank," not full section 9.1). Section 9.1 additionally asks for
 * "beam admission" (survival within a WIDTH-limited GLOBAL frontier pooled across every parent, not
 * just this one path's own local children) and "first extinction depth" in a real multi-restart
 * beam. Faithfully replaying that would mean instrumenting beamSearchFromGate's actual frontier
 * internals (a hot, optimized function) rather than calling its exported primitives from outside —
 * a materially bigger and riskier undertaking. This tool answers the narrower, still-useful
 * question section 9.1 also names first ("correct-child rank at each depth," "score gap"): does
 * the HEURISTIC ITSELF prefer the correct move, independent of beam width or pruning? A low local
 * rank does not guarantee beam survival (other parents' children could still crowd the frontier),
 * and a high local rank does not guarantee beam death (width could still be generous enough) — this
 * is a proxy, not a beam-survival simulator, and is reported as such.
 *
 * A further scope choice: candidates come straight from getNeighbors (move-LEGALITY only), not
 * post-prune-gauntlet survivors — i.e. this measures the scorer's raw preference among everything
 * legal, not "rank among what the search would have actually scored after PRUNE_MUST_PASS_LB etc.
 * already rejected some". This is the simpler, more directly diagnostic question ("does the
 * heuristic like the right move") and avoids re-implementing the full prune gauntlet a second time
 * outside search.ts.
 *
 * BUDGET. The cold-solve check uses a modest, fixed budget (see COLD_SOLVE_* below) purely to
 * bucket results into solved/unsolved for THIS report — it is explicitly NOT the corpus's
 * authoritative solved count (see data/stress/README.md for that), which uses much larger budgets.
 *
 * Persists --out after EVERY level (CLAUDE.md's batch-tool rule), not only at the end.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/winning-path-archaeology.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --count=40 --seed=1 \
 *     --out=logs/winning-path-archaeology/corpus2-sample.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/Solver.ts');
const { undoMove } = await import('../../modules/solver/search-state.ts');
const { scoreMove } = await import('../../modules/solver/scoring.ts');
const { POLICY_PROFILES } = await import('../../modules/solver/policy.ts');
const { getRealLengthFromState } = await import('../../modules/solver/solution.ts');
const Solver = createSolver();
const { prepLevel, createState, getNeighbors, applyMove } = SOLVER_TESTING_API;

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const CORPUS = arg('corpus', 'data/stress/stress-levels-random.json');
const COUNT = Number(arg('count', 40));
const SEED = Number(arg('seed', 1));
const OUT_FILE = arg('out', null);
const COLD_SOLVE_TIME_BUDGET_MS = 15000;
const COLD_SOLVE_WORK_BUDGET = 5_000_000;

const corpusLevels = readLevelsWithHints(CORPUS);
const eligible = corpusLevels
    .map((raw, idx) => ({ raw, idx }))
    .filter(({ raw }) => (raw.hintRecords || [])[0]?.path?.length >= 4);

const rng = mulberry32(SEED);
const shuffled = eligible.slice();
for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
const sample = shuffled.slice(0, COUNT);

console.log(`winning-path-archaeology: ${sample.length} level(s) sampled from ${eligible.length} eligible (of ${corpusLevels.length} total), seed=${SEED}.`);

const results = [];

function persist() {
    if (!OUT_FILE) return;
    const abs = path.resolve(process.cwd(), OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ corpus: CORPUS, count: COUNT, seed: SEED, coldSolveTimeBudgetMs: COLD_SOLVE_TIME_BUDGET_MS, coldSolveWorkBudget: COLD_SOLVE_WORK_BUDGET, results }, null, 2) + '\n');
}

for (const { raw, idx } of sample) {
    const levelId = raw.id || `pos:${idx + 1}`;
    const path0 = raw.hintRecords[0].path;

    const prodLevel = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: idx + 1 });

    let coldSolved = null;
    try {
        const coldResult = await Solver.solve(prodLevel, { timeBudgetMs: COLD_SOLVE_TIME_BUDGET_MS, workBudget: COLD_SOLVE_WORK_BUDGET });
        coldSolved = !!(coldResult && coldResult.ok && coldResult.solution);
    } catch (e) {
        console.warn(`  ${levelId}: cold-solve threw (${e.message}), recording coldSolved=null`);
    }

    const prep = prepLevel(prodLevel);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const state = createState(path0[0], prodLevel, prep);

    const steps = [];
    for (let i = 1; i < path0.length; i++) {
        const pos = state.path[state.path.length - 1];
        const winner = path0[i];
        const neighbors = getNeighbors(pos, state, prodLevel, prep);

        const scored = [];
        for (const cand of neighbors) {
            const pAtPos = prodLevel.portalMap.get(pos);
            const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === cand);
            const undo = applyMove(cand, state, prodLevel, prep, isJump);
            const realLen = getRealLengthFromState(state);
            const rSteps = prodLevel.reqLen - realLen;
            const score = scoreMove(cand, pos, state, prodLevel, prep, POLICY_PROFILES.default, rSteps, null, null);
            scored.push({ cand, score });
            undoMove(undo, state);
        }
        scored.sort((a, b) => b.score - a.score);
        const rankIdx = scored.findIndex(s => s.cand === winner);
        const rank = rankIdx === -1 ? null : rankIdx + 1;
        const winnerScore = rankIdx === -1 ? null : scored[rankIdx].score;
        const topScore = scored[0]?.score ?? null;
        steps.push({
            step: i,
            candidateCount: scored.length,
            rank,
            scoreGap: (rank !== null && topScore !== null) ? topScore - winnerScore : null,
        });

        const pAtPos2 = prodLevel.portalMap.get(pos);
        const isJump2 = !!(pAtPos2 && !state.lastWasPortalJump && pAtPos2.dest === winner);
        applyMove(winner, state, prodLevel, prep, isJump2);
    }

    const rankedSteps = steps.filter(s => s.rank !== null);
    const rank1Count = rankedSteps.filter(s => s.rank === 1).length;
    const meanRank = rankedSteps.length ? rankedSteps.reduce((a, s) => a + s.rank, 0) / rankedSteps.length : null;

    results.push({
        levelId, coldSolved, pathLength: path0.length,
        stepsMeasured: steps.length, unrankedSteps: steps.length - rankedSteps.length,
        rank1Fraction: rankedSteps.length ? rank1Count / rankedSteps.length : null,
        meanRank, steps,
    });
    console.log(`  ${levelId}: coldSolved=${coldSolved} pathLen=${path0.length} rank1Fraction=${rankedSteps.length ? (rank1Count / rankedSteps.length).toFixed(2) : 'n/a'} meanRank=${meanRank !== null ? meanRank.toFixed(2) : 'n/a'}`);
    persist();
}

function summarizeBucket(bucket) {
    const withRank = bucket.filter(r => r.rank1Fraction !== null);
    if (withRank.length === 0) return null;
    return {
        levels: withRank.length,
        meanRank1Fraction: withRank.reduce((a, r) => a + r.rank1Fraction, 0) / withRank.length,
        meanOfMeanRank: withRank.reduce((a, r) => a + (r.meanRank ?? 0), 0) / withRank.length,
    };
}

const solvedBucket = results.filter(r => r.coldSolved === true);
const unsolvedBucket = results.filter(r => r.coldSolved === false);
console.log(`\nwinning-path-archaeology summary (${results.length} levels: ${solvedBucket.length} cold-solved, ${unsolvedBucket.length} cold-unsolved at ${COLD_SOLVE_TIME_BUDGET_MS}ms/${COLD_SOLVE_WORK_BUDGET} nodes):`);
console.log('  cold-solved bucket:  ', JSON.stringify(summarizeBucket(solvedBucket)));
console.log('  cold-unsolved bucket:', JSON.stringify(summarizeBucket(unsolvedBucket)));

persist();
if (OUT_FILE) console.log(`\nWrote ${OUT_FILE}`);
