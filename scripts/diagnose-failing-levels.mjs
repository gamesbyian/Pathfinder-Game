#!/usr/bin/env node
/**
 * Diagnostic: replay hint paths for the 3 persistently failing levels (92, 108, 134)
 * and compare the solver's actual search behaviour against what the known-good
 * solutions require.
 *
 * Runs entirely from the level data + audit file — no solver invocation needed.
 * The solver itself remains untouched.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root  = path.resolve(__dir, '..');

// ─── key helpers ──────────────────────────────────────────────────────────────
// Keys are packed as:  key = x0 | (y0 << 16),  where x0 = x-1, y0 = y-1
// (JSON coords are 1-based; key coords are 0-based)
const keyX  = k => k & 0xFFFF;
const keyY  = k => (k >>> 16) & 0xFFFF;
const toKey = (x1, y1) => (x1 - 1) | ((y1 - 1) << 16);
const fmt   = k => `(${keyX(k)+1},${keyY(k)+1})`;   // back to 1-based for display

// ─── load level data ──────────────────────────────────────────────────────────
async function loadLevels() {
  const src1 = await readFile(path.join(root, 'levels.js'),  'utf8');
  const src2 = await readFile(path.join(root, 'levels2.js'), 'utf8');

  // Both files assign to window.RAW_LEVELS — eval with a fake window
  const window = {};
  // eslint-disable-next-line no-new-func
  new Function('window', src1)(window);
  const levels1 = window.RAW_LEVELS || [];
  window.RAW_LEVELS = null;
  // eslint-disable-next-line no-new-func
  new Function('window', src2)(window);
  const levels2 = window.RAW_LEVELS || [];

  // Combine: levels.js = 1-68, levels2.js = 69-137 (1-indexed)
  return [...levels1, ...levels2];   // index 0 = level 1
}

// ─── load latest audit ────────────────────────────────────────────────────────
async function loadAudit() {
  const raw = await readFile(path.join(root, 'audits/raw/latest.json'), 'utf8');
  const data = JSON.parse(raw);
  const map = new Map();
  for (const row of data.levels ?? []) map.set(Number(row.level), row);
  return map;
}

// ─── trace a single hint path ─────────────────────────────────────────────────
function tracePath(hintPath, level, hintIndex) {
  const reqLen = level.reqLen ?? hintPath.length - 1;
  const reqInt = level.reqInt ?? 0;

  const blockSet = new Set((level.blocks ?? []).map(b => toKey(b.x, b.y)));

  // Build portal map (key → exit key, bidirectional)
  const portalMap = new Map();
  for (const p of level.portals ?? []) {
    const a = toKey(p.x1, p.y1);
    const b = toKey(p.x2, p.y2);
    portalMap.set(a, b);
    portalMap.set(b, a);
  }

  const visited   = new Map();   // key → first visit step index
  const events    = [];          // { step, type, key, detail }
  let   ints      = 0;
  let   portJumps = 0;

  for (let i = 0; i < hintPath.length; i++) {
    const key = hintPath[i];
    const isPrev = i > 0 && key === hintPath[i - 1];  // same as last (shouldn't happen)

    // Detect portal teleport: consecutive keys that are not adjacent on the grid
    if (i > 0) {
      const prev = hintPath[i - 1];
      const dx   = Math.abs(keyX(key) - keyX(prev));
      const dy   = Math.abs(keyY(key) - keyY(prev));
      if (dx + dy > 1) {
        // non-adjacent step → this is a portal landing
        portJumps++;
        events.push({ step: i, type: 'portal', key, from: prev,
                      detail: `PORTAL: ${fmt(prev)} → ${fmt(key)}` });
      }
    }

    if (visited.has(key)) {
      ints++;
      const firstStep = visited.get(key);
      events.push({
        step: i, type: 'intersection', key,
        detail: `INTERSECTION #${ints}: revisit ${fmt(key)} (first at step ${firstStep}), ` +
                `depth=${i}/${reqLen}, ints now ${ints}/${reqInt}, ` +
                `remaining budget=${reqLen - i}, remaining ints needed=${reqInt - ints}`
      });
    } else {
      visited.set(key, i);
    }
  }

  // Summary of when intersections land relative to total budget
  const intSteps = events.filter(e => e.type === 'intersection').map(e => e.step);

  return {
    pathLen     : hintPath.length,
    reqLen,
    reqInt,
    actualInts  : ints,
    portalJumps : portJumps,
    intSteps,
    events,
    visited,
  };
}

// ─── analyse the solver's frontier from the audit ────────────────────────────
function analyseFrontier(auditRow) {
  if (!auditRow) return null;

  const out = { attempts: [] };
  for (const att of auditRow.attempts ?? []) {
    const diag    = att.timeoutDiagnostics ?? {};
    const intDist = diag.frontierInteractionDeficitDistribution ?? {};
    const mpDist  = diag.frontierMustPassDistribution ?? {};

    // The "interaction deficit" = intersections still needed by each frontier state
    const totalFrontierStates = Object.values(intDist).reduce((a,b)=>a+b, 0);
    const impossibleThreshold = att.maxDepth ?? 0;
    const remainingBudget     = (auditRow.reqLen ?? 0) - impossibleThreshold;

    // For each deficit bucket, compute the minimum steps needed to close that many ints
    // Lower bound: to create K intersections you need at least K revisit steps,
    // and each revisit requires the path head to be adjacent to an already-visited cell.
    // Tight lower bound: you need to travel at least K extra steps to cross K cells.
    // In practice, creating K intersections in B remaining steps requires B >= K * 2
    // (because you need to go "out" past the cell and come "back" through it — minimum loop = 3 steps)
    // Conservative bound used here: B >= K (absolute minimum: visit cell, cross it = 2 steps per int)
    const intBucketsImpossible = {};
    for (const [deficit, count] of Object.entries(intDist)) {
      const needed = Number(deficit);
      // Conservative: if remaining budget < needed * 2, almost certainly impossible
      const tightlyImpossible = remainingBudget < needed * 2;
      // Loose: if remaining budget < needed, definitely impossible
      const definitelyImpossible = remainingBudget < needed;
      intBucketsImpossible[deficit] = { count, needed, remainingBudget,
                                        definitelyImpossible, tightlyImpossible };
    }

    out.attempts.push({
      label           : att.label,
      maxDepth        : att.maxDepth,
      nodesExpanded   : att.nodesExpanded,
      prunes          : att.prunes,
      memoHits        : att.memoHits,
      totalFrontier   : totalFrontierStates,
      remainingBudget,
      intDist,
      mpDist,
      intBucketsImpossible,
      bestLowerBound  : diag.bestLowerBoundToValidSolution,
      nearSolution    : diag.nearSolutionStates,
      intScheduleProg : att.causality?.intersectionScheduleProgress,
    });
  }
  return out;
}

// ─── print report for one level ──────────────────────────────────────────────
function report(levelNum, level, auditRow) {
  const sep = '═'.repeat(70);
  const bar = '─'.repeat(70);
  console.log(`\n${sep}`);
  console.log(`  LEVEL ${levelNum}  |  grid ${level.grid.w}×${level.grid.h}  ` +
              `|  reqLen=${level.reqLen}  reqInt=${level.reqInt}`);
  console.log(`  Gates: ${level.gates.map(g=>`(${g.x},${g.y})`).join(', ')}  ` +
              `Goal: (${level.goal.x},${level.goal.y})`);
  const cNames = [];
  if (level.mustPass?.length)  cNames.push(`mustPass×${level.mustPass.length}`);
  if (level.mustCross?.length) cNames.push(`mustCross×${level.mustCross.length}`);
  if (level.filters?.length)   cNames.push(`filters×${level.filters.length}`);
  if (level.flippingFilters?.length) cNames.push(`flippingFilters×${level.flippingFilters.length}`);
  if (level.portals?.length)   cNames.push(`portals×${level.portals.length}`);
  if (level.geese?.length)     cNames.push(`geese×${level.geese.length}`);
  if (level.blocks?.length)    cNames.push(`blocks×${level.blocks.length}`);
  console.log(`  Constraints: ${cNames.join('  ')}`);
  console.log(sep);

  // ── Hint path analysis ────────────────────────────────────────────────────
  const hints = level.hints ?? [];
  console.log(`\n▶ HINT PATH ANALYSIS  (${hints.length} known-good solution(s))\n`);

  for (let hi = 0; hi < hints.length; hi++) {
    const trace = tracePath(hints[hi], level, hi);
    console.log(`  Hint ${hi+1}/${hints.length}:  path length=${trace.pathLen}  ` +
                `(reqLen=${trace.reqLen})  intersections found=${trace.actualInts}/${trace.reqInt}  ` +
                `portals used=${trace.portalJumps}`);

    if (trace.intSteps.length === 0) {
      console.log(`    No intersections detected in this path.`);
    } else {
      // Show intersection timing
      const budget = trace.reqLen;
      console.log(`    Intersection schedule (step / total-budget / % through path):`);
      trace.events
        .filter(e => e.type === 'intersection')
        .forEach(e => {
          const pct = ((e.step / budget) * 100).toFixed(0);
          const remBudget = budget - e.step;
          const remInts   = trace.reqInt - Number(e.detail.match(/ints now (\d+)/)?.[1] ?? 0);
          console.log(`      Int #${e.step - trace.intSteps.indexOf(e.step)}  step ${String(e.step).padStart(3)}/${budget}  (${pct}% into path)   at ${fmt(e.key)}   remaining budget=${remBudget}  remaining ints still needed=${remInts}`);
        });

      // Earliest and latest intersection
      const first = trace.intSteps[0];
      const last  = trace.intSteps[trace.intSteps.length - 1];
      const pctFirst = ((first / budget) * 100).toFixed(0);
      const pctLast  = ((last  / budget) * 100).toFixed(0);
      console.log(`    First int at step ${first} (${pctFirst}% through), last at step ${last} (${pctLast}% through)`);

      // Window of opportunity: from first to last intersection
      console.log(`    All intersections completed by step ${last} — ` +
                  `${budget - last} budget steps remain after final intersection`);
    }

    // Portal events
    const portEvents = trace.events.filter(e => e.type === 'portal');
    if (portEvents.length > 0) {
      console.log(`    Portal jumps: ${portEvents.map(e => `step ${e.step}: ${fmt(e.from)}→${fmt(e.key)}`).join('  ')}`);
    }
    console.log();
  }

  // ── Solver audit analysis ─────────────────────────────────────────────────
  if (!auditRow) {
    console.log(`  [No audit data found for this level]\n`);
    return;
  }

  const fa = analyseFrontier(auditRow);
  console.log(`▶ SOLVER AUDIT ANALYSIS  (${auditRow.attemptCount} attempts, total ${auditRow.nodesExpanded} nodes)\n`);
  console.log(`  Overall failure category: ${auditRow.failureCategory}`);
  console.log(`  Soft-bound activations: ${JSON.stringify(auditRow.softBoundActivations)}\n`);

  for (const att of fa.attempts) {
    console.log(`  ${bar}`);
    console.log(`  Attempt ${att.label}:  maxDepth=${att.maxDepth}  nodesExpanded=${att.nodesExpanded}  memoHits=${att.memoHits}`);
    console.log(`  Prunes: ${JSON.stringify(att.prunes)}`);
    console.log(`  Remaining budget at max depth: ${att.remainingBudget} steps`);
    console.log(`  Intersection schedule progress: ${att.intScheduleProg}`);
    console.log(`  Near-solution states: ${att.nearSolution}  (best lower bound: ${att.bestLowerBound} steps)`);

    // The key diagnostic: frontier states with impossible intersection schedules
    const intDist = att.intDist;
    const buckets = Object.entries(att.intBucketsImpossible);
    if (buckets.length > 0) {
      console.log(`\n  ▼ FRONTIER intersection-deficit distribution at timeout:`);
      console.log(`    (deficit = intersections still needed by each frontier state)`);
      let definitelyImpossibleCount = 0;
      let tightlyImpossibleCount    = 0;
      for (const [deficit, info] of buckets.sort((a,b) => Number(a[0])-Number(b[0]))) {
        const flags = [];
        if (info.definitelyImpossible) { flags.push('DEFINITELY-IMPOSSIBLE'); definitelyImpossibleCount += info.count; }
        else if (info.tightlyImpossible) { flags.push('LIKELY-IMPOSSIBLE'); tightlyImpossibleCount += info.count; }
        else flags.push('feasible');
        console.log(`    deficit=${deficit}  states=${String(info.count).padStart(6)}  ` +
                    `(need ${deficit} ints in ${info.remainingBudget} remaining steps)  → ${flags.join(', ')}`);
      }
      const total = Object.values(intDist).reduce((a,b)=>a+b,0);
      const wasted = definitelyImpossibleCount + tightlyImpossibleCount;
      if (wasted > 0) {
        console.log(`\n  ⚠️  ${wasted.toLocaleString()} / ${total.toLocaleString()} frontier states (${((wasted/total)*100).toFixed(1)}%) ` +
                    `are expanding in a region that CANNOT satisfy the intersection constraint`);
        console.log(`     in the remaining ${att.remainingBudget} steps — but the solver never prunes them.`);
      }
    }

    // MustPass frontier
    const mpDist = att.mpDist;
    const mpEntries = Object.entries(mpDist).sort((a,b)=>Number(a[0])-Number(b[0]));
    if (mpEntries.length > 0) {
      console.log(`\n  ▼ FRONTIER must-pass deficit distribution:`);
      for (const [deficit, count] of mpEntries) {
        console.log(`    deficit=${deficit}  states=${String(count).padStart(6)}`);
      }
    }
    console.log();
  }

  // ── Cross-comparison: what the hint requires vs. what the solver does ─────
  console.log(`▶ CROSS-COMPARISON: hint schedule vs. solver behaviour\n`);

  const firstHintTrace = hints[0] ? tracePath(hints[0], level, 0) : null;
  if (firstHintTrace && firstHintTrace.intSteps.length > 0) {
    const budget    = level.reqLen;
    const reqInt    = level.reqInt;
    const lastIntStep = firstHintTrace.intSteps[firstHintTrace.intSteps.length - 1];

    console.log(`  Hint: all ${reqInt} intersections created by step ${lastIntStep} / ${budget}`);
    console.log(`  Hint: ${budget - lastIntStep} budget steps remain AFTER the final intersection`);
    console.log();

    // For each solver attempt, show how it compares
    for (const att of fa.attempts) {
      const intDist = att.intDist;
      // Estimate: how many ints has the average frontier state achieved?
      let totalIntsAchieved = 0, totalStates = 0;
      for (const [deficit, count] of Object.entries(intDist)) {
        totalIntsAchieved += (reqInt - Number(deficit)) * count;
        totalStates += count;
      }
      const avgIntsAchieved = totalStates > 0 ? (totalIntsAchieved / totalStates).toFixed(2) : 'n/a';
      const pctDone = totalStates > 0 ? ((totalIntsAchieved / (reqInt * totalStates)) * 100).toFixed(1) : 'n/a';
      console.log(`  Attempt ${att.label} (depth ${att.maxDepth}): avg frontier state has ` +
                  `${avgIntsAchieved}/${reqInt} ints (${pctDone}% of requirement done)`);
      console.log(`    Hint has all ints done by step ${lastIntStep}; solver at depth ${att.maxDepth} ` +
                  `averages only ${avgIntsAchieved} ints — ${(reqInt - avgIntsAchieved).toFixed(2)} short ` +
                  `with only ${budget - att.maxDepth} steps left`);
    }
  } else {
    console.log(`  (No intersections in hint or no hint available for comparison)`);
  }

  console.log('\n' + sep + '\n');
}

// ─── main ────────────────────────────────────────────────────────────────────
const FAILING_LEVELS = [92, 108, 134];

const [allLevels, auditMap] = await Promise.all([loadLevels(), loadAudit()]);

console.log('PATHFINDER SOLVER — HEURISTIC RECALL DIAGNOSTIC');
console.log('Comparing known-good hint paths against solver frontier data');
console.log('Target levels: ' + FAILING_LEVELS.join(', '));

for (const n of FAILING_LEVELS) {
  const level    = allLevels[n - 1];   // 0-indexed
  const auditRow = auditMap.get(n);
  if (!level) { console.error(`Level ${n} not found in level data`); continue; }
  report(n, level, auditRow);
}
