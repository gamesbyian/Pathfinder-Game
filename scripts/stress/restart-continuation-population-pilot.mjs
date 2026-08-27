#!/usr/bin/env node
/**
 * Development pilot for docs/reports/2026-08-24-restart-continuation-value-audit.md's primary
 * comparison, run over a frozen baseline-failure-conditioned residual population: levels where
 * the raised-cap census run (reports/stress/benchmark-latest-random.json, commit fc625d18,
 * budgetMs=86400000/nodeBudget=50000000/workBudget=67000000 over Corpus 2) still could not solve
 * the level, AND repair-probe actually ran on it (so repair genuinely had a chance to act, not
 * merely starved out by earlier tiers) — see that report's own lifecycle breakdown.
 *
 * For each selected level, targets the exact gateKey the census's own repair-probe attempt used,
 * then runs modules/solver/restart-continuation-harness.ts's runRepairRestartVsContinuation at a
 * fixed, prespecified `--work-budget` (independent of whatever the census itself spent — this is
 * a fresh, much smaller, deliberately bounded work envelope devoted purely to the restart-vs-
 * continuation question).
 *
 * Selection is deterministic (every Nth candidate by census level order) and disclosed, not
 * outcome-based. This is DISCOVERY/DEVELOPMENT evidence only — Corpus 2 is repeatedly-mined
 * development data — never confirmation.
 *
 * `--restart-split=<f>` (default 0.5, the audit's own primary comparison) changes what fraction
 * of the work budget seed 0 gets in the restart arm before a fresh seed 1 takes the remainder —
 * an unequal split (e.g. 0.8) is a DIFFERENT treatment from the 50/50 form, not a rescue of it;
 * see reports/2026-08-26-restart-vs-continuation-near-miss-development-pilot.md.
 *
 * `--offset=<n>` (default 0) skips the first N candidates (in the same fixed census order,
 * before `--sample-every`/`--limit`) so a follow-up pilot can select a disjoint, non-overlapping
 * slice of the same stratum without re-running or re-selecting rows an earlier pilot already
 * inspected and drew conclusions from — see reports/2026-08-26-restart-continuation-larger-w-pilot.md.
 *
 * `--min-badness=<n>` (default 0) is `--max-badness`'s companion lower bound, so a follow-up
 * pilot can select a disjoint, materially different badness band (e.g. 7-9) instead of a disjoint
 * slice of the SAME band — useful once a fixed band's whole population has already been spent
 * across earlier pilots — see reports/2026-08-27-repair-restart-continuation-production-candidate-
 * design.md.
 *
 * `--budget-ms=<ms>` (default 120000, this tool's original hardcoded per-arm wall-clock deadline)
 * must stay large enough that `--work-budget`, not this wall clock, is what actually stops a slow
 * arm — check with a small `--limit` smoke run at the intended `--work-budget` before a full pilot;
 * a silently wall-clock-truncated arm is not an equal-work comparison. See the same design report.
 *
 * `--count-only`: print just the post-badness-filter population size (before offset/sample-every/
 * limit) and exit without running anything — for a GHA planning job to shard a full population by
 * --offset/--limit ranges without duplicating this file's own selection filter.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
 *     --census=reports/stress/benchmark-latest-random.json --corpus=data/stress/stress-levels-random.json \
 *     --work-budget=2000000 --sample-every=29 --out=tmp/restart-continuation-pilot.json
 */
import path from 'node:path';
import process from 'node:process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));

const root = new URL('..', import.meta.url).pathname;
const censusPath = argMap.get('--census') || path.join(root, 'reports/stress/benchmark-latest-random.json');
const corpusPath = argMap.get('--corpus') || path.join(root, 'data/stress/stress-levels-random.json');
const workBudget = Number(argMap.get('--work-budget') || 2_000_000);
const sampleEvery = Number(argMap.get('--sample-every') || 29);
const maxBadness = argMap.has('--max-badness') ? Number(argMap.get('--max-badness')) : Infinity;
// `--min-badness` (default 0, inert): companion lower bound to `--max-badness`, so a follow-up
// pilot can select a disjoint, materially different badness band (e.g. 7-9) from an earlier one
// (e.g. 2-6) without re-including any level the earlier pilot already inspected and drew
// conclusions from — same rationale as `--offset`, but by stratum definition rather than by
// position within one fixed stratum. See reports/2026-08-27-repair-restart-continuation-
// production-candidate-design.md.
const minBadness = argMap.has('--min-badness') ? Number(argMap.get('--min-badness')) : 0;
const limit = argMap.has('--limit') ? Number(argMap.get('--limit')) : Infinity;
// `--budget-ms` (default 120_000, this tool's original hardcoded value): non-binding wall-clock
// deadline PER ARM passed through to runRepairRestartVsContinuation. Must stay large enough that
// the deterministic `--work-budget` cap, not this wall clock, is what actually stops a slow arm —
// otherwise both arms are silently right-censored by wall time before reaching equal work, which
// would confound the restart-vs-continuation comparison with wall-clock speed instead of testing
// it at equal workSpent. Exposed as a flag (rather than left hardcoded) because a much larger
// --work-budget than this tool was originally built for needs a proportionally larger deadline;
// pick it from a timing smoke check at the intended --work-budget, not by guessing.
const budgetMs = Number(argMap.get('--budget-ms') || 120_000);
const offset = argMap.has('--offset') ? Number(argMap.get('--offset')) : 0;
const restartSplitFraction = argMap.has('--restart-split') ? Number(argMap.get('--restart-split')) : 0.5;
const outPath = argMap.get('--out') || path.join(root, 'tmp/restart-continuation-pilot.json');

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { POLICY_PROFILES } = await import('../../modules/solver/policy.js');
const { runRepairRestartVsContinuation } = await import('../../modules/solver/restart-continuation-harness.js');

