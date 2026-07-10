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
 *   npm run hints:workbench -- --levels=145 --preset=all-practical --policy=novelty-gated --write-levels
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { decideCandidateAcceptance, pathSignature } from '../modules/domain/hint-novelty.ts';
import { createDiversificationSession } from '../modules/solver/diversification.ts';

installBrowserStubs();

const { createSolver } = await import('../modules/Solver.js');
const Solver = createSolver();
const ROOT = new URL('..', import.meta.url).pathname;

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

async function atomicWriteJson(filePath, data) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, abs);
}

function presetSteps(preset) {
    switch (preset) {
        case 'enumerate-targeted': return ['enumerate-targeted'];
        case 'enumerate-complete': return ['enumerate-complete'];
        case 'ablation-ui': return ['ablation-ui'];
        case 'all-practical': return ['enumerate-targeted', 'ablation-ui', 'enumerate-targeted'];
        default: throw new Error(`Unknown --preset=${preset}. Expected enumerate-targeted, enumerate-complete, ablation-ui, or all-practical.`);
    }
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
    return {
        generator: mode === 'complete' ? 'enumerate-complete' : 'enumerate-targeted',
        candidates: result.newlySaved.map(path => ({ path, provenance: { generator: mode === 'complete' ? 'enumerate-complete' : 'enumerate-targeted' } })),
        meta: { outcome: result.outcome, savedCount: result.savedCount, curatedCount: result.curatedCount },
    };
}

async function runAblationUi(level, existingHints, opts) {
    const session = createDiversificationSession(level, existingHints, {
        solverApi: Solver,
        attemptBudgetMs: opts.attemptBudgetMs,
        baselineBudgetMs: opts.baselineBudgetMs,
    });
    const deadline = Date.now() + opts.wallMs;
    const result = await session.runUntil(() => deadline, { maxHints: opts.maxAccepted });
    return {
        generator: 'ablation-ui',
        candidates: result.novel.map(path => ({ path, provenance: { generator: 'ablation-ui' } })),
        meta: result.report,
    };
}

function acceptCandidate({ raw, pool, poolSigs, accepted, rejected }, candidate, provenance, opts) {
    const sig0 = pathSignature(candidate);
    if (poolSigs.has(sig0)) { rejected.duplicate = (rejected.duplicate || 0) + 1; return false; }
    const validation = Solver.validateCandidatePath(Solver.prepareLevelForSolver(raw, { source: 'raw' }), candidate);
    if (!validation.ok) { const key = `invalid:${validation.reason}`; rejected[key] = (rejected[key] || 0) + 1; return false; }
    const sig = pathSignature(validation.path);
    if (poolSigs.has(sig)) { rejected.duplicate = (rejected.duplicate || 0) + 1; return false; }

    let decision = { accept: true, reason: 'save-all-valid' };
    if (opts.policy === 'novelty-gated') decision = makeNoveltyGate(raw, pool, opts)(validation.path);
    if (opts.policy === 'audit-only') decision = { accept: false, reason: 'audit-only' };

    if (!decision.accept) { rejected[decision.reason] = (rejected[decision.reason] || 0) + 1; return false; }
    poolSigs.add(sig);
    pool.push(validation.path);
    accepted.push({ path: validation.path, provenance, reason: decision.reason, evaluation: decision.evaluation ?? null });
    return true;
}

async function processLevel(levelNumber, raw, opts) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const pool = [...(raw.hints || [])];
    const poolSigs = new Set(pool.map(pathSignature));
    const accepted = [];
    const rejected = {};
    const runs = [];

    for (const step of presetSteps(opts.preset)) {
        if (accepted.length >= opts.maxAccepted) break;
        const before = accepted.length;
        const existing = pool.slice();
        const outcome = step === 'ablation-ui'
            ? await runAblationUi(level, existing, opts)
            : await runEnumeration(level, existing, opts, levelNumber, step === 'enumerate-complete' ? 'complete' : 'targeted');
        for (const entry of outcome.candidates) {
            if (accepted.length >= opts.maxAccepted) break;
            acceptCandidate({ raw, pool, poolSigs, accepted, rejected }, entry.path, entry.provenance, opts);
        }
        runs.push({ step, produced: outcome.candidates.length, accepted: accepted.length - before, meta: outcome.meta });
    }

    return {
        level: levelNumber,
        status: 'done',
        hintCountBefore: (raw.hints || []).length,
        hintCountAfter: pool.length,
        acceptedCount: accepted.length,
        rejected,
        runs,
        acceptedPaths: accepted.map(a => a.path),
        acceptedMeta: accepted.map(({ provenance, reason, evaluation }) => ({ provenance, reason, evaluation })),
    };
}

const argMap = parseArgs(process.argv.slice(2));
const opts = {
    levelsJsonPath: argMap.get('--levels-json') || 'data/levels.json',
    output: argMap.get('--output') || 'reports/hint-workbench/latest.json',
    preset: argMap.get('--preset') || 'all-practical',
    policy: argMap.get('--policy') || 'novelty-gated',
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

const levelsPath = path.isAbsolute(opts.levelsJsonPath) ? opts.levelsJsonPath : path.join(ROOT, opts.levelsJsonPath);
const rawLevels = readLevelsWithHints(levelsPath);
const levelNumbers = parseLevelSpec(argMap.get('--levels'), rawLevels.length);
const startedAt = Date.now();
const results = [];
let totalAccepted = 0;

console.log(`Hint workbench: ${levelNumbers.length} level(s), preset=${opts.preset}, policy=${opts.policy}, write=${opts.writeLevels ? 'yes' : 'no'}`);
for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    const t0 = Date.now();
    const result = await processLevel(levelNumber, raw, opts);
    result.elapsedMs = Date.now() - t0;
    totalAccepted += result.acceptedCount;
    if (opts.writeLevels && result.acceptedCount > 0) raw.hints = [...(raw.hints || []), ...result.acceptedPaths];
    results.push(result);
    console.log(`L${levelNumber}: +${result.acceptedCount} (${result.hintCountBefore}->${result.hintCountAfter}) ${result.elapsedMs}ms`);
}

if (opts.writeLevels && totalAccepted > 0) writeLevelsWithHints(levelsPath, rawLevels);
await atomicWriteJson(opts.output, {
    timestamp: new Date().toISOString(),
    totalMs: Date.now() - startedAt,
    totalAccepted,
    options: opts,
    levels: results,
});
console.log(`Done: ${totalAccepted} accepted candidate(s). Report -> ${opts.output}`);
if (opts.writeLevels) console.log(`Updated -> ${opts.levelsJsonPath}`);
