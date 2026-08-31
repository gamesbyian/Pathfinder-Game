#!/usr/bin/env node
/**
 * Read-only diagnostic for the dynamic must-cross resource frontier.
 *
 * Measures
 *   crossingSlack = freeInt - forcedFutureNeighbourRevisits
 * using the exact shared derivation behind mc-neighbor-budget-propagation. This script NEVER changes
 * search, scoring, pruning, budgets, or stored hints. It exists to answer the next diagnostic question
 * in reports/2026-08-11-dynamic-resource-frontier-synthesis.md before anyone turns crossing slack into
 * policy: does low-but-nonnegative slack separate oracle-labelled dead branches from live branches,
 * and how does the same signal behave along known-valid solution prefixes?
 *
 * Two populations are deliberately reported separately:
 *
 * 1. Oracle-labelled Corpus-2 branches from reports/stress/prune-gap-*.json. These are split into
 *    `dead-residual` (dead and not already caught by the shipped gauntlet), `dead-pruned`, and `alive`.
 *    This is the population that can reveal whether slack has useful information BEFORE it reaches the
 *    existing hard neighbor-budget deadlock at slack < 0.
 * 2. Known-valid solution prefixes across published / Corpus 1 / Corpus 2. These provide the safety /
 *    calibration side of the picture. They are summarized both sample-weighted and level-balanced so
 *    levels with hundreds of hints do not silently dominate the conclusion.
 *
 * The current shared derivation globally abstains on portal levels and locally abstains on dynamic
 * flipper / pending-must-cross neighbor cases. This analyzer preserves those exact proof boundaries.
 * It is NOT the portal-local extension experiment.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/mc-crossing-slack-analysis.mjs -- \
 *     --out=reports/stress/mc-crossing-slack-analysis.json
 *
 * Optional:
 *   --atlas-dir=reports/stress
 *   --corpora=published,corpus1,corpus2
 *   --limit-levels=N          # per corpus, useful for smoke runs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { undoMove } from '../../modules/solver/search-state.ts';
import { computeMcNeighborBudget } from './lib/mc-neighbor-budget.mjs';

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    if (!existsSync(path.join(d, 'package.json'))) throw new Error('package root not found');
    return d;
})();

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const ATLAS_DIR = arg('atlas-dir', 'reports/stress');
const OUT_FILE = arg('out', 'reports/stress/mc-crossing-slack-analysis.json');
const CORPUS_NAMES = arg('corpora', 'published,corpus1,corpus2').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT_LEVELS = Number(arg('limit-levels', 'Infinity'));

const CORPORA = {
    published: { levels: 'data/levels.json', hints: 'data/hints' },
    corpus1: { levels: 'data/stress/stress-levels.json', hints: 'data/stress/hints' },
    corpus2: { levels: 'data/stress/stress-levels-random.json', hints: 'data/stress/hints-random' },
};
for (const name of CORPUS_NAMES) if (!CORPORA[name]) throw new Error(`Unknown corpus ${name}`);

const PACK = (x, y) => (((y << 16) | x) >>> 0);
const packXY1 = ([x, y]) => PACK(x - 1, y - 1);

function popcount(n) {
    let c = 0;
    for (let x = n >>> 0; x; x >>>= 1) c += x & 1;
    return c;
}

function depthBucket(step, totalSteps) {
    if (!(totalSteps > 0)) return 'unknown';
    const frac = Math.max(0, Math.min(0.999999, step / totalSteps));
    const lo = Math.floor(frac * 10) * 10;
    return `${lo}-${lo + 10}%`;
}

function freshDist() {
    return {
        count: 0,
        sumSlack: 0,
        sumFreeInt: 0,
        sumExtraNeeded: 0,
        minSlack: Infinity,
        maxSlack: -Infinity,
        slackHistogram: new Map(),
    };
}

function addObservation(dist, { slack, freeInt, extraNeeded }) {
    dist.count++;
    dist.sumSlack += slack;
    dist.sumFreeInt += freeInt;
    dist.sumExtraNeeded += extraNeeded;
    dist.minSlack = Math.min(dist.minSlack, slack);
    dist.maxSlack = Math.max(dist.maxSlack, slack);
    dist.slackHistogram.set(slack, (dist.slackHistogram.get(slack) || 0) + 1);
}

function quantileFromHistogram(hist, count, q) {
    if (!count) return null;
    const target = Math.max(1, Math.ceil(count * q));
    let seen = 0;
    for (const [value, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
        seen += n;
        if (seen >= target) return value;
    }
    return null;
}

function countAtMost(hist, threshold) {
    let n = 0;
    for (const [value, count] of hist) if (value <= threshold) n += count;
    return n;
}

function finishDist(dist) {
    if (!dist.count) return { count: 0 };
    return {
        count: dist.count,
        meanSlack: dist.sumSlack / dist.count,
        meanFreeInt: dist.sumFreeInt / dist.count,
        meanExtraNeeded: dist.sumExtraNeeded / dist.count,
        minSlack: dist.minSlack,
        p10Slack: quantileFromHistogram(dist.slackHistogram, dist.count, 0.10),
        p25Slack: quantileFromHistogram(dist.slackHistogram, dist.count, 0.25),
        medianSlack: quantileFromHistogram(dist.slackHistogram, dist.count, 0.50),
        p75Slack: quantileFromHistogram(dist.slackHistogram, dist.count, 0.75),
        p90Slack: quantileFromHistogram(dist.slackHistogram, dist.count, 0.90),
        maxSlack: dist.maxSlack,
        slackLe0Rate: countAtMost(dist.slackHistogram, 0) / dist.count,
        slackLe1Rate: countAtMost(dist.slackHistogram, 1) / dist.count,
        slackLe2Rate: countAtMost(dist.slackHistogram, 2) / dist.count,
        slackLe3Rate: countAtMost(dist.slackHistogram, 3) / dist.count,
        histogram: Object.fromEntries([...dist.slackHistogram.entries()].sort((a, b) => a[0] - b[0])),
    };
}

function addGrouped(map, key, observation) {
    if (!map.has(key)) map.set(key, freshDist());
    addObservation(map.get(key), observation);
}

function finishGrouped(map) {
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, finishDist(v)]));
}

function freshFloatDist() {
    return { values: [] };
}

function addFloat(grouped, key, value) {
    if (!grouped.has(key)) grouped.set(key, freshFloatDist());
    grouped.get(key).values.push(value);
}

function finishFloatGrouped(grouped) {
    const result = {};
    for (const [key, { values }] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        values.sort((a, b) => a - b);
        const q = p => values.length ? values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * p) - 1))] : null;
        const sum = values.reduce((a, b) => a + b, 0);
        result[key] = {
            levels: values.length,
            meanOfLevelMeans: values.length ? sum / values.length : null,
            p25OfLevelMeans: q(0.25),
            medianOfLevelMeans: q(0.50),
            p75OfLevelMeans: q(0.75),
        };
    }
    return result;
}

function crossingObservation(pos, state, level, prep) {
    const r = computeMcNeighborBudget(pos, state, level, prep);
    if ('abstain' in r) return { abstain: r.abstain };
    return {
        slack: r.freeInt - r.extraNeeded,
        freeInt: r.freeInt,
        extraNeeded: r.extraNeeded,
        remainingMustCross: popcount(state.mustCrossMask),
    };
}

function thresholdContrast(deadDist, aliveDist) {
    const result = [];
    for (let k = 0; k <= 5; k++) {
        const deadRate = deadDist?.count ? countAtMost(deadDist.slackHistogram, k) / deadDist.count : null;
        const aliveRate = aliveDist?.count ? countAtMost(aliveDist.slackHistogram, k) / aliveDist.count : null;
        result.push({
            threshold: k,
            deadResidualRate: deadRate,
            aliveRate,
            absoluteGap: deadRate === null || aliveRate === null ? null : deadRate - aliveRate,
        });
    }
    return result;
}

function analyzeAtlas() {
    const atlasRoot = path.resolve(root, ATLAS_DIR);
    const files = readdirSync(atlasRoot).filter(f => /^prune-gap-.*\.json$/.test(f)).sort();
    const corpusLevels = readLevelsWithHints(path.join(root, CORPORA.corpus2.levels));
    const grouped = new Map();
    const overall = new Map();
    const abstainedByReason = new Map();
    const rows = [];
    let liveNegativeSlack = 0;

    for (const file of files) {
        const atlas = JSON.parse(readFileSync(path.join(atlasRoot, file), 'utf8'));
        const idx = corpusLevels.findIndex(l => l.id === atlas.level);
        if (idx < 0) continue;
        const raw = corpusLevels[idx];
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: idx + 1 });
        const prep = prepLevel(level);
        prep._cfg = null;
        prep._metrics = { nodesExpanded: 0 };
        const solution = (raw.hintRecords || [])[0]?.path;
        if (!solution) continue;

        const branchesByStep = new Map();
        for (const branch of atlas.branches || []) {
            if (!branchesByStep.has(branch.step)) branchesByStep.set(branch.step, []);
            branchesByStep.get(branch.step).push(branch);
        }

        const state = createState(solution[0], level, prep);
        for (let step = 1; step < solution.length; step++) {
            const pos = solution[step - 1];
            for (const branch of branchesByStep.get(step) || []) {
                const altKey = packXY1(branch.alt);
                const portal = level.portalMap.get(pos);
                const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === altKey);
                const undo = applyMove(altKey, state, level, prep, isJump);
                const obs = crossingObservation(altKey, state, level, prep);
                if ('abstain' in obs) {
                    abstainedByReason.set(obs.abstain, (abstainedByReason.get(obs.abstain) || 0) + 1);
                } else {
                    const cohort = branch.dead ? (branch.pruned ? 'dead-pruned' : 'dead-residual') : 'alive';
                    const bucket = depthBucket(branch.step, level.requiredLength);
                    const key = `${cohort}|depth=${bucket}|pendingMC=${obs.remainingMustCross}`;
                    addGrouped(grouped, key, obs);
                    if (!overall.has(cohort)) overall.set(cohort, freshDist());
                    addObservation(overall.get(cohort), obs);
                    if (!branch.dead && obs.slack < 0) liveNegativeSlack++;
                    rows.push({
                        level: atlas.level,
                        step: branch.step,
                        alt: branch.alt,
                        cohort,
                        depthBucket: bucket,
                        remainingMustCross: obs.remainingMustCross,
                        freeInt: obs.freeInt,
                        forcedFutureNeighbourRevisits: obs.extraNeeded,
                        crossingSlack: obs.slack,
                    });
                }
                undoMove(undo, state);
            }
            const portal = level.portalMap.get(pos);
            applyMove(solution[step], state, level, prep, !!(portal && !state.lastWasPortalJump && portal.dest === solution[step]));
        }
    }

    return {
        atlasDir: ATLAS_DIR,
        atlasFiles: files.length,
        rows,
        overall: Object.fromEntries([...overall.entries()].map(([k, v]) => [k, finishDist(v)])),
        byDepthAndRemainingMustCross: finishGrouped(grouped),
        thresholdContrastDeadResidualVsAlive: thresholdContrast(overall.get('dead-residual'), overall.get('alive')),
        abstainedByReason: Object.fromEntries([...abstainedByReason.entries()].sort((a, b) => b[1] - a[1])),
        liveNegativeSlack,
    };
}

function uniqueKnownPaths(raw, hintsPath) {
    const paths = new Map();
    const witness = raw?.stressMeta?.witnessSolution;
    if (Array.isArray(witness) && witness.length) {
        const packed = witness.map(([x, y]) => PACK(x - 1, y - 1));
        paths.set(packed.join(','), packed);
    }
    if (raw.id && existsSync(hintsPath)) {
        const hintFile = JSON.parse(readFileSync(hintsPath, 'utf8'));
        for (const h of hintFile.hints || []) {
            if (!Array.isArray(h?.path) || !h.path.length) continue;
            paths.set(h.path.join(','), h.path);
        }
    }
    return [...paths.values()];
}

function analyzeSolutionPrefixes() {
    const grouped = new Map();
    const overall = freshDist();
    const perLevelGroups = new Map();
    const abstainedByReason = new Map();
    let negativeSlack = 0;
    let levels = 0;
    let paths = 0;
    let prefixes = 0;
    let applicablePrefixes = 0;

    for (const corpusName of CORPUS_NAMES) {
        const corpus = CORPORA[corpusName];
        const rawFile = JSON.parse(readFileSync(path.join(root, corpus.levels), 'utf8'));
        const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;
        const selected = Number.isFinite(LIMIT_LEVELS) ? rawLevels.slice(0, LIMIT_LEVELS) : rawLevels;

        for (let levelIndex = 0; levelIndex < selected.length; levelIndex++) {
            const raw = selected[levelIndex];
            if (!(raw.mustCross || []).length) continue;
            let level;
            let prep;
            try {
                level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: levelIndex + 1 });
                prep = prepLevel(level);
            } catch {
                continue;
            }

            const hintPath = raw.id ? path.join(root, corpus.hints, `${raw.id}.json`) : '';
            const knownPaths = uniqueKnownPaths(raw, hintPath);
            if (!knownPaths.length) continue;
            levels++;
            const levelId = raw.id || `${corpusName}:${levelIndex + 1}`;

            for (const p of knownPaths) {
                let state;
                try { state = createState(p[0], level, prep); } catch { continue; }
                paths++;
                for (let i = 1; i < p.length; i++) {
                    const portal = level.portalMap.get(p[i - 1]);
                    const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === p[i]);
                    try { applyMove(p[i], state, level, prep, isJump); } catch { break; }
                    if (i >= p.length - 1 || state.mustCrossMask === 0) continue;
                    prefixes++;
                    const obs = crossingObservation(p[i], state, level, prep);
                    if ('abstain' in obs) {
                        abstainedByReason.set(obs.abstain, (abstainedByReason.get(obs.abstain) || 0) + 1);
                        continue;
                    }
                    applicablePrefixes++;
                    addObservation(overall, obs);
                    const bucket = depthBucket(i, p.length - 1);
                    const key = `depth=${bucket}|pendingMC=${obs.remainingMustCross}`;
                    addGrouped(grouped, key, obs);
                    const levelKey = `${levelId}|${key}`;
                    if (!perLevelGroups.has(levelKey)) perLevelGroups.set(levelKey, { levelId, groupKey: key, dist: freshDist() });
                    addObservation(perLevelGroups.get(levelKey).dist, obs);
                    if (obs.slack < 0) negativeSlack++;
                }
            }
        }
    }

    const levelBalanced = new Map();
    for (const { groupKey, dist } of perLevelGroups.values()) {
        if (dist.count) addFloat(levelBalanced, groupKey, dist.sumSlack / dist.count);
    }

    return {
        corpora: CORPUS_NAMES,
        limitLevelsPerCorpus: Number.isFinite(LIMIT_LEVELS) ? LIMIT_LEVELS : null,
        levels,
        uniquePaths: paths,
        pendingMustCrossPrefixes: prefixes,
        applicablePrefixes,
        overallSampleWeighted: finishDist(overall),
        byDepthAndRemainingMustCrossSampleWeighted: finishGrouped(grouped),
        byDepthAndRemainingMustCrossLevelBalanced: finishFloatGrouped(levelBalanced),
        abstainedByReason: Object.fromEntries([...abstainedByReason.entries()].sort((a, b) => b[1] - a[1])),
        negativeSlack,
    };
}

console.log('mc-crossing-slack-analysis: replaying oracle-labelled branches...');
const atlas = analyzeAtlas();
console.log(`  applicable atlas rows: ${atlas.rows.length.toLocaleString()} | live negative slack: ${atlas.liveNegativeSlack}`);
console.log('mc-crossing-slack-analysis: replaying known-valid solution prefixes...');
const solutionPrefixes = analyzeSolutionPrefixes();
console.log(`  known paths: ${solutionPrefixes.uniquePaths.toLocaleString()} | applicable prefixes: ${solutionPrefixes.applicablePrefixes.toLocaleString()} | negative slack: ${solutionPrefixes.negativeSlack}`);

const result = {
    generatedAt: new Date().toISOString(),
    definition: 'crossingSlack = freeInt - forcedFutureNeighbourRevisits',
    proofScope: 'exactly scripts/stress/lib/mc-neighbor-budget.mjs computeMcNeighborBudget; portal-level and documented local exclusions preserved',
    atlas,
    solutionPrefixes,
};

const absOut = path.resolve(root, OUT_FILE);
mkdirSync(path.dirname(absOut), { recursive: true });
writeFileSync(absOut, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${OUT_FILE}`);

if (atlas.liveNegativeSlack || solutionPrefixes.negativeSlack) {
    console.error('Unexpected negative crossing slack on an oracle-alive branch or known-valid solution prefix. Treat as a soundness alarm.');
    process.exitCode = 1;
}
