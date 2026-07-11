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
 *   npm run hints:workbench -- --levels=145 --preset=enumerate-targeted --target=15
 *   npm run hints:workbench -- --levels=145 --preset=ablation-ui --wall-ms=60000
 *   npm run hints:workbench -- --levels=145 --preset=ui-plus --policy=novelty-gated --write-levels
 */
import { execSync } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { hintFilePathFor, readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { decideCandidateAcceptance, pathSignature } from '../modules/domain/hint-novelty.ts';
import { createDiversificationSession } from '../modules/solver/diversification.ts';
import { makeProvenanceEntry, mergeHints, toHint } from '../modules/domain/hint-types.ts';

// Git SHA at run time, for hint-provenance's solver.version — null (not a placeholder) when
// unavailable, e.g. run outside a git checkout.
function currentGitSha() {
    try {
        return execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
    } catch {
        return null;
    }
}

installBrowserStubs();

const { createSolver } = await import('../modules/Solver.js');
const Solver = createSolver();
const ROOT = new URL('..', import.meta.url).pathname;
const GIT_SHA = currentGitSha();

function parseArgs(argv) {
    const out = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        out.set(key, rest.length ? rest.join('=') : 'true');
    }
    return out;
}

function parseLevelSpec(spec, maxLevel) {
    if (!spec || spec === 'all') return Array.from({ length: maxLevel }, (_, i) => i + 1);
    const levels = new Set();
    for (const part of spec.split(',')) {
        const token = part.trim();
        if (!token) continue;
        if (token.includes('-')) {
            const [a, b] = token.split('-').map(v => Number(v.trim()));
            if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
            for (let n = Math.min(a, b); n <= Math.max(a, b); n++) levels.add(n);
        } else {
            const n = Number(token);
            if (Number.isFinite(n)) levels.add(n);
        }
    }
    return [...levels].filter(n => n >= 1 && n <= maxLevel).sort((a, b) => a - b);
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
    'ui-plus': {
        description: 'Targeted enumeration, browser-safe UI ablation, then targeted enumeration again.',
        steps: ['enumerate-targeted', 'ablation-ui', 'enumerate-targeted'],
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
        else throw new Error(`Unsupported --include=${item}. Currently supported: enumeration, complete-enumeration, ablation.`);
    }
    return steps;
}

