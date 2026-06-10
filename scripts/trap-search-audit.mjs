#!/usr/bin/env node
/**
 * Trap search audit — runs findTrapSpots against every level using the same
 * budget the UI computes (getTrapSpotBudgetMs), then re-runs timed-out levels
 * with a generous extended budget to measure how much time they actually need.
 *
 *   node scripts/trap-search-audit.mjs
 *   node scripts/trap-search-audit.mjs --levels=138,140
 *   node scripts/trap-search-audit.mjs --extended-budget=120000
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

// Browser stubs needed by SolverV2
if (typeof globalThis.window === 'undefined')
    globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined')
    globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined')
    globalThis.performance = { now: () => Date.now() };

const { createSolverV2 } = await import('../SolverV2.js');

const SolverV2 = createSolverV2();

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argMap = new Map(
    args.filter(a => a.startsWith('--'))
        .map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; })
);

const filterSpec = argMap.get('--levels');
const filterLevels = filterSpec
    ? new Set(filterSpec.split(',').map(s => Number(s.trim())).filter(Number.isFinite))
    : null;

const extendedBudgetMs = Number(argMap.get('--extended-budget') || 300_000);

// ── Level loader ──────────────────────────────────────────────────────────────

async function loadAllLevels() {
    const root = new URL('..', import.meta.url).pathname;
    const ctx = vm.createContext({ window: {} });
    const filePath = path.join(root, 'levels.js');
    if (!existsSync(filePath)) throw new Error('levels.js not found');
    const src = await readFile(filePath, 'utf8');
    vm.runInContext(src, ctx, { filename: 'levels.js' });
    const levels = ctx.window.RAW_LEVELS;
    if (!Array.isArray(levels) || levels.length === 0) throw new Error('Failed to load RAW_LEVELS');
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

const rawLevels = await loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels.\n`);

const timedOutLevels = [];
let runCount = 0;
let completedCount = 0;
let timedOutCount = 0;

// ── Pass 1: run with default UI budget ───────────────────────────────────────

console.log('Pass 1 — default UI budget\n');

for (let i = 0; i < rawLevels.length; i++) {
    const levelNumber = i + 1;
    if (filterLevels && !filterLevels.has(levelNumber)) continue;

    const raw = rawLevels[i];
    const level = SolverV2._normalizeRawLevel(raw, levelNumber);
    const budgetMs = SolverV2.getTrapSpotBudgetMs(level);
    runCount++;

    process.stdout.write(`  L${String(levelNumber).padStart(3)}: budget=${fmt(budgetMs).padEnd(8)} `);

    const t0 = Date.now();
    const res = await SolverV2.findTrapSpots(level, { timeLimit: budgetMs });
    const elapsed = Date.now() - t0;

    if (res.timedOut) {
        timedOutCount++;
        timedOutLevels.push({ levelNumber, budgetMs, elapsed, spots: res.spots.size, gatesProcessed: res.gatesProcessed, totalGates: level.gateKeys.length });
        console.log(`TIMEOUT  ${fmt(elapsed).padEnd(8)} ${res.gatesProcessed}/${level.gateKeys.length} gates  ${res.spots.size} spots so far   [${levelSummary(raw)}]`);
    } else {
        completedCount++;
        console.log(`ok       ${fmt(elapsed).padEnd(8)} ${res.gatesProcessed}/${level.gateKeys.length} gates  ${res.spots.size} spots`);
    }
}

console.log(`\nPass 1 result: ${completedCount}/${runCount} completed, ${timedOutCount} timed out.\n`);

if (timedOutLevels.length === 0) {
    console.log('No timeouts — all levels complete within their default budget.');
    process.exit(0);
}

// ── Pass 2: extended budget for timed-out levels ──────────────────────────────

console.log(`Pass 2 — extended budget (${fmt(extendedBudgetMs)}) for timed-out levels\n`);

const stillTimedOut = [];

for (const { levelNumber, budgetMs, spots: spotsAfterTimeout, gatesProcessed } of timedOutLevels) {
    const raw = rawLevels[levelNumber - 1];
    const level = SolverV2._normalizeRawLevel(raw, levelNumber);

    process.stdout.write(`  L${String(levelNumber).padStart(3)}: `);

    const t0 = Date.now();
    const res = await SolverV2.findTrapSpots(level, { timeLimit: extendedBudgetMs });
    const elapsed = Date.now() - t0;

    if (res.timedOut) {
        stillTimedOut.push({ levelNumber, budgetMs, elapsed });
        console.log(`STILL TIMEOUT  ${fmt(elapsed).padEnd(8)} ${res.gatesProcessed}/${level.gateKeys.length} gates  ${res.spots.size} spots`);
    } else {
        const ratio = (elapsed / budgetMs).toFixed(1);
        console.log(`DONE  ${fmt(elapsed).padEnd(8)} ${res.spots.size} spots   needs ${fmt(elapsed)} vs default ${fmt(budgetMs)} (${ratio}x)`);
    }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n── Summary ──────────────────────────────────────────────────────\n');
console.log(`Levels run:       ${runCount}`);
console.log(`Completed (P1):   ${completedCount}`);
console.log(`Timed out (P1):   ${timedOutCount}`);

if (timedOutLevels.length > 0) {
    console.log('\nTimed-out levels:');
    for (const { levelNumber, budgetMs } of timedOutLevels) {
        const raw = rawLevels[levelNumber - 1];
        const level = SolverV2._normalizeRawLevel(raw, levelNumber);
        console.log(`  L${levelNumber}: default budget ${fmt(budgetMs)}   [${levelSummary(raw)}]`);
    }
}

if (stillTimedOut.length > 0) {
    console.log(`\nStill timing out even at ${fmt(extendedBudgetMs)}:`);
    for (const { levelNumber } of stillTimedOut) {
        const raw = rawLevels[levelNumber - 1];
        console.log(`  L${levelNumber}:  [${levelSummary(raw)}]`);
    }
}
