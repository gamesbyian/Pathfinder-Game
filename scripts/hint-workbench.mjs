#!/usr/bin/env node
/**
 * Unified hint workbench.
 *
 * A thin orchestration layer over the existing hint-discovery systems:
 *   - enumeration targeted/complete via modules/solver/variety-search.ts (Systems A/B + Find all)
 *   - browser-safe ablation diversification via modules/solver/diversification.ts
 *
 * The workbench deliberately treats generation, validation/acceptance, writing, and reporting as
 * separate steps. Read-only by default; pass --write-levels to append accepted candidates.
 *
 * Examples:
 *   npm run hints:workbench -- --levels=id:145 --preset=enumerate-targeted --target=15
 *   npm run hints:workbench -- --levels=id:145 --preset=ablation-ui --wall-ms=60000
 *   npm run hints:workbench -- --levels=id:145 --preset=ui-plus --policy=novelty-gated --write-levels
 */
import { execSync } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { hintFilePathFor, hintKeyForLevel, readLevelsWithHints, writeLevelsWithHints, parseLevelSelector } from './level-data-io.mjs';
import { decideCandidateAcceptance, isDrawnStep, pathSignature } from '../modules/domain/hint-novelty.ts';
import { evaluateCandidateAcceptance } from '../modules/domain/hint-acceptance-pipeline.ts';
import { createDiversificationSession } from '../modules/solver/diversification.ts';
import { workMeter } from '../modules/solver/work-meter.ts';
import { legacyMsToWork } from '../modules/solver/budget-units.ts';

/** --wall-ms/--enum-wall-ms are compatibility names: convert once to canonical work. */
import { createHintAblationGenerator } from '../modules/solver/hint-ablation-generator.ts';
import { deriveSolveAttemptInfo } from '../modules/solver/hint-provenance.ts';
import { makeProvenanceEntry, mergeHints, toHint } from '../modules/domain/hint-types.ts';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.ts';
import { FEATURE_GROUPS, withFeatureDisabled } from '../modules/solver/ablation-config.js';

installBrowserStubs();

const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { createState, getNeighbors } = await import('../modules/solver/search-state.js');
const Solver = createSolver();
const ROOT = new URL('..', import.meta.url).pathname;

// Git SHA at run time — feeds both hint-provenance's per-hint solver.version (GIT_SHA, null when
// unavailable, e.g. run outside a git checkout — an honest "unknown", not a placeholder) and the
// report's own top-level provenance.sourceCommit (GIT_SHA ?? 'local', a display fallback for a
// packaged/no-git context, which is exactly where GITHUB_SHA also isn't set). CI is checked first
// since it's more reliable there than a possibly-shallow local .git.
function resolveGitCommitSha() {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch { return null; }
}
const GIT_SHA = resolveGitCommitSha();

function parseArgs(argv) {
    const out = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        out.set(key, rest.length ? rest.join('=') : 'true');
    }
    return out;
}

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function relativePath(filePath) {
    return path.relative(ROOT, filePath) || '.';
}

function isPathInside(child, parent) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function assertSafeReportOutput(outputPath, opts) {
    if (opts.allowArtifactOutput) return;
    const absOutput = path.resolve(outputPath);
    const artifactDirs = [path.join(ROOT, 'data')];
    const blockedDir = artifactDirs.find(dir => isPathInside(absOutput, dir));
    if (blockedDir) {
        throw new Error(`Refusing to write report inside source-controlled artifact path ${relativePath(blockedDir)}. Use --allow-artifact-output=true to override.`);
    }
}

async function atomicWriteJson(filePath, data) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, abs);
}

const PRESETS = {
    'enumerate-targeted': {
        description: 'Targeted System A/B enumeration around existing hint coverage.',
        steps: ['enumerate-targeted'],
    },
    'enumerate-complete': {
        description: 'Complete DFS enumeration using the shared variety-search complete mode.',
        steps: ['enumerate-complete'],
    },
    'ablation-ui': {
        description: 'Browser-safe solver ablation phases exposed by the in-editor diversification UI.',
        steps: ['ablation-ui'],
    },
    'ablation-full': {
        description: 'Full solver ablation with all phases: baseline, forward cascade/strategy, reverse, portal-exit, combined forcing.',
        steps: ['ablation-full'],
    },
    'ablation-combined-only': {
        description: 'Only the evidence-bounded combined gate+direction x portal-exit phases (F/G); assumes forward/reverse/portal phases already ran and their discoveries are saved as evidence.',
        steps: ['ablation-combined-only'],
    },
    'ablation-reverse-only': {
        description: 'Only the gate/goal-swap reverse phases (D/E/G); for targeted debugging of direction-sensitive discoveries without re-running the forward phases.',
        steps: ['ablation-reverse-only'],
    },
    'candidate-grid': {
        description: 'Forced-first-step x strategy-flag ablation grid, an unforced strategy-flag sweep (no gate-direction forcing, which ablation-full never runs standalone), and corner-flip mutation of a sampled subset of existing hints (ported from hint-candidate-search.mjs), wall-clock-bounded so it always persists partial progress.',
        steps: ['candidate-grid'],
    },
    'portal-grid': {
        description: 'Every gate-direction x every portal-destination-exit-direction combo (one plain solve each, no cascade/strategy sweep), not just the evidence-proven triples ablation-full\'s Phase F/G tries. Hard-capped by --max-combos as well as --wall-ms. Opt-in only: no other preset includes this step.',
        steps: ['portal-grid'],
    },
    'ui-plus': {
        description: 'Targeted enumeration, browser-safe UI ablation, then targeted enumeration again.',
        steps: ['enumerate-targeted', 'ablation-ui', 'enumerate-targeted'],
    },
    'full-practical': {
        description: 'The full practical cross-product: targeted enumeration, then all full-ablation phases (baseline, forward/reverse cascade+strategy, portal-exit forward/reverse, evidence-bounded combined forward/reverse).',
        steps: ['enumerate-targeted', 'ablation-full'],
    },
    'full-practical-plus': {
        description: 'full-practical, then candidate-grid last: since the accepted pool grows across steps within a level, running candidate-grid after enumerate-targeted/ablation-full means its corner-flip sampling also covers this run\'s own new finds, not just hints that existed before the run started.',
        steps: ['enumerate-targeted', 'ablation-full', 'candidate-grid'],
    },
};

const PRESET_ALIASES = {
    'all-practical': 'ui-plus',
};

function presetHelpText() {
    const lines = [
        'Hint workbench presets:',
        ...Object.entries(PRESETS).map(([name, preset]) => `  ${name}: ${preset.description} Steps: ${preset.steps.join(' -> ')}`),
        '  all-practical: Deprecated alias for ui-plus; does not include full reverse or combined ablation phases.',
    ];
    return lines.join('\n');
}

function resolvePreset(preset) {
    const canonical = PRESET_ALIASES[preset] || preset;
    const config = PRESETS[canonical];
    if (!config) {
        throw new Error(`Unknown --preset=${preset}. Expected one of: ${[...Object.keys(PRESETS), ...Object.keys(PRESET_ALIASES)].join(', ')}.`);
    }
    return {
        requested: preset,
        name: canonical,
        isAlias: canonical !== preset,
        description: config.description,
        steps: [...config.steps],
    };
}

function parseCsvOption(value) {
    if (!value) return [];
    return value.split(',').map(part => part.trim()).filter(Boolean);
}

function stepsForInclude(include) {
    const steps = [];
    for (const item of include) {
        if (item === 'enumeration') steps.push('enumerate-targeted');
        else if (item === 'complete-enumeration') steps.push('enumerate-complete');
        else if (item === 'ablation') steps.push('ablation-ui');
        else if (item === 'ablation-full') steps.push('ablation-full');
        else if (item === 'ablation-combined-only') steps.push('ablation-combined-only');
        else if (item === 'ablation-reverse-only') steps.push('ablation-reverse-only');
        else if (item === 'candidate-grid') steps.push('candidate-grid');
        else if (item === 'portal-grid') steps.push('portal-grid');
        else throw new Error(`Unsupported --include=${item}. Currently supported: enumeration, complete-enumeration, ablation, ablation-full, ablation-combined-only, ablation-reverse-only, candidate-grid, portal-grid.`);
    }
    return steps;
}

