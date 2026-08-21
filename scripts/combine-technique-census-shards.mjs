#!/usr/bin/env node
/**
 * technique-census: combine step.
 *
 * Runs ONCE, after every shard job has finished — the ONLY place in this pipeline that writes to
 * git-tracked corpus/hint files, deliberately (see technique-census.mjs's own header for why the
 * shards themselves never do). Merges every shard's result file (downloaded artifacts, one
 * `shard-NN.json` per subdirectory under --staging-dir, same layout method-probe-sweep.yml's own
 * combine step already uses) into:
 *
 *   - combined-cells.json           the full flat cross-matrix (every cell, every tier) — the
 *                                    reusable research artifact everything else derives from.
 *   - technique-capability-summary.md   per-technique solve count/rate + cost stats, split into the
 *                                    previously-unsolved and previously-solved halves of T1's now-
 *                                    full population (see the full-parity note below).
 *   - level-technique-coverage.json     per level: which T1 techniques solved it alone — feeds the
 *                                    starved-vs-blind-spot question directly (a level with zero
 *                                    isolated-technique solves anywhere is a genuinely different
 *                                    kind of unsolved than one an isolated technique DOES crack).
 *   - pair-synergy.md                for each T3 pair: levels the PAIR solves that NEITHER single
 *                                    technique does alone (joined against T1's per-technique data).
 *   - flag-sensitivity.md            for each T1_PROMOTED_VARIANTS flag/variant: levels it flips
 *                                    relative to its own base technique's default-flag T1 reading —
 *                                    BOTH directions (helps a previously-failing technique, or
 *                                    REGRESSES a previously-working one), the latter split out by
 *                                    whether the level is one the production ladder currently solves
 *                                    at all. Also covers T4 (currently empty).
 *
 * FULL-PARITY REVISION (2026-08-19): T1 now covers EVERY level in all 3 corpora (solved and
 * unsolved), not just the previously-unsolved population — see build-technique-census-plan.mjs's own
 * header for why (a real gap: an unsolved-only design can never observe a technique/flag combination
 * that breaks a level production currently solves — precisely how the queue's own Priority 0
 * regression was found in the first place). This combine step classifies each T1 cell's level as
 * previously-solved/-unsolved by re-loading the SAME baseline `summary.json` the plan was built
 * from (`plan.baselineFile`) — not stored per-cell in the shard output, to keep that file lean.
 * T2 (the old cheap breadth tier) is retired; there is no T2 data to merge here anymore.
 *
 * Then persists every genuinely new, referee-valid solve into the real hint corpus via the SAME
 * createHintCapture/provenanceFromSolveResult path every other tool in this codebase uses (never
 * hand-rolled — see CLAUDE.md's provenance section) — one hintCapture instance per corpus file,
 * each flushed exactly once, so a level solved by cells from several different shards still gets
 * every discovery recorded as its own provenance entry (createHintCapture's own dedup-by-identity
 * logic already handles two shards finding the SAME path safely).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/combine-technique-census-shards.mjs -- \
 *     --staging-dir=artifact-staging --out-dir=reports/stress/technique-census/RUN_ID \
 *     --plan=/path/to/plan.json --save-hints --solver-version=<commit-sha>
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { readLevelsWithHints } from './level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--') && !a.includes('=')));

const STAGING_DIR = args.get('--staging-dir') || 'artifact-staging';
const OUT_DIR = args.get('--out-dir') || 'reports/stress/technique-census/latest';
const PLAN_FILE = args.get('--plan');
const SAVE_HINTS = flags.has('--save-hints');
const SOLVER_VERSION = args.get('--solver-version') || null;

installBrowserStubs();

const CORPUS_FILES = { published: 'data/levels.json', corpus1: 'data/stress/stress-levels.json', corpus2: 'data/stress/stress-levels-random.json' };

// ─── "Previously solved by production?" classification — re-derived from the SAME baseline the plan
// was built from (plan.baselineFile), matching build-technique-census-plan.mjs's own isSolved()
// exactly (published always counted solved; corpus1/corpus2 via the baseline's own solvedIds sets).
// Not carried per-cell in shard output to keep that file lean — cheap to recompute here once.
let wasSolvedBaseline = () => false;
if (PLAN_FILE) {
    try {
        const plan = JSON.parse(readFileSync(path.resolve(PLAN_FILE), 'utf8'));
        const baseline = JSON.parse(readFileSync(path.resolve(plan.baselineFile), 'utf8'));
        const solvedIds = {
            corpus1: new Set(baseline.corpus1?.solvedIds ?? []),
            corpus2: new Set(baseline.corpus2?.solvedIds ?? []),
        };
        wasSolvedBaseline = (corpus, levelId) => corpus === 'published' ? true : (solvedIds[corpus]?.has(levelId) ?? false);
    } catch (err) {
        console.error(`combine: could not load baseline via --plan (${PLAN_FILE}) for solved/unsolved classification — proceeding with everything treated as "unknown" (${err?.message ?? err}).`);
    }
}

// ─── Load every shard's results ─────────────────────────────────────────────────────────────────
const dirs = readdirSync(STAGING_DIR).filter(d => statSync(path.join(STAGING_DIR, d)).isDirectory() && d.startsWith('technique-census-shard-'));
let allResults = [];
const missing = [];
const partial = [];
for (const d of dirs.sort()) {
    const shardPath = path.join(STAGING_DIR, d);
    const files = readdirSync(shardPath).filter(f => /^shard-\d+\.json$/.test(f));
    if (files.length === 0) { missing.push(d); continue; }
    const data = JSON.parse(readFileSync(path.join(shardPath, files[0]), 'utf8'));
    if (data.partial) partial.push(d);
    allResults = allResults.concat(data.results || []);
}

console.log(`technique-census combine: ${allResults.length} cell results from ${dirs.length - missing.length}/${dirs.length} shards (${missing.length} missing, ${partial.length} still marked partial)`);

// ─── combined-cells.json — the reusable cross-matrix ────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'combined-cells.json'), JSON.stringify({ generatedAt: new Date().toISOString(), missingShards: missing, partialShards: partial, totalCells: allResults.length, results: allResults }));

// ─── technique-capability-summary.md ────────────────────────────────────────────────────────────
// identityKey: a promoted flag variant (r.variantLabel set) is its OWN row, distinct from its base
// technique's plain (ablation: null) entry — they are genuinely different configurations that
// happen to share a techniqueKey, and merging them would silently blend two different capability
// readings into one (a variant's extra solves misattributed to the base technique, or vice versa).
function identityKey(r) { return r.variantLabel ?? r.techniqueKeys[0]; }
function wasSolved(r) { return wasSolvedBaseline(r.corpus, r.levelId); }
function techniqueStats(tier, filterFn = () => true) {
    const byKey = new Map();
    for (const r of allResults) {
        if (r.tier !== tier || (r.techniqueKeys?.length ?? 0) !== 1 || !filterFn(r)) continue;
        const key = identityKey(r);
        if (!byKey.has(key)) byKey.set(key, { total: 0, ok: 0, nodeBudgetReached: 0, exhausted: 0, refereeInvalid: 0, error: 0, sumMs: 0, solveNodes: [] });
        const s = byKey.get(key);
        s.total++; s.sumMs += r.totalMs ?? 0;
        if (r.ok) { s.ok++; s.solveNodes.push(r.nodesExpanded); }
        else if (r.status === 'node-budget-reached') s.nodeBudgetReached++;
        else if (r.status === 'exhausted') s.exhausted++;
        else if (r.status === 'referee-invalid') s.refereeInvalid++;
        else if (r.status === 'error') s.error++;
    }
    return byKey;
}
// Split T1's now-full population (2026-08-19 full-parity revision) into the two halves that answer
// genuinely different questions: "unsolved" is the decision-bearing capability-gap read (can any
// isolated technique crack what production can't); "solved" is the regression-safety read (does any
// technique/variant fail — or a flag REGRESS — a level production currently handles). Merging them
// into one table would blend two different populations' solve rates into a meaningless average.
const t1StatsUnsolved = techniqueStats('T1', r => !wasSolved(r));
const t1StatsSolved = techniqueStats('T1', r => wasSolved(r));
// Per-technique UNIQUE solve count within T1 (2026-08-19, per external review point 6), split by the
// same solved/unsolved halves as the stats tables above: a level counts toward a technique's
// "unique" total only if that technique is the ONLY T1 entry (default key OR promoted variant) that
// solves it — the specialist signal ("few total solves, many unique solves" identifies a technique
// worth keeping even if its raw solve count looks unremarkable).
function solversByLevel(filterFn) {
    const byLevel = new Map(); // "corpus/levelPos" -> Set<identityKey>
    for (const r of allResults) {
        if (r.tier !== 'T1' || (r.techniqueKeys?.length ?? 0) !== 1 || !r.ok || !filterFn(r)) continue;
        const lk = `${r.corpus}/${r.levelPos}`;
        if (!byLevel.has(lk)) byLevel.set(lk, new Set());
        byLevel.get(lk).add(identityKey(r));
    }
    return byLevel;
}
function uniqueCounts(byLevel) {
    const counts = new Map(); // identityKey -> count
    for (const solvers of byLevel.values()) if (solvers.size === 1) {
        const only = [...solvers][0];
        counts.set(only, (counts.get(only) ?? 0) + 1);
    }
    return counts;
}
const t1SolversByLevelUnsolved = solversByLevel(r => !wasSolved(r));
const t1SolversByLevelSolved = solversByLevel(r => wasSolved(r));
const uniqueSolveCountsUnsolved = uniqueCounts(t1SolversByLevelUnsolved);
const uniqueSolveCountsSolved = uniqueCounts(t1SolversByLevelSolved);
function median(nums) {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
function statsTable(byKey, uniqueSolveCounts) {
    const rows = [...byKey.entries()].sort((a, b) => b[1].ok - a[1].ok || a[0].localeCompare(b[0]));
    const header = '| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |';
    const rule = '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|';
    return [header, rule, ...rows.map(([k, s]) => {
        const uniqueCol = ` ${uniqueSolveCounts.get(k) ?? 0} |`;
        const rest = ` ${s.nodeBudgetReached} | ${s.exhausted} | ${s.refereeInvalid} | ${s.error} | ${s.total} | ${(100 * s.ok / s.total).toFixed(1)}% | ${Math.round(s.sumMs / s.total)} |`;
        return `| \`${k}\` | ${s.ok} |` + uniqueCol + rest + ` ${median(s.solveNodes) ?? '—'} |`;
    })].join('\n');
}
// ─── The oracle union (2026-08-19, per external review point 5 -- the single most important number
// this run produces; re-scoped 2026-08-19's full-parity revision to T1's previously-unsolved subset,
// since T1 now also covers previously-solved levels where "does an isolated technique solve it" is a
// different, regression-safety question, not this one): of the levels the production ladder could
// NOT solve at the frozen baseline, how many does AT LEAST ONE isolated technique solve when given
// the full budget to itself? This directly separates "production fails because no existing technique
// can do it" from "production fails because of scheduling/allocation" -- a large oracle union means
// the next big lever is smarter routing (queue Priority 1), not new algorithms.
const unsolvedLevelKeys = new Set(allResults.filter(r => r.tier === 'T1' && !wasSolved(r)).map(r => `${r.corpus}/${r.levelPos}`));
const oracleSolved = [...t1SolversByLevelUnsolved.keys()].length;
const oracleLine = `**Oracle union**: of ${unsolvedLevelKeys.size} levels currently unsolved by the production ladder at the frozen baseline, ${oracleSolved} (${unsolvedLevelKeys.size ? (100 * oracleSolved / unsolvedLevelKeys.size).toFixed(1) : '0.0'}%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.`;
// The regression-safety counterpart: among levels the ladder DOES currently solve, is there one with
// literally ZERO isolated T1 solvers at all (every one of 34+7 techniques failed in isolation)? A
// single technique failing a solved level is routine (most levels are solved by only 1-2 techniques
// in production); a level with NO isolated solver anywhere would mean this run's own full-budget
// isolation setup (fair per-gate share, referee validation, etc.) diverges from how production
// actually solves it, worth investigating directly rather than a silent anomaly.
const solvedLevelKeys = new Set(allResults.filter(r => r.tier === 'T1' && wasSolved(r)).map(r => `${r.corpus}/${r.levelPos}`));
const solvedWithZeroIsolatedSolvers = [...solvedLevelKeys].filter(lk => !t1SolversByLevelSolved.has(lk));
const regressionLine = `**Regression check**: of ${solvedLevelKeys.size} levels the production ladder currently solves, ${solvedWithZeroIsolatedSolvers.length} have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).`;
const capabilitySummary = [
    '# Technique capability census — technique summary', '',
    `Cross-matrix: ${allResults.length} cells. Missing shards: ${missing.length ? missing.join(', ') : 'none'}.`, '',
    oracleLine, '', regressionLine, '',
    '## T1 — previously-unsolved population (the capability-gap read)', '',
    statsTable(t1StatsUnsolved, uniqueSolveCountsUnsolved), '',
    '## T1 — previously-solved population (the regression-safety read)', '',
    statsTable(t1StatsSolved, uniqueSolveCountsSolved), '',
].join('\n');
writeFileSync(path.join(OUT_DIR, 'technique-capability-summary.md'), capabilitySummary + '\n');

// ─── level-technique-coverage.json — per level, which techniques solved it alone ───────────────────
const coverage = new Map(); // "corpus/levelId" -> { corpus, levelId, wasSolvedByProduction, solvedByT1: [...] }
for (const r of allResults) {
    if (r.tier !== 'T1' || (r.techniqueKeys?.length ?? 0) !== 1) continue;
    const k = `${r.corpus}/${r.levelId}`;
    if (!coverage.has(k)) coverage.set(k, { corpus: r.corpus, levelId: r.levelId, wasSolvedByProduction: wasSolved(r), solvedByT1: [] });
    if (r.ok) coverage.get(k).solvedByT1.push(identityKey(r));
}
writeFileSync(path.join(OUT_DIR, 'level-technique-coverage.json'), JSON.stringify([...coverage.values()]));
const zeroIsolatedSolves = [...coverage.values()].filter(c => !c.wasSolvedByProduction && c.solvedByT1.length === 0);

// ─── pair-synergy.md — T3 pairs vs. their own members' T1 results ─────────────────────────────────
// DEFAULT (ablation: null) T1 rows only -- a promoted variant's reading is a different config and
// must never silently become "the" baseline a pair or flag experiment is compared against.
const t1ByLevelTechnique = new Map(); // "corpus/levelPos/key" -> ok
for (const r of allResults) if (r.tier === 'T1' && (r.techniqueKeys?.length ?? 0) === 1 && !r.ablation) t1ByLevelTechnique.set(`${r.corpus}/${r.levelPos}/${r.techniqueKeys[0]}`, r.ok);
const pairRows = new Map(); // pairLabel -> { total, pairSolved, neitherAloneSolved }
for (const r of allResults) {
    if (r.tier !== 'T3') continue;
    const label = r.pairLabel;
    if (!pairRows.has(label)) pairRows.set(label, { total: 0, pairSolved: 0, neitherAloneSolved: 0 });
    const s = pairRows.get(label);
    s.total++;
    if (r.ok) {
        s.pairSolved++;
        const aloneOk = r.techniqueKeys.some(k => t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${k}`) === true);
        if (!aloneOk) s.neitherAloneSolved++;
    }
}
const pairSummary = [
    '# Technique capability census — pair synergy (T3)', '',
    '"neither alone" = the pair solved a level where T1\'s data shows NEITHER member solved it by itself — the genuine synergy signal.', '',
    '| pair | pair solved | neither alone | total | synergy rate |',
    '|---|---:|---:|---:|---:|',
    ...[...pairRows.entries()].map(([label, s]) => `| \`${label}\` | ${s.pairSolved} | ${s.neitherAloneSolved} | ${s.total} | ${s.pairSolved ? (100 * s.neitherAloneSolved / s.pairSolved).toFixed(1) : '0.0'}% |`),
].join('\n');
writeFileSync(path.join(OUT_DIR, 'pair-synergy.md'), pairSummary + '\n');

// ─── flag-sensitivity.md — every T1_PROMOTED_VARIANTS flag/variant (plus T4, currently empty) vs.
// its own base technique's default-flag T1 reading for the SAME (level, technique) pair ───────────
// Two directions, not one — this is the 2026-08-19 full-parity revision's main new analysis, added
// directly in response to the gap that prompted the whole revision (an unsolved-only design could
// never see a flag/variant BREAK a level production currently solves):
//   "flipped on"  = variant/flag-arm solves a (technique, level) pair the default arm fails — helps.
//   "regressed"   = default arm solves it, but the variant/flag-arm FAILS it — hurts. Split further
//                   into "on a previously-solved level" (the headline safety number: did this flag
//                   break something the production ladder actually relies on right now) vs. "on a
//                   previously-unsolved level" (less alarming — the default arm solving it just means
//                   SOME technique/config combination reaches it, not that production currently does).
function variantRows() {
    const byLabel = new Map(); // label -> { total, variantSolved, comparable, baselineSolved, flippedOn, regressed, regressedOnSolvedLevel }
    // T1's own promoted-variant cells (r.variantLabel set) — the primary source now that T4 is empty.
    for (const r of allResults) {
        if (r.tier !== 'T1' || !r.variantLabel) continue;
        const label = r.variantLabel;
        if (!byLabel.has(label)) byLabel.set(label, { total: 0, variantSolved: 0, comparable: 0, baselineSolved: 0, flippedOn: 0, regressed: 0, regressedOnSolvedLevel: 0 });
        const s = byLabel.get(label);
        s.total++;
        if (r.ok) s.variantSolved++;
        const baselineOk = t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${r.techniqueKeys[0]}`);
        if (baselineOk === undefined) continue; // no default-arm baseline for this exact technique+level (e.g. turnBiased has no unflagged equivalent)
        s.comparable++;
        if (baselineOk) s.baselineSolved++;
        if (r.ok && !baselineOk) s.flippedOn++;
        if (!r.ok && baselineOk) {
            s.regressed++;
            if (wasSolved(r)) s.regressedOnSolvedLevel++;
        }
    }
    // T4 (structurally kept, currently empty — see build-technique-census-plan.mjs's FLAG_EXPERIMENTS).
    for (const r of allResults) {
        if (r.tier !== 'T4') continue;
        const label = r.flagExperiment;
        if (!byLabel.has(label)) byLabel.set(label, { total: 0, variantSolved: 0, comparable: 0, baselineSolved: 0, flippedOn: 0, regressed: 0, regressedOnSolvedLevel: 0 });
        const s = byLabel.get(label);
        s.total++;
        if (r.ok) s.variantSolved++;
        const baselineReadings = r.techniqueKeys.map(k => t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${k}`));
        if (baselineReadings.some(v => v === undefined)) continue;
        s.comparable++;
        const baselineOk = baselineReadings.some(v => v === true);
        if (baselineOk) s.baselineSolved++;
        if (r.ok && !baselineOk) s.flippedOn++;
        if (!r.ok && baselineOk) {
            s.regressed++;
            if (wasSolved(r)) s.regressedOnSolvedLevel++;
        }
    }
    return byLabel;
}
const flagRows = variantRows();
const flagSummary = [
    '# Technique capability census — flag/variant sensitivity', '',
    '"flipped on" = the variant/flag-arm solves a (technique, level) pair the default arm fails — helps. "regressed" = the default arm solves it but the variant/flag-arm FAILS it — hurts; "on solved level" narrows that to levels the production ladder currently solves at all, the direct answer to "did this flag break something that works."', '',
    '| variant/experiment | arm solved | comparable | baseline solved | flipped on | regressed | regressed on solved level |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...[...flagRows.entries()].map(([label, s]) => `| \`${label}\` | ${s.variantSolved} | ${s.comparable} | ${s.baselineSolved} | ${s.flippedOn} | ${s.regressed} | ${s.regressedOnSolvedLevel} |`),
].join('\n');
writeFileSync(path.join(OUT_DIR, 'flag-sensitivity.md'), flagSummary + '\n');

// ─── Persist novel solutions/provenance (the ONLY writer to git-tracked hint/corpus files) ─────────
let hintFilesChanged = 0;
if (SAVE_HINTS) {
    const byCorpus = new Map();
    for (const r of allResults) {
        if (!r.ok || !r.solution) continue;
        if (!byCorpus.has(r.corpus)) byCorpus.set(r.corpus, []);
        byCorpus.get(r.corpus).push(r);
    }
    for (const [corpus, cellResults] of byCorpus) {
        const corpusPath = CORPUS_FILES[corpus];
        // readLevelsWithHints, NOT a raw JSON.parse: it stashes each level's starting .hints/
        // .hintRecords array REFERENCES in UNTOUCHED_HINTS_STATE, which is what lets
        // writeLevelsWithHints skip every level this run never actually touched. A raw parse skips
        // that registration entirely, and writeLevelsWithHints treats an unregistered level as
        // "always considered touched" (its own doc comment) — every level in the corpus gets
        // rewritten regardless of whether it changed, discovered locally: a 1-level test run
        // rewrote all 160 published hint files before this fix.
        const levels = readLevelsWithHints(path.resolve(corpusPath));
        // isolatedTechnique: true — every cell here ran ONE technique alone (T1's isolated-
        // technique census), never the real competitively-budgeted solveLevel() ladder, so a find
        // persisted from this tool must not be misread as ordinary production-solver capability
        // evidence (docs/solver-optimization-current-queue.md's Priority 0 — this is the exact
        // contamination path that finding traced, e.g. R02900).
        const capture = await createHintCapture({ solverVersion: SOLVER_VERSION, budgetMs: null, enabled: true, isolatedTechnique: true });
        const touchedLevels = [...new Set(cellResults.map(r => levels[r.levelPos - 1]))];
        await capture.prepare(touchedLevels);
        // Deterministic order (sorted by cellId) so a re-run of the same combine step against the
        // same shard data produces byte-identical provenance ordering.
        for (const r of [...cellResults].sort((a, b) => a.cellId.localeCompare(b.cellId))) {
            const level = levels[r.levelPos - 1];
            capture.record(level, { ok: true, solution: r.solution, attempts: r.attempts, nodesExpanded: r.nodesExpanded, totalMs: r.totalMs, status: r.status });
        }
        const flush = capture.flush(corpusPath, levels);
        hintFilesChanged += flush.hintFilesChanged;
        console.log(`  ${corpus}: ${flush.levelsTouched} level(s) touched, ${flush.hintFilesChanged} hint file(s) changed (${flush.newPaths} new path(s), ${flush.rediscoveries} rediscover(y/ies))`);
    }
}

// ─── Top-line summary ───────────────────────────────────────────────────────────────────────────
const solvedTotal = allResults.filter(r => r.ok).length;
const totalRegressedOnSolvedLevel = [...flagRows.values()].reduce((sum, s) => sum + s.regressedOnSolvedLevel, 0);
console.log(`Combine complete: ${solvedTotal}/${allResults.length} cells solved, ${zeroIsolatedSolves.length} previously-unsolved levels with ZERO isolated-technique solves anywhere, ${solvedWithZeroIsolatedSolvers.length} previously-solved levels with ZERO isolated-technique solvers, ${totalRegressedOnSolvedLevel} variant/flag regression(s) on a previously-solved level, ${hintFilesChanged} hint file(s) changed.`);

const topLine = [
    '# Technique capability census — run summary', '',
    `Total cells: ${allResults.length} (missing shards: ${missing.length ? missing.join(', ') : 'none'}; still-partial shards: ${partial.length ? partial.join(', ') : 'none'})`,
    `Solved: ${solvedTotal}`,
    oracleLine,
    regressionLine,
    `Variant/flag regressions on a previously-solved level (default arm solves it, variant/flag-arm doesn't): ${totalRegressedOnSolvedLevel} — see flag-sensitivity.md's "regressed on solved level" column for which variant.`,
    `Previously-unsolved levels with zero isolated-technique solves anywhere: ${zeroIsolatedSolves.length}`,
    `Hint files changed: ${hintFilesChanged}`,
    '', `Plan: \`${PLAN_FILE ?? '(not recorded)'}\``,
].join('\n');
writeFileSync(path.join(OUT_DIR, 'README.md'), topLine + '\n');
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, topLine + '\n', { flag: 'a' });
