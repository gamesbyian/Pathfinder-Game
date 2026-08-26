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
const limit = argMap.has('--limit') ? Number(argMap.get('--limit')) : Infinity;
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
    return attempt.bestBadness == null || attempt.bestBadness <= maxBadness;
});

// `--offset` (applied first) skips a prefix of candidates in census order, purely to let a
// follow-up pilot select rows disjoint from an earlier one's — not outcome-based. `--limit`
// truncates to the first N candidates after that (compute-boundedness, not outcome selection);
// `--sample-every` (applied after offset, before limit) is the alternative stride-based reducer —
// combine only deliberately, since all three change which rows are covered.
const selected = candidates.slice(offset).filter((_, i) => i % sampleEvery === 0).slice(0, limit);

console.log(`restart-continuation-population-pilot: census=${censusPath} (${census.solved}/${census.total} solved, commit ${census.commitSha})`);
console.log(`population: ${candidates.length} unsolved levels with a repair-probe attempt; offset=${offset}, sampling every ${sampleEvery}th, limit=${Number.isFinite(limit) ? limit : '(none)'} -> ${selected.length} levels; work-budget=${workBudget}; restart-split=${restartSplitFraction}`);

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
    const result = await runRepairRestartVsContinuation(gateKey, level, () => prepLevel(level), profile, workBudget, { budgetMs: 120_000, restartSplitFraction });
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
