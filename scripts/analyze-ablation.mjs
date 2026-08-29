#!/usr/bin/env node
/**
 * analyze-ablation.mjs — Solver ablation analysis and report generator.
 *
 * Reads the JSON output from run-ablation.mjs, computes deltas vs baseline,
 * ranks features by importance, and emits a structured report.
 *
 * Usage:
 *   node scripts/analyze-ablation.mjs --input=logs/ablation/run-*.json [options]
 *
 * Options:
 *   --input=<path>      Path to the ablation run JSON (required)
 *   --output=<path>     Write analysis JSON to this file (default: reports/ablation/<input-name>-analysis.json)
 *   --text              Also print a human-readable report to stdout
 *   --min-impact=<n>    Minimum importance score to show in ranked tables (default: 0)
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { computeImportanceScore, classifyFeature,
         ORDERING_BIAS_FEATURE_KEYS } from '../modules/solver/ablation-config.js';

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const eq = a.indexOf('=');
    return [a.slice(0, eq), a.slice(eq + 1)];
}));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const inputFile  = argMap.get('--input');
const minImpact  = Number(argMap.get('--min-impact') ?? 0);
const printText  = argFlags.has('--text');

if (!inputFile) {
    console.error('Usage: analyze-ablation.mjs --input=<file> [--output=<file>] [--text]');
    process.exit(1);
}

const inputBase  = path.basename(inputFile, '.json');
const defaultOut = path.join('reports', 'ablation', `${inputBase}-analysis.json`);
const outputFile = argMap.get('--output') || defaultOut;

// ─── Load data ────────────────────────────────────────────────────────────────

const data = JSON.parse(await readFile(inputFile, 'utf8'));
const { runs = [], budgetMs, phase, levelCount } = data;

if (runs.length === 0) {
    console.error('No runs found in input file.');
    process.exit(1);
}

const baseline = runs.find(r => r.name === 'baseline');
if (!baseline) {
    console.error('No baseline run found. Run with --experiment=baseline first or include it in the experiment set.');
    process.exit(1);
}

console.log(`Loaded ${runs.length} runs. Baseline: ${baseline.summary.solved}/${baseline.summary.total} solved.`);

// ─── Per-level sets ───────────────────────────────────────────────────────────

const baselineSolvedSet = new Set(baseline.solvedLevels ?? []);

// ─── Delta computation ────────────────────────────────────────────────────────

function computeDelta(run) {
    const ablSolvedSet = new Set(run.solvedLevels ?? []);

    const uniqueFailures  = [...baselineSolvedSet].filter(l => !ablSolvedSet.has(l)).sort((a, b) => a - b);
    const uniqueSuccesses = [...ablSolvedSet].filter(l => !baselineSolvedSet.has(l)).sort((a, b) => a - b);

    const bSum = baseline.summary;
    const aSum = run.summary;

    const importanceScore = computeImportanceScore(run, baseline);
    const solveLoss = Math.max(0, bSum.solved - aSum.solved);
    const tier = classifyFeature(importanceScore, solveLoss);

    const levelDeltas = {};
    const baselineLevelMap = new Map((baseline.levels ?? []).map(l => [l.level, l]));
    for (const lr of (run.levels ?? [])) {
        const bl = baselineLevelMap.get(lr.level);
        if (!bl) continue;
        levelDeltas[lr.level] = {
            deltaMs:    lr.elapsedMs - bl.elapsedMs,
            deltaNodes: (lr.nodesExpanded ?? 0) - (bl.nodesExpanded ?? 0),
            baselineOk: bl.ok,
            ablationOk: lr.ok,
        };
    }

    return {
        name: run.name,
        label: run.label,
        tags: run.tags ?? [],
        tier,
        importanceScore: Math.round(importanceScore * 10) / 10,
        deltaSolved:     aSum.solved  - bSum.solved,
        deltaTotalMs:    aSum.totalMs - bSum.totalMs,
        deltaAvgMs:      aSum.avgMs   - bSum.avgMs,
        deltaNodes:      (aSum.nodesExpanded ?? 0) - (bSum.nodesExpanded ?? 0),
        solveLoss,
        solveGain:       Math.max(0, aSum.solved - bSum.solved),
        ablationSummary: aSum,
        uniqueFailures,
        uniqueSuccesses,
        levelDeltas,
    };
}

const deltas = runs
    .filter(r => r.name !== 'baseline')
    .map(r => ({ run: r, delta: computeDelta(r) }));

// ─── Rankings ─────────────────────────────────────────────────────────────────

const ranked = [...deltas].sort((a, b) => b.delta.importanceScore - a.delta.importanceScore);

const singleFeature = ranked.filter(d => d.delta.tags.includes('single-feature')
    && !d.delta.tags.includes('scoring-profile') && !d.delta.tags.includes('profile')
    && !d.delta.tags.includes('ordering-bias') && !d.delta.tags.includes('template'));
const _scoringProfileRuns = ranked.filter(d => (d.delta.tags.includes('scoring-profile') || d.delta.tags.includes('profile'))
    && (d.delta.name.startsWith('scoring-profile-off:') || d.delta.name.startsWith('profile-off:')));
const _orderingBiasRuns = ranked.filter(d => (d.delta.tags.includes('ordering-bias') || d.delta.tags.includes('template'))
    && (d.delta.name.startsWith('ordering-bias-off:') || d.delta.name.startsWith('template-off:')));
const orderRuns     = ranked.filter(d => d.delta.tags.includes('order'));
const pairRuns      = ranked.filter(d => d.delta.tags.includes('pair') || (d.delta.tags.includes('combination')
    && !d.delta.tags.includes('ordering-bias') && !d.delta.tags.includes('template')));

// ─── Scoring-profile win analysis ──────────────────────────────────────────────

function findScoringProfileOffDelta(scoringProfileId) {
    return deltas.find(d => d.run.name === `scoring-profile-off:${scoringProfileId}`
        || d.run.name === `profile-off:${scoringProfileId}`);
}

function findScoringProfileSoloDelta(scoringProfileId) {
    return deltas.find(d => d.run.name === `scoring-profile-solo:${scoringProfileId}`
        || d.run.name === `profile-solo:${scoringProfileId}`);
}

function analyseScoringProfileWins() {
    const profileWins = new Map();
    for (const lr of (baseline.levels ?? [])) {
        const p = lr.solvedByScoringProfileId ?? lr.solvedBy ?? null;
        if (!lr.ok || !p) continue;
        if (!profileWins.has(p)) profileWins.set(p, []);
        profileWins.get(p).push(lr.level);
    }

    const profileUniqueWins = new Map();
    for (const [p, levels] of profileWins) {
        const offRun = findScoringProfileOffDelta(p);
        if (!offRun) { profileUniqueWins.set(p, []); continue; }
        const offFailed = new Set(offRun.delta.uniqueFailures);
        profileUniqueWins.set(p, levels.filter(l => offFailed.has(l)));
    }

    return { profileWins, profileUniqueWins };
}

// ─── Structural-ordering-bias win analysis ───────────────────────────────────

function findOrderingBiasOffDelta(orderingBiasId) {
    const featureKey = ORDERING_BIAS_FEATURE_KEYS[orderingBiasId];
    return deltas.find(d => d.run.name === `ordering-bias-off:${orderingBiasId}`
        || d.run.name === `template-off:${orderingBiasId}`
        || (featureKey && d.run.name === `disable:${featureKey}`));
}

function analyseOrderingBiasWins() {
    const templateWins = new Map();
    for (const lr of (baseline.levels ?? [])) {
        if (!lr.ok || !lr.attempts) continue;
        const winAttempt = lr.attempts.find(a => a.ok);
        const t = winAttempt?.orderingBiasId ?? winAttempt?.template ?? null;
        if (!t) continue;
        if (!templateWins.has(t)) templateWins.set(t, []);
        templateWins.get(t).push(lr.level);
    }

    const templateUniqueWins = new Map();
    for (const [t, levels] of templateWins) {
        const offRun = findOrderingBiasOffDelta(t);
        if (!offRun) { templateUniqueWins.set(t, []); continue; }
        if (!offRun) { templateUniqueWins.set(t, []); continue; }
        const offFailed = new Set(offRun.delta.uniqueFailures);
        templateUniqueWins.set(t, levels.filter(l => offFailed.has(l)));
    }

    return { templateWins, templateUniqueWins };
}

const { profileWins, profileUniqueWins } = analyseScoringProfileWins();
const { templateWins, templateUniqueWins } = analyseOrderingBiasWins();

// ─── Redundancy detection ─────────────────────────────────────────────────────

function detectRedundantPairs() {
    const results = [];
    for (const d of pairRuns) {
        if (!d.delta.tags.includes('pair')) continue;
        const match = d.run.name.match(/^pair-off:(.+)\+(.+)$/);
        if (!match) continue;
        const [, a, b] = match;

        const dA = deltas.find(x => x.run.name === `disable:${a}`);
        const dB = deltas.find(x => x.run.name === `disable:${b}`);
        if (!dA || !dB) continue;

        const pairLoss = -d.delta.deltaSolved;
        const aLoss    = -dA.delta.deltaSolved;
        const bLoss    = -dB.delta.deltaSolved;
        const expectedCombined = aLoss + bLoss;

        const redundancyRatio = expectedCombined > 0 ? pairLoss / expectedCombined : 1;
        const isRedundant = pairLoss <= Math.max(aLoss, bLoss) && (aLoss > 0 || bLoss > 0);

        results.push({
            features: [a, b],
            pairSolveLoss:    pairLoss,
            aOnlySolveLoss:   aLoss,
            bOnlySolveLoss:   bLoss,
            expectedCombined,
            redundancyRatio:  Math.round(redundancyRatio * 100) / 100,
            isRedundant,
            note: isRedundant ? 'combined loss ≤ max(a,b) — one may subsume the other' : null,
        });
    }
    return results.sort((a, b) => a.redundancyRatio - b.redundancyRatio);
}

const redundancyAnalysis = detectRedundantPairs();

// ─── Tier summary ─────────────────────────────────────────────────────────────

function tierSummary(rankedList) {
    const tiers = { critical: [], strong: [], helpful: [], neutral: [], negative: [] };
    for (const d of rankedList) {
        const t = d.delta.tier;
        if (tiers[t]) tiers[t].push(d.delta.name);
    }
    return tiers;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(sfRanked, redundancy) {
    const recs = [];

    const critical = sfRanked.filter(d => d.delta.tier === 'critical');
    if (critical.length > 0) {
        recs.push({
            category: 'essential',
            message: `${critical.length} feature(s) critical — removing causes solve failures.`,
            features: critical.map(d => d.delta.name),
        });
    }

    const neutral = sfRanked.filter(d => d.delta.tier === 'neutral' && d.delta.importanceScore <= 2);
    if (neutral.length > 0) {
        recs.push({
            category: 'removable-candidates',
            message: `${neutral.length} feature(s) appear neutral (importance ≤ 2).`,
            features: neutral.map(d => d.delta.name),
        });
    }

    const negative = sfRanked.filter(d => d.delta.tier === 'negative');
    if (negative.length > 0) {
        recs.push({
            category: 'potentially-harmful',
            message: `${negative.length} feature(s) net-negative: removing improves results.`,
            features: negative.map(d => d.delta.name),
        });
    }

    const redundantPairs = redundancy.filter(r => r.isRedundant);
    if (redundantPairs.length > 0) {
        recs.push({
            category: 'possible-redundancy',
            message: `${redundantPairs.length} feature pair(s) show possible redundancy.`,
            pairs: redundantPairs.map(r => ({ features: r.features, note: r.note })),
        });
    }

    return recs;
}

// ─── Assemble analysis ────────────────────────────────────────────────────────

const analysis = {
    meta: {
        inputFile,
        timestamp: new Date().toISOString(),
        phase,
        budgetMs,
        levelCount,
        baselineSummary: baseline.summary,
        totalExperiments: runs.length - 1,
    },

    featureRanking: singleFeature.map(d => ({
        name:            d.delta.name,
        label:           d.run.label,
        tier:            d.delta.tier,
        importanceScore: d.delta.importanceScore,
        deltaSolved:     d.delta.deltaSolved,
        solveLoss:       d.delta.solveLoss,
        solveGain:       d.delta.solveGain,
        deltaTotalMs:    d.delta.deltaTotalMs,
        deltaAvgMs:      d.delta.deltaAvgMs,
        deltaNodes:      d.delta.deltaNodes,
        uniqueFailures:  d.delta.uniqueFailures,
        uniqueSuccesses: d.delta.uniqueSuccesses,
    })),

    tierSummary: tierSummary(singleFeature),

    scoringProfileRanking: [...profileWins.entries()]
        .map(([p, levels]) => {
            const offDelta  = findScoringProfileOffDelta(p)?.delta;
            const soloDelta = findScoringProfileSoloDelta(p)?.delta;
            return {
                scoringProfileId: p,
                wins:            levels.length,
                winLevels:       levels.slice().sort((a, b) => a - b),
                uniqueWins:      profileUniqueWins.get(p) ?? [],
                importanceScore: offDelta?.importanceScore ?? null,
                tier:            offDelta?.tier ?? 'unknown',
                soloSolves:      soloDelta?.ablationSummary?.solved ?? null,
                soloMs:          soloDelta?.ablationSummary?.totalMs ?? null,
            };
        })
        .sort((a, b) => (b.uniqueWins.length - a.uniqueWins.length) || (b.wins - a.wins)),

    orderingBiasRanking: [...templateWins.entries()]
        .map(([t, levels]) => {
            const offDelta = findOrderingBiasOffDelta(t)?.delta ?? null;
            return {
                orderingBiasId:  t,
                wins:            levels.length,
                winLevels:       levels.slice().sort((a, b) => a - b),
                uniqueWins:      templateUniqueWins.get(t) ?? [],
                importanceScore: offDelta?.importanceScore ?? null,
                tier:            offDelta?.tier ?? 'unknown',
            };
        })
        .sort((a, b) => (b.uniqueWins.length - a.uniqueWins.length) || (b.wins - a.wins)),

    attemptOrderSensitivity: orderRuns.map(d => ({
        order:           d.run.name.replace('order:', ''),
        deltaSolved:     d.delta.deltaSolved,
        deltaTotalMs:    d.delta.deltaTotalMs,
        uniqueFailures:  d.delta.uniqueFailures,
        uniqueSuccesses: d.delta.uniqueSuccesses,
        importanceScore: d.delta.importanceScore,
    })),

    redundancyAnalysis,

    combinationResults: pairRuns.map(d => ({
        name:            d.delta.name,
        deltaSolved:     d.delta.deltaSolved,
        deltaMs:         d.delta.deltaTotalMs,
        uniqueFailures:  d.delta.uniqueFailures,
        importanceScore: d.delta.importanceScore,
    })),

    recommendations: buildRecommendations(singleFeature, redundancyAnalysis),
};

// ─── Write JSON ───────────────────────────────────────────────────────────────

const dir = path.dirname(path.resolve(outputFile));
await mkdir(dir, { recursive: true });
await writeFile(outputFile, JSON.stringify(analysis, null, 2));
console.log(`Analysis → ${outputFile}`);

// ─── Human-readable text report ───────────────────────────────────────────────

if (!printText) process.exit(0);

const hr  = '─'.repeat(76);
const hr2 = '═'.repeat(76);
const pad  = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);
const fmt  = n => (n >= 0 ? '+' : '') + n;
const fmtMs = ms => `${ms >= 0 ? '+' : ''}${Math.round(ms / 100) / 10}s`;

const tierIcon = { critical: '🔴', strong: '🟠', helpful: '🟡', neutral: '⚪', negative: '🟢', unknown: '❓' };

console.log('\n' + hr2);
console.log('  PATHFINDER SOLVER — ABLATION LABORATORY REPORT');
console.log(hr2);
console.log(`  Budget: ${budgetMs}ms/level  |  Levels tested: ${levelCount}  |  Phase: ${phase}`);
console.log(`  Baseline: ${baseline.summary.solved}/${baseline.summary.total} solved  |  ${(baseline.summary.totalMs / 1000).toFixed(1)}s total  |  ${(baseline.summary.nodesExpanded ?? 0).toLocaleString()} nodes`);
console.log(hr2);

// ── Feature importance ranking ─────────────────────────────────────────────────
console.log('\n\n── FEATURE IMPORTANCE RANKING (single-feature ablations)\n' + hr);
console.log(pad('Feature', 35) + rpad('Score', 7) + rpad('Tier', 11) + rpad('ΔSolved', 9) + rpad('ΔTime', 9) + '  Unique failures');
console.log(hr);

for (const d of singleFeature) {
    const { name, importanceScore, tier, deltaSolved, deltaTotalMs, uniqueFailures } = d.delta;
    if (importanceScore < minImpact && uniqueFailures.length === 0) continue;
    const shortName = name.replace('disable:', '');
    console.log(
        pad(shortName, 35) +
        rpad(importanceScore.toFixed(1), 7) +
        rpad(tierIcon[tier] + ' ' + tier, 11) +
        rpad(fmt(deltaSolved), 9) +
        rpad(fmtMs(deltaTotalMs), 9) +
        '  ' + (uniqueFailures.length > 0 ? `L${uniqueFailures.join(', L')}` : '—')
    );
}

console.log('\n' + hr);
const ts2 = tierSummary(singleFeature);
for (const [tier, names] of Object.entries(ts2)) {
    if (names.length === 0) continue;
    const clean = names.map(n => n.replace('disable:', ''));
    console.log(`  ${tierIcon[tier]} ${tier.toUpperCase()} (${names.length}): ${clean.join(', ')}`);
}

// ── Scoring-profile ranking ───────────────────────────────────────────────────
console.log('\n\n── SCORING PROFILE IMPORTANCE RANKING\n' + hr);
console.log(pad('Scoring profile', 24) + rpad('Wins', 6) + rpad('Unique', 8) + rpad('Score', 8) + rpad('Tier', 11) + '  Unique win levels');
console.log(hr);
for (const p of analysis.scoringProfileRanking) {
    const icon = tierIcon[p.tier] ?? '?';
    const uniq = p.uniqueWins.length > 0 ? `L${p.uniqueWins.join(', L')}` : '—';
    console.log(pad(p.scoringProfileId, 24) + rpad(p.wins, 6) + rpad(p.uniqueWins.length, 8) +
        rpad(p.importanceScore?.toFixed(1) ?? '?', 8) + rpad(icon + ' ' + p.tier, 11) + '  ' + uniq);
}

// ── Structural-ordering-bias ranking ─────────────────────────────────────────
console.log('\n\n── STRUCTURAL ORDERING BIAS IMPORTANCE RANKING\n' + hr);
console.log(pad('Ordering bias', 20) + rpad('Wins', 6) + rpad('Unique', 8) + rpad('Score', 8) + rpad('Tier', 11) + '  Unique win levels');
console.log(hr);
for (const t of analysis.orderingBiasRanking) {
    const icon = tierIcon[t.tier] ?? '?';
    const uniq = t.uniqueWins.length > 0 ? `L${t.uniqueWins.join(', L')}` : '—';
    console.log(pad(t.orderingBiasId, 20) + rpad(t.wins, 6) + rpad(t.uniqueWins.length, 8) +
        rpad(t.importanceScore?.toFixed(1) ?? '?', 8) + rpad(icon + ' ' + t.tier, 11) + '  ' + uniq);
}

// ── Attempt order sensitivity ──────────────────────────────────────────────────
if (analysis.attemptOrderSensitivity.length > 0) {
    console.log('\n\n── ATTEMPT ORDER SENSITIVITY\n' + hr);
    for (const o of analysis.attemptOrderSensitivity) {
        const uniq = o.uniqueFailures.length > 0 ? ` | new failures: L${o.uniqueFailures.join(', L')}` : '';
        console.log(`  ${pad(o.order, 28)} ΔSolved=${fmt(o.deltaSolved)}  ΔTime=${fmtMs(o.deltaTotalMs)}${uniq}`);
    }
    const maxLoss = Math.max(...analysis.attemptOrderSensitivity.map(o => -o.deltaSolved));
    console.log(`\n  Max order-induced solve loss: ${maxLoss} levels`);
    if (maxLoss === 0) console.log('  → Solver is ORDER-INSENSITIVE at this budget.');
    else               console.log('  → Solver is ORDER-SENSITIVE — current ordering matters.');
}

// ── Redundancy ─────────────────────────────────────────────────────────────────
if (redundancyAnalysis.length > 0) {
    console.log('\n\n── REDUNDANCY ANALYSIS (pairwise ablations)\n' + hr);
    for (const r of redundancyAnalysis) {
        const flag = r.isRedundant ? '⚠️  ' : '   ';
        console.log(`  ${flag}${r.features.join(' + ')}`);
        console.log(`       pair_loss=${r.pairSolveLoss}  a_loss=${r.aOnlySolveLoss}  b_loss=${r.bOnlySolveLoss}  ratio=${r.redundancyRatio}${r.note ? '  ← ' + r.note : ''}`);
    }
}

// ── Recommendations ────────────────────────────────────────────────────────────
if (analysis.recommendations.length > 0) {
    console.log('\n\n── RECOMMENDATIONS\n' + hr);
    for (const rec of analysis.recommendations) {
        console.log(`\n  [${rec.category.toUpperCase()}]`);
        console.log(`  ${rec.message}`);
        if (rec.features) console.log(`    ${rec.features.map(f => f.replace('disable:', '')).join('\n    ')}`);
        if (rec.pairs) {
            for (const p of rec.pairs) console.log(`    ${p.features.join(' + ')} — ${p.note}`);
        }
    }
}

console.log('\n' + hr2 + '\n');
