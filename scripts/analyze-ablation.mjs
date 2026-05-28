#!/usr/bin/env node
/**
 * Ablation analysis.
 *
 * Reads output from solver-ablation.mjs and produces a structured report
 * answering:
 *   - Which techniques are indispensable? (regressions when disabled)
 *   - Which techniques have meaningful standalone coverage?
 *   - Which techniques are redundant or only situationally needed?
 *   - Where does budget sweeping unlock new solves vs just going faster?
 *   - Which levels are "canaries" that require specific technique logic?
 *   - How much time is wasted on pre-solve overhead per level?
 *   - What is the minimum covering technique set?
 *
 * Usage:
 *   node scripts/analyze-ablation.mjs --input-dir=audits/ablation/run1
 *   node scripts/analyze-ablation.mjs --input-dir=audits/ablation/run1 --output=audits/ablation/run1/analysis.md
 *   node scripts/analyze-ablation.mjs --input-dir=audits/ablation/run1 --json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const inputDir = argMap.get('--input-dir');
if (!inputDir || !existsSync(inputDir)) {
  console.error(`Usage: node scripts/analyze-ablation.mjs --input-dir=<path>`);
  process.exit(1);
}
const outputPath = argMap.get('--output') || null;
const jsonMode = argFlags.has('--json');

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadJson(filePath) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); } catch { return null; }
}

const manifest = await loadJson(path.join(inputDir, 'manifest.json'));
if (!manifest) { console.error('manifest.json not found in input-dir'); process.exit(1); }

const variantData = {};
for (const v of (manifest.completedVariants || manifest.variants || [])) {
  const file = v.outputFile || `${v.variantId}.json`;
  const data = await loadJson(path.join(inputDir, file));
  if (data) variantData[v.variantId || v.id] = data;
}

const allVariantIds = Object.keys(variantData);
console.log(`Loaded ${allVariantIds.length} variant(s) from ${inputDir}`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const baseline = variantData['baseline'];
const levelNumbers = manifest.levels || [];
const levelClassifications = manifest.levelClassifications || {};

function getLevelResult(variantId, levelNum) {
  const v = variantData[variantId];
  if (!v) return null;
  return (v.levels || []).find(l => l.level === levelNum) || null;
}

function getVariantIds(prefix) {
  return allVariantIds.filter(id => id.startsWith(prefix));
}

// ─── Section 1: Baseline summary ─────────────────────────────────────────────
function analyzeBaseline() {
  if (!baseline) return null;
  const levels = baseline.levels || [];
  const solved = levels.filter(l => l.ok);
  const failed = levels.filter(l => !l.ok && l.status !== 'error');
  const errors = levels.filter(l => l.status === 'error');

  // Technique distribution: which technique solved each level first?
  const techCounts = {};
  const overheadByTech = {};
  const solveTimesTotal = [];

  for (const l of solved) {
    const tech = l.firstSolvingAttempt || 'unknown';
    techCounts[tech] = (techCounts[tech] || 0) + 1;
    if (!overheadByTech[tech]) overheadByTech[tech] = [];
    overheadByTech[tech].push(l.overheadBeforeSolveMs || 0);
    solveTimesTotal.push(l.elapsedMs || 0);
  }

  const techRows = Object.entries(techCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tech, count]) => {
      const overheads = overheadByTech[tech] || [];
      const avgOverhead = overheads.length > 0 ? overheads.reduce((s, v) => s + v, 0) / overheads.length : 0;
      return { tech, count, avgOverheadMs: Math.round(avgOverhead) };
    });

  const totalMs = solveTimesTotal.reduce((s, v) => s + v, 0);
  const avgMs = solved.length > 0 ? totalMs / solved.length : 0;

  return {
    solvedCount: solved.length,
    failedCount: failed.length,
    errorCount: errors.length,
    totalLevels: levels.length,
    avgSolveMs: Math.round(avgMs),
    techDistribution: techRows,
    failedLevels: failed.map(l => l.level),
  };
}

// ─── Section 2: Disable-one regression analysis ───────────────────────────────
function analyzeDisableOne() {
  const disableVariants = getVariantIds('disable-');
  if (!disableVariants.length) return null;

  const rows = [];
  for (const variantId of disableVariants.sort()) {
    const v = variantData[variantId];
    if (!v) continue;
    const techId = variantId.replace('disable-', '');
    const variantLevels = v.levels || [];

    const regressions = [];
    const improvements = [];
    let solvedCount = 0;

    for (const l of variantLevels) {
      const base = getLevelResult('baseline', l.level);
      if (l.ok) solvedCount++;
      if (base && base.ok && !l.ok) regressions.push(l.level);
      if (base && !base.ok && l.ok) improvements.push(l.level);
    }

    rows.push({
      techId,
      desc: (manifest.techniques || []).find(t => t.id === techId)?.desc || techId,
      solvedCount,
      baselineSolvedCount: baseline ? (baseline.levels || []).filter(l => l.ok).length : null,
      regressionCount: regressions.length,
      regressions,
      improvements,
      verdict: regressions.length === 0 ? 'REDUNDANT' : regressions.length <= 2 ? 'SITUATIONAL' : 'INDISPENSABLE',
    });
  }

  return rows.sort((a, b) => b.regressionCount - a.regressionCount);
}

// ─── Section 3: Solo coverage analysis ───────────────────────────────────────
function analyzeSolo() {
  const soloVariants = getVariantIds('solo-');
  if (!soloVariants.length) return null;

  const coverageSets = {};
  const rows = [];

  for (const variantId of soloVariants.sort()) {
    const v = variantData[variantId];
    if (!v) continue;
    const techId = variantId.replace('solo-', '');
    const techPrefix = (manifest.techniques || []).find(t => t.id === techId)?.prefix || techId;

    // Attribution filter: if firstSolvingAttempt doesn't start with this technique's prefix,
    // it was solved by the "empty plan" fallback (old solver code), not the technique itself.
    // Count it as a true solo solve only when attribution matches.
    const allSolved = (v.levels || []).filter(l => l.ok);
    const trueSolved = allSolved.filter(l => {
      if (!l.firstSolvingAttempt) return true; // no attribution data — can't filter
      return l.firstSolvingAttempt.startsWith(techPrefix) || l.firstSolvingAttempt === techPrefix;
    });
    const fallbackCount = allSolved.length - trueSolved.length;

    const solved = trueSolved.map(l => l.level);
    coverageSets[techId] = new Set(solved);

    rows.push({
      techId,
      desc: (manifest.techniques || []).find(t => t.id === techId)?.desc || techId,
      solvedCount: solved.length,
      solvedLevels: solved,
      fallbackCount,
    });
  }

  // Find levels solvable by ONLY one technique (canaries)
  const canaryMap = {};
  for (const levelNum of levelNumbers) {
    const solvers = rows.filter(r => coverageSets[r.techId]?.has(levelNum));
    if (solvers.length === 1) {
      const tech = solvers[0].techId;
      if (!canaryMap[tech]) canaryMap[tech] = [];
      canaryMap[tech].push(levelNum);
    }
  }

  // Overlap matrix: which techniques solve the same levels?
  const overlapMatrix = {};
  for (const r of rows) {
    overlapMatrix[r.techId] = {};
    for (const r2 of rows) {
      if (r === r2) continue;
      const intersection = [...coverageSets[r.techId]].filter(l => coverageSets[r2.techId]?.has(l));
      overlapMatrix[r.techId][r2.techId] = intersection.length;
    }
  }

  // Minimum covering set (greedy)
  const allSolved = baseline ? new Set((baseline.levels || []).filter(l => l.ok).map(l => l.level)) : new Set(levelNumbers);
  const remaining = new Set(allSolved);
  const coveringSet = [];
  const sorted = rows.slice().sort((a, b) => b.solvedCount - a.solvedCount);
  while (remaining.size > 0 && sorted.length > 0) {
    let best = null, bestNew = -1;
    for (const r of sorted) {
      const newSolves = [...coverageSets[r.techId]].filter(l => remaining.has(l));
      if (newSolves.length > bestNew) { best = r; bestNew = newSolves.length; }
    }
    if (!best || bestNew === 0) break;
    coveringSet.push({ techId: best.techId, newSolves: bestNew });
    for (const l of coverageSets[best.techId]) remaining.delete(l);
    sorted.splice(sorted.indexOf(best), 1);
  }

  return {
    rows: rows.sort((a, b) => b.solvedCount - a.solvedCount),
    canaryMap,
    overlapMatrix,
    minimumCoveringSet: coveringSet,
    uncoveredByAnySolo: [...remaining],
  };
}

// ─── Section 4: Budget sweep analysis ────────────────────────────────────────
function analyzeBudgetSweep() {
  const budgetVariants = getVariantIds('budget-').filter(id => !id.startsWith('budget-sweep'));
  if (!budgetVariants.length) return null;

  const baselineSolved = baseline ? (baseline.levels || []).filter(l => l.ok).length : null;
  const rows = [];

  for (const variantId of budgetVariants.sort()) {
    const v = variantData[variantId];
    if (!v) continue;
    const mult = v.config?.globalBudgetMultiplier || 1.0;
    const solved = (v.levels || []).filter(l => l.ok);
    const newSolves = baseline
      ? solved.filter(l => !getLevelResult('baseline', l.level)?.ok).map(l => l.level)
      : [];
    rows.push({
      variantId,
      multiplier: mult,
      budgetMs: Math.round((manifest.budgetMs || 180000) * mult),
      solvedCount: solved.length,
      baselineDelta: baselineSolved != null ? solved.length - baselineSolved : null,
      newSolves,
    });
  }

  // Add baseline as the 1.0 point
  if (baseline) {
    rows.push({
      variantId: 'baseline',
      multiplier: 1.0,
      budgetMs: manifest.budgetMs || 180000,
      solvedCount: (baseline.levels || []).filter(l => l.ok).length,
      baselineDelta: 0,
      newSolves: [],
    });
  }

  return rows.sort((a, b) => a.multiplier - b.multiplier);
}

// ─── Section 5: Technique budget sweep ────────────────────────────────────────
function analyzeTechniqueBudget() {
  const techBudgetVariants = getVariantIds('tech-budget-');
  if (!techBudgetVariants.length) return null;

  const byTech = {};
  for (const variantId of techBudgetVariants.sort()) {
    const v = variantData[variantId];
    if (!v) continue;
    // Extract techId and multiplier from variantId: tech-budget-{techId}-{M}x
    const parts = variantId.replace('tech-budget-', '').split('-');
    // Multiplier is the last part (e.g. "2p0x" → 2.0)
    const multStr = parts[parts.length - 1];
    const mult = Number(multStr.replace('x', '').replace('p', '.'));
    const techId = parts.slice(0, -1).join('-');

    if (!byTech[techId]) byTech[techId] = [];
    byTech[techId].push({
      multiplier: mult,
      solvedCount: (v.levels || []).filter(l => l.ok).length,
      levels: (v.levels || []).filter(l => l.ok).map(l => l.level),
    });
  }

  const rows = [];
  for (const [techId, points] of Object.entries(byTech)) {
    rows.push({
      techId,
      desc: (manifest.techniques || []).find(t => t.id === techId)?.desc || techId,
      curve: points.sort((a, b) => a.multiplier - b.multiplier),
    });
  }
  return rows.sort((a, b) => a.techId.localeCompare(b.techId));
}

// ─── Section 5b: Timing impact (slowdown cost of removing each technique) ─────
function analyzeTimingImpact() {
  const disableVariants = getVariantIds('disable-');
  if (!disableVariants.length || !baseline) return null;

  const baselineTimes = {};
  for (const l of baseline.levels || []) baselineTimes[l.level] = l.elapsedMs || 0;

  const rows = [];
  for (const variantId of disableVariants.sort()) {
    const v = variantData[variantId];
    if (!v) continue;
    const techId = variantId.replace('disable-', '');

    let totalDeltaMs = 0;
    const changedLevels = [];

    for (const l of v.levels || []) {
      const baseMs = baselineTimes[l.level] ?? 0;
      const varMs = l.elapsedMs || 0;
      const delta = varMs - baseMs;
      const multiplier = baseMs > 0 ? varMs / baseMs : 1;
      if (!l.ok) continue; // skip failures (captured in regression analysis)
      totalDeltaMs += delta;
      if (multiplier >= 1.5 || Math.abs(delta) >= 2000) {
        const baseTech = getLevelResult('baseline', l.level)?.firstSolvingAttempt || '?';
        changedLevels.push({
          level: l.level,
          baseMs,
          varMs,
          delta,
          multiplier,
          fallbackTech: l.firstSolvingAttempt || '?',
          baseTech,
        });
      }
    }

    // Sort by absolute time delta (practical impact), not ratio
    changedLevels.sort((a, b) => b.delta - a.delta);
    const worstLevel = changedLevels[0] || null;

    rows.push({
      techId,
      totalDeltaMs,
      worstLevel,
      changedLevels,
    });
  }

  return rows.sort((a, b) => b.totalDeltaMs - a.totalDeltaMs);
}

// ─── Section 6: Overhead analysis (from baseline) ────────────────────────────
function analyzeOverhead() {
  if (!baseline) return null;
  const solved = (baseline.levels || []).filter(l => l.ok && l.overheadBeforeSolveMs > 0);
  const totalOverhead = solved.reduce((s, l) => s + (l.overheadBeforeSolveMs || 0), 0);
  const totalSolveTime = (baseline.levels || []).filter(l => l.ok).reduce((s, l) => s + (l.elapsedMs || 0), 0);

  // Per-technique: how much overhead was paid before this technique solved?
  const overheadByTech = {};
  for (const l of (baseline.levels || []).filter(l => l.ok)) {
    const tech = l.firstSolvingAttempt || 'unknown';
    if (!overheadByTech[tech]) overheadByTech[tech] = { levels: 0, totalOverheadMs: 0, wastedAttempts: 0 };
    overheadByTech[tech].levels++;
    overheadByTech[tech].totalOverheadMs += l.overheadBeforeSolveMs || 0;
    overheadByTech[tech].wastedAttempts += l.solvingAttemptIdx || 0;
  }

  // True overhead = total elapsed minus winning attempt's own elapsed.
  // This captures failed-stage time that overheadBeforeSolveMs misses (it only
  // covers attempts within the winning stage, not prior stage failures).
  const highOverheadLevels = (baseline.levels || [])
    .filter(l => l.ok)
    .map(l => {
      const winAttemptMs = (l.attemptSummary || []).find(a => a.solved)?.elapsedMs || 0;
      const trueOverheadMs = Math.max(0, (l.elapsedMs || 0) - winAttemptMs);
      return {
        level: l.level,
        solvingTech: l.firstSolvingAttempt,
        solvingAttemptIdx: l.solvingAttemptIdx,
        overheadMs: trueOverheadMs,
        winAttemptMs,
        totalMs: l.elapsedMs,
        overheadFraction: l.elapsedMs > 0 ? trueOverheadMs / l.elapsedMs : 0,
      };
    })
    .filter(l => l.overheadMs > 200)
    .sort((a, b) => b.overheadMs - a.overheadMs)
    .slice(0, 20);

  // Recompute totals using true overhead
  const trueTotal = (baseline.levels || []).filter(l => l.ok).reduce((s, l) => {
    const winAttemptMs = (l.attemptSummary || []).find(a => a.solved)?.elapsedMs || 0;
    return s + Math.max(0, (l.elapsedMs || 0) - winAttemptMs);
  }, 0);

  return {
    totalOverheadMs: Math.round(trueTotal),
    totalSolveTimeMs: Math.round(totalSolveTime),
    overheadFraction: totalSolveTime > 0 ? trueTotal / totalSolveTime : 0,
    byTechnique: Object.entries(overheadByTech)
      .map(([tech, d]) => ({ tech, ...d, avgOverheadMs: Math.round(d.totalOverheadMs / d.levels) }))
      .sort((a, b) => b.totalOverheadMs - a.totalOverheadMs),
    highOverheadLevels,
  };
}

// ─── Section 6b: Archetype pass efficiency ────────────────────────────────────
function analyzeArchetypeEfficiency() {
  if (!baseline || !variantData['disable-archetype']) return null;

  const disableArchetype = variantData['disable-archetype'];
  const rows = [];

  for (const baseLevel of (baseline.levels || []).filter(l => l.ok)) {
    const firstSolving = baseLevel.firstSolvingAttempt || '';
    if (!firstSolving.startsWith('archetype')) continue;

    const disabledLevel = (disableArchetype.levels || []).find(l => l.level === baseLevel.level);
    if (!disabledLevel) continue;

    const baseMs = baseLevel.elapsedMs || 0;
    const disabledMs = disabledLevel.elapsedMs || 0;
    const speedup = baseMs > 0 && disabledMs > 0 ? baseMs / disabledMs : null;
    const archEssential = !disabledLevel.ok;

    rows.push({
      level: baseLevel.level,
      archetypeAttempt: firstSolving,
      baseMs,
      disabledMs,
      disabledSolvingTech: disabledLevel.firstSolvingAttempt || null,
      disabledStatus: disabledLevel.status,
      archEssential,
      speedup, // >1 means archetype is SLOWER than no-archetype
    });
  }

  return rows.sort((a, b) => (b.speedup || 0) - (a.speedup || 0));
}

// ─── Section 7: Per-feature breakdown ────────────────────────────────────────
function analyzeByFeature() {
  if (!baseline) return null;
  const features = ['hasPortals', 'hasMustCross', 'hasMustPass', 'hasGeese', 'hasFilters', 'hasFalseGoals', 'multiGate'];
  const rows = [];

  for (const feat of features) {
    const withFeature = levelNumbers.filter(n => levelClassifications[n]?.[feat]);
    if (withFeature.length === 0) continue;

    const baseSolvedWithFeat = withFeature.filter(n => getLevelResult('baseline', n)?.ok);
    const disableRows = [];

    for (const techId of (manifest.techniques || []).map(t => t.id)) {
      const disableVariantId = `disable-${techId}`;
      if (!variantData[disableVariantId]) continue;
      const regressions = withFeature.filter(n => getLevelResult('baseline', n)?.ok && !getLevelResult(disableVariantId, n)?.ok);
      if (regressions.length > 0) {
        disableRows.push({ techId, regressions, regressionCount: regressions.length });
      }
    }

    rows.push({
      feature: feat,
      levelCount: withFeature.length,
      baselineSolved: baseSolvedWithFeat.length,
      featureRegressions: disableRows.sort((a, b) => b.regressionCount - a.regressionCount),
    });
  }
  return rows;
}

// ─── Run all analyses ─────────────────────────────────────────────────────────
const baselineAnalysis = analyzeBaseline();
const archetypeEfficiencyAnalysis = analyzeArchetypeEfficiency();
const disableOneAnalysis = analyzeDisableOne();
const soloAnalysis = analyzeSolo();
const budgetSweepAnalysis = analyzeBudgetSweep();
const techniqueBudgetAnalysis = analyzeTechniqueBudget();
const timingImpactAnalysis = analyzeTimingImpact();
const overheadAnalysis = analyzeOverhead();
const featureAnalysis = analyzeByFeature();

// ─── Report generation ────────────────────────────────────────────────────────
const lines = [];
const h1 = s => lines.push(`\n${'═'.repeat(72)}\n${s}\n${'═'.repeat(72)}`);
const h2 = s => lines.push(`\n── ${s} ${'─'.repeat(Math.max(0, 68 - s.length - 4))}`);
const row = s => lines.push(s);
const blank = () => lines.push('');

h1(`Solver Ablation Analysis`);
row(`Input:    ${inputDir}`);
row(`Date:     ${manifest.timestamp || 'unknown'}`);
row(`Commit:   ${manifest.commitSha?.slice(0, 12) || 'unknown'}`);
row(`Budget:   ${manifest.budgetMs || 'unknown'}ms`);
row(`Levels:   ${levelNumbers.length}`);
row(`Variants: ${allVariantIds.length}`);

// ── Baseline ──────────────────────────────────────────────────────────────────
if (baselineAnalysis) {
  h2('BASELINE SUMMARY');
  row(`Solved: ${baselineAnalysis.solvedCount}/${baselineAnalysis.totalLevels}   Failed: ${baselineAnalysis.failedCount}   Avg time: ${baselineAnalysis.avgSolveMs}ms`);
  if (baselineAnalysis.failedLevels.length > 0) row(`Failed levels: ${baselineAnalysis.failedLevels.join(', ')}`);
  blank();
  row(`First-success technique distribution (who solved what):`);
  row(`  ${'Technique'.padEnd(42)} Levels  Avg overhead`);
  row(`  ${'─'.repeat(60)}`);
  for (const t of baselineAnalysis.techDistribution) {
    row(`  ${t.tech.padEnd(42)} ${String(t.count).padStart(6)}  ${t.avgOverheadMs}ms`);
  }
}

// ── Archetype pass efficiency ─────────────────────────────────────────────────
if (archetypeEfficiencyAnalysis && archetypeEfficiencyAnalysis.length > 0) {
  h2('ARCHETYPE PASS EFFICIENCY');
  row(`For each level solved by an archetype pass in baseline:`);
  row(`Does removing the archetype make it faster, slower, or impossible?`);
  blank();
  row(`  ${'Level'.padEnd(8)} ${'Archetype'.padEnd(48)} ${'Base'.padEnd(8)} ${'NoArch'.padEnd(10)} ${'Ratio'.padEnd(8)} Essential`);
  row(`  ${'─'.repeat(92)}`);
  for (const r of archetypeEfficiencyAnalysis) {
    const noArchStr = r.archEssential ? 'FAIL' : (r.disabledMs ? r.disabledMs + 'ms' : '?');
    const ratioStr = r.archEssential ? '∞' : (r.speedup != null ? r.speedup.toFixed(2) + '×' : '?');
    const note = r.archEssential ? 'YES — fails without'
               : (r.speedup && r.speedup > 1.5) ? `NO  — ${(r.speedup).toFixed(1)}× slower`
               : 'NO  — similar speed';
    row(`  L${String(r.level).padEnd(6)} ${(r.archetypeAttempt || '?').padEnd(48)} ${(r.baseMs+'ms').padEnd(8)} ${noArchStr.padEnd(10)} ${ratioStr.padEnd(8)} ${note}`);
  }
  const essential = archetypeEfficiencyAnalysis.filter(r => r.archEssential);
  const inefficient = archetypeEfficiencyAnalysis.filter(r => !r.archEssential && r.speedup && r.speedup > 1.5);
  blank();
  if (essential.length > 0) row(`  Essential (would fail without archetype): L${essential.map(r => r.level).join(', L')}`);
  if (inefficient.length > 0) row(`  Inefficient (archetype slower than fallback at this budget): L${inefficient.map(r => r.level).join(', L')}`);
}

// ── Disable-one analysis ──────────────────────────────────────────────────────
if (disableOneAnalysis) {
  h2('DISABLE-ONE REGRESSIONS');
  row(`Which techniques, when removed, cause levels to fail?`);
  blank();
  row(`  ${'Technique'.padEnd(36)} Verdict        Regressions`);
  row(`  ${'─'.repeat(70)}`);
  for (const t of disableOneAnalysis) {
    const regStr = t.regressions.length > 0 ? `L${t.regressions.join(', L')}` : 'none';
    row(`  ${t.techId.padEnd(36)} ${t.verdict.padEnd(14)} ${String(t.regressionCount).padStart(3)}  ${regStr}`);
  }
  blank();
  const indispensable = disableOneAnalysis.filter(t => t.verdict === 'INDISPENSABLE').map(t => t.techId);
  const redundant = disableOneAnalysis.filter(t => t.verdict === 'REDUNDANT').map(t => t.techId);
  const situational = disableOneAnalysis.filter(t => t.verdict === 'SITUATIONAL').map(t => t.techId);
  if (indispensable.length) row(`INDISPENSABLE (≥3 regressions): ${indispensable.join(', ')}`);
  if (situational.length) row(`SITUATIONAL (1–2 regressions):  ${situational.join(', ')}`);
  if (redundant.length) row(`REDUNDANT (0 regressions):       ${redundant.join(', ')}`);
}

// ── Timing impact ─────────────────────────────────────────────────────────────
if (timingImpactAnalysis && timingImpactAnalysis.some(r => Math.abs(r.totalDeltaMs) >= 500)) {
  h2('TIMING IMPACT (slowdown cost of disabling each technique)');
  row(`No failures, but removal may significantly slow solving. Δtime = total extra ms across all levels.`);
  blank();
  row(`  ${'Technique'.padEnd(36)} ${'Δ total'.padEnd(12)} ${'Worst level'.padEnd(12)} Worst ×`);
  row(`  ${'─'.repeat(72)}`);
  for (const t of timingImpactAnalysis) {
    if (Math.abs(t.totalDeltaMs) < 100 && !t.worstLevel) continue;
    const sign = t.totalDeltaMs >= 0 ? '+' : '';
    const worstStr = t.worstLevel ? `L${t.worstLevel.level}` : '-';
    const multStr = t.worstLevel ? `${t.worstLevel.multiplier.toFixed(1)}×` : '-';
    row(`  ${t.techId.padEnd(36)} ${(sign + Math.round(t.totalDeltaMs/1000) + 's').padEnd(12)} ${worstStr.padEnd(12)} ${multStr}`);
  }
  blank();

  // Speedup anomalies: techniques whose removal makes things FASTER
  // This signals the technique is spending budget less efficiently than the fallback.
  const speedupTechs = timingImpactAnalysis.filter(t => t.totalDeltaMs < -2000);
  if (speedupTechs.length > 0) {
    blank();
    row(`  ANOMALY — faster without the technique (may be budget-inefficient at test scale):`);
    for (const t of speedupTechs) {
      if (!t.worstLevel) continue;
      row(`  disable-${t.techId}: ${Math.abs(Math.round(t.totalDeltaMs/1000))}s faster total | ` +
          `L${t.worstLevel.level}: ${t.worstLevel.baseMs}ms → ${t.worstLevel.varMs}ms  (${t.worstLevel.multiplier.toFixed(2)}×)`);
      for (const l of t.changedLevels.filter(l => l.delta < -500)) {
        row(`    L${String(l.level).padEnd(5)} ${l.baseMs}ms → ${l.varMs}ms  (${l.multiplier.toFixed(2)}×)  ${l.baseTech} → ${l.fallbackTech}`);
      }
    }
    row(`  NOTE: Speedup anomalies are often budget-scale artifacts — reduced test budget`);
    row(`  causes the technique to fail in stage-0 (wasting its fraction), while the fallback`);
    row(`  succeeds in fewer virtual nodes. At production budget this anomaly may disappear.`);
  }

  // Detail for techniques with significant slowdowns
  const significant = timingImpactAnalysis.filter(t => t.worstLevel && t.worstLevel.multiplier >= 1.5 && t.totalDeltaMs > 0);
  for (const t of significant) {
    row(`  disable-${t.techId} level detail:`);
    for (const l of t.changedLevels.filter(l => l.delta > 0)) {
      row(`    L${String(l.level).padEnd(5)} ${l.baseMs}ms → ${l.varMs}ms  (${l.multiplier.toFixed(1)}×)` +
          (l.baseTech !== l.fallbackTech ? `  ${l.baseTech} → ${l.fallbackTech}` : `  same tech: ${l.baseTech}`));
    }
  }
}

// ── Solo coverage ─────────────────────────────────────────────────────────────
if (soloAnalysis) {
  h2('SOLO COVERAGE (each technique alone with ≈full budget)');
  row(`How many levels can each technique solve by itself?`);
  blank();
  row(`  ${'Technique'.padEnd(36)} Alone  Coverage  Fallback`);
  row(`  ${'─'.repeat(68)}`);
  const totalSolvable = baseline ? (baseline.levels || []).filter(l => l.ok).length : levelNumbers.length;
  for (const t of soloAnalysis.rows) {
    const pct = totalSolvable > 0 ? ((t.solvedCount / totalSolvable) * 100).toFixed(1) : '?';
    const bar = '█'.repeat(Math.round(t.solvedCount / totalSolvable * 20));
    const fallbackStr = t.fallbackCount > 0 ? `(+${t.fallbackCount} via fallback)` : '';
    row(`  ${t.techId.padEnd(36)} ${String(t.solvedCount).padStart(5)}  ${pct.padStart(5)}%  ${bar} ${fallbackStr}`);
  }
  blank();

  if (soloAnalysis.minimumCoveringSet.length > 0) {
    row(`Minimum greedy covering set (order matters):`);
    let cumulative = 0;
    for (const entry of soloAnalysis.minimumCoveringSet) {
      cumulative += entry.newSolves;
      row(`  + ${entry.techId.padEnd(36)} → +${entry.newSolves} new (${cumulative} total)`);
    }
    if (soloAnalysis.uncoveredByAnySolo.length > 0) {
      row(`  Uncovered by any solo technique: L${soloAnalysis.uncoveredByAnySolo.join(', L')}`);
    }
  }

  const canaryTechs = Object.entries(soloAnalysis.canaryMap);
  if (canaryTechs.length > 0) {
    blank();
    row(`Canary levels (solvable by exactly ONE technique standalone):`);
    for (const [tech, levels] of canaryTechs.sort()) {
      row(`  ${tech}: L${levels.join(', L')}`);
    }
  }
}

// ── Budget sweep ──────────────────────────────────────────────────────────────
if (budgetSweepAnalysis) {
  h2('BUDGET SWEEP (global time multiplier vs solve count)');
  row(`Does more budget unlock new levels or just solve faster?`);
  blank();
  row(`  ${'Multiplier'.padEnd(14)} ${'Budget'.padEnd(12)} ${'Solved'.padEnd(10)} Delta  New levels`);
  row(`  ${'─'.repeat(70)}`);
  for (const pt of budgetSweepAnalysis) {
    const deltaStr = pt.baselineDelta != null ? (pt.baselineDelta >= 0 ? `+${pt.baselineDelta}` : `${pt.baselineDelta}`) : '?';
    const newStr = pt.newSolves.length > 0 ? `L${pt.newSolves.slice(0, 8).join(', L')}${pt.newSolves.length > 8 ? '...' : ''}` : '-';
    row(`  ${String(pt.multiplier + 'x').padEnd(14)} ${(pt.budgetMs + 'ms').padEnd(12)} ${String(pt.solvedCount).padEnd(10)} ${deltaStr.padStart(5)}  ${newStr}`);
  }
}

// ── Per-technique budget sweep ────────────────────────────────────────────────
if (techniqueBudgetAnalysis) {
  h2('PER-TECHNIQUE BUDGET CURVES (solo, varying budget)');
  row(`For each technique alone: how does solve count grow with budget?`);
  row(`(Budget multiplier is relative to the technique's normal budget share.)`);
  blank();
  for (const t of techniqueBudgetAnalysis) {
    const points = t.curve.map(pt => `×${pt.multiplier}=${pt.solvedCount}`).join('  ');
    row(`  ${t.techId.padEnd(36)} ${points}`);
  }
}

// ── Overhead analysis ─────────────────────────────────────────────────────────
if (overheadAnalysis) {
  h2('OVERHEAD ANALYSIS (time wasted before winning technique)');
  const pct = overheadAnalysis.overheadFraction * 100;
  row(`True overhead (total elapsed − winning attempt elapsed) across all solved levels:`);
  row(`  ${Math.round(overheadAnalysis.totalOverheadMs/1000)}s overhead of ${Math.round(overheadAnalysis.totalSolveTimeMs/1000)}s total (${pct.toFixed(1)}%)`);
  row(`  (Captures failed-stage time that attempt-level overhead misses.)`);
  row(`  NOTE: at reduced test budgets, stage-0 exhausts its virtual-time fraction before`);
  row(`  solving hard levels, inflating overhead. At production budget overhead is lower.`);
  if (overheadAnalysis.highOverheadLevels.length > 0) {
    blank();
    row(`High-overhead levels (stages that ran before the winning technique):`);
    row(`  ${'Level'.padEnd(8)} ${'Winning tech'.padEnd(36)} ${'Win attempt'.padEnd(14)} ${'Overhead'.padEnd(12)} Fraction`);
    row(`  ${'─'.repeat(80)}`);
    for (const l of overheadAnalysis.highOverheadLevels.slice(0, 15)) {
      row(`  L${String(l.level).padEnd(6)} ${(l.solvingTech||'?').padEnd(36)} ${(l.winAttemptMs+'ms').padEnd(14)} ${(Math.round(l.overheadMs/1000)+'s').padEnd(12)} ${(l.overheadFraction*100).toFixed(0)}%`);
    }
  }
}

// ── Feature-based breakdown ───────────────────────────────────────────────────
if (featureAnalysis && disableOneAnalysis) {
  h2('PER-FEATURE REGRESSION BREAKDOWN');
  row(`Which techniques matter most for each level feature?`);
  for (const feat of featureAnalysis) {
    blank();
    row(`  Feature: ${feat.feature}  (${feat.levelCount} levels, ${feat.baselineSolved} solved by baseline)`);
    if (feat.featureRegressions.length === 0) {
      row(`    No regressions when any single technique is disabled.`);
    } else {
      for (const r of feat.featureRegressions) {
        row(`    disable-${r.techId}: ${r.regressionCount} regression(s): L${r.regressions.join(', L')}`);
      }
    }
  }
}

// ── Verdict summary ───────────────────────────────────────────────────────────
h2('VERDICT SUMMARY');
blank();
row(`QUESTION: Which techniques can be removed without any regression?`);
if (disableOneAnalysis) {
  const safe = disableOneAnalysis.filter(t => t.verdict === 'REDUNDANT').map(t => t.techId);
  row(safe.length > 0
    ? `  Safe to disable: ${safe.join(', ')}`
    : `  None — every tested technique causes at least one regression when removed.`);
}
blank();
row(`QUESTION: Which technique combination covers the most levels solo?`);
if (soloAnalysis) {
  row(`  Greedy minimum set: ${soloAnalysis.minimumCoveringSet.map(e => e.techId).join(' + ')}`);
  if (soloAnalysis.uncoveredByAnySolo.length > 0) {
    row(`  NOTE: ${soloAnalysis.uncoveredByAnySolo.length} level(s) require multi-technique solving: L${soloAnalysis.uncoveredByAnySolo.join(', L')}`);
  }
}
blank();
row(`QUESTION: Is global budget the bottleneck (vs technique ordering)?`);
if (budgetSweepAnalysis) {
  const highMult = budgetSweepAnalysis.find(pt => pt.multiplier >= 2);
  const baseSolved = budgetSweepAnalysis.find(pt => pt.multiplier === 1.0)?.solvedCount;
  if (highMult && baseSolved != null) {
    if (highMult.newSolves.length > 0) {
      row(`  YES — ×${highMult.multiplier} budget unlocks ${highMult.newSolves.length} additional level(s).`);
    } else {
      row(`  NO — doubling budget does not unlock new solves; technique logic is the bottleneck.`);
    }
  }
}
blank();
row(`QUESTION: Where is solve time wasted?`);
if (overheadAnalysis) {
  const pct = (overheadAnalysis.overheadFraction * 100).toFixed(1);
  row(`  ${pct}% of total solve time is wasted in failed stages before the winning technique.`);
  if (overheadAnalysis.highOverheadLevels.length > 0) {
    const worst = overheadAnalysis.highOverheadLevels[0];
    row(`  Worst case: L${worst.level} wastes ${Math.round(worst.overheadMs/1000)}s in prior stages; ${worst.solvingTech} then solves in ${worst.winAttemptMs}ms.`);
  }
}

blank();
const report = lines.join('\n');

// ─── Output ───────────────────────────────────────────────────────────────────
if (jsonMode) {
  const jsonReport = {
    baseline: baselineAnalysis,
    disableOne: disableOneAnalysis,
    timingImpact: timingImpactAnalysis,
    solo: soloAnalysis,
    budgetSweep: budgetSweepAnalysis,
    techniqueBudget: techniqueBudgetAnalysis,
    overhead: overheadAnalysis,
    byFeature: featureAnalysis,
  };
  console.log(JSON.stringify(jsonReport, null, 2));
} else {
  console.log(report);
}

if (outputPath) {
  await writeFile(outputPath, report + '\n', 'utf8');
  console.log(`\nReport saved to ${outputPath}`);
}