const Solver = createSolver();
const census = JSON.parse(readFileSync(censusPath, 'utf8'));
const corpusParsed = JSON.parse(readFileSync(corpusPath, 'utf8'));
const rawLevels = Array.isArray(corpusParsed) ? corpusParsed : corpusParsed.levels;

// Population: census-unsolved levels where a repair-probe attempt actually ran (repair got a
// genuine chance to act, as opposed to the 279/558 "routing-skipped" cases the census's own
// lifecycle-failure-map already documents as a starvation/allocation question for queue item #1,
// not this restart-vs-continuation question). `--max-badness` additionally restricts to the
// primary (seedSalt-0) repair-probe attempt's own recorded `bestBadness` — a NEAR-MISS stratum,
// disclosed and chosen on the census's pre-existing difficulty label (never on this pilot's own
// outcome): deep failures (bestBadness in the teens/twenties+, most of the population — see this
// report's own bestBadness distribution) are not close enough for ANY bounded repair work,
// continuation or restart, to plausibly close, so including them mostly measures "population too
// hard to be informative" rather than answering the scheduling question.
const primaryRepairProbe = lv => (lv.attempts || []).find(a => a.repair && a.stageId === 'repair-probe' && a.seedSalt == null);
const candidates = census.levels.filter(lv => {
    if (lv.status === 'success') return false;
    const attempt = primaryRepairProbe(lv);
    if (!attempt) return false;
    if (attempt.bestBadness == null) return minBadness <= 0;
    return attempt.bestBadness >= minBadness && attempt.bestBadness <= maxBadness;
});

// `--offset` (applied first) skips a prefix of candidates in census order, purely to let a
// follow-up pilot select rows disjoint from an earlier one's — not outcome-based. `--limit`
// truncates to the first N candidates after that (compute-boundedness, not outcome selection);
// `--sample-every` (applied after offset, before limit) is the alternative stride-based reducer —
// combine only deliberately, since all three change which rows are covered.
const selected = candidates.slice(offset).filter((_, i) => i % sampleEvery === 0).slice(0, limit);

console.log(`restart-continuation-population-pilot: census=${censusPath} (${census.solved}/${census.total} solved, commit ${census.commitSha})`);
console.log(`population: ${candidates.length} unsolved levels with a repair-probe attempt (min-badness=${minBadness}, max-badness=${Number.isFinite(maxBadness) ? maxBadness : '(none)'}); offset=${offset}, sampling every ${sampleEvery}th, limit=${Number.isFinite(limit) ? limit : '(none)'} -> ${selected.length} levels; work-budget=${workBudget}; restart-split=${restartSplitFraction}; budget-ms=${budgetMs}`);

// --count-only: print the population size (post min/max-badness filter, pre offset/sample-every/
// limit) and exit, for a GHA planning job that shards a full population by --offset/--limit ranges
// without duplicating this file's own selection filter. No solver work is run.
if (args.includes('--count-only')) {
    console.log(candidates.length);
    process.exit(0);
}

const results = [];
for (const lv of selected) {
    const raw = rawLevels[lv.level - 1];
    if (!raw || raw.id !== lv.id) { console.error(`SKIP ${lv.id}: corpus position ${lv.level} mismatch (found ${raw?.id ?? 'nothing'})`); continue; }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: lv.level });
    const repairAttempt = primaryRepairProbe(lv);
    const gateKey = repairAttempt.gateKey;
    const censusBestBadness = repairAttempt.bestBadness;
    if (!level.gateKeys.includes(gateKey)) { console.error(`SKIP ${lv.id}: census gateKey ${gateKey} not present on re-prepared level`); continue; }
    const profile = POLICY_PROFILES.repair ?? POLICY_PROFILES.default;
    const start = Date.now();
    const result = await runRepairRestartVsContinuation(gateKey, level, () => prepLevel(level), profile, workBudget, { budgetMs, restartSplitFraction });
    const elapsedMs = Date.now() - start;
    console.log(`${lv.id} (pos ${lv.level}, censusBestBadness=${censusBestBadness}): `
        + `continuation solved=${result.continuation.solved} workSpent=${result.continuation.workSpent} bestBadness=${result.continuation.bestBadness} | `
        + `restart solved=${result.restart.solved} workSpent=${result.restart.workSpent} bestBadness=${result.restart.bestBadness} seeds=[${result.restart.seedSalts.join(',')}] | ${elapsedMs}ms`);
    results.push({ id: lv.id, level: lv.level, gateKey, censusBestBadness, elapsedMs, ...result });
}

const gains = results.filter(r => r.restart.solved && !r.continuation.solved).map(r => r.id);
const losses = results.filter(r => !r.restart.solved && r.continuation.solved).map(r => r.id);
const bothSolved = results.filter(r => r.restart.solved && r.continuation.solved).length;
const neitherSolved = results.filter(r => !r.restart.solved && !r.continuation.solved).length;

console.log(`\nSummary over ${results.length} levels: continuation solved ${results.filter(r => r.continuation.solved).length}, restart solved ${results.filter(r => r.restart.solved).length}`);
console.log(`both solved: ${bothSolved}, neither solved: ${neitherSolved}, restart-only gains: ${gains.length} [${gains.join(',')}], restart-only losses: ${losses.length} [${losses.join(',')}]`);

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
    censusPath, censusCommit: census.commitSha, corpusPath, workBudget, sampleEvery,
    populationSize: candidates.length, sampledSize: selected.length, results,
}, null, 2));
console.log(`\nWrote ${outPath}`);