const VALID_DIRECTIONS = new Set(['forward', 'reverse']);
const VALID_COMBINED = new Set(['off', 'evidence', 'full']);

// Translates the resolved --directions/--combined axis options into a phase-toggle record
// for the generic 'ablation-full' step. Only affects that step — the fixed-name convenience
// presets (ablation-combined-only, ablation-reverse-only) always run their own documented
// phase subset regardless of --directions/--combined, since their whole purpose is a
// specific named shortcut rather than a tunable axis combination.
function phasesFromAxisPlan(axisPlan) {
    const hasForward = axisPlan.directions.length === 0 || axisPlan.directions.includes('forward');
    const hasReverse = axisPlan.directions.includes('reverse');
    const hasCombined = axisPlan.combined === 'evidence';
    return {
        baseline: hasForward,
        cascade: hasForward,
        portalCascade: hasForward,
        swap: hasReverse,
        swapPortal: hasReverse,
        combined: hasCombined && hasForward,
        swapCombined: hasCombined && hasReverse,
    };
}

function resolveAxisPlan(presetConfig, opts) {
    const include = parseCsvOption(opts.include);
    const steps = include.length > 0 ? stepsForInclude(include) : [...presetConfig.steps];
    // The 'ablation-full' step's own name promises full phase coverage (Component 2's
    // invariant: a preset/step must not imply coverage it doesn't run), so when the caller
    // reaches it without explicitly narrowing --directions/--combined, default to the full
    // forward+reverse+evidence-combined set instead of the global forward-only/combined-off
    // default that applies to every other step.
    const includesAblationFull = steps.includes('ablation-full');
    const directions = parseCsvOption(opts.directions || (includesAblationFull ? 'forward,reverse' : 'forward'));
    for (const direction of directions) {
        if (!VALID_DIRECTIONS.has(direction)) {
            throw new Error(`Unsupported --directions=${opts.directions}. Expected forward, reverse, or forward,reverse.`);
        }
    }
    const combined = opts.combined || (includesAblationFull ? 'evidence' : 'off');
    if (!VALID_COMBINED.has(combined)) {
        throw new Error(`Unsupported --combined=${combined}. Expected off, evidence, or full.`);
    }
    if (combined === 'full') {
        throw new Error(`Unsupported --combined=full. Only evidence-bounded combined forcing (--combined=evidence) is implemented — an unbounded full (gate x direction) x portalDest cross product is deliberately not exposed as a default-reachable option (design principle 4: dangerous full Cartesian products require explicit, budgeted opt-in, and no such bounded-but-unbounded-combined mode exists yet). See Component 4/5 in docs/hint-workbench-implementation-plan.md.`);
    }
    return {
        source: include.length > 0 ? 'include' : 'preset',
        preset: presetConfig.name,
        include: include.length > 0 ? include : [...new Set(steps.map(step => step.startsWith('enumerate') ? 'enumeration' : step === 'ablation-ui' ? 'ablation' : step === 'candidate-grid' ? 'candidate-grid' : step === 'portal-grid' ? 'portal-grid' : 'ablation-full'))],
        directions,
        portalDests: opts.portalDests,
        combined,
        flipperVariants: opts.flipperVariants,
        strategyFlags: opts.strategyFlags,
        cascade: opts.cascade,
        steps,
    };
}


function sumByStep(runs, field) {
    const totals = {};
    for (const run of runs) totals[run.step] = (totals[run.step] || 0) + run[field];
    return totals;
}

// Per-axis coverage for the ablation-full family of steps (ablation-full,
// ablation-combined-only, ablation-reverse-only): how many gate x direction, portal-dest x
// exit-direction, and evidence-bounded combined triples were actually tried, summed across
// every such step this level ran, plus the union of phases that executed. Returns null when
// no ablation-full-family step ran this level (e.g. an enumeration-only preset), so callers
// don't have to distinguish "zero combos tried" from "this axis wasn't attempted at all".
function summarizeAblationAxisCoverage(runs) {
    const ablationRuns = runs.filter(run => run.meta && run.meta.combosTried);
    if (ablationRuns.length === 0) return null;
    const totals = { baseline: 0, cascade: 0, swap: 0, portalCascade: 0, swapPortal: 0, combined: 0, swapCombined: 0 };
    const phasesRun = new Set();
    for (const run of ablationRuns) {
        for (const key of Object.keys(totals)) totals[key] += run.meta.combosTried[key] || 0;
        for (const phase of run.meta.phasesRun || []) phasesRun.add(phase);
    }
    return {
        baselineTried: totals.baseline,
        gateDirectionsTried: totals.cascade,
        swapGateDirectionsTried: totals.swap,
        portalDestDirectionsTried: totals.portalCascade,
        swapPortalDestDirectionsTried: totals.swapPortal,
        combinedTriplesTried: totals.combined,
        swapCombinedTriplesTried: totals.swapCombined,
        phasesRun: [...phasesRun],
    };
}

function summarizeAxisCoverage(axisPlan, runs) {
    const attemptedSteps = runs.map(run => run.step);
    return {
        include: axisPlan.include,
        directions: axisPlan.directions,
        portalDests: axisPlan.portalDests,
        combined: axisPlan.combined,
        attemptedSteps,
        completedSteps: runs.filter(run => run.status === 'done').map(run => run.step),
        budgetedSteps: runs.filter(run => run.status === 'budgeted').map(run => run.step),
        cappedSteps: runs.filter(run => run.status === 'capped').map(run => run.step),
        cancelledSteps: runs.filter(run => run.status === 'cancelled').map(run => run.step),
        producedByStep: sumByStep(runs, 'produced'),
        acceptedByStep: sumByStep(runs, 'accepted'),
        ablation: summarizeAblationAxisCoverage(runs),
    };
}

function makeNoveltyGate(raw, pool, opts) {
    return (candidate) => decideCandidateAcceptance({ ...raw, hints: pool }, candidate, {
        maxHintsPerLevel: opts.maxHints,
        diversityFloor: opts.diversityFloor,
        heatmapScoreFloor: opts.heatmapScoreFloor,
    });
}

