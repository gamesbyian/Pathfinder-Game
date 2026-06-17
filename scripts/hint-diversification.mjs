#!/usr/bin/env node
/**
 * Ablative hint-discovery sweep. For each level, forces the solver through
 * every (gate × first-step direction) combination, cascading through
 * profile/template disables and independently testing strategy-flag
 * disables, to surface alternative valid solution paths. Novel paths
 * (not already in the level's `hints`) are appended to data/levels.json.
 *
 * See docs/hint-diversification-plan.md for the full methodology.
 *
 * Usage:
 *   node scripts/hint-diversification.mjs --levels=1-33
 *   node scripts/hint-diversification.mjs --levels=1-33 --attempt-budget-ms=4000 --output=audits/hint-discovery/batch1.json
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const args     = process.argv.slice(2);
const argMap   = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const parseLevelSpec = spec => {
    if (!spec || spec === 'all') return null;
    const set = new Set();
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (t.includes('-')) {
            const [from, to] = t.split('-').map(v => Number(v.trim()));
            if (Number.isFinite(from) && Number.isFinite(to)) for (let i = Math.min(from, to); i <= Math.max(from, to); i++) set.add(i);
        } else { const n = Number(t); if (Number.isFinite(n) && n > 0) set.add(n); }
    }
    return set.size > 0 ? set : null;
};

const levelFilter      = parseLevelSpec(argMap.get('--levels'));
const attemptBudgetMs  = Number(argMap.get('--attempt-budget-ms')) > 0 ? Number(argMap.get('--attempt-budget-ms')) : 4000;
const baselineBudgetMs = Number(argMap.get('--baseline-budget-ms')) > 0 ? Number(argMap.get('--baseline-budget-ms')) : 8000;
const maxWallMs         = Number(argMap.get('--max-wall-ms')) > 0 ? Number(argMap.get('--max-wall-ms')) : 150 * 60 * 1000;
const outputFile        = argMap.get('--output') || 'audits/hint-discovery/latest.json';
const levelsJsonPath    = argMap.get('--levels-json') || 'data/levels.json';
const verbose           = argFlags.has('--verbose');

// Browser stubs (mirrors scripts/run-solverv2-direct.mjs)
if (typeof globalThis.window === 'undefined')      globalThis.window      = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined')    globalThis.document    = { addEventListener(){}, getElementById: () => null, createElement: () => ({ classList: { add(){}, remove(){} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { createSolverV2 } = await import('../modules/SolverV2.js');
const { getAttemptConfigs } = await import('../modules/solver/attempts.js');
const { TEMPLATE_CONFIG_KEYS } = await import('../modules/solver/policy.js');
const { createState, getNeighbors } = await import('../modules/solver/search-state.js');
const {
    TEMPLATE_CONFIG_KEY, PROFILE_CONFIG_KEY, FEATURE_GROUPS,
    withFeaturesDisabled, withFeatureDisabled,
} = await import('./ablation-config.mjs');
const { stringifyLevelsJson } = await import('./level-json-format.mjs');

const SolverV2 = createSolverV2();
const STRATEGY_FLAGS = FEATURE_GROUPS.strategy; // 5 flags

const root = new URL('..', import.meta.url).pathname;
const levelsJsonAbs = path.join(root, levelsJsonPath);

function loadRawLevels() {
    const text = readFileSync(levelsJsonAbs, 'utf8');
    const levels = JSON.parse(text);
    if (!Array.isArray(levels) || levels.length === 0) throw new Error(`${levelsJsonPath} is empty or not an array`);
    return levels;
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

async function atomicWriteJson(filePath, data, serialize = d => JSON.stringify(d, null, 2)) {
    const abs = path.resolve(filePath);
    const dir = path.dirname(abs);
    await mkdir(dir, { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${serialize(data)}\n`);
    await rename(tmp, abs);
}

// Returns true if at least one attempt config would survive the given disable set
// for this level — mirrors applyAttemptConfigOptions' filter predicate. We need this
// check ourselves because applyAttemptConfigOptions falls back to the *unfiltered*
// base list when every config is filtered out (a safety net for production solving),
// which would otherwise make our cascade loop never terminate.
function anyConfigSurvives(level, disabledKeys) {
    const baseConfigs = getAttemptConfigs(level);
    return baseConfigs.some(c => {
        if (c.template) {
            const tKey = TEMPLATE_CONFIG_KEYS[c.template.id];
            if (tKey && disabledKeys.has(tKey)) return false;
        }
        const pKey = `PROFILE_${c.profileName}`;
        if (disabledKeys.has(pKey)) return false;
        return true;
    });
}

function enumerateDirections(gateLevel, gateKey) {
    const prep = SolverV2._prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep);
}

function pathSignature(p) { return p.join(','); }

async function runCascade(gateLevel, gateKey, direction, deadlineAt, report) {
    const disabled = new Set();
    const found = [];
    let round = 0;
    while (true) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        if (disabled.size > 0 && !anyConfigSurvives(gateLevel, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await SolverV2.solve(gateLevel, { timeBudgetMs: attemptBudgetMs, forcedFirstStepKey: direction, ablation: cfg });
        } catch (e) {
            report.errors.push(`gate=${gateKey} dir=${direction} round=${round}: ${e?.message}`);
            break;
        }
        round++;
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find(a => a.ok);
        found.push({ path: result.solution, gateKey, direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return found;
}

async function runStrategyPhase(gateLevel, gateKey, direction, deadlineAt, report) {
    const found = [];
    for (const flag of STRATEGY_FLAGS) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        let result;
        try {
            result = await SolverV2.solve(gateLevel, { timeBudgetMs: attemptBudgetMs, forcedFirstStepKey: direction, ablation: withFeatureDisabled(flag) });
        } catch (e) {
            report.errors.push(`strategy=${flag} gate=${gateKey} dir=${direction}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            found.push({ path: result.solution, gateKey, direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] });
        }
    }
    return found;
}

async function processLevel(levelNumber, raw, deadlineAt) {
    const level = SolverV2.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const existingSigs = new Set((raw.hints || []).map(pathSignature));
    const loggedSigs = new Set();
    const discoveries = new Map(); // pathSignature -> provenance entry (first producer wins, mirrors novelty semantics)
    const novel = [];
    const report = { level: levelNumber, gates: level.gateKeys.length, combosTried: 0, baselineWinner: null, novelFound: 0, errors: [], haltedByWallClock: false };

    function consider(path, provenance) {
        const sig = pathSignature(path);
        if (loggedSigs.has(sig)) return;
        const v = SolverV2.validateCandidatePath(level, path);
        if (!v.ok) return;
        loggedSigs.add(sig);
        discoveries.set(sig, provenance);
        if (!existingSigs.has(sig)) novel.push(path);
    }

    // Phase 0: unconstrained baseline (establishes "what wins by default").
    try {
        const base = await SolverV2.solve(level, { timeBudgetMs: baselineBudgetMs });
        if (base?.ok && base.solution) {
            const winner = base.attempts?.find(a => a.ok);
            report.baselineWinner = winner?.profile ?? null;
            consider(base.solution, { phase: 'baseline', gateKey: null, direction: null, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [] });
        }
    } catch (e) { report.errors.push(`baseline: ${e?.message}`); }

    for (const gateKey of level.gateKeys) {
        if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
        const gateLevel = { ...level, gateKeys: [gateKey] };
        const directions = enumerateDirections(gateLevel, gateKey);

        for (const direction of directions) {
            if (Date.now() >= deadlineAt) { report.haltedByWallClock = true; break; }
            report.combosTried++;

            const cascadeResults = await runCascade(gateLevel, gateKey, direction, deadlineAt, report);
            for (const r of cascadeResults) {
                consider(r.path, { phase: 'cascade', gateKey: r.gateKey, direction: r.direction, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
            }

            if (cascadeResults.length > 0) {
                const strategyResults = await runStrategyPhase(gateLevel, gateKey, direction, deadlineAt, report);
                for (const r of strategyResults) {
                    consider(r.path, { phase: 'strategy', gateKey: r.gateKey, direction: r.direction, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }
            }
        }
    }

    report.novelFound = novel.length;
    return { novel, report, discoveries };
}

async function main() {
    const rawLevels = loadRawLevels();
    const levelNumbers = levelFilter
        ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
        : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

    console.log(`Hint diversification sweep: ${levelNumbers.length} level(s), attempt budget ${attemptBudgetMs}ms, wall-clock cap ${Math.round(maxWallMs / 60000)}min`);

    const runStart = Date.now();
    const deadlineAt = runStart + maxWallMs;
    const levelReports = [];
    let totalNovel = 0;
    let haltedEarly = false;

    for (const levelNumber of levelNumbers) {
        if (Date.now() >= deadlineAt) { haltedEarly = true; break; }
        const raw = rawLevels[levelNumber - 1];
        if (!raw) continue;

        const t0 = Date.now();
        let outcome;
        try {
            outcome = await processLevel(levelNumber, raw, deadlineAt);
        } catch (e) {
            console.log(`  L${levelNumber}: ERROR — ${e?.message}`);
            levelReports.push({ level: levelNumber, status: 'error', error: e?.message, elapsedMs: Date.now() - t0 });
            continue;
        }
        const elapsedMs = Date.now() - t0;

        if (outcome.novel.length > 0) {
            raw.hints = [...(raw.hints || []), ...outcome.novel];
            totalNovel += outcome.novel.length;
        }

        const hintProvenance = (raw.hints || []).map((hintPath, hintIndex) => {
            const entry = outcome.discoveries.get(pathSignature(hintPath));
            return entry ? { hintIndex, ...entry } : { hintIndex, phase: 'unmatched' };
        });

        levelReports.push({ ...outcome.report, status: 'done', elapsedMs, hintsAfter: raw.hints.length, hintProvenance });
        console.log(`  L${levelNumber}: +${outcome.novel.length} novel hint(s) (total ${raw.hints.length}), ${outcome.report.combosTried} combos, ${elapsedMs}ms${outcome.report.haltedByWallClock ? ' [WALL-CLOCK HALT]' : ''}`);
        if (verbose && outcome.report.errors.length > 0) console.log(`    errors: ${outcome.report.errors.join('; ')}`);

        // Checkpoint after every level.
        await atomicWriteJson(levelsJsonAbs, rawLevels, stringifyLevelsJson);
        await atomicWriteJson(outputFile, {
            timestamp: new Date().toISOString(),
            commitSha: getCommitSha(),
            attemptBudgetMs, baselineBudgetMs, maxWallMs,
            levelFilter: levelFilter ? [...levelFilter].sort((a, b) => a - b) : 'all',
            inProgress: true,
            totalMs: Date.now() - runStart,
            totalNovel,
            levels: levelReports,
        });

        if (outcome.report.haltedByWallClock) { haltedEarly = true; break; }
    }

    const totalMs = Date.now() - runStart;
    await atomicWriteJson(outputFile, {
        timestamp: new Date().toISOString(),
        commitSha: getCommitSha(),
        attemptBudgetMs, baselineBudgetMs, maxWallMs,
        levelFilter: levelFilter ? [...levelFilter].sort((a, b) => a - b) : 'all',
        inProgress: false,
        haltedEarly,
        totalMs, totalNovel,
        levels: levelReports,
    });

    console.log(`\nDone: ${totalNovel} novel hint(s) discovered across ${levelReports.length} level(s) — ${totalMs}ms${haltedEarly ? ' (halted early: wall-clock cap reached)' : ''}`);
    console.log(`Results → ${outputFile}`);
    console.log(`Updated → ${levelsJsonPath}`);
}

await main();
