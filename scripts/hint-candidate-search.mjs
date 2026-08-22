#!/usr/bin/env node
/**
 * Read-only first-pass hint candidate search.
 *
 * This is intentionally narrower than the full corpus-expansion plan: it asks the existing solver for
 * baseline and forced-first-step solutions, validates each path with the PLAY referee, then filters it
 * through the shared heatmap/coverage acceptance gate. Accepted hints are written to an audit JSON file
 * for review; data/levels.json is not modified unless --write-levels is passed.
 *
 * Usage:
 *   npm run hints:discover-candidates -- --levels=pos:145 --max-accepted=5
 *   npm run hints:discover-candidates -- --levels=pos:1 --max-accepted=2 --write-levels
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { decideCandidateAcceptance, isDrawnStep, pathSignature } from '../modules/domain/hint-novelty.ts';

installBrowserStubs();

const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { createState, getNeighbors } = await import('../modules/solver/search-state.js');
const { FEATURE_GROUPS, withFeatureDisabled } = await import('../modules/solver/ablation-config.js');
const { readLevelsWithHints, writeLevelsWithHints, parseLevelPositions } = await import('./level-data-io.mjs');

const Solver = createSolver();
const ROOT = new URL('..', import.meta.url).pathname;

function parseArgs(argv) {
    const args = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        args.set(key, rest.length ? rest.join('=') : 'true');
    }
    return args;
}

async function atomicWriteFile(filePath, contents) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, contents);
    await rename(tmp, abs);
}

async function atomicWriteJson(filePath, data) {
    await atomicWriteFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function loadRawLevels(levelsJsonPath) {
    const resolved = path.isAbsolute(levelsJsonPath) ? levelsJsonPath : path.join(ROOT, levelsJsonPath);
    return readLevelsWithHints(resolved);
}

function enumerateFirstSteps(level, gateKey) {
    const gateLevel = { ...level, gateKeys: [gateKey] };
    const prep = SOLVER_TESTING_API.prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep).map(stepKey => ({ gateLevel, stepKey }));
}


function unpack(key) {
    return { x: key & 0xFFFF, y: key >>> 16 };
}

function pack(x, y) {
    return ((y << 16) | x) >>> 0;
}

function cornerFlipMutations(pathToMutate, grid) {
    const candidates = [];
    for (let i = 1; i < pathToMutate.length - 1; i++) {
        const a = pathToMutate[i - 1];
        const b = pathToMutate[i];
        const c = pathToMutate[i + 1];
        if (!isDrawnStep(a, b) || !isDrawnStep(b, c)) continue;
        const pa = unpack(a);
        const pb = unpack(b);
        const pc = unpack(c);
        if (Math.abs(pa.x - pc.x) !== 1 || Math.abs(pa.y - pc.y) !== 1) continue;
        const dx = pa.x + pc.x - pb.x;
        const dy = pa.y + pc.y - pb.y;
        if (dx < 0 || dy < 0 || dx >= grid.w || dy >= grid.h) continue;
        const replacement = pack(dx, dy);
        if (replacement === b) continue;
        const candidate = pathToMutate.slice();
        candidate[i] = replacement;
        candidates.push({ path: candidate, index: i, replaced: b, replacement });
    }
    return candidates;
}

async function solveAttempt(level, opts, errors) {
    try {
        // disableExtraBudgetPasses: this grid runs many narrow, cheap probes under a tight
        // timeBudgetMs -- without this, each individual solve can silently balloon to up to
        // (1 + 6 + 1 + N) x timeBudgetMs (repair fallback / attraction-diversity / admissible-
        // order-search's own extra-budget tiers; see CLAUDE.md's solver-architecture gotcha),
        // defeating the point of a tight per-attempt budget across a large grid. Same reasoning as
        // hint-ablation-generator.ts's runCascade/runStrategyPhase, which set this for the same
        // reason (the workbench's own ported candidate-grid step gained the identical fix
        // alongside this one — see reports/2026-07-25-hint-tool-comparison.md).
        const result = await Solver.solve(level, { ...opts, disableExtraBudgetPasses: true });
        return result?.ok && result.solution ? result.solution : null;
    } catch (err) {
        errors.push(err?.message || String(err));
        return null;
    }
}

async function processLevel(levelNumber, raw, opts) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const accepted = [];
    const rejected = new Map();
    const errors = [];
    const seen = new Set((raw.hints || []).map(pathSignature));
    const pool = [...(raw.hints || [])];
    let attempts = 0;
    let validCandidates = 0;

    const consider = (candidate, provenance) => {
        attempts++;
        if (!candidate) return;
        const validation = Solver.validateCandidatePath(level, candidate);
        if (!validation.ok) {
            rejected.set(`invalid:${validation.reason}`, (rejected.get(`invalid:${validation.reason}`) || 0) + 1);
            return;
        }
        validCandidates++;
        const sig = pathSignature(validation.path);
        if (seen.has(sig)) {
            rejected.set('already-known', (rejected.get('already-known') || 0) + 1);
            return;
        }
        const decision = decideCandidateAcceptance({ ...raw, hints: pool }, validation.path, {
            maxHintsPerLevel: opts.maxHintsPerLevel,
            diversityFloor: opts.diversityFloor,
            heatmapScoreFloor: opts.heatmapScoreFloor,
        });
        if (!decision.accept) {
            rejected.set(decision.reason, (rejected.get(decision.reason) || 0) + 1);
            return;
        }
        seen.add(sig);
        pool.push(validation.path);
        accepted.push({ path: validation.path, provenance, decision });
    };

    for (const [hintIndex, hint] of (raw.hints || []).entries()) {
        if (accepted.length >= opts.maxAccepted) break;
        for (const mutation of cornerFlipMutations(hint, raw.grid)) {
            if (accepted.length >= opts.maxAccepted) break;
            consider(mutation.path, {
                phase: 'corner-flip',
                hintIndex,
                index: mutation.index,
                replaced: mutation.replaced,
                replacement: mutation.replacement,
            });
        }
    }

    consider(await solveAttempt(level, { timeBudgetMs: opts.timeBudgetMs }, errors), { phase: 'baseline' });
    for (const flag of FEATURE_GROUPS.strategy) {
        if (accepted.length >= opts.maxAccepted) break;
        const candidate = await solveAttempt(level, { timeBudgetMs: opts.timeBudgetMs, ablation: withFeatureDisabled(flag) }, errors);
        consider(candidate, { phase: 'strategy', flag });
    }

    for (const gateKey of level.gateKeys) {
        if (accepted.length >= opts.maxAccepted) break;
        for (const { gateLevel, stepKey } of enumerateFirstSteps(level, gateKey)) {
            if (accepted.length >= opts.maxAccepted) break;
            const candidate = await solveAttempt(gateLevel, { timeBudgetMs: opts.timeBudgetMs, forcedFirstStepKey: stepKey }, errors);
            consider(candidate, { phase: 'forced-first-step', gateKey, stepKey });
            for (const flag of FEATURE_GROUPS.strategy) {
                if (accepted.length >= opts.maxAccepted) break;
                const strategyCandidate = await solveAttempt(gateLevel, {
                    timeBudgetMs: opts.timeBudgetMs,
                    forcedFirstStepKey: stepKey,
                    ablation: withFeatureDisabled(flag),
                }, errors);
                consider(strategyCandidate, { phase: 'forced-first-step-strategy', gateKey, stepKey, flag });
            }
        }
    }

    return {
        level: levelNumber,
        hintCountBefore: (raw.hints || []).length,
        attempts,
        validCandidates,
        acceptedCount: accepted.length,
        rejected: Object.fromEntries([...rejected.entries()].sort(([a], [b]) => a.localeCompare(b))),
        errors,
        accepted,
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const levelsJsonPath = args.get('--levels-json') || 'data/levels.json';
    const rawLevels = loadRawLevels(levelsJsonPath);
    const levelNumbers = parseLevelPositions(args.get('--levels') || 'pos:145', { maxLevel: rawLevels.length });
    const opts = {
        timeBudgetMs: Number(args.get('--time-budget-ms') || 1000),
        maxAccepted: Number(args.get('--max-accepted') || 10),
        maxHintsPerLevel: Number(args.get('--max-hints') || 1000),
        diversityFloor: Number(args.get('--diversity-floor') || 0.65),
        heatmapScoreFloor: Number(args.get('--heatmap-score-floor') || 1),
        output: args.get('--output') || 'reports/hint-discovery/candidate-search-latest.json',
        writeLevels: args.has('--write-levels'),
    };

    const results = [];
    for (const levelNumber of levelNumbers) {
        const result = await processLevel(levelNumber, rawLevels[levelNumber - 1], opts);
        if (opts.writeLevels && result.accepted.length) {
            const raw = rawLevels[levelNumber - 1];
            raw.hints = [...(raw.hints || []), ...result.accepted.map(accepted => accepted.path)];
        }
        results.push(result);
        console.log(`L${levelNumber}: accepted ${result.acceptedCount} / ${result.validCandidates} valid candidate(s)`);
        if (result.accepted.length) {
            for (const [idx, accepted] of result.accepted.entries()) {
                console.log(`  #${idx + 1}: ${accepted.decision.reason}, score=${accepted.decision.evaluation.heatmap.score}, phase=${accepted.provenance.phase}`);
            }
        }
    }

    const report = {
        generatedAt: new Date().toISOString(),
        levelsJsonPath,
        levelNumbers,
        options: opts,
        totalAccepted: results.reduce((sum, result) => sum + result.acceptedCount, 0),
        levels: results,
    };
    await atomicWriteJson(opts.output, report);
    console.log(`Wrote candidate report to ${opts.output}`);
    if (opts.writeLevels && report.totalAccepted > 0) {
        writeLevelsWithHints(path.isAbsolute(levelsJsonPath) ? levelsJsonPath : path.join(ROOT, levelsJsonPath), rawLevels);
        console.log(`Updated ${levelsJsonPath} with ${report.totalAccepted} accepted hint(s)`);
    }
}

await main();