function resolveAxisPlan(presetConfig, opts) {
    const include = parseCsvOption(opts.include);
    const steps = include.length > 0 ? stepsForInclude(include) : [...presetConfig.steps];
    const directions = parseCsvOption(opts.directions || 'forward');
    if (directions.some(direction => direction !== 'forward')) {
        throw new Error(`Unsupported --directions=${opts.directions}. Reverse solving is planned but not available in the workbench yet.`);
    }
    if (opts.combined !== 'off') {
        throw new Error(`Unsupported --combined=${opts.combined}. Combined forcing is planned but not available in the workbench yet.`);
    }
    return {
        source: include.length > 0 ? 'include' : 'preset',
        preset: presetConfig.name,
        include: include.length > 0 ? include : [...new Set(steps.map(step => step.startsWith('enumerate') ? 'enumeration' : 'ablation'))],
        directions,
        portalDests: opts.portalDests,
        combined: opts.combined,
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
    return {
        generator: technique,
        candidates,
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
    const candidates = result.novel.map((candidatePath, index) => {
        const prov = foundProvenance[index] || {};
        const technique = ['ablation-ui', prov.phase].filter(Boolean).join(':');
        return {
            path: candidatePath,
            generator: 'ablation-ui',
            sequence: index + 1,
            provenance: {
                generator: 'ablation-ui',
                levelNumber,
                attemptBudgetMs: opts.attemptBudgetMs,
                baselineBudgetMs: opts.baselineBudgetMs,
                wallMs: opts.wallMs,
                ...prov,
            },
            diagnostics: {},
            technique,
            profile: prov.profile ?? null,
            template: prov.template ?? null,
            nodesExpanded: null,
            elapsedMs: null,
            budgetMs: opts.wallMs,
            randomSeed: null,
            usedExistingHints: existingHints.length > 0,
            hintGuided: false,
        };
    });
    return {
        generator: 'ablation-ui',
        candidates,
        exhaustion: {
            status: classifyAblationExhaustion(result.report),
            haltedByWallClock: Boolean(result.report?.haltedByWallClock),
            haltedByMaxHints: Boolean(result.report?.haltedByMaxHints),
            haltedByCancel: Boolean(result.report?.haltedByCancel),
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

function acceptCandidate({ raw, pool, poolSigs, accepted, rejected, policyReports }, event, opts) {
    const candidate = event.path;
    const sig0 = pathSignature(candidate);
    if (poolSigs.has(sig0)) {
        rejected['exact-duplicate'] = (rejected['exact-duplicate'] || 0) + 1;
        recordPolicyReport(policyReports, opts, {
            generator: event.generator,
            sequence: event.sequence,
            path: maybePolicyPath(candidate, opts),
            pathSignature: sig0,
            valid: null,
            wouldAccept: false,
            wouldRejectReason: 'exact-duplicate',
            provenance: event.provenance,
        });
        return false;
    }
    const validation = Solver.validateCandidatePath(Solver.prepareLevelForSolver(raw, { source: 'raw' }), candidate);
    if (!validation.ok) {
        const key = `invalid:${validation.reason}`;
        rejected[key] = (rejected[key] || 0) + 1;
        recordPolicyReport(policyReports, opts, {
            generator: event.generator,
            sequence: event.sequence,
            path: maybePolicyPath(candidate, opts),
            pathSignature: sig0,
            valid: false,
            wouldAccept: false,
            wouldRejectReason: key,
            provenance: event.provenance,
        });
        return false;
    }
    const sig = pathSignature(validation.path);
    if (poolSigs.has(sig)) {
        rejected['canonical-duplicate'] = (rejected['canonical-duplicate'] || 0) + 1;
        recordPolicyReport(policyReports, opts, {
            generator: event.generator,
            sequence: event.sequence,
            path: maybePolicyPath(validation.path, opts),
            pathSignature: sig,
            valid: true,
            wouldAccept: false,
            wouldRejectReason: 'canonical-duplicate',
            provenance: event.provenance,
        });
        return false;
    }

    const decision = evaluatePolicy(raw, pool, validation.path, opts);

    if (!decision.accept) {
        rejected[decision.reason] = (rejected[decision.reason] || 0) + 1;
        recordPolicyReport(policyReports, opts, {
            generator: event.generator,
            sequence: event.sequence,
            path: maybePolicyPath(validation.path, opts),
            pathSignature: sig,
            valid: true,
            wouldAccept: false,
            wouldRejectReason: decision.reason,
            evaluation: decision.evaluation ?? null,
            provenance: event.provenance,
        });
        return false;
    }
    poolSigs.add(sig);
    pool.push(validation.path);
    accepted.push({
        path: validation.path,
        auditOnly: opts.auditMode,
        generator: event.generator,
        sequence: event.sequence,
        provenance: event.provenance,
        diagnostics: event.diagnostics ?? null,
        reason: decision.reason,
        evaluation: decision.evaluation ?? null,
        hintProvenance: [makeProvenanceEntry(event.technique || event.generator, {
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
        })],
    });
    recordPolicyReport(policyReports, opts, {
        generator: event.generator,
        sequence: event.sequence,
        path: maybePolicyPath(validation.path, opts),
        pathSignature: sig,
        valid: true,
        wouldAccept: true,
        wouldRejectReason: null,
        reason: decision.reason,
        evaluation: decision.evaluation ?? null,
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

    for (const step of opts.axisPlan.steps) {
        if (accepted.length >= opts.maxAccepted) break;
        const before = accepted.length;
        const existing = pool.slice();
        const outcome = step === 'ablation-ui'
            ? await runAblationUi(level, existing, opts, levelNumber)
            : await runEnumeration(level, existing, opts, levelNumber, step === 'enumerate-complete' ? 'complete' : 'targeted');
        for (const entry of outcome.candidates) {
            if (accepted.length >= opts.maxAccepted) break;
            acceptCandidate({ raw, pool, poolSigs, accepted, rejected, policyReports }, entry, opts);
        }
        runs.push({
            step,
            status: outcome.exhaustion?.status || 'unknown',
            produced: outcome.candidates.length,
            accepted: accepted.length - before,
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
    directions: argMap.get('--directions') || 'forward',
    portalDests: argMap.get('--portal-dests') || 'off',
    combined: argMap.get('--combined') || 'off',
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
const levelNumbers = parseLevelSpec(argMap.get('--levels'), rawLevels.length);
const startedAt = Date.now();
const results = [];
const changedHintFiles = [];
const patchLevels = [];
let totalAccepted = 0;
let writeResult = null;
let patchResult = null;

console.log(`Hint workbench: ${levelNumbers.length} level(s), preset=${opts.preset}, steps=${opts.axisPlan.steps.join(' -> ')}, policy=${opts.policy}, evaluationPolicy=${opts.evaluationPolicy}, write=${opts.writeLevels && !opts.auditMode ? 'yes' : 'no'}`);
for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    const t0 = Date.now();
    const result = await processLevel(levelNumber, raw, opts);
    result.elapsedMs = Date.now() - t0;
    totalAccepted += result.acceptedCount;
    if (!opts.auditMode && result.acceptedCount > 0) {
        if (opts.writeLevels && !opts.writePatch) {
            raw.hints = [...(raw.hints || []), ...result.acceptedPaths];
            raw.hintRecords = mergeHints(raw.hintRecords || [], result.acceptedHints);
            changedHintFiles.push(relativePath(hintFilePathFor(levelsPath, levelNumber)));
        }
        if (opts.writePatch) {
            patchLevels.push({
                level: levelNumber,
                acceptedPaths: result.acceptedPaths,
                acceptedHints: result.acceptedHints,
                acceptedPathSignatures: result.acceptedPathSignatures,
            });
        }
    }
    results.push(result);
    console.log(`L${levelNumber}: +${result.acceptedCount}${opts.auditMode ? ' would-accept' : ''} (${result.hintCountBefore}->${result.hintCountAfter}${opts.auditMode ? `, would be ${result.hintCountAfterWouldBe}` : ''}) ${result.elapsedMs}ms`);
}

if (opts.writeLevels && !opts.writePatch && !opts.auditMode && totalAccepted > 0) writeResult = writeLevelsWithHints(levelsPath, rawLevels);
if (opts.writePatch && !opts.auditMode && totalAccepted > 0) {
    patchResult = {
        schemaVersion: 1,
        levelsPath: relativePath(levelsPath),
        totalAccepted,
        levels: patchLevels,
    };
    await atomicWriteJson(opts.writePatch, patchResult);
}
await atomicWriteJson(opts.output, {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    totalMs: Date.now() - startedAt,
    totalAccepted,
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
