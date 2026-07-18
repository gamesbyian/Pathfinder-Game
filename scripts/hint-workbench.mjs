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
import { decideCandidateAcceptance, pathSignature } from '../modules/domain/hint-novelty.ts';
import { evaluateCandidateAcceptance } from '../modules/domain/hint-acceptance-pipeline.ts';
import { createDiversificationSession } from '../modules/solver/diversification.ts';
import { createHintAblationGenerator } from '../modules/solver/hint-ablation-generator.ts';
import { makeProvenanceEntry, mergeHints, toHint } from '../modules/domain/hint-types.ts';

installBrowserStubs();

const { createSolver } = await import('../modules/Solver.js');
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
    'ui-plus': {
        description: 'Targeted enumeration, browser-safe UI ablation, then targeted enumeration again.',
        steps: ['enumerate-targeted', 'ablation-ui', 'enumerate-targeted'],
    },
    'full-practical': {
        description: 'The full practical cross-product: targeted enumeration, then all full-ablation phases (baseline, forward/reverse cascade+strategy, portal-exit forward/reverse, evidence-bounded combined forward/reverse).',
        steps: ['enumerate-targeted', 'ablation-full'],
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
        else throw new Error(`Unsupported --include=${item}. Currently supported: enumeration, complete-enumeration, ablation, ablation-full, ablation-combined-only, ablation-reverse-only.`);
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
        include: include.length > 0 ? include : [...new Set(steps.map(step => step.startsWith('enumerate') ? 'enumeration' : step === 'ablation-ui' ? 'ablation' : 'ablation-full'))],
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
    });
    const started = Date.now();
    let cancelled = false;
    const result = await search.run({
        mode: mode === 'complete' ? 'complete' : 'targeted',
        target: opts.target,
        maxHints: opts.maxHints,
        shouldStop: () => {
            cancelled = Date.now() - started >= opts.wallMs;
            return cancelled;
        },
        isCancelled: () => cancelled,
    });
    const technique = mode === 'complete' ? 'enumerate-complete' : 'enumerate-targeted';
    const seed = opts.seed + levelNumber + (mode === 'complete' ? 1000003 : 0);
    // variety-search already tracks real nodesExpanded/elapsedMs/technique per candidate
    // (newlySavedMeta, 1:1 aligned with newlySaved) — carry it straight through instead of
    // re-deriving it, so cost/technique data reflects the actual search that found each path.
    const candidates = result.newlySaved.map((candidatePath, index) => {
        const savedMeta = result.newlySavedMeta[index] ?? { nodesExpanded: null, elapsedMs: null, technique };
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
            },
            diagnostics: { cancelled },
            technique: savedMeta.technique,
            nodesExpanded: savedMeta.nodesExpanded,
            elapsedMs: savedMeta.elapsedMs,
            budgetMs: opts.wallMs,
            randomSeed: seed,
            usedExistingHints: existingHints.length > 0,
            hintGuided: savedMeta.technique === 'prefix-anchored',
        };
    });
    // Paths the search independently found again but which already matched an existing hint —
    // variety-search.ts tracks these (VarietyResult.rediscovered) instead of silently dropping
    // them, so their provenance can still be attributed (see processLevel's duplicateProvenance).
    const rediscovered = result.rediscovered.map((entry) => ({
        path: entry.path,
        generator: technique,
        technique: entry.technique,
        nodesExpanded: entry.nodesExpanded,
        elapsedMs: entry.elapsedMs,
        budgetMs: opts.wallMs,
        randomSeed: seed,
        usedExistingHints: existingHints.length > 0,
        hintGuided: entry.technique === 'prefix-anchored',
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
    const deadline = Date.now() + opts.wallMs;
    // The cascade doesn't track nodesExpanded/elapsedMs per found candidate (only wall-clock
    // budgets per phase), but onProgress does report each find's phase/profile/template — capture
    // it here (in the same order `novel` is pushed, since consider() does both synchronously) so
    // the accepted hint's provenance at least names which cascade phase/profile found it.
    const foundProvenance = [];
    const result = await session.runUntil(() => deadline, {
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
        profile: prov.profile ?? null,
        template: prov.template ?? null,
        forcingGateKey: prov.gateKey ?? null,
        forcingDirection: prov.direction ?? null,
        forcingPortalDest: prov.portalDest ?? null,
        forcingPortalExitDirection: prov.portalExitDirection ?? null,
        forcingDisabledFeatures: prov.disabledFeatures ?? null,
        nodesExpanded: null,
        elapsedMs: null,
        budgetMs: opts.wallMs,
        randomSeed: null,
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
            haltedByWallClock: Boolean(result.report?.haltedByWallClock),
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
    const wallClockDeadlineMs = opts.wallMs;
    const result = await createHintAblationGenerator(rawLevel, levelNumber, {
        solverApi: Solver,
        attemptBudgetMs: opts.attemptBudgetMs,
        baselineBudgetMs: opts.baselineBudgetMs,
        wallClockDeadlineMs,
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
            status: result.report.haltedByWallClock ? 'budgeted' : 'done',
            haltedByWallClock: result.report.haltedByWallClock,
        },
        meta: result.report,
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
    if (report?.haltedByWallClock) return 'budgeted';
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

function hintProvenanceEntryForEvent(event) {
    return makeProvenanceEntry(event.technique || event.generator, {
        solverVersion: GIT_SHA,
        profile: event.profile ?? null,
        template: event.template ?? null,
        nodesExpanded: event.nodesExpanded ?? null,
        elapsedMs: event.elapsedMs ?? null,
        budgetMs: event.budgetMs ?? null,
        termination: 'solved',
        randomSeed: event.randomSeed ?? null,
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
    });
}

function acceptCandidate({ raw, pool, poolSigs, accepted, rejected, policyReports, duplicateProvenance }, event, opts) {
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
            duplicateProvenance?.push({ path: reportPath, provenance: hintProvenanceEntryForEvent(event) });
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
        hintProvenance: [hintProvenanceEntryForEvent(event)],
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
            : ablationFullPhases
            ? await runAblationFull(level, raw, existing, opts, levelNumber, ablationFullPhases)
            : await runEnumeration(level, existing, opts, levelNumber, step === 'enumerate-complete' ? 'complete' : 'targeted');
        for (const entry of outcome.candidates) {
            if (accepted.length >= opts.maxAccepted) break;
            acceptCandidate({ raw, pool, poolSigs, accepted, rejected, policyReports, duplicateProvenance }, entry, opts);
        }
        // Paths the generator's own search already determined match an existing hint (see each
        // runXxx()'s `rediscovered` construction) — no need to re-run the acceptance pipeline's
        // duplicate check, just attribute the discovery directly.
        for (const entry of outcome.rediscovered || []) {
            duplicateProvenance?.push({ path: entry.path, provenance: hintProvenanceEntryForEvent(entry) });
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
        duplicateProvenanceCount: duplicateProvenance?.length ?? 0,
        duplicateProvenanceHints: (duplicateProvenance || []).map(d => toHint(d.path, [d.provenance])),
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
    maxHints: Number(argMap.get('--max-hints') || 1000),
    maxAccepted: Number(argMap.get('--max-accepted') || 150),
    stagnation: Number(argMap.get('--stagnation') || 400),
    restarts: Number(argMap.get('--restarts') || 24),
    nodeBudget: Number(argMap.get('--node-budget') || 120000),
    seeds: Number(argMap.get('--seeds') || 12),
    diversityFloor: Number(argMap.get('--diversity-floor') || 0.65),
    heatmapScoreFloor: Number(argMap.get('--heatmap-score-floor') || 1),
    seed: Number(argMap.get('--seed') || 20260703),
    wallMs: Number(argMap.get('--wall-ms') || 5 * 60 * 1000),
    attemptBudgetMs: Number(argMap.get('--attempt-budget-ms') || 4000),
    baselineBudgetMs: Number(argMap.get('--baseline-budget-ms') || 8000),
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
            ? ['npm run levels:generate-heatmaps', 'npm run check:hint-validity', 'npm run test:hint-path-oracle']
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
    if (totalAccepted > 0) console.log('Review patch, then run post-apply checks: npm run levels:generate-heatmaps && npm run check:hint-validity && npm run test:hint-path-oracle');
} else if (opts.writeLevels && !opts.auditMode) {
    console.log(`Updated -> ${opts.levelsJsonPath}`);
    if (totalAccepted > 0) console.log('Post-write checks: npm run levels:generate-heatmaps && npm run check:hint-validity && npm run test:hint-path-oracle');
}
if (opts.auditMode && (opts.writeLevels || opts.writePatch)) console.log('Audit mode enabled; skipped writes despite write options.');