async function runEnumeration(level, existingHints, opts, levelNumber, mode) {
    const search = Solver.createVarietySearch(level, existingHints, {
        maxHints: opts.maxHints,
        stagnation: opts.stagnation,
        restarts: opts.restarts,
        nodeBudget: opts.nodeBudget,
        seeds: opts.seeds,
        rng: mulberry32(opts.seed + levelNumber + (mode === 'complete' ? 1000003 : 0)),
        orderBy: opts.enumOrder,
        tieBreakProfile: opts.enumTieBreak ? {} : null,
    });
    const startedWork = workMeter.units;
    let cancelled = false;
    const result = await search.run({
        mode: mode === 'complete' ? 'complete' : 'targeted',
        target: opts.target,
        maxHints: opts.maxHints,
        shouldStop: () => {
            // Work-governed (per the "work budgets, not wall clock" directive): the deterministic
            // per-call node budgets (nodeBudget x restarts/seeds) bound this search, so System A can't
            // starve System B (prefix-anchored) by burning a budget before the anchored phase runs —
            // the failure mode that skipped re-attribution on large levels. This secondary
            // hang-safety bound is now WORK too (opts.enumWallMs converted at the same rate), so
            // even the non-binding safety net cannot make the discovered set host-dependent.
            // Still reads the realm-global workMeter (unlike runAblationUi/runCandidateGrid/
            // runPortalGrid/diversification.ts's session-local accounting, fixed 2026-08-28):
            // shouldStop fires from INSIDE variety-search's own run() call, which owns no
            // caller-visible per-step result to sum a workSpent delta from, so there's no
            // solveGridAttempt()-style return value to intercept here. Contamination risk is lower
            // than the fixed sites because this bound is explicitly secondary/non-binding (the
            // deterministic nodeBudget above already governs the discovered set) — remaining debt,
            // see docs/solver-budget-determinism.md's "module-global discovery work meter" item.
            cancelled = workMeter.units - startedWork >= legacyMsToWork(opts.enumWallMs, 1);
            return cancelled;
        },
        isCancelled: () => cancelled,
    });
    const technique = mode === 'complete' ? 'enumerate-complete' : 'enumerate-targeted';
    const seed = opts.seed + levelNumber + (mode === 'complete' ? 1000003 : 0);
    // variety-search already tracks real nodesExpanded/elapsedMs/technique per candidate
    // (newlySavedMeta, 1:1 aligned with newlySaved) — carry it straight through instead of
    // re-deriving it, so cost/technique data reflects the actual search that found each path.
    // savedMeta.technique/scoringProfileId already carry the orderBy suffix/tie-break identity (see
    // VarietySavedMeta's own doc in variety-search.ts) -- .startsWith, not ===, below, since the
    // suffix means the string is no longer exactly 'prefix-anchored' under admissible-slack mode.
    const candidates = result.newlySaved.map((candidatePath, index) => {
        const savedMeta = result.newlySavedMeta[index] ?? { nodesExpanded: null, elapsedMs: null, technique, scoringProfileId: null };
        return {
            path: candidatePath,
            generator: technique,
            sequence: index + 1,
            provenance: {
                generator: technique,
                levelNumber,
                mode: mode === 'complete' ? 'complete' : 'targeted',
                seed,
                target: opts.target,
                maxHints: opts.maxHints,
                restarts: opts.restarts,
                nodeBudget: opts.nodeBudget,
                seeds: opts.seeds,
                orderBy: opts.enumOrder,
                tieBreak: opts.enumTieBreak,
            },
            diagnostics: { cancelled },
            technique: savedMeta.technique,
            scoringProfileId: savedMeta.scoringProfileId ?? savedMeta.profile ?? null,
            nodesExpanded: savedMeta.nodesExpanded,
            elapsedMs: savedMeta.elapsedMs,
            budgetMs: opts.wallMs,
            randomSeed: seed,
            usedExistingHints: existingHints.length > 0,
            hintGuided: savedMeta.technique.startsWith('prefix-anchored'),
            anchorSeed: savedMeta.anchorSeed ?? null,
            anchorDepth: savedMeta.anchorDepth ?? null,
        };
    });
    // Paths the search independently found again but which already matched an existing hint —
    // variety-search.ts tracks these (VarietyResult.rediscovered) instead of silently dropping
    // them, so their provenance can still be attributed (see processLevel's duplicateProvenance).
    const rediscovered = result.rediscovered.map((entry) => ({
        path: entry.path,
        generator: technique,
        technique: entry.technique,
        scoringProfileId: entry.scoringProfileId ?? entry.profile ?? null,
        nodesExpanded: entry.nodesExpanded,
        elapsedMs: entry.elapsedMs,
        budgetMs: opts.wallMs,
        randomSeed: seed,
        usedExistingHints: existingHints.length > 0,
        hintGuided: entry.technique.startsWith('prefix-anchored'),
        anchorSeed: entry.anchorSeed ?? null,
        anchorDepth: entry.anchorDepth ?? null,
    }));
    return {
        generator: technique,
        candidates,
        rediscovered,
        exhaustion: { status: classifyEnumerationExhaustion(result.outcome), outcome: result.outcome, cancelled },
        meta: { outcome: result.outcome, savedCount: result.savedCount, curatedCount: result.curatedCount, cancelled },
    };
}

async function runAblationUi(level, existingHints, opts, levelNumber) {
    const session = createDiversificationSession(level, existingHints, {
        solverApi: Solver,
        attemptBudgetMs: opts.attemptBudgetMs,
        baselineBudgetMs: opts.baselineBudgetMs,
    });
    // Wall-clock budget in, WORK ceiling out — converted once here at the run boundary using the
    // same measured rate solveLevel's own ms->work shim uses, so an existing --wall-ms caller keeps
    // roughly its intended cost while WHICH HINTS GET FOUND stops depending on host speed.
    // Session-local budget (see diversification.ts's ctx.sessionWork): runUntil()'s ceiling is now
    // measured from the session's own zero baseline, not an absolute realm-global workMeter.units
    // checkpoint, so no `workMeter.units +` prefix here.
    const workCeiling = legacyMsToWork(opts.wallMs, 1);
    // The cascade doesn't track nodesExpanded/elapsedMs per found candidate (only wall-clock
    // budgets per phase), but onProgress does report each find's phase/scoring-profile/ordering-bias — capture
    // it here (in the same order `novel` is pushed, since consider() does both synchronously) so
    // the accepted hint's provenance at least names which cascade phase/scoring profile found it.
    const foundProvenance = [];
    const result = await session.runUntil(() => workCeiling, {
        maxHints: opts.maxAccepted,
        onProgress: (event) => { if (event.type === 'hint-found') foundProvenance.push(event.provenance); },
    });
    // ablation-ui never reverses the gate/goal (Phase D/E/F/G are excluded — see
    // diversification.ts's header comment), so forcingReversed/forcingFlippedFilters are left
    // unset (undefined) here rather than false: the swap axis isn't part of this generator's
    // design at all, distinct from ablation-full where it exists but a given phase didn't use it.
    const candidateFromProv = (path, prov, sequence) => ({
        path,
        generator: 'ablation-ui',
        sequence,
        provenance: {
            generator: 'ablation-ui',
            levelNumber,
            attemptBudgetMs: opts.attemptBudgetMs,
            baselineBudgetMs: opts.baselineBudgetMs,
            wallMs: opts.wallMs,
            ...prov,
        },
        diagnostics: {},
        technique: ['ablation-ui', prov.phase].filter(Boolean).join(':'),
        scoringProfileId: prov.scoringProfileId ?? prov.profile ?? null,
        orderingBiasId: prov.orderingBiasId ?? prov.template ?? null,
        forcingGateKey: prov.gateKey ?? null,
        forcingDirection: prov.direction ?? null,
        forcingPortalDest: prov.portalDest ?? null,
        forcingPortalExitDirection: prov.portalExitDirection ?? null,
        forcingDisabledFeatures: prov.disabledFeatures ?? null,
        beamWidth: prov.beamWidth ?? null,
        mechanicBucketRetention: prov.mechanicBucketRetention ?? prov.diverseBeam ?? null,
        attemptIndex: prov.attemptIndex ?? null,
        nodesExpanded: prov.nodesExpanded ?? null,
        elapsedMs: prov.elapsedMs ?? null,
        budgetMs: opts.wallMs,
        randomSeed: prov.randomSeed ?? null,
        seedSalt: prov.seedSalt ?? null,
        usedExistingHints: existingHints.length > 0,
        hintGuided: false,
    });
    const candidates = result.novel.map((candidatePath, index) => candidateFromProv(candidatePath, foundProvenance[index] || {}, index + 1));
    // Paths the cascade independently found again but which already matched an existing hint —
    // see runEnumeration's identical handling of variety-search.ts's rediscovered list.
    const rediscovered = (result.rediscovered || []).map((entry, index) => candidateFromProv(entry.path, entry.provenance || {}, index + 1));
    return {
        generator: 'ablation-ui',
        candidates,
        rediscovered,
        exhaustion: {
            status: classifyAblationExhaustion(result.report),
            haltedByWorkBudget: Boolean(result.report?.haltedByWorkBudget ?? result.report?.haltedByWallClock),
            // Compatibility output for older report consumers.
            haltedByWallClock: Boolean(result.report?.haltedByWorkBudget ?? result.report?.haltedByWallClock),
            haltedByMaxHints: Boolean(result.report?.haltedByMaxHints),
            haltedByCancel: Boolean(result.report?.haltedByCancel),
        },
        meta: result.report,
    };
}

const ABLATION_FULL_PHASE_SETS = {
    // Every phase: baseline, forward/reverse cascade+strategy, portal-exit forward/reverse,
    // evidence-bounded combined forward/reverse.
    all: { baseline: true, cascade: true, swap: true, portalCascade: true, swapPortal: true, combined: true, swapCombined: true },
    // Only the evidence-bounded combined phases (F/G) — for targeted debugging once
    // Phase A/B/C/D have already been run and their discoveries saved as evidence.
    'combined-only': { baseline: false, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: true, swapCombined: true },
    // Only the reverse (gate/goal-swap) phases (D/E/G) — for targeted debugging of
    // direction-sensitive discoveries without re-running the forward phases.
    'reverse-only': { baseline: false, cascade: false, swap: true, portalCascade: false, swapPortal: true, combined: false, swapCombined: true },
};

