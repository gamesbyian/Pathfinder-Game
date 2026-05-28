#!/usr/bin/env node
/**
 * Deep ablation analysis — archaeological layer.
 *
 * Where analyze-ablation.mjs asks "does it matter?", this script asks:
 *   - WHY did each technique appear to matter?
 *   - Which techniques are genuinely load-bearing vs historical scar tissue?
 *   - Which are budget artifacts, orchestration artifacts, or classifier over-fires?
 *   - Which technique families duplicate each other?
 *   - Where does the solver route itself badly (orchestration waste)?
 *   - What is the irreducible conceptual core?
 *
 * Guard rails:
 *   - Every aggregate claim is stratified by feature signature to catch Simpson's Paradox.
 *   - Classifications include the evidence and explicit confidence levels.
 *   - Sample-size limitations are called out explicitly.
 *
 * Usage:
 *   node scripts/analyze-ablation-deep.mjs --input-dir=audits/ablation/full-sample
 *   node scripts/analyze-ablation-deep.mjs --input-dir=... --output=audits/ablation/deep-analysis.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--')).map(a => {
  const [k, ...v] = a.split('='); return [k, v.join('=')];
}));

const inputDir = argMap.get('--input-dir');
if (!inputDir || !existsSync(inputDir)) {
  console.error('Usage: node scripts/analyze-ablation-deep.mjs --input-dir=<path>');
  process.exit(1);
}
const outputPath = argMap.get('--output') || null;

async function loadJson(p) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

// ─── Load data ────────────────────────────────────────────────────────────────
const manifest = await loadJson(path.join(inputDir, 'manifest.json'));
if (!manifest) { console.error('manifest.json not found'); process.exit(1); }

const variantData = {};
for (const v of (manifest.variants || [])) {
  const d = await loadJson(path.join(inputDir, v.outputFile));
  if (d) variantData[v.id] = d;
}

console.log(`Loaded ${Object.keys(variantData).length} variants from ${inputDir}`);

const baseline = variantData['baseline'];
const levelNums = manifest.levels || [];
const levelCls = manifest.levelClassifications || {};
const techniques = manifest.techniques || [];
const techPrefixMap = Object.fromEntries(techniques.map(t => [t.id, t.prefix]));

function levelResult(variantId, levelNum) {
  return (variantData[variantId]?.levels || []).find(l => l.level === levelNum) || null;
}

// ─── Build genuine coverage sets from solo variants ───────────────────────────
// Attribution filter: a level is "genuinely" covered only when firstSolvingAttempt
// starts with the technique's own prefix. Anything else = fallback contamination.
const genuineCoverage = {}; // techId -> Set<levelNum>
const genuineTiming = {};   // techId -> Map<levelNum, elapsedMs>

for (const tech of techniques) {
  const v = variantData[`solo-${tech.id}`];
  genuineCoverage[tech.id] = new Set();
  genuineTiming[tech.id] = new Map();
  if (!v) continue;
  for (const l of v.levels || []) {
    const first = l.firstSolvingAttempt || '';
    if (l.ok && first.startsWith(tech.prefix)) {
      genuineCoverage[tech.id].add(l.level);
      genuineTiming[tech.id].set(l.level, l.elapsedMs || 0);
    }
  }
}

// Baseline technique attribution (who solved each level in baseline)
const baselineWinner = {}; // levelNum -> firstSolvingAttempt label
const baselineTiming = {}; // levelNum -> elapsedMs
for (const l of (baseline?.levels || []).filter(l => l.ok)) {
  baselineWinner[l.level] = l.firstSolvingAttempt || null;
  baselineTiming[l.level] = l.elapsedMs || 0;
}

// ─── Feature groupings ────────────────────────────────────────────────────────
const FEATURES = ['hasPortals', 'hasMustCross', 'hasMustPass', 'hasFilters', 'hasFalseGoals', 'multiGate'];
const REQ_INT_BUCKETS = { low: [1, 3], medium: [4, 6], high: [7, 99] };

function reqIntBucket(n) {
  if (n <= 3) return 'low(1-3)';
  if (n <= 6) return 'medium(4-6)';
  return 'high(7+)';
}

function gridBucket(area) {
  if (area <= 81) return 'small(≤9×9)';
  if (area <= 144) return 'medium(10-12×)';
  return 'large(>12×)';
}

// Solvability: levels solvable in baseline
const baselineSolvable = new Set((baseline?.levels || []).filter(l => l.ok).map(l => l.level));

// ─── Report builder ───────────────────────────────────────────────────────────
const lines = [];
const h1 = s => lines.push(`\n${'═'.repeat(72)}\n${s}\n${'═'.repeat(72)}`);
const h2 = s => lines.push(`\n── ${s} ${'─'.repeat(Math.max(0, 68 - s.length - 4))}`);
const h3 = s => lines.push(`\n  ▸ ${s}`);
const row = s => lines.push(s);
const blank = () => lines.push('');

h1('Solver Ablation — Deep Analysis (Archaeological Layer)');
row(`Input:  ${inputDir}`);
row(`Date:   ${manifest.timestamp || 'unknown'}`);
row(`Commit: ${manifest.commitSha?.slice(0, 12) || 'unknown'}`);
row(`Budget: ${manifest.budgetMs}ms × globalBudgetMultiplier (solo = ×2)`);
row(`Levels: ${levelNums.length} (IMPORTANT: small sample — see LIMITATIONS section)`);
blank();
row(`This analysis treats the solver as an evolved organism, not a designed system.`);
row(`Every technique is assumed to be "historical scar tissue" until proven otherwise.`);

// ─── Section 1: Genuine coverage overview ─────────────────────────────────────
h2('GENUINE SOLO COVERAGE (attribution-filtered)');
row(`Coverage counts are attribution-filtered: only levels where firstSolvingAttempt`);
row(`starts with the technique's own prefix are counted. Fallback contamination excluded.`);
blank();
row(`  ${'Technique'.padEnd(36)} ${'Genuine'.padStart(7)}  ${'Coverage'.padStart(8)}  Levels covered`);
row(`  ${'─'.repeat(80)}`);
const sortedTechs = techniques.slice().sort((a, b) =>
  (genuineCoverage[b.id]?.size || 0) - (genuineCoverage[a.id]?.size || 0)
);
for (const t of sortedTechs) {
  const cov = genuineCoverage[t.id];
  const n = cov?.size || 0;
  const total = baselineSolvable.size;
  const pct = total > 0 ? (n / total * 100).toFixed(0) : '?';
  const lvls = cov ? [...cov].sort((a, b) => a - b).map(l => `L${l}`).join(' ') : '';
  row(`  ${t.id.padEnd(36)} ${String(n).padStart(7)}  ${(pct + '%').padStart(8)}  ${lvls}`);
}

// ─── Section 2: Dominated technique pairs ────────────────────────────────────
h2('DOMINATED TECHNIQUE PAIRS');
row(`Technique A is "coverage-dominated" by B if A's genuine coverage ⊆ B's coverage.`);
row(`Coverage-dominated does NOT mean useless — A may still be faster for its levels.`);
row(`Full domination (speed + coverage) requires B to also be faster for all shared levels.`);
blank();

const dominated = []; // { dominated: techId, dominatedBy: techId, type, evidence }

for (const a of techniques) {
  for (const b of techniques) {
    if (a.id === b.id) continue;
    const ca = genuineCoverage[a.id];
    const cb = genuineCoverage[b.id];
    if (!ca || !cb || ca.size === 0) continue;
    if (!isSubset(ca, cb)) continue;

    const sharedLevels = [...ca];
    let bFaster = 0, aFaster = 0;
    for (const lv of sharedLevels) {
      const ta = genuineTiming[a.id]?.get(lv) ?? Infinity;
      const tb = genuineTiming[b.id]?.get(lv) ?? Infinity;
      if (tb < ta) bFaster++;
      else if (ta < tb) aFaster++;
    }
    const type = ca.size === cb.size ? 'equal-coverage' : 'proper-subset';
    dominated.push({ dominated: a.id, dominatedBy: b.id, type, sharedCount: sharedLevels.length, bFaster, aFaster });
  }
}

// Show most interesting pairs: proper subsets where B is faster on majority
const properSubsets = dominated.filter(d => d.type === 'proper-subset' && d.bFaster >= d.sharedCount / 2);
if (properSubsets.length > 0) {
  row(`  Coverage-dominated pairs (A's levels ⊆ B's levels, B faster on majority):`);
  const seen = new Set();
  for (const d of properSubsets) {
    const key = `${d.dominated}→${d.dominatedBy}`;
    if (seen.has(key)) continue; seen.add(key);
    row(`  ${d.dominated.padEnd(36)} ⊆ ${d.dominatedBy.padEnd(36)} B faster: ${d.bFaster}/${d.sharedCount}`);
  }
}
blank();

// Show exact duplicates (equal coverage)
const equalPairs = [];
const seenEqual = new Set();
for (const d of dominated.filter(d => d.type === 'equal-coverage')) {
  const key = [d.dominated, d.dominatedBy].sort().join('|');
  if (!seenEqual.has(key)) {
    seenEqual.add(key);
    equalPairs.push(d);
  }
}
if (equalPairs.length > 0) {
  row(`  Exact coverage duplicates (same genuine coverage set — ${equalPairs.length / 2} pairs):`);
  const seenGrouped = new Set();
  for (const d of equalPairs) {
    const key = [...genuineCoverage[d.dominated]].sort().join(',');
    if (!seenGrouped.has(key)) {
      seenGrouped.add(key);
      const sameGroup = techniques.filter(t => {
        const other = genuineCoverage[t.id];
        if (!other || other.size !== genuineCoverage[d.dominated].size) return false;
        return isSubset(other, genuineCoverage[d.dominated]) && isSubset(genuineCoverage[d.dominated], other);
      }).map(t => t.id);
      const levels = [...genuineCoverage[d.dominated]].sort((a, b) => a - b).map(l => `L${l}`).join(' ');
      row(`    Cluster: { ${sameGroup.join(', ')} }  →  levels: ${levels}`);
    }
  }
}

// ─── Section 3: Feature-stratified coverage matrix ───────────────────────────
h2('FEATURE-STRATIFIED COVERAGE MATRIX');
row(`For each technique, genuine solo coverage rate broken down by level feature.`);
row(`Simpson's Paradox risk: flagged when subgroup rate differs strongly from aggregate.`);
blank();

for (const tech of sortedTechs.filter(t => (genuineCoverage[t.id]?.size || 0) > 0)) {
  const cov = genuineCoverage[tech.id];
  const totalSolvable = baselineSolvable.size;
  const aggregate = cov.size / totalSolvable;

  const lines2 = [];

  // Boolean features
  for (const feat of FEATURES) {
    const withFeat = levelNums.filter(n => levelCls[n]?.[feat] && baselineSolvable.has(n));
    const withoutFeat = levelNums.filter(n => !levelCls[n]?.[feat] && baselineSolvable.has(n));
    if (withFeat.length < 2 && withoutFeat.length < 2) continue;
    const covWith = withFeat.filter(n => cov.has(n)).length / Math.max(1, withFeat.length);
    const covWithout = withoutFeat.filter(n => cov.has(n)).length / Math.max(1, withoutFeat.length);
    const diff = Math.abs(covWith - covWithout);
    const risk = diff >= 0.5 ? 'SIMPSON-RISK' : diff >= 0.3 ? 'notable' : '';
    if (diff >= 0.2 || withFeat.length === 0 || withoutFeat.length === 0) {
      lines2.push(`    ${feat.padEnd(20)} ${feat}=Y: ${pct(covWith, withFeat.length)} (${withFeat.length}lv)  ${feat}=N: ${pct(covWithout, withoutFeat.length)} (${withoutFeat.length}lv)  ${risk}`);
    }
  }

  // reqInt bucket
  const reqIntGroups = {};
  for (const n of levelNums.filter(n => baselineSolvable.has(n))) {
    const bucket = reqIntBucket(levelCls[n]?.reqInt || 1);
    if (!reqIntGroups[bucket]) reqIntGroups[bucket] = [];
    reqIntGroups[bucket].push(n);
  }
  for (const [bucket, levels] of Object.entries(reqIntGroups)) {
    if (levels.length < 2) continue;
    const covRate = levels.filter(n => cov.has(n)).length / levels.length;
    const diff = Math.abs(covRate - aggregate);
    if (diff >= 0.25) {
      const risk = diff >= 0.5 ? 'SIMPSON-RISK' : 'notable';
      lines2.push(`    reqInt=${bucket.padEnd(14)} ${pct(covRate, levels.length)} (${levels.length}lv)  ${risk}`);
    }
  }

  if (lines2.length > 0) {
    row(`  ${tech.id}  (${cov.size}/${totalSolvable} aggregate = ${(aggregate * 100).toFixed(0)}%)`);
    for (const l of lines2) row(l);
  }
}

// ─── Section 4: Orchestration overhead analysis ───────────────────────────────
h2('ORCHESTRATION OVERHEAD ANALYSIS');
row(`For each level, the true overhead = total elapsed − winning attempt elapsed.`);
row(`This measures time wasted running earlier stages/attempts before the winner.`);
row(`NOTE: attemptSummary only captures the WINNING stage's attempts. Cross-stage`);
row(`overhead (stage-0 failure → stage-2 winner) is not decomposed in current data.`);
blank();

// Compute per-level cascade interpretation
const slowLevels = (baseline?.levels || [])
  .filter(l => l.ok)
  .map(l => {
    const winner = (l.attemptSummary || []).find(a => a.solved);
    const winMs = winner?.elapsedMs || 0;
    const trueOverhead = Math.max(0, (l.elapsedMs || 0) - winMs);
    const overheadFraction = l.elapsedMs > 0 ? trueOverhead / l.elapsedMs : 0;

    // Infer the "stage" the winner is in based on its label prefix
    const winLabel = l.firstSolvingAttempt || '';
    const winnerStage = winLabel.startsWith('template') ? 'stage-2-template'
      : winLabel.startsWith('archetype') ? 'stage-2-archetype'
      : 'stage-0-structural';

    // If winner is in stage-2, the overhead is from stage-0 structural failures
    const overheadSource = winnerStage !== 'stage-0-structural'
      ? `stage-0 structural exhausted budget before ${winnerStage} ran`
      : 'intra-stage overhead (prior attempts within stage-0)';

    return { level: l.level, total: l.elapsedMs || 0, winMs, trueOverhead, overheadFraction, winLabel, winnerStage, overheadSource };
  })
  .filter(l => l.trueOverhead > 500)
  .sort((a, b) => b.trueOverhead - a.trueOverhead);

if (slowLevels.length > 0) {
  row(`  ${'Level'.padEnd(6)} ${'Winner'.padEnd(48)} ${'Overhead'.padEnd(10)} ${'Fraction'.padEnd(10)} Interpretation`);
  row(`  ${'─'.repeat(100)}`);
  for (const l of slowLevels) {
    const cls = levelCls[l.level] || {};
    const sig = `ri=${cls.reqInt||'?'} p=${cls.hasPortals?'Y':'N'} mc=${cls.hasMustCross?'Y':'N'}`;
    row(`  L${String(l.level).padEnd(4)} ${l.winLabel.padEnd(48)} ${(Math.round(l.trueOverhead/1000)+'s').padEnd(10)} ${(l.overheadFraction*100).toFixed(0).padEnd(9)}%  ${sig}`);
    row(`         → ${l.overheadSource}`);
  }
  blank();

  // Total orchestration waste
  const totalOverhead = slowLevels.reduce((s, l) => s + l.trueOverhead, 0);
  const allLevelTotal = (baseline?.levels || []).filter(l => l.ok).reduce((s, l) => s + (l.elapsedMs || 0), 0);
  row(`  Total wasted time (stage-0 failures before stage-2 winner): ${Math.round(totalOverhead/1000)}s / ${Math.round(allLevelTotal/1000)}s total (${(totalOverhead/allLevelTotal*100).toFixed(0)}%)`);
  row(`  If the winning technique had run FIRST for those levels, solve time would drop ~${Math.round(totalOverhead/1000)}s.`);
}

// ─── Section 5: Budget artifact hypothesis ────────────────────────────────────
h2('BUDGET ARTIFACT HYPOTHESIS');
row(`A technique is a "budget artifact" if its genuine solo coverage at 2× budget`);
row(`matches what structural methods cover when present at 1× budget.`);
row(`i.e., the technique isn't genuinely different — it's structural with more time.`);
blank();

const structuralCoverage1x = genuineCoverage['structural-conservative']; // best coverage at 2×
// At 1× budget in baseline, which levels are solvable?
const disableStructuralModernCoverage = new Set(
  (variantData['disable-structural-modern']?.levels || []).filter(l => l.ok).map(l => l.level)
);
const disableStructuralConservativeCoverage = new Set(
  (variantData['disable-structural-conservative']?.levels || []).filter(l => l.ok).map(l => l.level)
);

row(`  Techniques compared against structural-conservative as the budget-reference method.`);
row(`  Structural-modern and structural-conservative are the reference; excluded from this table.`);
blank();
for (const tech of techniques) {
  const cov = genuineCoverage[tech.id];
  if (!cov || cov.size === 0) continue;
  if (tech.id === 'structural-modern' || tech.id === 'structural-conservative') continue;

  // Check overlap with structural-conservative genuine coverage at 2×
  const overlapWithSC = [...cov].filter(l => structuralCoverage1x?.has(l)).length;
  const overlapFraction = cov.size > 0 ? overlapWithSC / cov.size : 0;

  // Check if removing this technique from baseline reveals it was needed for any level
  const disableVariant = variantData[`disable-${tech.id}`];
  const regressions = disableVariant
    ? (disableVariant.levels || []).filter(l => !l.ok && baselineSolvable.has(l.level)).length
    : null;

  // Classify
  let hypothesis = '';
  if (regressions === 0 && overlapFraction >= 0.9) {
    hypothesis = 'BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled';
  } else if (regressions === 0 && overlapFraction >= 0.6) {
    hypothesis = 'BUDGET ARTIFACT (medium confidence) — partial overlap with structural; no regressions';
  } else if (regressions > 0) {
    hypothesis = `NOT a pure budget artifact — causes ${regressions} regression(s) when disabled`;
  } else if (cov.size === 0) {
    hypothesis = 'N/A — no genuine solo coverage';
  } else {
    hypothesis = 'UNCLEAR — insufficient data';
  }

  row(`  ${tech.id.padEnd(36)} solo=${cov.size}lv  SC-overlap=${(overlapFraction*100).toFixed(0)}%  regressions=${regressions ?? 'N/A'}  → ${hypothesis}`);
}
blank();
row(`  Note: SC-overlap measures what % of T's genuine solo coverage is ALSO`);
row(`  covered by structural-conservative alone. High overlap = T adds nothing new.`);
row(`  "No regressions when disabled" = structural methods cover T's levels at 1× budget.`);

// ─── Section 6: Technique classification ─────────────────────────────────────
h2('TECHNIQUE CLASSIFICATION TAXONOMY');
row(`Classifications with supporting evidence. Confidence = Low/Medium/High.`);
row(`Multiple classifications possible for one technique.`);
blank();

const classifications = computeClassifications();

for (const [techId, cls] of Object.entries(classifications)) {
  row(`  ${techId}`);
  for (const c of cls) {
    row(`    [${c.label.padEnd(28)}] ${c.confidence.padEnd(6)} | ${c.evidence}`);
  }
}

// ─── Section 7: Orchestration architecture analysis ──────────────────────────
h2('ORCHESTRATION ARCHITECTURE ANALYSIS');
row(`Policy: how a strategy searches. Orchestration: when/why strategies run.`);
row(`Fallback architecture: what happens after failure.`);
blank();

h3('Stage routing correctness');
// For each level, does the baseline route it through the right stage first?
const routingWaste = [];
for (const l of (baseline?.levels || []).filter(l => l.ok)) {
  const winner = l.firstSolvingAttempt || '';
  const winnerStage = winner.startsWith('template') || winner.startsWith('archetype') ? 2 : 0;
  if (winnerStage === 2 && l.elapsedMs > 1000) {
    const disableResult = levelResult('disable-archetype', l.level);
    const withoutArchMs = disableResult?.elapsedMs || null;
    const structuralWouldHaveWon = disableResult?.ok && withoutArchMs < l.elapsedMs;
    if (structuralWouldHaveWon && withoutArchMs && withoutArchMs < l.elapsedMs * 0.5) {
      routingWaste.push({
        level: l.level,
        baseMs: l.elapsedMs,
        altMs: withoutArchMs,
        winnerLabel: winner,
        speedup: l.elapsedMs / withoutArchMs,
      });
    }
  }
}
if (routingWaste.length > 0) {
  row(`  Levels where routing to stage-2 is SLOWER than staying in stage-0:`);
  for (const r of routingWaste) {
    row(`    L${r.level}: ${Math.round(r.baseMs)}ms (via ${r.winnerLabel.slice(0, 40)}) vs ${r.altMs}ms structural (${r.speedup.toFixed(1)}× slower)`);
  }
  row(`  → These levels are "misclassified" — the archetype classifier fires but structural is faster.`);
  row(`  → The classifier is over-broad; tighten it to avoid routing these levels to stage-2.`);
} else {
  row(`  No levels found where stage-2 routing was provably worse than stage-0.`);
}

h3('Fallback architecture redundancy');
// How many "solo" techniques add nothing beyond structural-conservative?
const soloTechsWithoutUniqueCoverage = techniques.filter(t => {
  const cov = genuineCoverage[t.id];
  if (!cov || cov.size === 0) return false;
  if (t.id === 'structural-conservative') return false;
  // All levels in cov are also in SC's coverage
  return [...cov].every(l => structuralCoverage1x?.has(l));
}).map(t => t.id);

row(`\n  Techniques with zero unique coverage (all their levels also covered by structural-conservative):`);
row(`    { ${soloTechsWithoutUniqueCoverage.join(', ') || 'none'} }`);
row(`  These techniques are purely fallback insurance for when structural methods are too slow.`);
row(`  Their presence in the plan adds orchestration complexity without adding correctness guarantees.`);

h3('Budget allocation efficiency');
const budgetSweep = manifest.variants?.filter(v => v.id.startsWith('budget-')) || [];
if (budgetSweep.length > 0) {
  row(`\n  Budget sweep results (all techniques, global multiplier):`);
  for (const bv of budgetSweep.sort((a, b) => (a.config?.globalBudgetMultiplier || 1) - (b.config?.globalBudgetMultiplier || 1))) {
    const d = variantData[bv.id];
    if (!d) continue;
    const solved = (d.levels || []).filter(l => l.ok).length;
    const mult = bv.config?.globalBudgetMultiplier || '?';
    row(`    ×${mult}: ${solved}/${levelNums.length} solved`);
  }
  row(`  → Budget is NOT the coverage bottleneck above 0.5×. The failure (L92 at 0.25×) is`);
  row(`    structural: archetype needs enough time to explore the constrained portal+mustCross search.`);
  row(`    Doubling or quadrupling budget does not unlock new levels beyond 0.5×.`);
}

// ─── Section 8: What the sample CANNOT tell us ───────────────────────────────
h2('SAMPLE LIMITATIONS — WHAT THIS DATA CANNOT ANSWER');
blank();
row(`This sample contains ${levelNums.length} levels. The full game has 140+. Many conclusions below`);
row(`carry high Simpson's Paradox risk and MUST be re-evaluated on a larger, stratified sample.`);
blank();

const limitations = [
  {
    claim: 'portal-optional-{modern,endurance,perimeter} are always triplicate-redundant',
    risk: 'HIGH',
    reason: `Only 2 portal levels in sample both have portals+reqInt≤6. These techniques may cover `
           + `different portal level sub-types (high-reqInt portals, portal-only-path levels, etc.) `
           + `in the full 140-level set. The identical {108,130} coverage is likely coincidence.`
  },
  {
    claim: 'must-cross-horizon is always a budget artifact',
    risk: 'MEDIUM',
    reason: `The 7 mustCross levels in sample include only 1 that archetype-type handles (L92). `
           + `There may be mustCross levels in 140-level set where MCH is faster than structural `
           + `by a large margin, or where structural fails at production budget.`
  },
  {
    claim: 'template is redundant (covered by SC)',
    risk: 'MEDIUM',
    reason: `Only 1 longpath level (L50, reqLen=34, reqInt=3) in sample. Template passes may be `
           + `uniquely essential for high-reqLen, low-reqInt levels where greedy structural methods `
           + `get trapped by local optima. Need more longpath levels.`
  },
  {
    claim: 'endurance-longpath is identical to template',
    risk: 'HIGH',
    reason: `Both cover only L50 in this sample. They may cover completely different level types `
           + `across the full game. endurance-longpath targets portal-heavy/high-objectives levels.`
  },
  {
    claim: 'archetype is essential only for L92-type levels',
    risk: 'MEDIUM',
    reason: `L92 is the only portals+mustCross+reqInt≥8 level in sample. In 140-level set, there `
           + `may be many such levels, making archetype more broadly essential.`
  },
  {
    claim: 'structural-conservative dominates all other techniques',
    risk: 'LOW',
    reason: `The 9/10 solo coverage is robust: SC is a fundamentally different algorithm `
           + `(harvestThenFinish vs perimeterSweep). Its advantage may not hold for all level types.`
  }
];

for (const lim of limitations) {
  row(`  [${lim.risk}-RISK] Claim: "${lim.claim}"`);
  row(`  Caveat: ${lim.reason}`);
  blank();
}

// ─── Section 9: Recommended next experiments ─────────────────────────────────
h2('RECOMMENDED NEXT EXPERIMENTS');
blank();

const experiments = [
  {
    priority: 1,
    name: '140-level baseline + full attribution analysis',
    goal: 'Understand the true distribution of technique usage across the game.',
    action: 'Run baseline on all 140 levels. Compute: which technique solves each level? '
          + 'Build distribution by (portals, mustCross, reqInt-bucket, gridArea-bucket). '
          + 'Identify natural level clusters for stratified ablation.',
    command: 'node scripts/solver-ablation.mjs --experiment=baseline --levels=all --output-dir=audits/ablation/baseline-140'
  },
  {
    priority: 2,
    name: 'Stratified 50-level disable-one ablation',
    goal: 'Get statistically meaningful regressions per technique, per feature subgroup.',
    action: 'Sample 5+ levels per feature bucket (portals×Y/N, mustCross×Y/N, reqInt-bucket×3). '
          + 'Run disable-one on this stratified sample. '
          + 'This reveals Simpson\'s Paradox hiding in the 10-level aggregate.',
    command: 'node scripts/solver-ablation.mjs --experiment=disable-one --levels=<stratified-50> --output-dir=audits/ablation/stratified-50'
  },
  {
    priority: 3,
    name: 'Per-technique budget scaling (technique-budget experiment)',
    goal: 'Determine which techniques are "budget artifacts" — just structural with more time.',
    action: 'For each technique T, run solo-T at 0.5×, 1×, 2×, 4×, 8× budget. '
          + 'If T\'s coverage at 2× is identical to structural-conservative at 1×, T is a budget artifact. '
          + 'Focus on: MCH, portal-optional-*, template, endurance-longpath.',
    command: 'node scripts/solver-ablation.mjs --experiment=technique-budget --output-dir=audits/ablation/tech-budget'
  },
  {
    priority: 4,
    name: 'Archetype classifier tightening validation',
    goal: 'Confirm narrowing high-intersection-burden to require portals OR mustCross removes L139 false fires.',
    action: 'Run baseline with modified classifier. Verify: L92 still solved, L139 faster, no new regressions.',
    command: '(Requires Solver.js modification + targeted re-run)'
  },
  {
    priority: 5,
    name: 'Synthetic "gap level" generation',
    goal: 'Find levels where each "apparently-redundant" technique is uniquely essential.',
    action: 'Generate synthetic levels that maximize the expected activation condition for each technique. '
          + 'E.g., portal-optional-perimeter targets: portals + openness≥0.52 + structural-modern failure. '
          + 'If no synthetic level can activate the technique uniquely, it may be truly redundant.',
    command: '(Requires synthetic level generator)'
  }
];

for (const exp of experiments) {
  row(`  ${exp.priority}. ${exp.name}`);
  row(`     Goal: ${exp.goal}`);
  row(`     Action: ${exp.action}`);
  if (exp.command && !exp.command.startsWith('(')) row(`     Command: ${exp.command}`);
  blank();
}

// ─── Section 10: Conceptual core summary ──────────────────────────────────────
h2('CONCEPTUAL CORE SUMMARY');
blank();
row(`Based on this ${levelNums.length}-level sample (SUBJECT TO REVISION with larger data):`);
blank();

const uniqueCovTechs = techniques.filter(t => {
  const cov = genuineCoverage[t.id];
  if (!cov || cov.size === 0) return false;
  // Unique = covers at least one level not covered by structural-conservative
  return [...cov].some(l => !structuralCoverage1x?.has(l));
});

const baselineTimes2 = Object.fromEntries((baseline?.levels || []).map(l => [l.level, l.elapsedMs || 0]));
const timingDeltaByTech = (techId) => {
  const d = variantData[`disable-${techId}`];
  if (!d) return 0;
  return (d.levels || []).filter(l => l.ok)
    .reduce((s, l) => s + ((l.elapsedMs || 0) - (baselineTimes2[l.level] || 0)), 0);
};

const speedCriticalTechs = techniques.filter(t => {
  if (uniqueCovTechs.some(u => u.id === t.id)) return false;
  return timingDeltaByTech(t.id) > 15000;
});
const speedContributingTechs = techniques.filter(t => {
  if (uniqueCovTechs.some(u => u.id === t.id)) return false;
  if (speedCriticalTechs.some(u => u.id === t.id)) return false;
  return timingDeltaByTech(t.id) > 500;
});

row(`  Load-bearing (unique coverage or causes regressions when disabled):`);
row(`    ${uniqueCovTechs.map(t => {
  const unique = [...(genuineCoverage[t.id]||[])].filter(l => !structuralCoverage1x?.has(l));
  return `${t.id}  [${genuineCoverage[t.id]?.size || 0}lv total, ${unique.length} uniquely covered: ${unique.map(l=>'L'+l).join(',')||'none'}]`;
}).join('\n    ') || 'none found'}`);
blank();
row(`  Speed-critical (removing costs >15s; no unique coverage):`);
row(`    ${speedCriticalTechs.map(t => `${t.id} (+${Math.round(timingDeltaByTech(t.id)/1000)}s)`).join(', ') || 'none'}`);
blank();
row(`  Speed-contributing (removing costs 0.5-15s):`);
row(`    ${speedContributingTechs.map(t => `${t.id} (+${Math.round(timingDeltaByTech(t.id)/1000)}s)`).join(', ') || 'none'}`);
blank();
row(`  Apparent scar tissue (no unique coverage, no regressions when disabled, minimal timing impact):`);
const scarTechs = techniques.filter(t => {
  if (uniqueCovTechs.some(u => u.id === t.id)) return false;
  if (speedCriticalTechs.some(u => u.id === t.id)) return false;
  if (speedContributingTechs.some(u => u.id === t.id)) return false;
  const disableRow = variantData[`disable-${t.id}`];
  const regressions = disableRow ? (disableRow.levels || []).filter(l => !l.ok && baselineSolvable.has(l.level)).length : 0;
  return regressions === 0;
});
row(`    ${scarTechs.map(t => t.id).join(', ') || 'none'}`);
blank();
row(`  IMPORTANT: "Apparent scar tissue" requires verification on 140-level data.`);
row(`  A technique covering 0 levels in a 10-level sample may cover many in the full game.`);

// ─── Section: Disable-one fallback chains ────────────────────────────────────
h2('DISABLE-ONE FALLBACK CHAINS');
row(`For each disable-one variant: which levels changed winner? When technique T is disabled,`);
row(`which technique steps in? This reveals the fallback dependency graph.`);
blank();

// Group technique prefix to short name
function techShortName(label) {
  if (!label) return 'none';
  if (label.startsWith('structural-modern')) return 'SM';
  if (label.startsWith('structural-conservative')) return 'SC';
  if (label.startsWith('template')) return 'TPL';
  if (label.startsWith('portal-optional-modern')) return 'POM';
  if (label.startsWith('portal-optional-endurance')) return 'POE';
  if (label.startsWith('portal-optional-perimeter')) return 'POP';
  if (label.startsWith('must-cross-horizon')) return 'MCH';
  if (label.startsWith('endurance-longpath')) return 'ELP';
  if (label.startsWith('archetype')) return 'ARC';
  return label.slice(0, 6);
}

const disableVariants = techniques.filter(t => variantData[`disable-${t.id}`]);

for (const tech of disableVariants) {
  const v = variantData[`disable-${tech.id}`];
  if (!v) continue;

  const failures = (v.levels || []).filter(l => !l.ok && baselineSolvable.has(l.level));
  const changed = (v.levels || []).filter(l => {
    if (!l.ok) return false;
    const base = baselineWinner[l.level];
    const now = l.firstSolvingAttempt || '';
    // Safety valve suspect: disabled technique still "won"
    return base !== now;
  });
  const safetyValveSuspect = (v.levels || []).filter(l => {
    if (!l.ok) return false;
    const now = l.firstSolvingAttempt || '';
    return now.startsWith(tech.prefix);
  });

  // Fallback distribution: when tech disabled, what won instead?
  const fallbackDist = new Map();
  for (const l of changed) {
    const sn = techShortName(l.firstSolvingAttempt);
    fallbackDist.set(sn, (fallbackDist.get(sn) || 0) + 1);
  }
  const fallbackStr = [...fallbackDist.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(' ');

  row(`  disable-${tech.id.padEnd(30)}`);
  row(`    Failures: ${failures.length}  ${failures.length > 0 ? failures.map(l => `L${l.level}`).join(' ') : ''}`);
  row(`    Changed winner: ${changed.length}  Fallbacks: ${fallbackStr || 'none'}`);
  if (safetyValveSuspect.length > 0) {
    row(`    Safety-valve suspects: ${safetyValveSuspect.map(l => `L${l.level}`).join(' ')} — technique disabled but still won (plan was single-technique)`);
  }
  // Speed delta for changed levels
  const speedDelta = changed.reduce((s, l) => {
    const base = baselineTiming[l.level] || 0;
    return s + (l.elapsedMs || 0) - base;
  }, 0);
  if (changed.length > 0) {
    const avgDelta = speedDelta / changed.length;
    row(`    Speed on changed levels: ${speedDelta >= 0 ? '+' : ''}${Math.round(speedDelta / 1000)}s total, ${speedDelta >= 0 ? '+' : ''}${Math.round(avgDelta)}ms avg`);
  }
  blank();
}

// ─── Section: Technique interaction matrix ────────────────────────────────────
h2('TECHNIQUE INTERACTION MATRIX');
row(`When technique ROW is disabled, how many levels fall to technique COL?`);
row(`Read across: ROW's fallback distribution. Read down: COL's pickup coverage.`);
blank();

const techShorts = techniques.map(t => techShortName(t.prefix + '-x'));
const header = `  ${'Disabled'.padEnd(10)} ` + techShorts.map(s => s.padStart(5)).join(' ') + '  FAIL';
row(header);
row(`  ${'─'.repeat(header.length)}`);

for (const disabledTech of techniques) {
  const v = variantData[`disable-${disabledTech.id}`];
  if (!v) continue;
  const counts = new Map(techniques.map(t => [techShortName(t.prefix + '-x'), 0]));
  let failCount = 0;
  for (const l of (v.levels || [])) {
    if (!baselineSolvable.has(l.level)) continue;
    if (!l.ok) { failCount++; continue; }
    const sn = techShortName(l.firstSolvingAttempt);
    if (counts.has(sn)) counts.set(sn, counts.get(sn) + 1);
  }
  const cols = techShorts.map(s => String(counts.get(s) || '').padStart(5)).join(' ');
  row(`  ${techShortName(disabledTech.prefix + '-x').padEnd(10)} ${cols}  ${String(failCount).padStart(4)}`);
}
blank();

// ─── Output ───────────────────────────────────────────────────────────────────
const report = lines.join('\n') + '\n';
console.log(report);

if (outputPath) {
  await writeFile(outputPath, report, 'utf8');
  console.error(`Report saved to ${outputPath}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSubset(setA, setB) {
  for (const el of setA) if (!setB.has(el)) return false;
  return true;
}

function pct(rate, n) {
  return `${(rate * 100).toFixed(0)}%`;
}

function computeClassifications() {
  const result = {};
  for (const tech of techniques) {
    const cls = [];
    const cov = genuineCoverage[tech.id];
    const disableRow = variantData[`disable-${tech.id}`];
    const regressions = disableRow
      ? (disableRow.levels || []).filter(l => !l.ok && baselineSolvable.has(l.level)).map(l => l.level)
      : [];
    const hasSolo = cov && cov.size > 0;
    const isRequiredForCoverage = regressions.length > 0;
    const uniqueLevels = cov ? [...cov].filter(l => !structuralCoverage1x?.has(l)) : [];
    const hasUniqueCoverage = uniqueLevels.length > 0;

    // Timing impact when disabled
    const baselineTimes = Object.fromEntries((baseline?.levels || []).map(l => [l.level, l.elapsedMs || 0]));
    const timingDeltaMs = (disableRow?.levels || [])
      .filter(l => l.ok)
      .reduce((s, l) => s + ((l.elapsedMs || 0) - (baselineTimes[l.level] || 0)), 0);

    if (isRequiredForCoverage && hasUniqueCoverage) {
      cls.push({ label: 'INDISPENSABLE', confidence: 'High', evidence: `Causes ${regressions.length} regression(s): L${regressions.join(', L')}; unique coverage: L${uniqueLevels.join(', L')}` });
    } else if (isRequiredForCoverage) {
      cls.push({ label: 'INDISPENSABLE', confidence: 'Medium', evidence: `Causes ${regressions.length} regression(s) but coverage not provably unique on this sample` });
    }

    if (!isRequiredForCoverage && timingDeltaMs > 15000) {
      cls.push({ label: 'SPEED-CRITICAL', confidence: 'High', evidence: `+${Math.round(timingDeltaMs/1000)}s total overhead when disabled; no coverage regressions` });
    } else if (!isRequiredForCoverage && timingDeltaMs > 3000) {
      cls.push({ label: 'SPEED-CONTRIBUTING', confidence: 'Medium', evidence: `+${Math.round(timingDeltaMs/1000)}s total overhead when disabled` });
    } else if (!isRequiredForCoverage && timingDeltaMs > 500) {
      cls.push({ label: 'SPEED-MARGINAL', confidence: 'Low', evidence: `+${Math.round(timingDeltaMs/1000)}s timing delta — within noise range at this sample size` });
    }

    if (hasSolo && !isRequiredForCoverage
        && tech.id !== 'structural-conservative' && tech.id !== 'structural-modern') {
      // Budget artifact: all this technique's solo levels are already covered by the primary
      // structural method (SC). i.e., SC makes this technique redundant when it has enough time.
      const coveredByCC = cov ? [...cov].every(l => structuralCoverage1x?.has(l)) : false;
      if (coveredByCC && regressions.length === 0) {
        cls.push({ label: 'BUDGET-ARTIFACT (hypothesis)', confidence: 'Medium', evidence: `All ${cov.size} solo levels covered by structural-conservative at 2×; 0 regressions when disabled` });
      }
    }

    // Feature-specific: coverage concentrated in a feature subgroup
    for (const feat of FEATURES) {
      const withFeat = levelNums.filter(n => levelCls[n]?.[feat] && baselineSolvable.has(n));
      const withoutFeat = levelNums.filter(n => !levelCls[n]?.[feat] && baselineSolvable.has(n));
      if (!cov || withFeat.length === 0 || withoutFeat.length === 0) continue;
      const covWith = withFeat.filter(n => cov.has(n)).length / withFeat.length;
      const covWithout = withoutFeat.filter(n => cov.has(n)).length / withoutFeat.length;
      if (covWith >= 0.7 && covWithout <= 0.2) {
        cls.push({ label: 'FEATURE-SPECIFIC', confidence: 'Medium', evidence: `${feat}=Y: ${pct(covWith, 0)} vs ${feat}=N: ${pct(covWithout, 0)} coverage — concentrated in ${feat} levels` });
      }
    }

    // Orchestration artifact: wins mainly after stage-0 exhausted budget
    const archetypeEfficiency = (baseline?.levels || [])
      .filter(l => l.ok && (l.firstSolvingAttempt || '').startsWith(tech.prefix))
      .map(l => {
        const winMs = (l.attemptSummary || []).find(a => a.solved)?.elapsedMs || 0;
        const overhead = Math.max(0, (l.elapsedMs || 0) - winMs);
        return overhead / (l.elapsedMs || 1);
      });
    if (archetypeEfficiency.length > 0) {
      const avgOverhead = archetypeEfficiency.reduce((s, v) => s + v, 0) / archetypeEfficiency.length;
      if (avgOverhead > 0.7) {
        cls.push({ label: 'ORCHESTRATION-ARTIFACT (risk)', confidence: 'Low', evidence: `Avg ${(avgOverhead*100).toFixed(0)}% of solve time is pre-winner overhead; runs after stage-0 fails` });
      }
    }

    if (cls.length === 0) {
      if (!hasSolo) {
        cls.push({ label: 'UNKNOWN / ZERO-COVERAGE', confidence: 'N/A', evidence: 'No solo data or 0 genuine solo solves on this sample' });
      } else {
        cls.push({ label: 'REDUNDANT (on this sample)', confidence: 'Low', evidence: `${cov?.size || 0} genuine solo solves, all covered by structural-conservative, no regressions` });
      }
    }

    result[tech.id] = cls;
  }
  return result;
}
