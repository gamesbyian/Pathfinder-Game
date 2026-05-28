#!/usr/bin/env node
/**
 * analyze-baseline-140.mjs
 *
 * Post-processes the 140-level baseline.json to answer:
 * 1. Technique distribution: which technique wins on each level?
 * 2. Feature stratification: technique win rates broken down by feature presence
 * 3. Escalation map: how many levels needed stage-1 or stage-2?
 * 4. Stratified sample recommendation: 50 levels that maximize coverage of
 *    interesting sub-populations for disable-one ablation
 *
 * Usage:
 *   node scripts/analyze-baseline-140.mjs --input-dir=audits/ablation/baseline-140
 *   node scripts/analyze-baseline-140.mjs --input-dir=audits/ablation/baseline-140 --output=audits/ablation/baseline-140/distribution.md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.includes('=')).map(a => {
  const i = a.indexOf('=');
  return [a.slice(0, i), a.slice(i + 1)];
}));
if (!argMap.has('--input-dir')) {
  console.error('Usage: node scripts/analyze-baseline-140.mjs --input-dir=<path>');
  process.exit(1);
}

const inputDir = resolve(argMap.get('--input-dir'));
const outputPath = argMap.has('--output') ? resolve(argMap.get('--output')) : join(inputDir, 'distribution.md');

const baselineFile = join(inputDir, 'baseline.json');
const manifestFile = join(inputDir, 'manifest.json');

if (!existsSync(baselineFile)) {
  console.error(`baseline.json not found in ${inputDir}`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : null;

const levels = baseline.levels || [];
const levelClassifications = manifest?.levelClassifications || {};

// ─── Normalize technique prefix to a short group name ─────────────────────
function techGroup(label) {
  if (!label) return 'none';
  if (label.startsWith('structural-modern')) return 'structural-modern';
  if (label.startsWith('structural-conservative')) return 'structural-conservative';
  if (label.startsWith('template')) return 'template';
  if (label.startsWith('portal-optional-modern')) return 'portal-optional-modern';
  if (label.startsWith('portal-optional-endurance')) return 'portal-optional-endurance';
  if (label.startsWith('portal-optional-perimeter')) return 'portal-optional-perimeter';
  if (label.startsWith('must-cross-horizon')) return 'must-cross-horizon';
  if (label.startsWith('endurance-longpath')) return 'endurance-longpath';
  if (label.startsWith('archetype')) return 'archetype';
  return label.split(':')[0].split('-').slice(0, 3).join('-');
}

// ─── Build per-level summary ───────────────────────────────────────────────
const levelSummary = levels.map(l => ({
  level: l.level,
  ok: l.ok,
  elapsedMs: l.elapsedMs,
  tech: techGroup(l.firstSolvingAttempt),
  fullLabel: l.firstSolvingAttempt,
  stagesTriedCount: l.stagesTriedCount || 1,
  cls: levelClassifications[l.level] || {},
}));

const solved = levelSummary.filter(l => l.ok);
const failed = levelSummary.filter(l => !l.ok);

// ─── Technique distribution ────────────────────────────────────────────────
const techCounts = new Map();
const techLevels = new Map();
const techTimes = new Map();
for (const l of solved) {
  techCounts.set(l.tech, (techCounts.get(l.tech) || 0) + 1);
  if (!techLevels.has(l.tech)) techLevels.set(l.tech, []);
  techLevels.get(l.tech).push(l.level);
  if (!techTimes.has(l.tech)) techTimes.set(l.tech, []);
  techTimes.get(l.tech).push(l.elapsedMs);
}

const techSorted = [...techCounts.entries()].sort((a, b) => b[1] - a[1]);

// ─── Escalation map ────────────────────────────────────────────────────────
const byStages = new Map();
for (const l of solved) {
  const s = l.stagesTriedCount;
  byStages.set(s, (byStages.get(s) || 0) + 1);
}

// ─── Feature presence (from levelClassifications or inferred) ─────────────
const boolFeatures = ['hasPortals', 'hasMustCross', 'hasMustPass', 'hasGeese', 'hasFilters', 'hasFalseGoals', 'multiGate'];

function featVal(cls, feat) {
  if (feat in cls) return !!cls[feat];
  return null;
}

// ─── Feature × technique cross-table ──────────────────────────────────────
function featureCrossTable(feature) {
  const withFeat = solved.filter(l => featVal(l.cls, feature) === true);
  const withoutFeat = solved.filter(l => featVal(l.cls, feature) === false);
  const techSet = new Set([...withFeat, ...withoutFeat].map(l => l.tech));
  const rows = [];
  for (const tech of [...techSet].sort()) {
    const nWith = withFeat.filter(l => l.tech === tech).length;
    const nWithout = withoutFeat.filter(l => l.tech === tech).length;
    const rateWith = withFeat.length > 0 ? nWith / withFeat.length : 0;
    const rateWithout = withoutFeat.length > 0 ? nWithout / withoutFeat.length : 0;
    rows.push({ tech, nWith, nWithout, rateWith, rateWithout, diff: Math.abs(rateWith - rateWithout) });
  }
  return { withFeat, withoutFeat, rows: rows.sort((a, b) => b.diff - a.diff) };
}

// ─── Stratified sample recommendation ─────────────────────────────────────
// Goal: pick ~50 levels that best cover:
//   1. All non-structural-modern winners (mandatory — these are the interesting cases)
//   2. All archetype winners (mandatory)
//   3. Representative structural-modern across difficulty (reqInt buckets, gridArea buckets)
//   4. Levels that escalated to stage > 1
//   5. Feature-positive levels (portals, mustCross)
//   6. Fast levels (early exit variety) and slow levels

function buildStratifiedSample(targetSize = 50) {
  const selected = new Set();
  const reasons = new Map();

  const addLevel = (n, reason) => {
    if (!selected.has(n)) { selected.add(n); reasons.set(n, reason); }
    else reasons.set(n, reasons.get(n) + ' + ' + reason);
  };

  // Tier 1: all non-structural-modern, non-structural-conservative winners
  const tier1Techs = new Set(['template', 'portal-optional-modern', 'portal-optional-endurance', 'portal-optional-perimeter', 'must-cross-horizon', 'endurance-longpath', 'archetype']);
  for (const l of solved) {
    if (tier1Techs.has(l.tech)) addLevel(l.level, `tier1:${l.tech}`);
  }

  // Tier 2: structural-conservative winners (these are interesting because SM failed)
  for (const l of solved) {
    if (l.tech === 'structural-conservative') addLevel(l.level, 'tier2:structural-conservative');
  }

  // Tier 3: levels that required stage escalation
  for (const l of solved) {
    if ((l.stagesTriedCount || 1) > 1) addLevel(l.level, `escalated-${l.stagesTriedCount}-stages`);
  }

  // Tier 4: feature-positive levels with structural-modern wins (representative of feature × technique)
  for (const feat of ['hasPortals', 'hasMustCross', 'hasMustPass']) {
    const featLevels = solved.filter(l => featVal(l.cls, feat) === true && l.tech === 'structural-modern');
    // Pick up to 3 per feature
    for (const l of featLevels.slice(0, 3)) addLevel(l.level, `feat:${feat}+SM`);
  }

  // Tier 5: fill to target with structural-modern across difficulty buckets
  if (selected.size < targetSize) {
    const smLevels = solved.filter(l => l.tech === 'structural-modern' && !selected.has(l.level));
    // Sort by reqInt (difficulty proxy), then by level number
    const clsMap = Object.fromEntries(Object.entries(levelClassifications));
    smLevels.sort((a, b) => {
      const ra = clsMap[a.level]?.reqInt || 0;
      const rb = clsMap[b.level]?.reqInt || 0;
      return rb - ra; // hardest first
    });
    // Bucket by reqInt: 0-2 (easy), 3-5 (medium), 6-9 (hard), 10+ (extreme)
    const buckets = [[10, Infinity], [6, 9], [3, 5], [0, 2]];
    const perBucket = Math.max(3, Math.ceil((targetSize - selected.size) / buckets.length));
    for (const [lo, hi] of buckets) {
      let count = 0;
      for (const l of smLevels) {
        if (selected.size >= targetSize) break;
        const ri = clsMap[l.level]?.reqInt || 0;
        if (ri >= lo && ri <= hi && count < perBucket) {
          addLevel(l.level, `reqInt:${ri}`);
          count++;
        }
      }
    }
  }

  // Tier 6: failed levels (important to test — does anything fix them?)
  for (const l of failed) addLevel(l.level, 'failed-in-baseline');

  return { sample: [...selected].sort((a, b) => a - b), reasons };
}

const { sample: stratSample, reasons: stratReasons } = buildStratifiedSample(50);

// ─── Timing percentiles ────────────────────────────────────────────────────
function pct(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p / 100)] || 0;
}

const allTimes = solved.map(l => l.elapsedMs);
const p50 = pct(allTimes, 50), p90 = pct(allTimes, 90), p99 = pct(allTimes, 99);
const avgTime = allTimes.reduce((s, t) => s + t, 0) / Math.max(1, allTimes.length);

// ─── Render ────────────────────────────────────────────────────────────────
const lines = [];
const row = (...parts) => lines.push(parts.join(''));

const bar = (n, total, w = 20) => {
  const filled = Math.round((n / Math.max(1, total)) * w);
  return '█'.repeat(filled) + '░'.repeat(w - filled);
};

row('');
row('═'.repeat(72));
row('140-Level Baseline: Technique Distribution & Sample Strategy');
row('═'.repeat(72));
row(`Input:    ${inputDir}`);
row(`Date:     ${baseline.meta?.date || new Date().toISOString()}`);
row(`Commit:   ${baseline.meta?.commit || 'unknown'}`);
row(`Budget:   ${baseline.meta?.budgetMs || '?'}ms`);
row(`Solved:   ${solved.length}/${levels.length}`);
row('');

// ── Section 1: Technique distribution ──────────────────────────────────────
row('── TECHNIQUE DISTRIBUTION ─────────────────────────────────────────────');
row(`Who solves what across all ${solved.length} solved levels:`);
row('');
row(`  ${'Technique'.padEnd(32)} ${'Count'.padStart(5)}  ${'%'.padStart(5)}  ${'Avg ms'.padStart(8)}  Coverage`);
row(`  ${'─'.repeat(70)}`);

for (const [tech, count] of techSorted) {
  const times = techTimes.get(tech) || [];
  const avg = times.reduce((s, t) => s + t, 0) / Math.max(1, times.length);
  const pct100 = (count / solved.length * 100).toFixed(1);
  const b = bar(count, solved.length, 24);
  row(`  ${tech.padEnd(32)} ${String(count).padStart(5)}  ${pct100.padStart(5)}%  ${Math.round(avg).toString().padStart(7)}ms  ${b}`);
}

row('');

// ── Section 2: Escalation map ───────────────────────────────────────────────
row('── ESCALATION MAP (how many solver stages were needed) ─────────────────');
row('');
row(`  ${'Stages'.padEnd(10)} ${'Levels'.padStart(6)}  ${'%'.padStart(5)}`);
row(`  ${'─'.repeat(28)}`);

for (const [stages, count] of [...byStages.entries()].sort((a, b) => a[0] - b[0])) {
  const pct100 = (count / solved.length * 100).toFixed(1);
  row(`  ${String(stages).padEnd(10)} ${String(count).padStart(6)}  ${pct100.padStart(5)}%`);
}
row('');
row(`  NOTE: stagesTried counts cross-stage escalations captured by the ablation runner.`);
row(`  A level showing 1 stage may still have had multiple in-stage attempts.`);
row('');

// ── Section 3: Timing distribution ─────────────────────────────────────────
row('── TIMING DISTRIBUTION ─────────────────────────────────────────────────');
row('');
row(`  Avg: ${Math.round(avgTime)}ms  P50: ${Math.round(p50)}ms  P90: ${Math.round(p90)}ms  P99: ${Math.round(p99)}ms`);
row('');

const timeBuckets = [
  [0, 100, '<100ms'],
  [100, 500, '100-500ms'],
  [500, 2000, '0.5-2s'],
  [2000, 10000, '2-10s'],
  [10000, 30000, '10-30s'],
  [30000, Infinity, '>30s'],
];

row(`  ${'Bucket'.padEnd(15)} ${'Count'.padStart(5)}  ${'%'.padStart(5)}  Levels`);
row(`  ${'─'.repeat(55)}`);
for (const [lo, hi, label] of timeBuckets) {
  const inBucket = solved.filter(l => l.elapsedMs >= lo && l.elapsedMs < hi);
  if (inBucket.length === 0) continue;
  const pct100 = (inBucket.length / solved.length * 100).toFixed(1);
  const levelList = inBucket.map(l => `L${l.level}`).join(' ');
  const display = levelList.length > 40 ? `${inBucket.length} levels` : levelList;
  row(`  ${label.padEnd(15)} ${String(inBucket.length).padStart(5)}  ${pct100.padStart(5)}%  ${display}`);
}
row('');

// ── Section 4: Feature × technique matrix ──────────────────────────────────
if (Object.keys(levelClassifications).length > 0) {
  row('── FEATURE × TECHNIQUE MATRIX ──────────────────────────────────────────');
  row(`For each boolean feature, how does presence/absence correlate with which`);
  row(`technique wins?`);
  row('');

  for (const feat of boolFeatures) {
    const { withFeat, withoutFeat, rows } = featureCrossTable(feat);
    if (withFeat.length === 0) continue;

    row(`  Feature: ${feat}  (${withFeat.length} with, ${withoutFeat.length} without)`);
    row(`  ${'Technique'.padEnd(30)} ${'W/feat'.padStart(8)} ${'W/o feat'.padStart(9)} ${'Diff'.padStart(6)}`);
    row(`  ${'─'.repeat(55)}`);

    for (const r of rows.slice(0, 6)) {
      const riskFlag = r.diff >= 0.4 ? '  ← SIMPSON-RISK' : r.diff >= 0.25 ? '  ← notable' : '';
      row(`  ${r.tech.padEnd(30)} ${(r.rateWith * 100).toFixed(0).padStart(7)}%  ${(r.rateWithout * 100).toFixed(0).padStart(8)}%  ${(r.diff * 100).toFixed(0).padStart(5)}%${riskFlag}`);
    }
    row('');
  }

  // reqInt bucket breakdown
  row(`  Feature: reqInt bucket (complexity of required intersections)`);
  const reqBuckets = [[0, 0], [1, 3], [4, 6], [7, 9], [10, 99]];
  const bucketLabels = ['reqInt=0', 'reqInt 1-3', 'reqInt 4-6', 'reqInt 7-9', 'reqInt 10+'];
  row(`  ${'Bucket'.padEnd(12)} ${'Count'.padStart(6)}  ${'Techs used (count)'.padEnd(50)}`);
  row(`  ${'─'.repeat(65)}`);
  for (let i = 0; i < reqBuckets.length; i++) {
    const [lo, hi] = reqBuckets[i];
    const inBucket = solved.filter(l => {
      const ri = levelClassifications[l.level]?.reqInt || 0;
      return ri >= lo && ri <= hi;
    });
    if (inBucket.length === 0) continue;
    const techDist = new Map();
    for (const l of inBucket) techDist.set(l.tech, (techDist.get(l.tech) || 0) + 1);
    const techStr = [...techDist.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join('  ');
    row(`  ${bucketLabels[i].padEnd(12)} ${String(inBucket.length).padStart(6)}  ${techStr}`);
  }
  row('');
}

// ── Section 5: Failures ─────────────────────────────────────────────────────
if (failed.length > 0) {
  row('── FAILURES ────────────────────────────────────────────────────────────');
  row(`${failed.length} level(s) not solved in baseline (should be 0 if golden baseline holds):`);
  row('');
  for (const l of failed) {
    const cls = JSON.stringify(l.cls);
    row(`  L${l.level}  status=${l.status || 'unknown'}  ${cls}`);
  }
  row('');
} else {
  row('── FAILURES ────────────────────────────────────────────────────────────');
  row(`None — all ${solved.length} levels solved. Golden baseline intact.`);
  row('');
}

// ── Section 6: Stratified sample ────────────────────────────────────────────
row('── STRATIFIED SAMPLE FOR DISABLE-ONE ABLATION ──────────────────────────');
row(`Recommended ${stratSample.length}-level sample for stratified disable-one run.`);
row(`Selection prioritizes: non-SM winners > SC winners > escalated levels > feature-positive.`);
row('');

const techGroupsInSample = new Map();
for (const n of stratSample) {
  const l = levelSummary.find(x => x.level === n);
  if (l) techGroupsInSample.set(l.tech, (techGroupsInSample.get(l.tech) || 0) + 1);
}

row(`  Sample composition by winning technique:`);
for (const [tech, count] of [...techGroupsInSample.entries()].sort((a, b) => b[1] - a[1])) {
  row(`    ${tech.padEnd(32)} ${count}`);
}
row('');
row(`  Level list (use with --levels flag):`);
row(`  ${stratSample.join(',')}`);
row('');
row(`  To run stratified disable-one ablation:`);
row(`  node scripts/solver-ablation.mjs \\`);
row(`    --experiment=disable-one \\`);
row(`    --levels=${stratSample.join(',')} \\`);
row(`    --output-dir=audits/ablation/stratified-50 \\`);
row(`    --max-level-wall-ms=120000`);
row('');

// ── Section 7: Technique-level mapping ──────────────────────────────────────
row('── FULL TECHNIQUE-LEVEL MAP ────────────────────────────────────────────');
row(`Which technique first-solved each level:`);
row('');

for (const [tech] of techSorted) {
  const levs = (techLevels.get(tech) || []).sort((a, b) => a - b);
  row(`  ${tech.padEnd(32)} [${levs.map(n => `L${n}`).join(', ')}]`);
}

if (failed.length > 0) {
  row(`  ${'FAILED'.padEnd(32)} [${failed.map(l => `L${l.level}`).join(', ')}]`);
}
row('');

const output = lines.join('\n');
writeFileSync(outputPath, output);
console.log(output);
console.log(`\nSaved to ${outputPath}`);
