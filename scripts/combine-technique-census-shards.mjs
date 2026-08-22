#!/usr/bin/env node
/**
 * Combine technique-census shard results into reusable aggregate reports and optionally persist
 * newly discovered hints. Supports --combined-file for re-deriving reports from an already-committed
 * raw matrix without rerunning the expensive census; add --derived-only to leave that raw file intact.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { readLevelsWithHints } from './level-data-io.mjs';
import {
    dedupeTechniqueCensusResults,
    inferredVariantLabel,
    techniqueCensusIdentityKey,
} from './technique-census-result-lib.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const flags = new Set(argv.filter(a => a.startsWith('--') && !a.includes('=')));

const STAGING_DIR = args.get('--staging-dir') || 'artifact-staging';
const OUT_DIR = args.get('--out-dir') || 'reports/stress/technique-census/latest';
const PLAN_FILE = args.get('--plan');
const COMBINED_FILE = args.get('--combined-file');
const SAVE_HINTS = flags.has('--save-hints');
const DERIVED_ONLY = flags.has('--derived-only');
const SOLVER_VERSION = args.get('--solver-version') || null;

installBrowserStubs();
const CORPUS_FILES = {
    published: 'data/levels.json',
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
};

let wasSolvedBaseline = () => false;
if (PLAN_FILE) {
    try {
        const plan = JSON.parse(readFileSync(path.resolve(PLAN_FILE), 'utf8'));
        const baseline = JSON.parse(readFileSync(path.resolve(plan.baselineFile), 'utf8'));
        const solvedIds = {
            corpus1: new Set(baseline.corpus1?.solvedIds ?? []),
            corpus2: new Set(baseline.corpus2?.solvedIds ?? []),
        };
        wasSolvedBaseline = (corpus, levelId) => corpus === 'published' || (solvedIds[corpus]?.has(levelId) ?? false);
    } catch (err) {
        console.error(`combine: could not load baseline via --plan (${PLAN_FILE}); treating levels as unknown (${err?.message ?? err}).`);
    }
}

let rawResults = [];
let missing = [];
let partial = [];
if (COMBINED_FILE) {
    const existing = JSON.parse(readFileSync(path.resolve(COMBINED_FILE), 'utf8'));
    rawResults = existing.results ?? [];
    missing = existing.missingShards ?? [];
    partial = existing.partialShards ?? [];
} else {
    const dirs = readdirSync(STAGING_DIR).filter(d =>
        statSync(path.join(STAGING_DIR, d)).isDirectory() && d.startsWith('technique-census-shard-'));
    for (const d of dirs.sort()) {
        const shardPath = path.join(STAGING_DIR, d);
        const files = readdirSync(shardPath).filter(f => /^shard-\d+\.json$/.test(f));
        if (files.length === 0) { missing.push(d); continue; }
        const data = JSON.parse(readFileSync(path.join(shardPath, files[0]), 'utf8'));
        if (data.partial) partial.push(d);
        rawResults.push(...(data.results || []));
    }
}

const deduped = dedupeTechniqueCensusResults(rawResults);
const allResults = deduped.results.map(r => {
    const variantLabel = inferredVariantLabel(r);
    return variantLabel && !r.variantLabel ? { ...r, variantLabel } : r;
});
console.log(`technique-census combine: ${rawResults.length} raw cell result(s), ${allResults.length} unique (${deduped.duplicatesRemoved} duplicate(s) removed; ${missing.length} missing shard(s), ${partial.length} partial marker(s))`);

mkdirSync(OUT_DIR, { recursive: true });
if (!DERIVED_ONLY) {
    writeFileSync(path.join(OUT_DIR, 'combined-cells.json'), JSON.stringify({
        generatedAt: new Date().toISOString(),
        missingShards: missing,
        partialShards: partial,
        duplicateCellsRemoved: deduped.duplicatesRemoved,
        totalCells: allResults.length,
        results: allResults,
    }));
}

function identityKey(r) { return techniqueCensusIdentityKey(r); }
function wasSolved(r) { return wasSolvedBaseline(r.corpus, r.levelId); }
function techniqueStats(tier, filterFn = () => true) {
    const byKey = new Map();
    for (const r of allResults) {
        if (r.tier !== tier || (r.techniqueKeys?.length ?? 0) !== 1 || !filterFn(r)) continue;
        const key = identityKey(r);
        if (!key) continue;
        if (!byKey.has(key)) byKey.set(key, {
            total: 0, ok: 0, nodeBudgetReached: 0, exhausted: 0,
            refereeInvalid: 0, error: 0, sumMs: 0, solveNodes: [],
        });
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

function solversByLevel(filterFn) {
    const byLevel = new Map();
    for (const r of allResults) {
        if (r.tier !== 'T1' || (r.techniqueKeys?.length ?? 0) !== 1 || !r.ok || !filterFn(r)) continue;
        const lk = `${r.corpus}/${r.levelPos}`;
        if (!byLevel.has(lk)) byLevel.set(lk, new Set());
        const key = identityKey(r);
        if (key) byLevel.get(lk).add(key);
    }
    return byLevel;
}
function uniqueCounts(byLevel) {
    const counts = new Map();
    for (const solvers of byLevel.values()) if (solvers.size === 1) {
        const only = [...solvers][0];
        counts.set(only, (counts.get(only) ?? 0) + 1);
    }
    return counts;
}
function median(nums) {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
function statsTable(byKey, uniqueSolveCounts) {
    const rows = [...byKey.entries()].sort((a, b) => b[1].ok - a[1].ok || a[0].localeCompare(b[0]));
    return [
        '| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |',
        '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
        ...rows.map(([k, s]) => `| \`${k}\` | ${s.ok} | ${uniqueSolveCounts.get(k) ?? 0} | ${s.nodeBudgetReached} | ${s.exhausted} | ${s.refereeInvalid} | ${s.error} | ${s.total} | ${(100 * s.ok / s.total).toFixed(1)}% | ${Math.round(s.sumMs / s.total)} | ${median(s.solveNodes) ?? '—'} |`),
    ].join('\n');
}

const t1StatsUnsolved = techniqueStats('T1', r => !wasSolved(r));
const t1StatsSolved = techniqueStats('T1', r => wasSolved(r));
const t1SolversByLevelUnsolved = solversByLevel(r => !wasSolved(r));
const t1SolversByLevelSolved = solversByLevel(r => wasSolved(r));
const uniqueSolveCountsUnsolved = uniqueCounts(t1SolversByLevelUnsolved);
const uniqueSolveCountsSolved = uniqueCounts(t1SolversByLevelSolved);
const unsolvedLevelKeys = new Set(allResults.filter(r => r.tier === 'T1' && !wasSolved(r)).map(r => `${r.corpus}/${r.levelPos}`));
const oracleSolved = t1SolversByLevelUnsolved.size;
const oracleLine = `**Oracle union**: of ${unsolvedLevelKeys.size} levels currently unsolved by the production ladder at the frozen baseline, ${oracleSolved} (${unsolvedLevelKeys.size ? (100 * oracleSolved / unsolvedLevelKeys.size).toFixed(1) : '0.0'}%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.`;
const solvedLevelKeys = new Set(allResults.filter(r => r.tier === 'T1' && wasSolved(r)).map(r => `${r.corpus}/${r.levelPos}`));
const solvedWithZeroIsolatedSolvers = [...solvedLevelKeys].filter(lk => !t1SolversByLevelSolved.has(lk));
const regressionLine = `**Regression check**: of ${solvedLevelKeys.size} levels the production ladder currently solves, ${solvedWithZeroIsolatedSolvers.length} have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).`;
writeFileSync(path.join(OUT_DIR, 'technique-capability-summary.md'), [
    '# Technique capability census — technique summary', '',
    `Cross-matrix: ${allResults.length} unique cells (${deduped.duplicatesRemoved} duplicate cell result(s) removed). Missing shards: ${missing.length ? missing.join(', ') : 'none'}.`, '',
    oracleLine, '', regressionLine, '',
    '## T1 — previously-unsolved population (the capability-gap read)', '',
    statsTable(t1StatsUnsolved, uniqueSolveCountsUnsolved), '',
    '## T1 — previously-solved population (the regression-safety read)', '',
    statsTable(t1StatsSolved, uniqueSolveCountsSolved), '',
].join('\n'));

const coverage = new Map();
for (const r of allResults) {
    if (r.tier !== 'T1' || (r.techniqueKeys?.length ?? 0) !== 1) continue;
    const k = `${r.corpus}/${r.levelId}`;
    if (!coverage.has(k)) coverage.set(k, {
        corpus: r.corpus, levelId: r.levelId, wasSolvedByProduction: wasSolved(r), solvedByT1: new Set(),
    });
    if (r.ok) {
        const key = identityKey(r);
        if (key) coverage.get(k).solvedByT1.add(key);
    }
}
const coverageRows = [...coverage.values()].map(c => ({ ...c, solvedByT1: [...c.solvedByT1] }));
writeFileSync(path.join(OUT_DIR, 'level-technique-coverage.json'), JSON.stringify(coverageRows));
const zeroIsolatedSolves = coverageRows.filter(c => !c.wasSolvedByProduction && c.solvedByT1.length === 0);

const t1ByLevelTechnique = new Map();
for (const r of allResults) {
    if (r.tier === 'T1' && (r.techniqueKeys?.length ?? 0) === 1 && !r.ablation) {
        t1ByLevelTechnique.set(`${r.corpus}/${r.levelPos}/${r.techniqueKeys[0]}`, r.ok);
    }
}
const pairRows = new Map();
for (const r of allResults) {
    if (r.tier !== 'T3') continue;
    const label = r.pairLabel;
    if (!pairRows.has(label)) pairRows.set(label, { total: 0, pairSolved: 0, neitherAloneSolved: 0 });
    const s = pairRows.get(label);
    s.total++;
    if (r.ok) {
        s.pairSolved++;
        if (!r.techniqueKeys.some(k => t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${k}`) === true)) s.neitherAloneSolved++;
    }
}
writeFileSync(path.join(OUT_DIR, 'pair-synergy.md'), [
    '# Technique capability census — pair synergy (T3)', '',
    '"neither alone" = the pair solved a level where T1 data shows neither member solved it alone.', '',
    '| pair | pair solved | neither alone | total | synergy rate |',
    '|---|---:|---:|---:|---:|',
    ...[...pairRows.entries()].map(([label, s]) => `| \`${label}\` | ${s.pairSolved} | ${s.neitherAloneSolved} | ${s.total} | ${s.pairSolved ? (100 * s.neitherAloneSolved / s.pairSolved).toFixed(1) : '0.0'}% |`),
].join('\n'));

function variantRows() {
    const byLabel = new Map();
    for (const r of allResults) {
        if (r.tier !== 'T1') continue;
        const label = inferredVariantLabel(r);
        if (!label) continue;
        if (!byLabel.has(label)) byLabel.set(label, {
            total: 0, variantSolved: 0, comparable: 0, baselineSolved: 0,
            flippedOn: 0, regressed: 0, regressedOnSolvedLevel: 0,
        });
        const s = byLabel.get(label);
        s.total++;
        if (r.ok) s.variantSolved++;
        const baselineOk = t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${r.techniqueKeys[0]}`);
        if (baselineOk === undefined) continue;
        s.comparable++;
        if (baselineOk) s.baselineSolved++;
        if (r.ok && !baselineOk) s.flippedOn++;
        if (!r.ok && baselineOk) {
            s.regressed++;
            if (wasSolved(r)) s.regressedOnSolvedLevel++;
        }
    }
    for (const r of allResults) {
        if (r.tier !== 'T4') continue;
        const label = r.flagExperiment;
        if (!byLabel.has(label)) byLabel.set(label, {
            total: 0, variantSolved: 0, comparable: 0, baselineSolved: 0,
            flippedOn: 0, regressed: 0, regressedOnSolvedLevel: 0,
        });
        const s = byLabel.get(label);
        s.total++;
        if (r.ok) s.variantSolved++;
        const baselineReadings = r.techniqueKeys.map(k => t1ByLevelTechnique.get(`${r.corpus}/${r.levelPos}/${k}`));
        if (baselineReadings.some(v => v === undefined)) continue;
        s.comparable++;
        const baselineOk = baselineReadings.some(Boolean);
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
writeFileSync(path.join(OUT_DIR, 'flag-sensitivity.md'), [
    '# Technique capability census — flag/variant sensitivity', '',
    '"flipped on" = variant solves where its default arm fails; "regressed" = default solves where variant fails.', '',
    '| variant/experiment | arm solved | comparable | baseline solved | flipped on | regressed | regressed on solved level |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...[...flagRows.entries()].map(([label, s]) => `| \`${label}\` | ${s.variantSolved} | ${s.comparable} | ${s.baselineSolved} | ${s.flippedOn} | ${s.regressed} | ${s.regressedOnSolvedLevel} |`),
].join('\n'));

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
        const levels = readLevelsWithHints(path.resolve(corpusPath));
        const capture = await createHintCapture({
            solverVersion: SOLVER_VERSION, budgetMs: null, enabled: true, isolatedTechnique: true,
        });
        await capture.prepare([...new Set(cellResults.map(r => levels[r.levelPos - 1]))]);
        for (const r of [...cellResults].sort((a, b) => a.cellId.localeCompare(b.cellId))) {
            capture.record(levels[r.levelPos - 1], {
                ok: true, solution: r.solution, attempts: r.attempts,
                nodesExpanded: r.nodesExpanded, totalMs: r.totalMs, status: r.status,
            });
        }
        const flush = capture.flush(corpusPath, levels);
        hintFilesChanged += flush.hintFilesChanged;
        console.log(`  ${corpus}: ${flush.levelsTouched} level(s) touched, ${flush.hintFilesChanged} hint file(s) changed`);
    }
}

const solvedTotal = allResults.filter(r => r.ok).length;
const totalRegressedOnSolvedLevel = [...flagRows.values()].reduce((sum, s) => sum + s.regressedOnSolvedLevel, 0);
const topLine = [
    '# Technique capability census — run summary', '',
    `Total cells: ${allResults.length} unique (${deduped.duplicatesRemoved} duplicate result(s) removed; missing shards: ${missing.length ? missing.join(', ') : 'none'}; still-partial shards: ${partial.length ? partial.join(', ') : 'none'})`,
    `Solved: ${solvedTotal}`,
    oracleLine,
    regressionLine,
    `Variant/flag regressions on a previously-solved level: ${totalRegressedOnSolvedLevel} — see flag-sensitivity.md.`,
    `Previously-unsolved levels with zero isolated-technique solves anywhere: ${zeroIsolatedSolves.length}`,
    `Hint files changed: ${hintFilesChanged}`,
    '', `Plan: \`${PLAN_FILE ?? '(not recorded)'}\``,
].join('\n');
writeFileSync(path.join(OUT_DIR, 'README.md'), topLine + '\n');
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, topLine + '\n', { flag: 'a' });
console.log(`Combine complete: ${solvedTotal}/${allResults.length} unique cells solved; ${totalRegressedOnSolvedLevel} solved-level flag regression(s).`);
