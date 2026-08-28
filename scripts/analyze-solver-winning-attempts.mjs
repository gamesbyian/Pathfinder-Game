#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { familyMetadataOf, summarizeFamilyWinningAttempts, winnerConfig } from './winning-attempt-family-lib.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const positional = args.filter(a => !a.startsWith('--'));
const inputFiles = (argMap.get('--inputs') || '').split(',').map(s => s.trim()).filter(Boolean).concat(positional);
const outputFile = argMap.get('--output') || 'reports/solver-winning-attempts.json';
const groupByFamily = argMap.get('--group-by-family') || null;
const familyParentFilter = argMap.get('--family-parent') || null;
const familyModeFilter = argMap.get('--family-mode') || null;

if (inputFiles.length === 0) {
  console.error('Usage: node scripts/analyze-solver-winning-attempts.mjs --inputs=path/a.json,path/b.json [--output=reports/solver-winning-attempts.json]');
  process.exit(1);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
}

function median(sorted) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value, places = 3) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const m = 10 ** places;
  return Math.round(value * m) / m;
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fractionsAfter(wins) {
  return Object.fromEntries(lateThresholds.map(t => [`after${t}ms`, round(wins.filter(w => w.elapsedMs > t).length / wins.length)]));
}

const rows = [];
const familyLevels = [];
const sourceSummaries = [];
for (const file of inputFiles) {
  const parsed = JSON.parse(await readFile(file, 'utf8'));
  const levels = Array.isArray(parsed?.levels) ? parsed.levels : Array.isArray(parsed?.data?.levels) ? parsed.data.levels : [];
  familyLevels.push(...levels.filter(level => { const f=familyMetadataOf(level); return (!familyParentFilter||String(f.parentId)===familyParentFilter)&&(!familyModeFilter||String(f.mode)===familyModeFilter); }));
  let wins = 0;
  for (const level of levels) {
    if (!level?.ok && level?.status !== 'success') continue;
    const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
    const attemptIndex = attempts.findIndex(a => a?.ok);
    if (attemptIndex < 0) continue;
    const attempt = attempts[attemptIndex];
    const elapsedMs = numericOrNull(attempt?.elapsedMs);
    if (elapsedMs === null) continue;
    const allocatedBudgetMs = numericOrNull(attempt?.allocatedBudgetMs);
    rows.push({
      source: file,
      level: level.level ?? level.id ?? null,
      config: winnerConfig(attempt),
      elapsedMs,
      nodesExpanded: numericOrNull(attempt?.nodesExpanded),
      allocatedBudgetMs,
      attemptIndex,
      cumulativeElapsedMs: Number.isFinite(Number(level?.elapsedMs)) ? Number(level.elapsedMs) : null,
      cumulativeNodesExpanded: Number.isFinite(Number(level?.nodesExpanded)) ? Number(level.nodesExpanded) : null,
    });
    wins += 1;
  }
  sourceSummaries.push({ file, levels: levels.length, successfulAttempts: wins });
}

const thresholds = [250, 500, 1000, 2000, 5000, 10000];
const lateThresholds = [1000, 2000, 5000, 10000];
const groups = new Map();
for (const row of rows) {
  if (!groups.has(row.config)) groups.set(row.config, []);
  groups.get(row.config).push(row);
}

const configs = [...groups.entries()].map(([config, wins]) => {
  const times = wins.map(w => w.elapsedMs).sort((a, b) => a - b);
  const withBudget = wins.filter(w => Number.isFinite(w.allocatedBudgetMs) && w.allocatedBudgetMs > 0);
  const budgetFractions = withBudget.map(w => w.elapsedMs / w.allocatedBudgetMs).sort((a, b) => a - b);
  const out = {
    config,
    winCount: wins.length,
    medianMs: round(median(times), 1),
    p90Ms: percentile(times, 90),
    p95Ms: percentile(times, 95),
    maxMs: times[times.length - 1],
    fractionsAfter: fractionsAfter(wins),
    fractionAfter2s: round(wins.filter(w => w.elapsedMs > 2000).length / wins.length),
    allocatedBudgetConsumption: withBudget.length ? {
      sampleCount: withBudget.length,
      medianFraction: round(median(budgetFractions)),
      p90Fraction: round(percentile(budgetFractions, 90)),
      p95Fraction: round(percentile(budgetFractions, 95)),
      maxFraction: round(budgetFractions[budgetFractions.length - 1]),
    } : null,
  };
  for (const t of thresholds) out[`fractionWithin${t}ms`] = round(wins.filter(w => w.elapsedMs <= t).length / wins.length);
  return out;
}).sort((a, b) => b.winCount - a.winCount || a.config.localeCompare(b.config));

const lateBloomers = configs
  .filter(c => c.winCount > 0 && (c.fractionsAfter.after1000ms > 0 || c.p95Ms > 1000))
  .map(c => ({
    config: c.config,
    winCount: c.winCount,
    p90Ms: c.p90Ms,
    p95Ms: c.p95Ms,
    maxMs: c.maxMs,
    fractionsAfter: c.fractionsAfter,
    allocatedBudgetConsumption: c.allocatedBudgetConsumption,
  }))
  .sort((a, b) => (b.fractionsAfter.after2000ms - a.fractionsAfter.after2000ms)
    || (b.fractionsAfter.after1000ms - a.fractionsAfter.after1000ms)
    || (b.p95Ms - a.p95Ms)
    || b.winCount - a.winCount);

const allTimes = rows.map(r => r.elapsedMs).sort((a, b) => a - b);
const allWithBudget = rows.filter(r => Number.isFinite(r.allocatedBudgetMs) && r.allocatedBudgetMs > 0);
const allBudgetFractions = allWithBudget.map(r => r.elapsedMs / r.allocatedBudgetMs).sort((a, b) => a - b);
const summary = {
  generatedAt: new Date().toISOString(),
  inputFiles,
  sourceSummaries,
  totalWinningAttempts: rows.length,
  configCount: configs.length,
  overall: {
    medianMs: round(median(allTimes), 1),
    p90Ms: percentile(allTimes, 90),
    p95Ms: percentile(allTimes, 95),
    maxMs: allTimes[allTimes.length - 1] ?? null,
    fractionsAfter: rows.length ? fractionsAfter(rows) : null,
    fractionAfter2s: rows.length ? round(rows.filter(r => r.elapsedMs > 2000).length / rows.length) : null,
    allocatedBudgetConsumption: allWithBudget.length ? {
      sampleCount: allWithBudget.length,
      medianFraction: round(median(allBudgetFractions)),
      p90Fraction: round(percentile(allBudgetFractions, 90)),
      p95Fraction: round(percentile(allBudgetFractions, 95)),
      maxFraction: round(allBudgetFractions[allBudgetFractions.length - 1]),
    } : null,
  },
  lateBloomers,
  configs,
  familyGroups: groupByFamily ? summarizeFamilyWinningAttempts(familyLevels, { groupBy: groupByFamily }) : null,
};
for (const t of thresholds) summary.overall[`fractionWithin${t}ms`] = rows.length ? round(rows.filter(r => r.elapsedMs <= t).length / rows.length) : null;

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(summary, null, 2));
console.log(`Analyzed ${rows.length} winning attempts across ${configs.length} configurations.`);
console.log(`Results → ${outputFile}`);
if (!allWithBudget.length) console.log('Note: no attempts had allocatedBudgetMs; budget-consumption fractions are unavailable for these inputs.');
console.log(JSON.stringify(summary.overall, null, 2));