async function runAblationFull(level, rawLevel, existingHints, opts, levelNumber, phases = ABLATION_FULL_PHASE_SETS.all) {
    // --wall-ms is retained as a CLI compatibility name, but all hint-discovery extent is work-
    // bounded. Convert once here and pass the preferred workBudget API; no live clock gates phases.
    const workBudget = legacyMsToWork(opts.wallMs, 1);
    const result = await createHintAblationGenerator(rawLevel, levelNumber, {
        solverApi: Solver,
        attemptBudgetMs: opts.attemptBudgetMs,
        baselineBudgetMs: opts.baselineBudgetMs,
        workBudget,
        extraEvidenceHints: existingHints,
        phases,
    });
    return {
        generator: 'ablation-full',
        candidates: result.candidates,
        // result.rediscovered already carries the same per-discovery forcing detail as
        // result.candidates (hint-ablation-generator.ts builds both through the same helper) —
        // no need to re-derive it here from result.discoveries.
        rediscovered: result.rediscovered,
        exhaustion: {
            status: result.report.haltedByWorkBudget ? 'budgeted' : 'done',
            haltedByWorkBudget: result.report.haltedByWorkBudget,
            haltedByWallClock: result.report.haltedByWallClock,
        },
        meta: result.report,
    };
}

// candidate-grid step: forced-first-neighbor x strategy-flag ablation grid, plus corner-flip
// mutation of existing hints — ported from scripts/hint-candidate-search.mjs. Unlike that script's
// unbounded (gate x direction x strategy-flag) grid, which had no incremental persistence and could
// time out with zero output (found in the 2026-07-25 tool comparison, reports/2026-07-25-hint-tool-
// comparison.md), this step is bounded by the work ceiling derived from opts.wallMs, like
// runAblationUi/runAblationFull. It always returns within that deterministic work envelope with
// whatever candidates it found so far, so the outer per-level write loop
// in main() below can persist partial progress instead of losing an interrupted run's work entirely.
function unpackCellKey(key) {
    return { x: key & 0xFFFF, y: key >>> 16 };
}

function packCellKey(x, y) {
    return ((y << 16) | x) >>> 0;
}

function shuffleCopy(arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
    return out;
}

function cornerFlipMutations(pathToMutate, grid) {
    const candidates = [];
    for (let i = 1; i < pathToMutate.length - 1; i++) {
        const a = pathToMutate[i - 1];
        const b = pathToMutate[i];
        const c = pathToMutate[i + 1];
        if (!isDrawnStep(a, b) || !isDrawnStep(b, c)) continue;
        const pa = unpackCellKey(a);
        const pb = unpackCellKey(b);
        const pc = unpackCellKey(c);
        if (Math.abs(pa.x - pc.x) !== 1 || Math.abs(pa.y - pc.y) !== 1) continue;
        const dx = pa.x + pc.x - pb.x;
        const dy = pa.y + pc.y - pb.y;
        if (dx < 0 || dy < 0 || dx >= grid.w || dy >= grid.h) continue;
        const replacement = packCellKey(dx, dy);
        if (replacement === b) continue;
        const candidate = pathToMutate.slice();
        candidate[i] = replacement;
        candidates.push({ path: candidate, index: i, replaced: b, replacement });
    }
    return candidates;
}

function enumerateFirstSteps(level, gateKey) {
    const gateLevel = { ...level, gateKeys: [gateKey] };
    const prep = SOLVER_TESTING_API.prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep).map(stepKey => ({ gateLevel, stepKey }));
}

async function solveGridAttempt(gridLevel, solveOpts, errors) {
    try {
        // disableExtraBudgetPasses: candidate-grid/portal-grid deliberately run many narrow, cheap
        // probes under a tight timeBudgetMs -- without this, each individual solve can silently
        // balloon to up to (1 + 6 + 1 + N) x timeBudgetMs (repair fallback / goal-attraction-disabled-retry /
        // admissible-order-fallback's own extra-budget tiers; see CLAUDE.md's solver-architecture
        // gotcha on this), defeating the whole point of a tight per-attempt budget across a large
        // grid. Same reasoning as hint-ablation-generator.ts's runCascade/runStrategyPhase, which
        // set this for the identical reason. Caught live: an early portal-grid test against S00103
        // (4 gates, 2 portals) averaged ~4.1s/combo against an 800ms nominal budget before this fix.
        const result = await Solver.solveLevel(gridLevel, { ...solveOpts, disableExtraBudgetPasses: true });
        // workSpent is reported even on a failed/no-solution attempt (SolveResult.workSpent is
        // always set — see orchestration.ts's finish()) so the caller's session-local work
        // accounting counts a losing probe's cost exactly like the old realm-global read did.
        const workSpent = result?.workSpent ?? 0;
        if (!result?.ok || !result.solution) return { solution: null, attemptInfo: null, workSpent };
        const attemptInfo = deriveSolveAttemptInfo(result.attempts);
        return { solution: result.solution, attemptInfo, workSpent };
    } catch (err) {
        errors.push(err?.message || String(err));
        // A thrown solve (rare -- genuine errors only, not ordinary exhaustion) can't report the
        // work it spent before throwing: unlike the old realm-global workMeter read, session-local
        // accounting has no way to recover that partial cost from here. Conservative in the safe
        // direction only: the session may run slightly longer than its nominal budget on that rare
        // path, never shorter.
        return { solution: null, attemptInfo: null, workSpent: 0 };
    }
}

