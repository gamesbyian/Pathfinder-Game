#!/usr/bin/env node
/**
 * Reports the early-repair-search ordinary-tier bestBadness distribution and biased-tier outcomes from
 * one or more level-blind-capability-sweep / portfolio-solve-sweep report JSON files, using the
 * `repairProbe` attempt tag (orchestration.ts's Attempt.repairProbe) to isolate probe-phase repair
 * attempts from the same repair config's later full-budget fallback run -- both produce
 * `repair`-flagged attempts with the same shape, so without the tag this split isn't reconstructible
 * from a persisted report alone.
 *
 * Built so recalibrating modules/solver/orchestration.ts's
 * REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE / REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE (see that
 * constant's own comment) never again requires a bespoke local diagnostic run: any ordinary batch
 * solve (level-blind-capability-sweep.mjs, portfolio-solve-sweep.mjs) that reaches a repair-gated,
 * must-turn-carrying level already produces this data as a side effect of solving it -- this script
 * just extracts and summarizes it. See reports/2026-08-12-repair-probe-early-main-loop-starvation.md
 * for why this constant needed re-deriving in the first place: the original calibration was n=12
 * (n=1 for the "biased tier needed its full budget" case).
 *
 * Usage (via run-bundled, because the gate/min-scale constants are imported from orchestration.ts):
 *   node scripts/run-bundled.mjs scripts/stress/early-repair-search-badness-report.mjs -- --in=reports/stress/early-repair-search-adaptive-sample-ab.json
 *
 * `--gate=<n>` / `--min-scale=<n>` override the imported production constants. Use them ONLY to
 * replay a historical report against the constants that were live when it was produced; the
 * defaults must stay bound to orchestration.ts so this diagnostic cannot drift out of sync with
 * production again (it shipped with `CURRENT_GATE = 10` hardcoded and kept printing 10 after the
 * gate was promoted to 6 on 2026-08-13, silently understating every shrink figure it reported --
 * a lower gate shrinks MORE, so the scaled-level count and the near-miss RISK list were both
 * computed against the wrong constant on every capability refresh in between).
 *
 * With TWO comma-separated --in files (a matched scaled-vs-unscaled pair -- e.g. one dispatch with
 * enable_flags=STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET, one with disable_flags= the same --
 * over the IDENTICAL sample/seed), also reports per-level flips (solved in one arm, not the other)
 * restricted to levels where a biased tier actually ran, which is the only population this flag can
 * ever affect.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
    REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE,
    REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE,
} from '../../modules/solver/orchestration.ts';

const argMap = new Map();
for (const arg of process.argv.slice(2)) {
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq > 0) argMap.set(arg.slice(0, eq), arg.slice(eq + 1));
}
const inArg = argMap.get('--in');
if (!inArg) { console.error('--in=<report.json>[,<report2.json>] is required'); process.exit(2); }
const files = inArg.split(',').map(s => s.trim()).filter(Boolean);
if (files.length > 2) { console.error('--in accepts at most 2 files (a single report, or a matched scaled-vs-unscaled pair).'); process.exit(2); }

function loadRows(file) {
    const parsed = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(rows)) throw new Error(`${file}: expected a top-level array or {levels: [...]}`);
    return rows;
}

// One row's early-repair-search-only view. Ordinary tier's bestBadness is the signal
// STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET actually gates on; biased tier's own outcome shows
// what the (possibly scaled) budget achieved.
function levelBadnessInfo(row) {
    const attempts = Array.isArray(row.attempts) ? row.attempts : [];
    const probe = attempts.filter(a => a.repairProbe);
    const ordinary = probe.filter(a => a.repair && !a.repairMustTurnBiased && !a.repairTurnBiased);
    const biased = probe.filter(a => a.repairMustTurnBiased || a.repairTurnBiased);
    const minBadness = list => list.reduce((min, a) => (Number.isFinite(a.bestBadness) ? Math.min(min, a.bestBadness) : min), Infinity);
    const ordinaryBestBadness = minBadness(ordinary);
    const biasedBestBadness = minBadness(biased);
    return {
        id: row.id ?? `L${row.level}`,
        ok: !!row.ok,
        hasBiasedTier: biased.length > 0,
        ordinaryBestBadness: Number.isFinite(ordinaryBestBadness) ? ordinaryBestBadness : null,
        biasedSolved: biased.some(a => a.ok),
        biasedBestBadness: Number.isFinite(biasedBestBadness) ? biasedBestBadness : null,
        biasedNodes: biased.reduce((sum, a) => sum + (a.nodesExpanded || 0), 0),
    };
}

function scaleFor(badness, gate, minScale) {
    if (badness == null) return 1;
    return Math.min(1, Math.max(minScale, gate / badness));
}

// Bound to production, never hardcoded — see the module header for the drift bug this replaced.
const numericArg = (name, fallback) => {
    if (!argMap.has(name)) return { value: fallback, overridden: false };
    const value = Number(argMap.get(name));
    if (!Number.isFinite(value)) { console.error(`${name} must be a finite number`); process.exit(2); }
    return { value, overridden: true };
};
const gateArg = numericArg('--gate', REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE);
const minScaleArg = numericArg('--min-scale', REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE);
const CURRENT_GATE = gateArg.value;
const CURRENT_MIN_SCALE = minScaleArg.value;
const constantsSource = gateArg.overridden || minScaleArg.overridden
    ? 'CLI override (historical replay — not production)'
    : 'imported from orchestration.ts';

const perFile = files.map(f => loadRows(f).map(levelBadnessInfo));
const [primary] = perFile;
const eligible = primary.filter(r => r.hasBiasedTier);

console.log(`early-repair-search-badness-report: ${files[0]} -- ${primary.length} levels, ${eligible.length} with a biased-tier attempt (the only population this flag can affect)`);
if (eligible.length === 0) {
    console.log('No biased-tier attempts found in this report -- either no repair-gated/must-turn levels were solved, or the report predates the repairProbe attempt tag (orchestration.ts).');
} else {
    const buckets = [[0, 5], [6, 10], [11, 15], [16, 20], [21, Infinity]];
    console.log('\nordinaryBestBadness distribution (levels with a biased tier):');
    for (const [lo, hi] of buckets) {
        const inBucket = eligible.filter(r => r.ordinaryBestBadness != null && r.ordinaryBestBadness >= lo && r.ordinaryBestBadness <= hi);
        const solvedByBiased = inBucket.filter(r => r.biasedSolved).length;
        const label = hi === Infinity ? `${lo}+` : `${lo}-${hi}`;
        console.log(`  badness ${label.padEnd(6)} n=${String(inBucket.length).padStart(3)}  biased-tier solved=${solvedByBiased}`);
    }
    const noOrdinary = eligible.filter(r => r.ordinaryBestBadness == null);
    console.log(`  no ordinary-tier reading n=${noOrdinary.length}  biased-tier solved=${noOrdinary.filter(r => r.biasedSolved).length}`);

    console.log(`\nCurrent constants: BADNESS_GATE=${CURRENT_GATE} MIN_SCALE=${CURRENT_MIN_SCALE} (${constantsSource})`);
    for (const r of eligible) {
        if (r.ordinaryBestBadness == null) continue;
        r.currentScale = scaleFor(r.ordinaryBestBadness, CURRENT_GATE, CURRENT_MIN_SCALE);
    }
    const scaled = eligible.filter(r => r.currentScale != null && r.currentScale < 1);
    console.log(`Levels where the current constants shrink the biased tier's budget: ${scaled.length}/${eligible.length}`);
    const shrunkButSolved = scaled.filter(r => r.biasedSolved);
    if (shrunkButSolved.length > 0) {
        console.log(`  of those, biased tier still solved despite the shrink: ${shrunkButSolved.map(r => `${r.id}(badness=${r.ordinaryBestBadness},scale=${r.currentScale.toFixed(2)})`).join(', ')}`);
    }
    const shrunkAndFailedCloseToZero = scaled.filter(r => !r.biasedSolved && r.biasedBestBadness != null && r.biasedBestBadness <= 3);
    if (shrunkAndFailedCloseToZero.length > 0) {
        console.log(`  RISK: shrunk AND failed with a near-miss biasedBestBadness<=3 (candidate evidence the shrink was too aggressive here): ${shrunkAndFailedCloseToZero.map(r => `${r.id}(ordinaryBadness=${r.ordinaryBestBadness},scale=${r.currentScale.toFixed(2)},biasedBestBadness=${r.biasedBestBadness})`).join(', ')}`);
    }
}

if (perFile.length === 2) {
    const [, secondaryRaw] = perFile;
    const secondaryById = new Map(secondaryRaw.map(r => [r.id, r]));
    console.log(`\n--- Matched-pair comparison: ${files[0]} vs ${files[1]} ---`);
    const flips = [];
    for (const a of primary) {
        const b = secondaryById.get(a.id);
        if (!b) continue;
        if (!(a.hasBiasedTier || b.hasBiasedTier)) continue;
        if (a.ok !== b.ok) flips.push({ id: a.id, [`ok(${path.basename(files[0])})`]: a.ok, [`ok(${path.basename(files[1])})`]: b.ok, ordinaryBestBadness: a.ordinaryBestBadness ?? b.ordinaryBestBadness });
    }
    console.log(`Levels with a biased tier in either arm: flips=${flips.length}`);
    for (const f of flips) console.log(`  ${JSON.stringify(f)}`);
}
