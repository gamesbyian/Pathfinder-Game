#!/usr/bin/env node
/**
 * Ablative hint-discovery sweep. For each level, forces the solver through
 * every (gate × first-step direction) combination, cascading through
 * profile/template disables and independently testing strategy-flag
 * disables, to surface alternative valid solution paths. Novel paths
 * (not already in the level's `hints`) are appended to data/levels.json.
 *
 * Phase logic (baseline, gate x direction cascade/strategy, gate/goal-swap reversal,
 * portal-exit forcing, evidence-bounded combined forcing) lives in
 * modules/solver/hint-ablation-generator.ts, shared with scripts/hint-workbench.mjs's
 * `ablation-full`/`ablation-combined-only`/`ablation-reverse-only` presets — this script
 * is a thin CLI wrapper that adds checkpointed writes to data/levels.json and a
 * run-report format kept for backwards compatibility with existing tooling/reports.
 *
 * See docs/hint-curation.md ("Relationship to hint discovery / corpus expansion") for how this
 * fits alongside the production discovery/curation pipeline.
 *
 * Usage:
 *   npm run hints:diversify -- --levels=1-33
 *   npm run hints:diversify -- --levels=1-33 --attempt-budget-ms=4000 --output=reports/hint-discovery/batch1.json
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

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
const outputFile        = argMap.get('--output') || 'reports/hint-discovery/latest.json';
const levelsJsonPath    = argMap.get('--levels-json') || 'data/levels.json';
const verbose           = argFlags.has('--verbose');
const combinedOnly      = argFlags.has('--combined-only');

installBrowserStubs();

const { createSolver } = await import('../modules/Solver.js');
const { createHintAblationGenerator } = await import('../modules/solver/hint-ablation-generator.ts');
const { pathSignature } = await import('../modules/domain/hint-novelty.ts');
const { readLevelsWithHints, writeLevelsWithHints } = await import('./level-data-io.mjs');

const Solver = createSolver();

const root = new URL('..', import.meta.url).pathname;
const levelsJsonAbs = path.join(root, levelsJsonPath);

function loadRawLevels() {
    const levels = readLevelsWithHints(levelsJsonAbs);
    if (levels.length === 0) throw new Error(`${levelsJsonPath} is empty or not an array`);
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

// Phases 0/A/B/D/C are skipped entirely under --combined-only: they've already run to
// completion in prior batches and committed their discoveries into raw.hints, so re-running
// them here would just re-derive the same (already-saved) paths at full cost. Phase F/G's
// evidence scan draws straight from raw.hints (createHintAblationGenerator always includes
// rawLevel.hints in its evidence pool), so skipping straight to F/G still gets the full
// benefit of every previously-discovered hint as bounding evidence.
const PHASES_FULL         = { baseline: true, cascade: true, swap: true, portalCascade: true, swapPortal: true, combined: true, swapCombined: true };
const PHASES_COMBINED_ONLY = { baseline: false, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: true, swapCombined: true };

async function processLevel(levelNumber, raw, deadlineAt) {
    const wallClockDeadlineMs = Math.max(0, deadlineAt - Date.now());
    const result = await createHintAblationGenerator(raw, levelNumber, {
        solverApi: Solver,
        attemptBudgetMs,
        baselineBudgetMs,
        wallClockDeadlineMs,
        phases: combinedOnly ? PHASES_COMBINED_ONLY : PHASES_FULL,
    });

    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const report = {
        level: levelNumber, gates: level.gateKeys.length,
        combosTried: result.report.combosTried.cascade,
        swapCombosTried: result.report.combosTried.swap,
        portalCombosTried: result.report.combosTried.portalCascade,
        swapPortalCombosTried: result.report.combosTried.swapPortal,
        combinedCombosTried: result.report.combosTried.combined,
        swapCombinedCombosTried: result.report.combosTried.swapCombined,
        baselineWinner: result.report.baselineWinner,
        novelFound: result.novel.length,
        errors: result.report.errors,
        haltedByWallClock: result.report.haltedByWallClock,
    };

    return { novel: result.novel, report, discoveries: result.discoveries };
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
        const swapNote         = outcome.report.swapCombosTried > 0 ? `, ${outcome.report.swapCombosTried} swap combos` : '';
        const portalNote       = outcome.report.portalCombosTried > 0 ? `, ${outcome.report.portalCombosTried} portal combos` : '';
        const swapPortalNote   = outcome.report.swapPortalCombosTried > 0 ? `, ${outcome.report.swapPortalCombosTried} swap-portal combos` : '';
        const combinedNote     = outcome.report.combinedCombosTried > 0 ? `, ${outcome.report.combinedCombosTried} combined combos` : '';
        const swapCombinedNote = outcome.report.swapCombinedCombosTried > 0 ? `, ${outcome.report.swapCombinedCombosTried} swap-combined combos` : '';
        console.log(`  L${levelNumber}: +${outcome.novel.length} novel hint(s) (total ${raw.hints.length}), ${outcome.report.combosTried} combos${swapNote}${portalNote}${swapPortalNote}${combinedNote}${swapCombinedNote}, ${elapsedMs}ms${outcome.report.haltedByWallClock ? ' [WALL-CLOCK HALT]' : ''}`);
        if (verbose && outcome.report.errors.length > 0) console.log(`    errors: ${outcome.report.errors.join('; ')}`);

        // Checkpoint after every level.
        writeLevelsWithHints(levelsJsonAbs, rawLevels);
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