async function runCandidateGrid(level, raw, existingHints, opts, levelNumber) {
    // Wall-clock budget in, WORK ceiling out — converted once here at the run boundary using the
    // same measured rate solveLevel's own ms->work shim uses, so an existing --wall-ms caller keeps
    // roughly its intended cost while WHICH HINTS GET FOUND stops depending on host speed.
    // Session-local accounting (2026-08-28 caller-owned-work-scope fix — see
    // docs/solver-budget-determinism.md's "module-global discovery work meter" debt item): this
    // step's own `workSpent` accumulator, fed by every solveGridAttempt() result `record()` sees
    // below, replaces a direct read of the realm-global workMeter so an unrelated solve elsewhere in
    // the same process can no longer pad or steal this step's own budget accounting.
    const workBudget = legacyMsToWork(opts.wallMs, 1);
    let workSpent = 0;
    const timedOut = () => workSpent >= workBudget;
    const candidates = [];
    const errors = [];
    let cancelled = false;

    // Expects a `{ solution, attemptInfo, workSpent? }` object (solveGridAttempt()'s own return
    // shape) — NOT a bare path array. A bare array's `.solution` is undefined, so it silently no-ops
    // here instead of throwing; wrap a non-solve candidate as `{ solution: path, attemptInfo: null }`
    // (see the corner-flip loop above for why that mistake is easy to make and easy to miss).
    const record = (result, provenance) => {
        workSpent += result?.workSpent ?? 0;
        if (!result?.solution) return;
        const attemptInfo = result.attemptInfo;
        candidates.push({
            path: result.solution,
            generator: 'candidate-grid',
            sequence: candidates.length + 1,
            provenance: { generator: 'candidate-grid', levelNumber, wallMs: opts.wallMs, attemptBudgetMs: opts.attemptBudgetMs, ...provenance },
            diagnostics: {},
            technique: ['candidate-grid', provenance.phase].filter(Boolean).join(':'),
            forcingGateKey: provenance.gateKey ?? null,
            forcingDisabledFeatures: provenance.flag ? [provenance.flag] : null,
            beamWidth: attemptInfo?.beamWidth ?? null,
            mechanicBucketRetention: attemptInfo?.mechanicBucketRetention ?? null,
            attemptIndex: attemptInfo?.attemptIndex ?? null,
            nodesExpanded: attemptInfo?.nodesExpanded ?? null,
            elapsedMs: attemptInfo?.elapsedMs ?? null,
            budgetMs: opts.attemptBudgetMs,
            randomSeed: attemptInfo?.randomSeed ?? null,
            seedSalt: attemptInfo?.seedSalt ?? null,
            usedExistingHints: existingHints.length > 0,
            hintGuided: false,
        });
    };

    // Corner-flip mutations are cheap local path edits (no solve call themselves), but each one is
    // still downstream-validated by the shared acceptance pipeline (a real, non-free solver call)
    // OUTSIDE this function's own opts.wallMs deadline — so, like System B's prefix-anchor sampling
    // (variety-search.ts's `seeds`), only mutate a bounded sample of existing hints rather than every
    // one, which would make the uncounted downstream validation cost scale unboundedly with the
    // level's existing hint count (measured: this exact gap timed out a 492-hint level's candidate-
    // grid run — see reports/2026-07-25-hint-tool-comparison.md). Deterministic given the same --seed.
    const cornerFlipRng = mulberry32(opts.seed + levelNumber + 7919);
    const cornerFlipSample = shuffleCopy(existingHints, cornerFlipRng).slice(0, opts.seeds);
    for (const [hintIndex, hint] of cornerFlipSample.entries()) {
        for (const mutation of cornerFlipMutations(hint, raw.grid)) {
            // record() reads `result.solution`/`result.attemptInfo` (the solveGridAttempt() shape);
            // a mutation has neither a real attempt nor any workSpent (no solve call — see the
            // header comment above), so wrap the path instead of passing it bare. A bare path array
            // silently vanished here for as long as this step has existed (candidates.push never
            // ran, `candidates` array size unaffected, no error) since `path.solution` is undefined
            // -- zero "corner-flip" provenance entries ever reached data/hints/*.json. Fixed
            // 2026-08-28; see this fix's report for the before/after evidence.
            record({ solution: mutation.path, attemptInfo: null }, { phase: 'corner-flip', hintIndex, index: mutation.index, replaced: mutation.replaced, replacement: mutation.replacement });
        }
    }

    if (!timedOut()) record(await solveGridAttempt(level, { timeBudgetMs: opts.attemptBudgetMs }, errors), { phase: 'baseline' });
    else cancelled = true;

    for (const flag of FEATURE_GROUPS.strategy) {
        if (timedOut()) { cancelled = true; break; }
        record(await solveGridAttempt(level, { timeBudgetMs: opts.attemptBudgetMs, ablation: withFeatureDisabled(flag) }, errors), { phase: 'strategy', flag });
    }

    gateLoop:
    for (const gateKey of level.gateKeys) {
        if (timedOut()) { cancelled = true; break; }
        for (const { gateLevel, stepKey } of enumerateFirstSteps(level, gateKey)) {
            if (timedOut()) { cancelled = true; break gateLoop; }
            record(await solveGridAttempt(gateLevel, { timeBudgetMs: opts.attemptBudgetMs, forcedFirstStepKey: stepKey }, errors), { phase: 'forced-first-step', gateKey, stepKey });
            for (const flag of FEATURE_GROUPS.strategy) {
                if (timedOut()) { cancelled = true; break gateLoop; }
                record(await solveGridAttempt(gateLevel, { timeBudgetMs: opts.attemptBudgetMs, forcedFirstStepKey: stepKey, ablation: withFeatureDisabled(flag) }, errors), { phase: 'forced-first-step-strategy', gateKey, stepKey, flag });
            }
        }
    }

    return {
        generator: 'candidate-grid',
        candidates,
        // No separate rediscovery tracking needed here: unlike the enumeration/ablation engines,
        // this step doesn't maintain its own pool/signature set, so every candidate (including
        // already-known ones) flows through outcome.candidates and acceptCandidate's own
        // exact-duplicate/canonical-duplicate handling already attributes duplicate provenance.
        rediscovered: [],
        exhaustion: { status: cancelled ? 'budgeted' : 'done', cancelled },
        meta: { errors },
    };
}

// portal-grid step: crosses EVERY gate-direction with EVERY portal-destination x exit-direction
// pair, not just the (gate, direction, portalDest) triples ablation-full's Phase F/G already
// proved jointly reachable by an existing hint. That evidence-bounding is exactly what makes
// Phase F/G unable to discover a level's portal being useful from a gate/direction no hint has
// ever used — this step exists to close that gap. Deliberately narrower than Phase F/G's per-combo
// treatment to keep the added combinatorial cost in check: ONE plain solve per (gate, direction,
// portalDest, exitDir) combo, no cascade/strategy sweep (that's what already-evidenced combos get
// from ablation-full; this step's job is breadth — trying combos nothing has tried yet — not depth
// on a combo already known to work). Always opt-in: no preset includes it by default, and it's
// hard-capped by BOTH --wall-ms and --max-combos so a level with many gates/portals can't make an
// unbounded run even if the wall clock is set generously.
function enumeratePortalExitDirections(level, destKey) {
    const prep = SOLVER_TESTING_API.prepLevel(level);
    const state = createState(destKey, level, prep);
    // A fresh state has lastWasPortalJump=false, which would make getNeighbors think it must force
    // another jump back out (destKey is itself a portalMap key) — force the flag so getNeighbors
    // falls through to normal static-neighbor enumeration instead. Mirrors
    // hint-ablation-generator.ts's identical helper.
    state.lastWasPortalJump = true;
    return getNeighbors(destKey, state, level, prep);
}

async function runPortalGrid(level, opts, levelNumber) {
    const candidates = [];
    const errors = [];
    if (level.portalMap.size === 0) {
        return { generator: 'portal-grid', candidates, rediscovered: [], exhaustion: { status: 'done', cancelled: false }, meta: { combosTried: 0, portalDests: 0, note: 'no portals on this level' } };
    }

    // Wall-clock budget in, WORK ceiling out — converted once here at the run boundary using the
    // same measured rate solveLevel's own ms->work shim uses, so an existing --wall-ms caller keeps
    // roughly its intended cost while WHICH HINTS GET FOUND stops depending on host speed.
    // Session-local accounting — see runCandidateGrid's identical comment above.
    const workBudget = legacyMsToWork(opts.wallMs, 1);
    let workSpent = 0;
    const timedOut = () => workSpent >= workBudget;
    const portalDests = [...new Set([...level.portalMap.values()].map(p => p.dest))];
    let combosTried = 0;
    let cancelled = false;

    const record = (result, provenance) => {
        workSpent += result?.workSpent ?? 0;
        if (!result?.solution) return;
        const attemptInfo = result.attemptInfo;
        candidates.push({
            path: result.solution,
            generator: 'portal-grid',
            sequence: candidates.length + 1,
            provenance: { generator: 'portal-grid', levelNumber, wallMs: opts.wallMs, attemptBudgetMs: opts.attemptBudgetMs, maxCombos: opts.maxCombos, ...provenance },
            diagnostics: {},
            technique: ['portal-grid', provenance.phase].filter(Boolean).join(':'),
            forcingGateKey: provenance.gateKey ?? null,
            forcingDirection: provenance.direction ?? null,
            forcingPortalDest: provenance.portalDest ?? null,
            forcingPortalExitDirection: provenance.portalExitDirection ?? null,
            beamWidth: attemptInfo?.beamWidth ?? null,
            mechanicBucketRetention: attemptInfo?.mechanicBucketRetention ?? null,
            attemptIndex: attemptInfo?.attemptIndex ?? null,
            nodesExpanded: attemptInfo?.nodesExpanded ?? null,
            elapsedMs: attemptInfo?.elapsedMs ?? null,
            budgetMs: opts.attemptBudgetMs,
            randomSeed: attemptInfo?.randomSeed ?? null,
            seedSalt: attemptInfo?.seedSalt ?? null,
            usedExistingHints: false,
            hintGuided: false,
        });
    };

    gridLoop:
    for (const gateKey of level.gateKeys) {
        for (const { gateLevel, stepKey } of enumerateFirstSteps(level, gateKey)) {
            for (const destKey of portalDests) {
                for (const exitDir of enumeratePortalExitDirections(level, destKey)) {
                    if (timedOut() || combosTried >= opts.maxCombos) { cancelled = true; break gridLoop; }
                    combosTried++;
                    const path = await solveGridAttempt(gateLevel, {
                        timeBudgetMs: opts.attemptBudgetMs,
                        forcedFirstStepKey: stepKey,
                        forcedPortalExitKey: { from: destKey, to: exitDir },
                    }, errors);
                    record(path, { phase: 'portal-grid', gateKey, direction: stepKey, portalDest: destKey, portalExitDirection: exitDir });
                }
            }
        }
    }

    return {
        generator: 'portal-grid',
        candidates,
        rediscovered: [],
        exhaustion: { status: cancelled ? 'budgeted' : 'done', cancelled },
        meta: { errors, combosTried, portalDests: portalDests.length },
    };
}

