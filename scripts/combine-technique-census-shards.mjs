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
 *   - technique-capability-summary.md   per-technique solve count/rate + cost stats, T1 vs T2.
 *   - level-technique-coverage.json     per level: which T1/T2 techniques solved it alone — feeds
 *                                    the starved-vs-blind-spot question directly (a level with zero
 *                                    isolated-technique solves anywhere is a genuinely different
 *                                    kind of unsolved than one an isolated technique DOES crack).
 *   - pair-synergy.md                for each T3 pair: levels the PAIR solves that NEITHER single
 *                                    technique does alone (joined against T1's per-technique data).
 *   - flag-sensitivity.md            for each T4 experiment: levels the flag toggle flips relative
 *                                    to T1's default-flag baseline for the same technique+level.
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
function techniqueStats(tier) {
    const byKey = new Map();
    for (const r of allResults) {
        if (r.tier !== tier || (r.techniqueKeys?.length ?? 0) !== 1) continue;
        const key = r.techniqueKeys[0];
        if (!byKey.has(key)) byKey.set(key, { total: 0, ok: 0, nodeBudgetReached: 0, exhausted: 0, refereeInvalid: 0, error: 0, sumMs: 0 });
        const s = byKey.get(key);
        s.total++; s.sumMs += r.totalMs ?? 0;
        if (r.ok) s.ok++;
        else if (r.status === 'node-budget-reached') s.nodeBudgetReached++;
        else if (r.status === 'exhausted') s.exhausted++;
        else if (r.status === 'referee-invalid') s.refereeInvalid++;
        else if (r.status === 'error') s.error++;
    }
    return byKey;
}
const t1Stats = techniqueStats('T1');
const t2Stats = techniqueStats('T2');
function statsTable(byKey) {
    const rows = [...byKey.entries()].sort((a, b) => b[1].ok - a[1].ok || a[0].localeCompare(b[0]));
    return [
        '| technique | solved | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms |',
        '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
        ...rows.map(([k, s]) => `| \`${k}\` | ${s.ok} | ${s.nodeBudgetReached} | ${s.exhausted} | ${s.refereeInvalid} | ${s.error} | ${s.total} | ${(100 * s.ok / s.total).toFixed(1)}% | ${Math.round(s.sumMs / s.total)} |`),
    ].join('\n');
}
const capabilitySummary = [
    '# Technique capability census — technique summary', '',
    `Cross-matrix: ${allResults.length} cells. Missing shards: ${missing.length ? missing.join(', ') : 'none'}.`, '',
    '## T1 — full 50,000,000-node budget, isolated, currently-unsolved-level sample', '',
    statsTable(t1Stats), '',
    '## T2 — small-budget breadth pass, every level in all 3 corpora', '',
    statsTable(t2Stats), '',
].join('\n');
writeFileSync(path.join(OUT_DIR, 'technique-capability-summary.md'), capabilitySummary + '\n');

// ─── level-technique-coverage.json — per level, which techniques solved it alone (T1 ∪ T2) ────────
const coverage = new Map(); // "corpus/levelId" -> { corpus, levelId, solvedByT1: [...], solvedByT2: [...] }
for (const r of allResults) {
    if ((r.tier !== 'T1' && r.tier !== 'T2') || (r.techniqueKeys?.length ?? 0) !== 1) continue;
    const k = `${r.corpus}/${r.levelId}`;
    if (!coverage.has(k)) coverage.set(k, { corpus: r.corpus, levelId: r.levelId, solvedByT1: [], solvedByT2: [] });
    if (r.ok) coverage.get(k)[r.tier === 'T1' ? 'solvedByT1' : 'solvedByT2'].push(r.techniqueKeys[0]);
}
writeFileSync(path.join(OUT_DIR, 'level-technique-coverage.json'), JSON.stringify([...coverage.values()]));
const zeroIsolatedSolves = [...coverage.values()].filter(c => c.solvedByT1.length === 0 && c.solvedByT2.length === 0 && allResults.some(r => r.tier === 'T1' && r.corpus === c.corpus && r.levelId === c.levelId));

// ─── pair-synergy.md — T3 pairs vs. their own members' T1 results ─────────────────────────────────
const t1ByLevelTechnique = new Map(); // "corpus/levelPos/key" -> ok
for (const r of allResults) if (r.tier === 'T1' && (r.techniqueKeys?.length ?? 0) === 1) t1ByLevelTechnique.set(`${r.corpus}/${r.levelPos}/${r.techniqueKeys[0]}`, r.ok);
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

// ─── flag-sensitivity.md — T4 experiments vs. T1's default-flag baseline for the same cells ───────
const flagRows = new Map(); // experiment -> { total, flagSolved, flippedOn (solved with flag, not without), flippedOff (solved without, not with -- only meaningful if T1 also ran this exact technique) }
for (const r of allResults) {
    if (r.tier !== 'T4') continue;
    const exp = r.flagExperiment;
    if (!flagRows.has(exp)) flagRows.set(exp, { total: 0, flagSolved: 0, flippedOn: 0, baselineSolved: 0, comparable: 0 });
    const s = flagRows.get(exp);
    s.total++;
    if (r.ok) s.flagSolved++;
    // Only comparable when every technique in the cell also has a T1 baseline reading (excludes the
    // repair-turn-bias experiment's turnBiased key, which has no default-flag equivalent).
    const baselineReadings = r.techniqueKeys.map(k => t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${k}`));
    if (baselineReadings.every(v => v !== undefined)) {
        s.comparable++;
        const baselineOk = baselineReadings.some(v => v === true);
        if (baselineOk) s.baselineSolved++;
        if (r.ok && !baselineOk) s.flippedOn++;
    }
}
const flagSummary = [
    '# Technique capability census — flag sensitivity (T4)', '',
    '"flipped on" = solved WITH the flag toggle on a (technique, level) pair T1 shows fails at the default flag setting — a genuine, isolated flag effect, not confounded by budget or ladder position.', '',
    '| experiment | flag-arm solved | comparable cells | baseline solved (of comparable) | flipped on |',
    '|---|---:|---:|---:|---:|',
    ...[...flagRows.entries()].map(([exp, s]) => `| \`${exp}\` | ${s.flagSolved} | ${s.comparable} | ${s.baselineSolved} | ${s.flippedOn} |`),
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
        const capture = await createHintCapture({ solverVersion: SOLVER_VERSION, budgetMs: null, enabled: true });
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
console.log(`Combine complete: ${solvedTotal}/${allResults.length} cells solved, ${zeroIsolatedSolves.length} T1-sample levels with ZERO isolated-technique solves anywhere (T1 or T2), ${hintFilesChanged} hint file(s) changed.`);

const topLine = [
    '# Technique capability census — run summary', '',
    `Total cells: ${allResults.length} (missing shards: ${missing.length ? missing.join(', ') : 'none'}; still-partial shards: ${partial.length ? partial.join(', ') : 'none'})`,
    `Solved: ${solvedTotal}`,
    `T1-sample levels with zero isolated-technique solves anywhere: ${zeroIsolatedSolves.length}`,
    `Hint files changed: ${hintFilesChanged}`,
    '', `Plan: \`${PLAN_FILE ?? '(not recorded)'}\``,
].join('\n');
writeFileSync(path.join(OUT_DIR, 'README.md'), topLine + '\n');
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, topLine + '\n', { flag: 'a' });
