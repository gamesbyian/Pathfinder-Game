#!/usr/bin/env node
/**
 * Representative real-search canary for search-loss/failure instrumentation.
 *
 * Runs the same deterministic sample under three observational modes:
 *   off     - no new failure-information observers
 *   compact - counter-only beam flow + typed prune counts + bounded progress
 *   rich    - compact observers plus bounded beam decision observations
 *
 * Search policy/budgets are identical. Any solve/status/node/work/solution drift is a hard parity
 * failure. Wall-time and payload measurements are evidence only: noisy hosted timings never make the
 * command fail merely because an overhead threshold is missed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import {
  createDecisionObservationCollector,
  beamResearchRecordToDecisionObservation,
} from './solver-decision-observation-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
  const i = a.indexOf('=');
  return [a.slice(2, i), a.slice(i + 1)];
}));
const corpusFile = args.get('corpus') ?? 'data/stress/stress-levels-random.json';
const sampleSize = Number(args.get('sample') ?? 12);
const seed = args.get('seed') ?? 'search-loss-real-canary-v1';
const workBudget = Number(args.get('work-budget') ?? 8000000);
const timeBudgetMs = Number(args.get('time-budget-ms') ?? 900000);
const decisionLimit = Number(args.get('decision-limit') ?? 32);
const maxProgressTransitions = Number(args.get('max-progress-transitions') ?? 16);
const outFile = args.get('out') ?? 'reports/stress/search-loss-real-canary.json';
for (const [name, value] of Object.entries({ sampleSize, workBudget, timeBudgetMs, decisionLimit, maxProgressTransitions })) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`);
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seedValue) {
  let a = seedValue >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sampleDeterministic(rows, count, seedText) {
  const pool = rows.slice();
  const rng = mulberry32(hashSeed(seedText));
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, take);
}
function createProgressCollector(limit) {
  const byFamily = new Map();
  return {
    observe(record) {
      const state = byFamily.get(record.family) ?? { observed: 0, transitions: [] };
      state.observed++;
      if (state.transitions.length < limit) state.transitions.push({ ...record });
      byFamily.set(record.family, state);
    },
    snapshot() {
      return Object.fromEntries([...byFamily.entries()].map(([family, state]) => [family, {
        observed: state.observed,
        retained: state.transitions.length,
        truncated: state.observed > state.transitions.length,
        transitions: state.transitions,
      }]));
    },
  };
}
function parityProjection(result) {
  return {
    ok: !!result.ok,
    status: result.status ?? null,
    solution: result.solution ?? null,
    nodesExpanded: result.nodesExpanded ?? null,
    workSpent: result.workSpent ?? null,
    nodeBudgetReached: result.nodeBudgetReached ?? false,
    workBudgetReached: result.workBudgetReached ?? false,
    deadlineTruncated: result.deadlineTruncated ?? false,
  };
}
function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value));
}
function ratioPct(observed, baseline) {
  if (!(baseline > 0)) return null;
  return ((observed / baseline) - 1) * 100;
}

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

const corpus = JSON.parse(fs.readFileSync(corpusFile, 'utf8'));
const allRows = Array.isArray(corpus) ? corpus : corpus.levels;
if (!Array.isArray(allRows) || allRows.length === 0) throw new Error('corpus has no levels');
const selected = sampleDeterministic(allRows, sampleSize, seed);

const modes = ['off', 'compact', 'rich'];
const rows = [];
for (let index = 0; index < selected.length; index++) {
  const raw = selected[index];
  const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
  // Rotate execution order by parent to reduce systematic warmup/order bias.
  const order = [...modes.slice(index % modes.length), ...modes.slice(0, index % modes.length)];
  const byMode = new Map();

  for (const mode of order) {
    const beamFlowCounters = {};
    const pruneDiagnostics = { reached: {}, rejected: {} };
    const progress = createProgressCollector(maxProgressTransitions);
    const decisions = createDecisionObservationCollector(decisionLimit);
    let decisionOrdinal = 0;

    const solveOpts = {
      timeBudgetMs,
      workBudget,
      strictTotalWorkBudget: true,
      attemptBudgetTelemetry: true,
    };
    if (mode !== 'off') {
      solveOpts.beamFlowCounters = beamFlowCounters;
      solveOpts.pruneDiagnostics = pruneDiagnostics;
      solveOpts.failureProgressObserver = progress;
    }
    if (mode === 'rich') {
      solveOpts.beamResearchObserver = {
        observe(record) {
          const observation = beamResearchRecordToDecisionObservation(record, {
            parentId: String(raw.id),
            decisionOrdinal: decisionOrdinal++,
          });
          if (observation) decisions.observe(observation);
        },
      };
    }

    const started = performance.now();
    const result = await Solver.solveLevel(level, solveOpts);
    const elapsedMs = performance.now() - started;
    const compactPayload = mode === 'off' ? null : {
      beamFlowCounters,
      pruneDiagnostics,
      failureProgress: progress.snapshot(),
    };
    const richPayload = mode === 'rich' ? decisions.snapshot() : null;
    byMode.set(mode, {
      mode,
      elapsedMs,
      parity: parityProjection(result),
      compactPayloadBytes: compactPayload ? jsonBytes(compactPayload) : 0,
      richPayloadBytes: richPayload ? jsonBytes(richPayload) : 0,
      compact: compactPayload,
      rich: richPayload ? {
        observed: richPayload.observed,
        retained: richPayload.retained,
        truncated: richPayload.truncated,
      } : null,
    });
  }

  const baseline = byMode.get('off').parity;
  const parity = {};
  for (const mode of modes) {
    parity[mode] = JSON.stringify(byMode.get(mode).parity) === JSON.stringify(baseline);
  }
  rows.push({
    id: raw.id,
    executionOrder: order,
    parity,
    modes: Object.fromEntries(modes.map(mode => [mode, byMode.get(mode)])),
  });
  console.log(`${raw.id}: parity compact=${parity.compact} rich=${parity.rich}; `
    + `ms off=${byMode.get('off').elapsedMs.toFixed(1)} compact=${byMode.get('compact').elapsedMs.toFixed(1)} rich=${byMode.get('rich').elapsedMs.toFixed(1)}`);
}

const totals = Object.fromEntries(modes.map(mode => [mode,
  rows.reduce((sum, row) => sum + row.modes[mode].elapsedMs, 0)]));
const parityFailures = rows.flatMap(row => modes.filter(mode => !row.parity[mode]).map(mode => ({ id: row.id, mode })));
const progressFamilies = {};
let richParentsWithDecisions = 0;
let richObservedDecisions = 0;
let compactBytes = 0;
let richBytes = 0;
for (const row of rows) {
  compactBytes += row.modes.compact.compactPayloadBytes;
  richBytes += row.modes.rich.richPayloadBytes;
  if ((row.modes.rich.rich?.observed ?? 0) > 0) richParentsWithDecisions++;
  richObservedDecisions += row.modes.rich.rich?.observed ?? 0;
  for (const [family, state] of Object.entries(row.modes.compact.compact.failureProgress ?? {})) {
    progressFamilies[family] = (progressFamilies[family] ?? 0) + state.observed;
  }
}
const summary = {
  parents: rows.length,
  parityFailures,
  semanticParity: parityFailures.length === 0,
  elapsedMs: totals,
  overheadPct: {
    compactVsOff: ratioPct(totals.compact, totals.off),
    richVsOff: ratioPct(totals.rich, totals.off),
    richVsCompact: ratioPct(totals.rich, totals.compact),
  },
  payloadBytes: { compact: compactBytes, rich: richBytes },
  richParentsWithDecisions,
  richObservedDecisions,
  progressFamilies,
  representativeCoverage: {
    multiParent: rows.length >= 4,
    richDecisionParents: richParentsWithDecisions,
    observedProgressFamilies: Object.keys(progressFamilies).sort(),
  },
};
const output = {
  schemaVersion: 1,
  kind: 'pathfinder-search-loss-real-canary',
  protocol: { corpusFile, sampleSize, seed, workBudget, timeBudgetMs, decisionLimit, maxProgressTransitions, modes },
  summary,
  levels: rows,
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (parityFailures.length) process.exitCode = 1;