function classifyEnumerationExhaustion(outcome) {
    if (outcome === 'exhaustive' || outcome === 'saturated' || outcome === 'target') return 'done';
    if (outcome === 'cancelled') return 'cancelled';
    if (outcome === 'budget') return 'budgeted';
    if (outcome === 'capped') return 'capped';
    return 'unknown';
}

function classifyAblationExhaustion(report) {
    if (report?.haltedByCancel) return 'cancelled';
    if (report?.haltedByWorkBudget ?? report?.haltedByWallClock) return 'budgeted';
    if (report?.haltedByMaxHints) return 'capped';
    return 'done';
}

function maybePaths(paths, opts) {
    return opts.includePaths ? paths : undefined;
}

function pathSignatures(paths) {
    return paths.map(pathSignature);
}

function maybePolicyPath(pathValue, opts) {
    return opts.includePaths ? pathValue : undefined;
}

function recordPolicyReport(reports, opts, entry) {
    if (opts.policyReport === 'summary') return;
    if (opts.policyReport === 'rejections-only' && entry.wouldAccept) return;
    reports.push(entry);
}

function evaluatePolicy(raw, pool, candidate, opts) {
    if (opts.evaluationPolicy === 'novelty-gated') return makeNoveltyGate(raw, pool, opts)(candidate);
    return { accept: true, reason: 'save-all-valid' };
}

// stage -> `valid` field semantics for the policy report: null means "duplicate check ran before
// validation, so validity is unknown"; false/true mean validation itself ran and returned that result.
function validFieldForStage(stage) {
    if (stage === 'exact-duplicate') return null;
    if (stage === 'invalid') return false;
    return true;
}

function hintProvenanceEntryForEvent(event, levelRevision = null) {
    return makeProvenanceEntry(event.technique || event.generator, {
        solverVersion: GIT_SHA,
        scoringProfileId: event.scoringProfileId ?? event.profile ?? null,
        orderingBiasId: event.orderingBiasId ?? event.template ?? null,
        beamWidth: event.beamWidth ?? null,
        mechanicBucketRetention: event.mechanicBucketRetention ?? event.diverseBeam ?? null,
        gateKey: event.gateKey ?? null,
        attemptIndex: event.attemptIndex ?? null,
        nodesExpanded: event.nodesExpanded ?? null,
        elapsedMs: event.elapsedMs ?? null,
        budgetMs: event.budgetMs ?? null,
        termination: 'solved',
        levelRevision,
        randomSeed: event.randomSeed ?? null,
        seedSalt: event.seedSalt ?? null,
        usedExistingHints: event.usedExistingHints ?? false,
        hintGuided: event.hintGuided ?? false,
        // Deliberately NOT `?? null` here: makeProvenanceEntry's forcingFromOpts distinguishes
        // undefined (this technique has no forcing concept at all -> forcing stays null overall)
        // from an explicit null (this technique HAS a forcing concept but didn't force this
        // particular field/find -> forcing is a populated object). Only ablation-family events
        // (runAblationFull/runAblationUi) set these; every other technique's event simply never
        // has them, so they read as undefined here and forcing correctly stays null.
        forcingGateKey: event.forcingGateKey,
        forcingDirection: event.forcingDirection,
        forcingPortalDest: event.forcingPortalDest,
        forcingPortalExitDirection: event.forcingPortalExitDirection,
        forcingReversed: event.forcingReversed,
        forcingFlippedFilters: event.forcingFlippedFilters,
        forcingDisabledFeatures: event.forcingDisabledFeatures,
        // Prefix-anchored finds carry the seed hint they anchored on — the real differentiator that
        // makes each such entry a distinct discovery condition. Only set (non-null) for those, so
        // forcing stays null for techniques with no anchor concept.
        ...(event.anchorSeed != null ? { forcingAnchorSeed: event.anchorSeed, forcingAnchorDepth: event.anchorDepth ?? null } : {}),
    });
}

// Collapse rediscovery provenance to one entry per (path, DISCOVERY CONDITION) — technique/scoring-profile/
// ordering-bias/forcing/seed/context/termination, i.e. "how was it found", excluding the incidental search
// metrics (nodesExpanded/elapsedMs/foundAt). A single enumeration run re-reaches the same solution
// from many internal anchors and fires a rediscovery event each time; those share a condition and
// differ only in node count (measured, on P00157, at 88% redundant), which is search noise, not
// solver-relevant signal. Genuinely distinct conditions (a different technique or forcing surfacing
// the same path) are the useful part and are kept. Keeps the first representative of each condition.
function dedupeRediscoveryByCondition(items) {
    const seen = new Set();
    const out = [];
    for (const it of items) {
        const s = it.provenance?.solver || {};
        const c = it.provenance?.context || {};
        const se = it.provenance?.search || {};
        const key = JSON.stringify([
            it.path.join(','), s.id, s.technique,
            s.scoringProfileId ?? s.profile, s.orderingBiasId ?? s.template, s.forcing,
            c.hintGuided, c.usedExistingHints, c.levelRevision, se.randomSeed, se.termination,
        ]);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
    }
    return out;
}

function acceptCandidate({ raw, pool, poolSigs, accepted, rejected, policyReports, duplicateProvenance, levelRevision }, event, opts) {
    const candidate = event.path;
    const normalizedLevel = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const outcome = evaluateCandidateAcceptance(
        normalizedLevel, raw, candidate, poolSigs,
        (_levelForPolicy, canonicalPath) => evaluatePolicy(raw, pool, canonicalPath, opts),
    );
    const reportPath = outcome.path ?? candidate;
    const reportSig = outcome.pathSignature ?? outcome.inputPathSignature;

    if (!outcome.accept) {
        rejected[outcome.reason] = (rejected[outcome.reason] || 0) + 1;
        // A path that already exists (either in the level's saved hints, or accepted earlier in
        // this same run) is still a genuine independent discovery event — its provenance would
        // otherwise be silently lost. Instead of just tallying the rejection, also capture the
        // finding under the existing path's signature; mergeHints (hint-types.ts) already knows
        // how to append this onto the matching Hint record rather than treating it as a new one,
        // so a previously-unattributed saved hint gains attribution, and a hint independently
        // rediscovered by a different technique/run accumulates every discovery, per the
        // provenance invariant ("one entry per independent find" — see CLAUDE.md). Not done for
        // 'invalid' rejections: an invalid candidate isn't a real solution for this level at all.
        if (outcome.stage === 'exact-duplicate' || outcome.stage === 'canonical-duplicate') {
            duplicateProvenance?.push({ path: reportPath, provenance: hintProvenanceEntryForEvent(event, levelRevision) });
        }
        recordPolicyReport(policyReports, opts, {
            generator: event.generator,
            sequence: event.sequence,
            path: maybePolicyPath(reportPath, opts),
            pathSignature: reportSig,
            valid: validFieldForStage(outcome.stage),
            wouldAccept: false,
            wouldRejectReason: outcome.reason,
            ...(outcome.stage === 'policy' ? { evaluation: outcome.evaluation ?? null } : {}),
            provenance: event.provenance,
        });
        return false;
    }
    poolSigs.add(outcome.pathSignature);
    pool.push(outcome.path);
    accepted.push({
        path: outcome.path,
        auditOnly: opts.auditMode,
        generator: event.generator,
        sequence: event.sequence,
        provenance: event.provenance,
        diagnostics: event.diagnostics ?? null,
        reason: outcome.reason,
        evaluation: outcome.evaluation ?? null,
        hintProvenance: [hintProvenanceEntryForEvent(event, levelRevision)],
    });
    recordPolicyReport(policyReports, opts, {
        generator: event.generator,
        sequence: event.sequence,
        path: maybePolicyPath(outcome.path, opts),
        pathSignature: outcome.pathSignature,
        valid: true,
        wouldAccept: true,
        wouldRejectReason: null,
        reason: outcome.reason,
        evaluation: outcome.evaluation ?? null,
        provenance: event.provenance,
    });
    return true;
}

