#!/usr/bin/env node
/**
 * False-goal triggerability audit — runs findTriggerableFalseGoalCells against every level using the same
 * budget the UI computes (getFalseGoalTriggerSearchBudgetMs), then re-runs partial levels
 * with a generous extended budget to measure how much time they actually need.
 *
 *   npm run solver:audit-false-goal-triggerability --
 *   npm run solver:audit-false-goal-triggerability -- --levels=pos:138,pos:140
 *   npm run solver:audit-false-goal-triggerability -- --extended-budget=120000
 *
 * False-goal viability mode — instead of the timing passes, classify every placed
 * false goal as triggerable or not (a false goal can only ever fire if a path can
 * end on its cell). Reports levels whose false goals cannot be triggered by any valid path. Partial searches are reported as "inconclusive", never as invalid.
 *
 *   npm run solver:audit-false-goal-triggerability -- --check-false-goals
 *   npm run solver:audit-false-goal-triggerability -- --check-false-goals --fg-budget=120000
 *   npm run solver:audit-false-goal-triggerability -- --check-false-goals --levels=pos:63
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions } from './level-data-io.mjs';

installBrowserStubs();

const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');

const Solver = createSolver();

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argMap = new Map(
    args.filter(a => a.startsWith('--'))
        .map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; })
);

const filterLevels = parseLevelPositions(argMap.get('--levels'));

const extendedBudgetMs = Number(argMap.get('--extended-budget') || 300_000);

// ── Level loader ──────────────────────────────────────────────────────────────

function loadAllLevels() {
    const root = new URL('..', import.meta.url).pathname;
    const filePath = path.join(root, 'data', 'levels.json');
    const levels = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(levels) || levels.length === 0) throw new Error('data/levels.json is empty or not an array');
    return levels;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = ms => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

function levelSummary(raw) {
    const area = (raw.grid?.w ?? 0) * (raw.grid?.h ?? 0);
    const gates = (raw.gates ?? []).length;
    const mp = (raw.mustPass ?? []).length;
    const mc = (raw.mustCross ?? []).length;
    const portals = (raw.portals ?? []).length;
    const filters = (raw.filters ?? []).length;
    const ff = (raw.flippingFilters ?? []).length;
    return `${raw.grid?.w}×${raw.grid?.h} area=${area} len=${raw.reqLen} int=${raw.reqInt} gates=${gates} mp=${mp} mc=${mc} portals=${portals} filters=${filters} ff=${ff}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rawLevels = loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels.\n`);

// ── Mode: false-goal viability check ──────────────────────────────────────────

if (argMap.has('--check-false-goals')) {
    const fgBudgetMs = Number(argMap.get('--fg-budget') || 60000);
    const unpack = k => ({ x: (k & 0xFFFF) + 1, y: ((k >>> 16) & 0xFFFF) + 1 });
    const fmtPts = pts => pts.map(p => `(${p.x},${p.y})`).join(' ');

    console.log(`False-goal viability check — budget ${fmt(fgBudgetMs)}/level\n`);

    const invalidLevels = [];
    const inconclusiveLevels = [];
    let levelsWithFG = 0;

    for (let i = 0; i < rawLevels.length; i++) {
        const levelNumber = i + 1;
        if (filterLevels && !filterLevels.has(levelNumber)) continue;
        const raw = rawLevels[i];
        if (!Array.isArray(raw.falseGoals) || raw.falseGoals.length === 0) continue;
        levelsWithFG++;

        const level = SOLVER_TESTING_API.normalizeRawLevel(raw, levelNumber);
        const res = await Solver.findTriggerableFalseGoalCells(level, { timeLimitMs: fgBudgetMs });
        const classes = Solver.classifyFalseGoalTriggerability(level, res);

        const dead = [], unknown = [];
        for (const [k, st] of classes) {
            if (st === 'untriggerable') dead.push(unpack(k));
            else if (st === 'unknown') unknown.push(unpack(k));
        }

        if (dead.length > 0) {
            invalidLevels.push({ levelNumber, dead, unknown });
            console.log(`  L${String(levelNumber).padStart(3)}: INVALID  ${dead.length} dead: ${fmtPts(dead)}${unknown.length ? `  (+${unknown.length} undetermined: ${fmtPts(unknown)})` : ''}  [${levelSummary(raw)}]`);
        } else if (unknown.length > 0) {
            inconclusiveLevels.push({ levelNumber, unknown });
            console.log(`  L${String(levelNumber).padStart(3)}: inconclusive (partial)  ${unknown.length} undetermined: ${fmtPts(unknown)}`);
        } else {
            console.log(`  L${String(levelNumber).padStart(3)}: ok  all ${raw.falseGoals.length} false-goal${raw.falseGoals.length > 1 ? 's' : ''} triggerable`);
        }
    }

    console.log('\n── False-goal viability summary ─────────────────────────────────\n');
    console.log(`Levels with false goals checked:                       ${levelsWithFG}`);
    console.log(`Levels with INVALID (never-triggerable) false goals:   ${invalidLevels.length}`);
    if (invalidLevels.length > 0) {
        for (const { levelNumber, dead } of invalidLevels)
            console.log(`  L${levelNumber}: ${fmtPts(dead)}`);
    }
    if (inconclusiveLevels.length > 0) {
        console.log(`\nInconclusive (partial — rerun with a larger --fg-budget): ${inconclusiveLevels.length}`);
        for (const { levelNumber, unknown } of inconclusiveLevels)
            console.log(`  L${levelNumber}: ${fmtPts(unknown)}`);
    }
    process.exit(0);
}

const partialLevels = [];
let runCount = 0;
let completedCount = 0;
let partialCount = 0;

// ── Pass 1: run with default UI budget ───────────────────────────────────────

console.log('Pass 1 — default UI budget\n');

for (let i = 0; i < rawLevels.length; i++) {
    const levelNumber = i + 1;
    if (filterLevels && !filterLevels.has(levelNumber)) continue;

    const raw = rawLevels[i];
    const level = SOLVER_TESTING_API.normalizeRawLevel(raw, levelNumber);
    const budgetMs = Solver.getFalseGoalTriggerSearchBudgetMs(level);
    runCount++;

    process.stdout.write(`  L${String(levelNumber).padStart(3)}: budget=${fmt(budgetMs).padEnd(8)} `);

    const t0 = Date.now();
    const res = await Solver.findTriggerableFalseGoalCells(level, { timeLimitMs: budgetMs });
    const elapsed = Date.now() - t0;

    if (res.status !== 'complete') {
        partialCount++;
        partialLevels.push({ levelNumber, budgetMs, elapsed, triggerableCells: res.triggerableCells.size, gatesProcessed: res.gatesProcessed, totalGates: level.gateKeys.length });
        console.log(`PARTIAL  ${fmt(elapsed).padEnd(8)} ${res.gatesProcessed}/${level.gateKeys.length} gates  ${res.triggerableCells.size} triggerable cells so far   [${levelSummary(raw)}]`);
    } else {
        completedCount++;
        console.log(`ok       ${fmt(elapsed).padEnd(8)} ${res.gatesProcessed}/${level.gateKeys.length} gates  ${res.triggerableCells.size} triggerable cells`);
    }
}

console.log(`\nPass 1 result: ${completedCount}/${runCount} completed, ${partialCount} partial.\n`);

if (partialLevels.length === 0) {
    console.log('No partial searches — all levels complete within their default budget.');
    process.exit(0);
}

// ── Pass 2: extended budget for partial levels ──────────────────────────────

console.log(`Pass 2 — extended budget (${fmt(extendedBudgetMs)}) for partial levels\n`);

const stillPartial = [];

for (const { levelNumber, budgetMs, triggerableCells: _triggerableCellsAfterPartial, gatesProcessed: _gatesProcessed } of partialLevels) {
    const raw = rawLevels[levelNumber - 1];
    const level = SOLVER_TESTING_API.normalizeRawLevel(raw, levelNumber);

    process.stdout.write(`  L${String(levelNumber).padStart(3)}: `);

    const t0 = Date.now();
    const res = await Solver.findTriggerableFalseGoalCells(level, { timeLimitMs: extendedBudgetMs });
    const elapsed = Date.now() - t0;

    if (res.status !== 'complete') {
        stillPartial.push({ levelNumber, budgetMs, elapsed });
        console.log(`STILL PARTIAL  ${fmt(elapsed).padEnd(8)} ${res.gatesProcessed}/${level.gateKeys.length} gates  ${res.triggerableCells.size} triggerable cells`);
    } else {
        const ratio = (elapsed / budgetMs).toFixed(1);
        console.log(`DONE  ${fmt(elapsed).padEnd(8)} ${res.triggerableCells.size} triggerable cells   needs ${fmt(elapsed)} vs default ${fmt(budgetMs)} (${ratio}x)`);
    }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n── Summary ──────────────────────────────────────────────────────\n');
console.log(`Levels run:       ${runCount}`);
console.log(`Completed (P1):   ${completedCount}`);
console.log(`Partial (P1):   ${partialCount}`);

if (partialLevels.length > 0) {
    console.log('\nPartial levels:');
    for (const { levelNumber, budgetMs } of partialLevels) {
        const raw = rawLevels[levelNumber - 1];
        console.log(`  L${levelNumber}: default budget ${fmt(budgetMs)}   [${levelSummary(raw)}]`);
    }
}

if (stillPartial.length > 0) {
    console.log(`\nStill partial even at ${fmt(extendedBudgetMs)}:`);
    for (const { levelNumber } of stillPartial) {
        const raw = rawLevels[levelNumber - 1];
        console.log(`  L${levelNumber}:  [${levelSummary(raw)}]`);
    }
}
