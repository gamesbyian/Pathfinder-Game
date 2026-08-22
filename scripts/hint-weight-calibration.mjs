#!/usr/bin/env node
/**
 * Hint Weight Calibration — offline analysis (+ optional local search) that uses
 * the verified hint corpus in data/levels.json to measure how well scoreMove's
 * weights explain the moves taken in the diverse, independently-discovered
 * solution paths produced by scripts/hint-diversification.mjs (see
 * docs/hint-curation.md). Those paths were found by forcing
 * different gates/first-steps and disabling profiles/templates/strategies, so
 * they represent genuinely different valid solving strategies — not just
 * restatements of whatever the default solver already finds.
 *
 * At every branching decision point along a hint path (>=2 legal next cells),
 * this scores all legal candidates with the real scoreMove() under a chosen
 * profile's weights and records the rank of the move the path actually took.
 * That gives a hit-rate / mean-reciprocal-rank measure of how well a weight
 * vector "explains" real valid solving behaviour, broken down by archetype and
 * solve phase (harvest/mid/finish).
 *
 * Read-only with respect to production code: never writes to
 * modules/solver/policy.js or data/levels.json. --search prints a suggested
 * weight vector for manual review; it does not apply it anywhere.
 *
 * Usage:
 *   npm run hints:calibrate-weights --                                # report, all profiles
 *   npm run hints:calibrate-weights -- --profile=default
 *   npm run hints:calibrate-weights -- --profile=default --search
 *   npm run hints:calibrate-weights -- --levels=pos:1-33 --profile=perimeterSweep --output=reports/hint-weight-calibration/perimeterSweep.json
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { readLevelsWithHints, parseLevelPositions } from './level-data-io.mjs';

const args     = process.argv.slice(2);
const argMap   = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const levelFilter  = parseLevelPositions(argMap.get('--levels'));
const profileArg   = argMap.get('--profile') || 'all';
const doSearch     = argFlags.has('--search');
const searchIters  = Number(argMap.get('--search-iters')) > 0 ? Number(argMap.get('--search-iters')) : 2;
const outputFile   = argMap.get('--output') || null;
const verbose      = argFlags.has('--verbose');

installBrowserStubs();

const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { POLICY_PROFILES } = await import('../modules/solver/policy.js');
const { scoreMove } = await import('../modules/solver/scoring.js');
const { createState, applyMove, getNeighbors } = await import('../modules/solver/search-state.js');
const { getRealLengthFromState } = await import('../modules/solver/solution.js');

const Solver = createSolver();

const root = new URL('..', import.meta.url).pathname;
const levelsJsonAbs = path.join(root, 'data/levels.json');

function loadRawLevels() {
    const levels = readLevelsWithHints(levelsJsonAbs);
    if (!Array.isArray(levels) || levels.length === 0) throw new Error('data/levels.json is empty or not an array');
    return levels;
}

// The 9 weight keys scoreMove actually consumes. (A vestigial `antiDeadCorridorWeight` field
// used to sit unused on every POLICY_PROFILES entry; it was removed.)
const WEIGHT_KEYS = [
    'goalAttractionWeight', 'objectiveAttractionWeight', 'finishCommitmentWeight',
    'perimeterBiasWeight', 'mustPassUrgencyWeight', 'mustCrossUrgencyWeight',
    'intersectionSetupWeight', 'antiDitherWeight', 'revisitPenaltyWeight',
];

function phaseOf(rRatio) { return rRatio < 0.45 ? 'harvest' : rRatio > 0.82 ? 'finish' : 'mid'; }

// Replay one verified hint path through the real state machine, scoring every
// legal candidate at each multi-way decision point with the live scoreMove().
// Calls onDecision({ archetype, phase, candidates: [{key,score}], expertKey, expertScore })
// for every step where the path actually had a choice to make.
function replayHintPath(level, prep, archetype, hintPath, profileWeights, onDecision) {
    if (!Array.isArray(hintPath) || hintPath.length < 2 || !level.gateKeys.includes(hintPath[0])) {
        return { ok: false, reason: 'bad-start' };
    }
    const state = createState(hintPath[0], level, prep);

    for (let i = 1; i < hintPath.length; i++) {
        const pos = state.path[state.path.length - 1];
        const target = hintPath[i];
        if (target === pos) continue; // noise dupe artifact, not a real move

        const candidates = getNeighbors(pos, state, level, prep);
        if (candidates.length === 0) return { ok: false, reason: `no-candidates@${i}` };
        if (!candidates.includes(target)) return { ok: false, reason: `diverged@${i}` };

        if (candidates.length >= 2) {
            const realLen = getRealLengthFromState(state);
            const portalEntry = level.portalMap.get(pos);
            const rRatio = level.reqLen > 0 ? Math.max(0, 1 - realLen / level.reqLen) : 1;
            const scored = candidates.map(key => {
                const isJump = !!(portalEntry && portalEntry.dest === key);
                const nRSteps = level.reqLen - realLen - (isJump ? 0 : 1);
                return { key, score: scoreMove(key, pos, state, level, prep, profileWeights, nRSteps, null) };
            });
            const expert = scored.find(c => c.key === target);
            onDecision({ archetype, phase: phaseOf(rRatio), candidates: scored, expertKey: target, expertScore: expert.score });
        }

        const portal = level.portalMap.get(pos);
        const isPortalJump = !!portal && portal.dest === target && !state.lastWasPortalJump;
        applyMove(target, state, level, prep, isPortalJump);
    }
    return { ok: true };
}

function newAggregate() { return { decisions: 0, top1: 0, sumReciprocalRank: 0, sumHingeLoss: 0 }; }

function addDecision(agg, d) {
    const rank = 1 + d.candidates.filter(c => c.score > d.expertScore).length;
    const others = d.candidates.filter(c => c.key !== d.expertKey).map(c => c.score);
    const maxOther = others.length > 0 ? Math.max(...others) : -Infinity;
    agg.decisions++;
    if (rank === 1) agg.top1++;
    agg.sumReciprocalRank += 1 / rank;
    agg.sumHingeLoss += Math.max(0, maxOther - d.expertScore + 1e-9);
}

function summarize(agg) {
    if (agg.decisions === 0) return { decisions: 0, top1Rate: 0, mrr: 0, meanHingeLoss: 0 };
    return {
        decisions: agg.decisions,
        top1Rate: agg.top1 / agg.decisions,
        mrr: agg.sumReciprocalRank / agg.decisions,
        meanHingeLoss: agg.sumHingeLoss / agg.decisions,
    };
}

function objective(summary) { return summary.top1Rate + 0.1 * summary.mrr; }

// Evaluate one weight vector against the entire prepared corpus.
function evaluateWeights(corpus, profileWeights) {
    const overall = newAggregate();
    const byArchetype = new Map();
    const byPhase = new Map();
    let failedPaths = 0, totalPaths = 0;

    for (const { level, prep, archetype, hints } of corpus) {
        for (const hintPath of hints) {
            totalPaths++;
            const result = replayHintPath(level, prep, archetype, hintPath, profileWeights, d => {
                addDecision(overall, d);
                if (!byArchetype.has(d.archetype)) byArchetype.set(d.archetype, newAggregate());
                addDecision(byArchetype.get(d.archetype), d);
                if (!byPhase.has(d.phase)) byPhase.set(d.phase, newAggregate());
                addDecision(byPhase.get(d.phase), d);
            });
            if (!result.ok) failedPaths++;
        }
    }

    const perArchetype = {};
    for (const [k, agg] of byArchetype) perArchetype[k] = summarize(agg);
    const perPhase = {};
    for (const [k, agg] of byPhase) perPhase[k] = summarize(agg);
    return { overall: summarize(overall), perArchetype, perPhase, diagnostics: { totalPaths, failedPaths } };
}

function prepareCorpus(rawLevels, levelNumbers) {
    const corpus = [];
    for (const levelNumber of levelNumbers) {
        const raw = rawLevels[levelNumber - 1];
        if (!raw || !Array.isArray(raw.hints) || raw.hints.length === 0) continue;
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
        const prep = SOLVER_TESTING_API.prepLevel(level);
        const archetype = SOLVER_TESTING_API.detectArchetype(level);
        corpus.push({ levelNumber, level, prep, archetype, hints: raw.hints });
    }
    return corpus;
}

const fmtPct = x => `${(x * 100).toFixed(1)}%`;

function printSummaryTable(label, summary) {
    console.log(`\n${label}`);
    console.log(`  decisions=${summary.overall.decisions}  top1=${fmtPct(summary.overall.top1Rate)}  mrr=${summary.overall.mrr.toFixed(3)}  hinge=${summary.overall.meanHingeLoss.toFixed(2)}`);
    console.log('  by archetype:');
    for (const [arch, s] of Object.entries(summary.perArchetype)) {
        console.log(`    ${arch.padEnd(24)} n=${String(s.decisions).padEnd(6)} top1=${fmtPct(s.top1Rate).padEnd(7)} mrr=${s.mrr.toFixed(3)}  hinge=${s.meanHingeLoss.toFixed(2)}`);
    }
    console.log('  by phase:');
    for (const [ph, s] of Object.entries(summary.perPhase)) {
        console.log(`    ${ph.padEnd(24)} n=${String(s.decisions).padEnd(6)} top1=${fmtPct(s.top1Rate).padEnd(7)} mrr=${s.mrr.toFixed(3)}  hinge=${s.meanHingeLoss.toFixed(2)}`);
    }
    if (summary.diagnostics.failedPaths > 0) {
        console.log(`  warning: ${summary.diagnostics.failedPaths}/${summary.diagnostics.totalPaths} hint path replays diverged from the live state machine (skipped)`);
    }
}

// Coordinate-descent local search over WEIGHT_KEYS, multiple sweeps. Candidate
// values are always relative to the ORIGINAL baseline value for that key
// (not the current value), so passes can't compound into runaway drift.
function searchWeights(corpus, baseWeights, iters) {
    const MULT = [0.4, 0.6, 0.8, 1.0, 1.25, 1.6, 2.0, 2.5];
    const weights = { ...baseWeights };
    let best = evaluateWeights(corpus, weights);
    let bestObj = objective(best.overall);

    for (let pass = 0; pass < iters; pass++) {
        let improvedThisPass = false;
        for (const key of WEIGHT_KEYS) {
            const original = baseWeights[key] ?? 1;
            let bestValForKey = weights[key];
            for (const m of MULT) {
                const trial = { ...weights, [key]: original * m };
                const evalResult = evaluateWeights(corpus, trial);
                const obj = objective(evalResult.overall);
                if (obj > bestObj) {
                    bestObj = obj;
                    bestValForKey = original * m;
                    best = evalResult;
                    improvedThisPass = true;
                }
            }
            weights[key] = bestValForKey;
        }
        if (verbose) console.log(`  pass ${pass + 1}/${iters}: objective=${bestObj.toFixed(4)}`);
        if (!improvedThisPass) break;
    }
    return { weights, summary: best, objective: bestObj };
}

async function main() {
    const rawLevels = loadRawLevels();
    const levelNumbers = levelFilter
        ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
        : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

    console.log(`Preparing corpus: ${levelNumbers.length} level(s)...`);
    const corpus = prepareCorpus(rawLevels, levelNumbers);
    const totalHints = corpus.reduce((s, c) => s + c.hints.length, 0);
    console.log(`Loaded ${corpus.length} level(s) with hints, ${totalHints} verified path(s).`);

    const report = { timestamp: new Date().toISOString(), levelCount: corpus.length, hintCount: totalHints, profiles: {} };

    if (profileArg === 'all') {
        if (doSearch) throw new Error('--search requires a single --profile=<name>, not "all"');
        for (const [name, weights] of Object.entries(POLICY_PROFILES)) {
            const summary = evaluateWeights(corpus, weights);
            report.profiles[name] = { weights, summary };
            printSummaryTable(`Profile: ${name}`, summary);
        }
    } else {
        const baseWeights = POLICY_PROFILES[profileArg];
        if (!baseWeights) throw new Error(`Unknown profile "${profileArg}". Valid: ${Object.keys(POLICY_PROFILES).join(', ')}`);
        const baseline = evaluateWeights(corpus, baseWeights);
        printSummaryTable(`Profile: ${profileArg} (baseline)`, baseline);
        report.profiles[profileArg] = { weights: baseWeights, summary: baseline };

        if (doSearch) {
            console.log(`\nSearching (${searchIters} pass(es) x ${WEIGHT_KEYS.length} weights x 8 candidate values)... this can take a few minutes.`);
            const result = searchWeights(corpus, baseWeights, searchIters);
            printSummaryTable(`Profile: ${profileArg} (search result)`, result.summary);
            console.log('\nSuggested weights (review before applying to modules/solver/policy.js — this script never writes there):');
            console.log(JSON.stringify(result.weights, null, 2));
            report.profiles[profileArg].search = { weights: result.weights, summary: result.summary, objective: result.objective };
        }
    }

    if (outputFile) {
        const outAbs = path.resolve(outputFile);
        await mkdir(path.dirname(outAbs), { recursive: true });
        await writeFile(outAbs, JSON.stringify(report, null, 2));
        console.log(`\nResults written to ${outputFile}`);
    }
}

await main();