async function processLevel(levelNumber, raw, opts) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    // Level-shape fingerprint at find-time, stamped on every hint's provenance.levelRevision so a
    // stored hint can't silently keep pointing at a since-edited level. Computed once per level.
    const levelRevision = await getLevelFingerprint(raw);
    const pool = [...(raw.hints || [])];
    const poolSigs = new Set(pool.map(pathSignature));
    const accepted = [];
    const rejected = {};
    const policyReports = [];
    const runs = [];
    const duplicateProvenance = opts.auditMode ? null : [];

    for (const step of opts.axisPlan.steps) {
        if (accepted.length >= opts.maxAccepted) break;
        const before = accepted.length;
        const existing = pool.slice();
        // 'ablation-full' honors --directions/--combined (Component 5's axis planner); the
        // fixed-name convenience presets always run their own documented phase subset.
        const ablationFullPhases = step === 'ablation-full' ? phasesFromAxisPlan(opts.axisPlan)
            : step === 'ablation-combined-only' ? ABLATION_FULL_PHASE_SETS['combined-only']
            : step === 'ablation-reverse-only' ? ABLATION_FULL_PHASE_SETS['reverse-only']
            : null;
        const outcome = step === 'ablation-ui'
            ? await runAblationUi(level, existing, opts, levelNumber)
            : step === 'candidate-grid'
            ? await runCandidateGrid(level, raw, existing, opts, levelNumber)
            : step === 'portal-grid'
            ? await runPortalGrid(level, opts, levelNumber)
            : ablationFullPhases
            ? await runAblationFull(level, raw, existing, opts, levelNumber, ablationFullPhases)
            : await runEnumeration(level, existing, opts, levelNumber, step === 'enumerate-complete' ? 'complete' : 'targeted');
        for (const entry of outcome.candidates) {
            if (accepted.length >= opts.maxAccepted) break;
            acceptCandidate({ raw, pool, poolSigs, accepted, rejected, policyReports, duplicateProvenance, levelRevision }, entry, opts);
        }
        // Paths the generator's own search already determined match an existing hint (see each
        // runXxx()'s `rediscovered` construction) — no need to re-run the acceptance pipeline's
        // duplicate check, just attribute the discovery directly.
        for (const entry of outcome.rediscovered || []) {
            duplicateProvenance?.push({ path: entry.path, provenance: hintProvenanceEntryForEvent(entry, levelRevision) });
        }
        runs.push({
            step,
            status: outcome.exhaustion?.status || 'unknown',
            produced: outcome.candidates.length,
            accepted: accepted.length - before,
            rediscovered: outcome.rediscovered?.length ?? 0,
            exhaustion: outcome.exhaustion || { status: 'unknown' },
            meta: outcome.meta,
        });
    }

    const dedupedDuplicateProvenance = dedupeRediscoveryByCondition(duplicateProvenance || []);

    return {
        level: levelNumber,
        status: 'done',
        hintCountBefore: (raw.hints || []).length,
        hintCountAfter: opts.auditMode ? (raw.hints || []).length : pool.length,
        hintCountAfterWouldBe: pool.length,
        acceptedCount: accepted.length,
        rejected,
        runs,
        axisCoverage: summarizeAxisCoverage(opts.axisPlan, runs),
        acceptedPaths: (opts.writeLevels || opts.writePatch) ? (opts.auditMode ? [] : accepted.map(a => a.path)) : maybePaths(opts.auditMode ? [] : accepted.map(a => a.path), opts),
        acceptedHints: opts.auditMode ? [] : accepted.map(a => toHint(a.path, a.hintProvenance)),
        // Provenance for re-discoveries of an ALREADY-known path (exact/canonical duplicates) —
        // never new paths, so never counted in acceptedCount/acceptedPaths, but still real
        // discovery events. mergeHints (hint-types.ts) matches these onto the existing Hint record
        // by path signature and appends the provenance, rather than this being treated as a new hint.
        duplicateProvenanceCount: dedupedDuplicateProvenance.length,
        duplicateProvenanceHints: dedupedDuplicateProvenance.map(d => toHint(d.path, [d.provenance])),
        acceptedPathSignatures: pathSignatures(opts.auditMode ? [] : accepted.map(a => a.path)),
        wouldAcceptPaths: maybePaths(opts.auditMode ? accepted.map(a => a.path) : [], opts),
        wouldAcceptPathSignatures: pathSignatures(opts.auditMode ? accepted.map(a => a.path) : []),
        policyReports,
        acceptedMeta: accepted.map(({ auditOnly, generator, sequence, provenance, diagnostics, reason, evaluation }) => ({
            auditOnly,
            generator,
            sequence,
            provenance,
            diagnostics,
            reason,
            evaluation,
        })),
    };
}

const argMap = parseArgs(process.argv.slice(2));
if (argMap.has('--help')) {
    console.log(`${presetHelpText()}\n\nPolicies: save-all, novelty-gated, audit-only. Use --audit-policy=save-all|novelty-gated to choose the evaluated policy for audit-only runs.`);
    process.exit(0);
}
const presetConfig = resolvePreset(argMap.get('--preset') || 'ui-plus');
if (presetConfig.isAlias) {
    console.warn(`Warning: --preset=${presetConfig.requested} is deprecated; using --preset=${presetConfig.name}. ${presetConfig.name} runs: ${presetConfig.steps.join(' -> ')}.`);
}
const opts = {
    levelsJsonPath: argMap.get('--levels-json') || 'data/levels.json',
    output: argMap.get('--output') || 'reports/hint-workbench/latest.json',
    preset: presetConfig.name,
    requestedPreset: presetConfig.requested,
    presetConfig,
    policy: argMap.get('--policy') || 'novelty-gated',
    auditPolicy: argMap.get('--audit-policy') || 'novelty-gated',
    policyReport: argMap.get('--policy-report') || 'summary',
    includePaths: argMap.get('--include-paths') !== 'false',
    include: argMap.get('--include') || '',
    directions: argMap.get('--directions') || '',
    portalDests: argMap.get('--portal-dests') || 'off',
    combined: argMap.get('--combined') || '',
    flipperVariants: argMap.get('--flipper-variants') || 'off',
    strategyFlags: argMap.get('--strategy-flags') || 'none',
    cascade: argMap.get('--cascade') || 'off',
    allowArtifactOutput: argMap.get('--allow-artifact-output') === 'true',
    writePatch: argMap.get('--write-patch') || '',
    yes: argMap.get('--yes') === 'true',
    writeLevels: argMap.get('--write-levels') === 'true',
    target: Number(argMap.get('--target') || 15),
    // maxHints/maxAccepted default to UNCAPPED for script/dev hint-finding: the 1000-hint cap and the
    // 150-accept cap are UI-latency guards for player-initiated searches, NOT data limits, so a script
    // must never skip or truncate a level just because it already has many hints — it only avoids
    // SAVING duplicate paths (dedup is by path signature, always on). Pass --max-hints/--max-accepted
    // to reimpose a cap for a bounded run. (Runtime/UI caps live elsewhere and are unchanged.)
    maxHints: Number(argMap.get('--max-hints') || Infinity),
    maxAccepted: Number(argMap.get('--max-accepted') || Infinity),
    stagnation: Number(argMap.get('--stagnation') || 400),
    restarts: Number(argMap.get('--restarts') || 24),
    nodeBudget: Number(argMap.get('--node-budget') || 120000),
    seeds: Number(argMap.get('--seeds') || 12),
    // Threaded into enumerate-targeted/enumerate-complete's Solver.createVarietySearch config
    // (variety-search.ts's VarietySearchConfig.orderBy/tieBreakProfile) -- see EnumOptions.orderBy's
    // own doc in hint-enumeration.ts for what 'admissible-slack' changes (ranking AND pruning
    // together) and why it's opt-in. Default 'random' leaves every existing enumeration call
    // byte-for-byte unaffected.
    enumOrder: argMap.get('--enum-order') === 'admissible-slack' ? 'admissible-slack' : 'random',
    enumTieBreak: argMap.get('--enum-tie-break') === 'true',
    diversityFloor: Number(argMap.get('--diversity-floor') || 0.65),
    heatmapScoreFloor: Number(argMap.get('--heatmap-score-floor') || 1),
    seed: Number(argMap.get('--seed') ?? 20260703),
    wallMs: Number(argMap.get('--wall-ms') || 5 * 60 * 1000),
    // Enumeration (targeted/complete) is node-governed — see runEnumeration's shouldStop. The wall
    // clock there is only a hang-safety: honor an explicit --wall-ms, else default it high (1h) so it
    // never binds before the deterministic per-call node budgets finish (and System B always runs).
    enumWallMs: argMap.has('--wall-ms') ? Number(argMap.get('--wall-ms')) : 60 * 60 * 1000,
    attemptBudgetMs: Number(argMap.get('--attempt-budget-ms') || 4000),
    baselineBudgetMs: Number(argMap.get('--baseline-budget-ms') || 8000),
    // Hard backstop for the portal-grid step, independent of --wall-ms: a level with several gates
    // x several first-step directions x several portal destinations x several exit directions can
    // multiply out large even before the wall clock would catch it. 500 is deliberately generous
    // (in practice --wall-ms usually binds first) but still a real ceiling, not "unbounded until
    // the timer says stop".
    maxCombos: Number(argMap.get('--max-combos') || 500),
};
if (!['save-all', 'novelty-gated', 'audit-only'].includes(opts.policy)) {
    throw new Error(`Unknown --policy=${opts.policy}. Expected save-all, novelty-gated, or audit-only.`);
}
if (!['save-all', 'novelty-gated'].includes(opts.auditPolicy)) {
    throw new Error(`Unknown --audit-policy=${opts.auditPolicy}. Expected save-all or novelty-gated.`);
}
if (!['summary', 'full', 'rejections-only'].includes(opts.policyReport)) {
    throw new Error(`Unknown --policy-report=${opts.policyReport}. Expected summary, full, or rejections-only.`);
}
if (opts.writeLevels && !opts.yes) {
    throw new Error('Refusing --write-levels without --yes=true. Use --write-patch for review-only output.');
}
opts.auditMode = opts.policy === 'audit-only';
opts.evaluationPolicy = opts.auditMode ? opts.auditPolicy : opts.policy;
opts.axisPlan = resolveAxisPlan(presetConfig, opts);

