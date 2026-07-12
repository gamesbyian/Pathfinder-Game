#!/usr/bin/env node
/**
 * Compares two solver-benchmark-shaped result files (anything with a top-level `levels: []`
 * array using the shared ok/refereeValid/elapsedMs/nodesExpanded/status schema — e.g. two
 * reports/stress/benchmark-latest.json runs, logs/stress-corpus1-baseline.json vs a fresh
 * benchmark, or two logs/solver-randoms-baseline/batch-*.json files) and reports what changed,
 * split into correctness regressions (must act on) vs timing/node-count drift (context only).
 *
 * Correctness regression: solved -> unsolved/error, or solved+valid -> solved+invalid path.
 * Correctness improvement: unsolved -> solved (referee-valid).
 * Drift: still same solved/valid status, but elapsedMs and/or nodesExpanded moved — reported,
 * never exit-coded, since elapsedMs is not a trustworthy signal on contention-affected sources
 * (see each input's own `timingTrustworthy`/`caveat` field if present) and nodesExpanded noise
 * is expected run-to-run for anything involving randomized repair-search restarts.
 * Strategy change: still same solved/valid status, but a different attempt config won
 * (winningStrategy differs) — also reported, never exit-coded: a different winner is expected and
 * fine whenever the old winner's timing was close to a competing strategy's, not evidence of a
 * problem by itself (docs/solver-dev-tooling-plan.md Component E).
 *
 * --retry-failures=<corpusFile> re-solves each hardRegressions candidate once in a FRESH child
 * process (retry-isolated.mjs) before it's reported as a genuine regression — opt-in (not the
 * default) because diff-baseline routinely compares two files with no single live corpus behind
 * them (e.g. two logs/solver-randoms-baseline/batch-*.json shards); pass the corpus file the
 * CANDIDATE side's levels came from. A candidate that solves on isolated retry moves from
 * hardRegressions into a separate flakyPassedOnRetry bucket instead (still surfaced, not silently
 * dropped) — this is not exit-coded as a regression, since the retry succeeded.
 *
 * Pure JS — runs under plain node (this file's own retry, if requested, shells out to a bundled
 * child process rather than importing the solver directly, so diff-baseline.mjs itself stays a
 * plain-JS comparison tool with no TS/solver dependency):
 *   node scripts/stress/diff-baseline.mjs --baseline=<file> --candidate=<file>
 *       [--drift-threshold=3] [--retry-failures=<corpusFile>] [--budget-ms=20000] [--out=<file>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { retryLevelIsolated } from './retry-isolated.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const BASELINE_FILE = args.get('--baseline');
const CANDIDATE_FILE = args.get('--candidate');
const DRIFT_THRESHOLD = Number(args.get('--drift-threshold') || 3); // Nx to flag as "watch this"
const RETRY_CORPUS = args.get('--retry-failures') || null;
const RETRY_BUDGET_MS = Number(args.get('--budget-ms') || 20000);
const OUT_FILE = args.get('--out') || null;

if (!BASELINE_FILE || !CANDIDATE_FILE) {
    console.error('Usage: diff-baseline.mjs --baseline=<file> --candidate=<file> [--drift-threshold=3] [--retry-failures=<corpusFile>] [--out=<file>]');
    process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const byId = (file) => {
    const data = readJson(file);
    const map = new Map(data.levels.map(lv => [lv.id, lv]));
    return { data, map };
};

const { data: baselineData, map: baseline } = byId(BASELINE_FILE);
const { data: candidateData, map: candidate } = byId(CANDIDATE_FILE);

const isTrustworthyTiming = (data, id) => {
    if (!Array.isArray(data.sources)) return true; // plain benchmark output: assume trustworthy
    const lv = data.levels.find(l => l.id === id);
    const source = data.sources.find(s => s.name === lv?.baselineSource);
    return source ? source.timingTrustworthy !== false : true;
};

const hardRegressions = [];
const improvements = [];
const slowdowns = [];
const speedups = [];
const nodeDrift = [];
const strategyChanges = [];
const onlyInBaseline = [];
const onlyInCandidate = [];

for (const [id, base] of baseline) {
    const cand = candidate.get(id);
    if (!cand) { onlyInBaseline.push(id); continue; }

    const baseOk = !!base.ok && base.refereeValid !== false;
    const candOk = !!cand.ok && cand.refereeValid !== false;

    if (baseOk && !candOk) {
        hardRegressions.push({ id, was: base.status, now: cand.status, wasValid: base.refereeValid, nowValid: cand.refereeValid });
        continue;
    }
    if (!baseOk && candOk) {
        improvements.push({ id, now: cand.status, elapsedMs: cand.elapsedMs, nodesExpanded: cand.nodesExpanded, winningStrategy: cand.winningStrategy });
        continue;
    }
    if (!baseOk && !candOk) continue; // still known-hard on both sides, nothing to report

    // Both solved+valid: check drift + which attempt won. Timing only trusted if BOTH sides say so.
    if (base.winningStrategy && cand.winningStrategy && base.winningStrategy !== cand.winningStrategy) {
        strategyChanges.push({ id, was: base.winningStrategy, now: cand.winningStrategy });
    }
    const timingOk = isTrustworthyTiming(baselineData, id) && isTrustworthyTiming(candidateData, id);
    if (timingOk && base.elapsedMs > 0 && cand.elapsedMs > 0) {
        const ratio = cand.elapsedMs / base.elapsedMs;
        if (ratio >= DRIFT_THRESHOLD) slowdowns.push({ id, baselineMs: base.elapsedMs, candidateMs: cand.elapsedMs, ratio: Number(ratio.toFixed(2)) });
        else if (ratio <= 1 / DRIFT_THRESHOLD) speedups.push({ id, baselineMs: base.elapsedMs, candidateMs: cand.elapsedMs, ratio: Number(ratio.toFixed(2)) });
    }
    if (base.nodesExpanded > 0 && cand.nodesExpanded > 0) {
        const nodeRatio = cand.nodesExpanded / base.nodesExpanded;
        if (nodeRatio >= DRIFT_THRESHOLD || nodeRatio <= 1 / DRIFT_THRESHOLD) {
            nodeDrift.push({ id, baselineNodes: base.nodesExpanded, candidateNodes: cand.nodesExpanded, ratio: Number(nodeRatio.toFixed(2)) });
        }
    }
}
for (const id of candidate.keys()) if (!baseline.has(id)) onlyInCandidate.push(id);

const flakyPassedOnRetry = [];
if (RETRY_CORPUS && hardRegressions.length > 0) {
    for (let i = hardRegressions.length - 1; i >= 0; i--) {
        const r = hardRegressions[i];
        const retry = retryLevelIsolated({ corpusFile: RETRY_CORPUS, levelId: r.id, budgetMs: RETRY_BUDGET_MS, root: ROOT });
        if (retry.ok && retry.refereeValid !== false) {
            flakyPassedOnRetry.push({ id: r.id, was: r.was, retryStatus: retry.status, retryElapsedMs: retry.elapsedMs });
            hardRegressions.splice(i, 1);
        }
    }
    flakyPassedOnRetry.reverse();
}

const summary = {
    baseline: BASELINE_FILE,
    candidate: CANDIDATE_FILE,
    compared: baseline.size,
    hardRegressions: hardRegressions.length,
    improvements: improvements.length,
    slowdowns: slowdowns.length,
    speedups: speedups.length,
    nodeDrift: nodeDrift.length,
    strategyChanges: strategyChanges.length,
    onlyInBaseline: onlyInBaseline.length,
    onlyInCandidate: onlyInCandidate.length,
    ...(RETRY_CORPUS ? { flakyPassedOnRetry: flakyPassedOnRetry.length } : {}),
};

console.log(`Baseline diff: ${BASELINE_FILE} -> ${CANDIDATE_FILE}`);
console.log(JSON.stringify(summary, null, 2));
if (hardRegressions.length > 0) {
    console.log(`\nHARD REGRESSIONS (act on these${RETRY_CORPUS ? ' — already confirmed on fresh-process retry' : ''}):`);
    for (const r of hardRegressions) console.log(`  ${r.id}: ${r.was}(valid=${r.wasValid}) -> ${r.now}(valid=${r.nowValid})`);
}
if (flakyPassedOnRetry.length > 0) {
    console.log('\nFLAKY_PASS_AFTER_RETRY (solved on a fresh-process retry — not counted as a regression, but investigate):');
    for (const r of flakyPassedOnRetry) console.log(`  ${r.id}: was ${r.was}, retry solved (${r.retryStatus}) in ${r.retryElapsedMs}ms`);
}
if (improvements.length > 0) {
    console.log('\nIMPROVEMENTS:');
    for (const r of improvements) console.log(`  ${r.id}: now ${r.now} in ${r.elapsedMs}ms via ${r.winningStrategy ?? '?'}`);
}
if (slowdowns.length > 0) {
    console.log(`\nSLOWDOWNS (>=${DRIFT_THRESHOLD}x, timing-trustworthy sources only):`);
    for (const r of slowdowns) console.log(`  ${r.id}: ${r.baselineMs}ms -> ${r.candidateMs}ms (${r.ratio}x)`);
}
if (nodeDrift.length > 0) {
    console.log(`\nNODE-COUNT DRIFT (>=${DRIFT_THRESHOLD}x either direction):`);
    for (const r of nodeDrift) console.log(`  ${r.id}: ${r.baselineNodes} -> ${r.candidateNodes} nodes (${r.ratio}x)`);
}
if (strategyChanges.length > 0) {
    console.log('\nSTRATEGY CHANGES (still solved both sides, different attempt won — informational, not gating):');
    for (const r of strategyChanges) console.log(`  ${r.id}: ${r.was} -> ${r.now}`);
}
if (onlyInBaseline.length > 0) console.log(`\nMissing from candidate (regression-set drift): ${onlyInBaseline.join(', ')}`);
if (onlyInCandidate.length > 0) console.log(`\nNew in candidate (not in baseline): ${onlyInCandidate.join(', ')}`);

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({
        summary, hardRegressions, improvements, slowdowns, speedups, nodeDrift, strategyChanges,
        onlyInBaseline, onlyInCandidate, ...(RETRY_CORPUS ? { flakyPassedOnRetry } : {}),
    }, null, 2) + '\n');
    console.log(`\nWrote ${OUT_FILE}`);
}

if (hardRegressions.length > 0) {
    console.error(`\n${hardRegressions.length} hard regression(s) found.`);
    process.exit(1);
}
