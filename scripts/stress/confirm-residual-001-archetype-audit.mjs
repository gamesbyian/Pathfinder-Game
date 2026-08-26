#!/usr/bin/env node
/**
 * One-off diagnostic for the confirm-residual-001 two-phase confirmation
 * (reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md,
 * reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md).
 *
 * The two-phase residual design guarantees every residual row is a CONTROL-FAILURE (survives the
 * whole ladder). It does NOT guarantee archetype eligibility (isMustCrossFlipperHeavy: arch ===
 * 'must-cross-heavy' && mustPass >= 3 && flippers >= 2) -- those are two independent conditions,
 * and STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE's new configs can only ever execute on a level
 * satisfying BOTH. This script answers, directly and exactly (not by estimate), how many of
 * confirm-residual-001's 520 control-failure rows also satisfy the archetype gate, given the
 * sealed phase-1 pool and the sealed phase-1 combined control report as the source of truth for
 * exactly which of the 1200 pool levels solved vs failed.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/confirm-residual-001-archetype-audit.mjs -- \
 *     --pool=confirm-residual-001-pool.json --phase1-report=residual-confirmation-phase1-control.json
 */
import path from 'node:path';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const poolPath = argMap.get('--pool');
const reportPath = argMap.get('--phase1-report');
if (!poolPath || !reportPath) throw new Error('Usage: --pool=<path> --phase1-report=<path>');

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { detectArchetype } = await import('../../modules/solver/archetype.js');

const OBJECTIVE_HEAVY_MUSTPASS = 3;
const FLIPPER_HEAVY = 2;

const poolParsed = JSON.parse(readFileSync(path.resolve(poolPath), 'utf8'));
const poolLevels = Array.isArray(poolParsed) ? poolParsed : poolParsed.levels;
const report = JSON.parse(readFileSync(path.resolve(reportPath), 'utf8'));
const reportRows = report.levels ?? [];
const solvedIds = new Set(reportRows.filter(r => r.ok).map(r => r.id ?? String(r.level)));

console.log(`pool: ${poolLevels.length} levels; phase1-report: ${reportRows.length} rows, ${solvedIds.size} solved`);

let archEligible = 0;
let archEligibleAndSolved = 0;
let archEligibleAndFailed = 0;
const eligibleFailedIds = [];
const archCounts = new Map();

for (let i = 0; i < poolLevels.length; i++) {
    const raw = poolLevels[i];
    const level = normalizeRawLevel(raw, i + 1);
    const arch = detectArchetype(level);
    archCounts.set(arch, (archCounts.get(arch) ?? 0) + 1);
    const mustPass = level.mustPassKeys.length;
    const flippers = level.flippingFilterMap?.size ?? 0;
    const eligible = arch === 'must-cross-heavy' && mustPass >= OBJECTIVE_HEAVY_MUSTPASS && flippers >= FLIPPER_HEAVY;
    if (!eligible) continue;
    archEligible++;
    const solved = solvedIds.has(raw.id);
    if (solved) archEligibleAndSolved++;
    else { archEligibleAndFailed++; eligibleFailedIds.push(raw.id); }
}

console.log(`archetype distribution: ${JSON.stringify(Object.fromEntries(archCounts))}`);
console.log(`isMustCrossFlipperHeavy-eligible in pool: ${archEligible}/${poolLevels.length} (${(100 * archEligible / poolLevels.length).toFixed(2)}%)`);
console.log(`  of those, solved by control: ${archEligibleAndSolved}`);
console.log(`  of those, control-failure (in the residual): ${archEligibleAndFailed}`);
console.log(`archetype-eligible-and-in-residual IDs (${eligibleFailedIds.length}): ${eligibleFailedIds.join(',')}`);