assertSafeReportOutput(opts.output, opts);
if (opts.writePatch) assertSafeReportOutput(opts.writePatch, opts);

const levelsPath = path.isAbsolute(opts.levelsJsonPath) ? opts.levelsJsonPath : path.join(ROOT, opts.levelsJsonPath);
const rawLevels = readLevelsWithHints(levelsPath);
const levelNumbers = [...parseLevelSelector(rawLevels, argMap.get('--levels'))].sort((a, b) => a - b);
const startedAt = Date.now();
const results = [];
const changedHintFiles = [];
const patchLevels = [];
let totalAccepted = 0;
let totalDuplicateProvenance = 0;
let writeResult = null;
let patchResult = null;

console.log(`Hint workbench: ${levelNumbers.length} level(s), preset=${opts.preset}, steps=${opts.axisPlan.steps.join(' -> ')}, policy=${opts.policy}, evaluationPolicy=${opts.evaluationPolicy}, write=${opts.writeLevels && !opts.auditMode ? 'yes' : 'no'}`);
for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    const t0 = Date.now();
    const result = await processLevel(levelNumber, raw, opts);
    result.elapsedMs = Date.now() - t0;
    totalAccepted += result.acceptedCount;
    totalDuplicateProvenance += result.duplicateProvenanceCount;
    if (!opts.auditMode && (result.acceptedCount > 0 || result.duplicateProvenanceCount > 0)) {
        if (opts.writeLevels && !opts.writePatch) {
            raw.hints = [...(raw.hints || []), ...result.acceptedPaths];
            raw.hintRecords = mergeHints(raw.hintRecords || [], [...result.acceptedHints, ...result.duplicateProvenanceHints]);
            changedHintFiles.push(relativePath(hintFilePathFor(levelsPath, hintKeyForLevel(raw, levelNumber))));
            // Persist after EVERY level rather than only once at the very end: a long multi-level run
            // used to lose all its work on an interruption, and its progress was invisible until it
            // finished. writeLevelsWithHints only rewrites files that actually changed, so this is
            // cheap. (Within a single very large level, bound it with --wall-ms so the step returns
            // and persists; re-running accumulates more, deduped by path signature.)
            writeResult = writeLevelsWithHints(levelsPath, rawLevels);
        }
        if (opts.writePatch) {
            patchLevels.push({
                level: levelNumber,
                acceptedPaths: result.acceptedPaths,
                acceptedHints: result.acceptedHints,
                acceptedPathSignatures: result.acceptedPathSignatures,
                duplicateProvenanceHints: result.duplicateProvenanceHints,
            });
        }
    }
    results.push(result);
    console.log(`L${levelNumber}: +${result.acceptedCount}${opts.auditMode ? ' would-accept' : ''} (${result.hintCountBefore}->${result.hintCountAfter}${opts.auditMode ? `, would be ${result.hintCountAfterWouldBe}` : ''})`
        + `${result.duplicateProvenanceCount > 0 ? `, +${result.duplicateProvenanceCount} provenance merged into existing hints` : ''} ${result.elapsedMs}ms`);
}

if (opts.writeLevels && !opts.writePatch && !opts.auditMode && (totalAccepted > 0 || totalDuplicateProvenance > 0)) writeResult = writeLevelsWithHints(levelsPath, rawLevels);
if (opts.writePatch && !opts.auditMode && (totalAccepted > 0 || totalDuplicateProvenance > 0)) {
    patchResult = {
        schemaVersion: 1,
        levelsPath: relativePath(levelsPath),
        totalAccepted,
        totalDuplicateProvenance,
        levels: patchLevels,
    };
    await atomicWriteJson(opts.writePatch, patchResult);
}
await atomicWriteJson(opts.output, {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    totalMs: Date.now() - startedAt,
    totalAccepted,
    totalDuplicateProvenance,
    provenance: { sourceCommit: GIT_SHA ?? 'local' },
    options: opts,
    axisPlan: opts.axisPlan,
    writes: {
        requested: opts.writeLevels || Boolean(opts.writePatch),
        mode: opts.writePatch ? 'patch' : (opts.writeLevels ? 'levels' : 'none'),
        skippedForAudit: (opts.writeLevels || Boolean(opts.writePatch)) && opts.auditMode,
        levelsPath: relativePath(levelsPath),
        changedFiles: opts.writePatch && patchResult ? [relativePath(path.resolve(opts.writePatch))] : (writeResult?.levelsChanged ? [relativePath(levelsPath), ...changedHintFiles] : changedHintFiles),
        result: opts.writePatch ? patchResult : writeResult,
        postWriteReminders: (opts.writeLevels || Boolean(opts.writePatch)) && !opts.auditMode && totalAccepted > 0
            ? ['npm run levels:generate-heatmaps', 'npm run check:level-data-validity', 'npm run test:hint-path-oracle']
            : [],
    },
    preset: {
        requested: opts.requestedPreset,
        resolved: opts.preset,
        description: opts.presetConfig.description,
        steps: opts.axisPlan.steps,
    },
    levels: results,
});
console.log(`Done: ${totalAccepted} ${opts.auditMode ? 'would-accept' : 'accepted'} candidate(s). Report -> ${opts.output}`);
if (opts.writePatch && !opts.auditMode) {
    console.log(`Patch -> ${opts.writePatch}`);
    if (totalAccepted > 0) console.log('Review patch, then run post-apply checks: npm run levels:generate-heatmaps && npm run check:level-data-validity && npm run test:hint-path-oracle');
} else if (opts.writeLevels && !opts.auditMode) {
    console.log(`Updated -> ${opts.levelsJsonPath}`);
    if (totalAccepted > 0) console.log('Post-write checks: npm run levels:generate-heatmaps && npm run check:level-data-validity && npm run test:hint-path-oracle');
}
if (opts.auditMode && (opts.writeLevels || opts.writePatch)) console.log('Audit mode enabled; skipped writes despite write options.');
