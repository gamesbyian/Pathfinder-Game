#!/usr/bin/env node
/**
 * Frozen Stage A harness for WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE.
 *
 * Runs the exact 20-level elite-prefix closest-miss population under identical repair search,
 * seed, node cap, candidate set and budgets. The only treatment difference is candidate ordering
 * inside elitePrefixDfsRepair: legacy nested-loop order vs the frozen ascending index-depth proxy
 * (requiredLength - destroyIdx). countedRemainingLength/portalJumps are observational telemetry
 * only and never affect ordering.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/ws1-remaining-length-intrasolve-bridge.mjs -- \
 *     --out=reports/stress/ws1-remaining-length-intrasolve-stage-a-001.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

export const FROZEN_STAGE_A_IDS = Object.freeze([
  'R00440','R01397','R01698','R01860','R02003','R02022','R02088','R02123','R02220','R02239',
  'R00342','R00786','R00877','R00886','R00893','R01341','R02106','R02118','R02137','R02275',
]);

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = argv.find(value => value.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const OUT_FILE = arg('out', null);
const NODE_BUDGET = Number(arg('node-budget', '15000000'));
const WALL_MS = Number(arg('wall-ms', '300000'));

function summarizeTrace(trace) {
  const byCall = new Map();
  for (const row of trace) {
    const rows = byCall.get(row.callOrdinal) ?? [];
    rows.push(row);
    byCall.set(row.callOrdinal, rows);
  }
  return {
    triggerCount: byCall.size,
    candidateAttempts: trace.length,
    candidateNodes: trace.reduce((sum, row) => sum + row.nodesUsed, 0),
    portalBearingCandidates: trace.filter(row => row.portalJumps > 0).length,
    proxyExactDisagreements: trace.filter(row => row.remainingLength !== row.countedRemainingLength).length,
    firstSolvedCandidate: trace.find(row => row.solved) ?? null,
    calls: [...byCall.entries()].map(([callOrdinal, rows]) => ({
      callOrdinal,
      attempted: rows.length,
      nodesUsed: rows.reduce((sum, row) => sum + row.nodesUsed, 0),
      rows,
    })),
  };
}

async function main() {
  if (!Number.isFinite(NODE_BUDGET) || NODE_BUDGET <= 0) throw new Error('--node-budget must be > 0');
  if (!Number.isFinite(WALL_MS) || WALL_MS <= 0) throw new Error('--wall-ms must be > 0');

  installBrowserStubs();
  const [{ createSolver, SOLVER_TESTING_API }, { repairSearchFromGate }] = await Promise.all([
    import('../../modules/solver.js'),
    import('../../modules/solver/repair-search.js'),
  ]);
  const Solver = createSolver();
  const {
    prepLevel, getAttemptConfigs, normalizeAblationConfig, SCORING_PROFILES,
  } = SOLVER_TESTING_API;

  const rawDoc = JSON.parse(readFileSync(path.resolve(process.cwd(), CORPUS_FILE), 'utf8'));
  const rawLevels = Array.isArray(rawDoc) ? rawDoc : rawDoc.levels;
  const byId = new Map(rawLevels.map(level => [String(level.id), level]));
  const missing = FROZEN_STAGE_A_IDS.filter(id => !byId.has(id));
  if (missing.length) throw new Error(`Frozen Stage A ids missing from ${CORPUS_FILE}: ${missing.join(', ')}`);

  const cfg = normalizeAblationConfig({ STRATEGY_REPAIR_ELITE_PREFIX_DFS: true });

  async function runArm(id, level, repairConfig, orderByRemainingLength) {
    const prep = prepLevel(level);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    prep._attemptBudgetTelemetry = true;
    const profile = SCORING_PROFILES[repairConfig.scoringProfileId] ?? SCORING_PROFILES.repair;
    const gateKey = level.gateKeys[0];
    const trace = [];
    const out = {};
    const workBefore = prep._workMeter.units;
    const startedAt = Date.now();
    const resultPath = await repairSearchFromGate(
      gateKey, level, prep, profile, WALL_MS, startedAt, repairConfig.orderingBias ?? null,
      null, false, NODE_BUDGET, out, 0,
      false, false, false, false,
      true, false, orderByRemainingLength, trace,
    );
    const workSpent = prep._workMeter.units - workBefore;
    const referee = resultPath ? Solver.validateCandidatePath(level, resultPath) : null;
    if (resultPath && !referee?.ok) throw new Error(`${id}: repair returned non-referee-valid path: ${referee?.reason ?? 'unknown'}`);
    return {
      solved: !!resultPath,
      refereeValid: referee?.ok ?? false,
      nodesExpanded: out.nodesExpanded ?? prep._metrics.nodesExpanded ?? null,
      workSpent,
      bestBadness: out.bestBadness ?? null,
      timedOut: out.timedOut ?? null,
      elapsedMs: Date.now() - startedAt,
      trace: summarizeTrace(trace),
    };
  }

  const rows = [];
  for (const id of FROZEN_STAGE_A_IDS) {
    const raw = byId.get(id);
    const { id: _id, stressMeta: _stressMeta, ...levelRaw } = raw;
    const level = Solver.prepareLevelForSolver(levelRaw, { source: 'raw' });
    const repairConfig = getAttemptConfigs(level).find(config => config.repair && !config.repairMustTurnBiased && !config.repairTurnBiased);
    if (!repairConfig) throw new Error(`${id}: frozen population no longer has an ordinary repair config`);

    const control = await runArm(id, level, repairConfig, false);
    const treatment = await runArm(id, level, repairConfig, true);
    rows.push({
      id,
      scoringProfileId: repairConfig.scoringProfileId,
      gateKey: level.gateKeys[0],
      requiredLength: level.requiredLength,
      portalPairs: Math.floor(level.portalMap.size / 2),
      control,
      treatment,
      flip: control.solved === treatment.solved ? 'same' : treatment.solved ? 'treatment-only' : 'control-only',
    });
    console.log(`${id}: control=${control.solved ? 'solve' : 'fail'} treatment=${treatment.solved ? 'solve' : 'fail'} work=${control.workSpent}/${treatment.workSpent} trace=${control.trace.candidateAttempts}/${treatment.trace.candidateAttempts}`);
  }

  const controlSolved = rows.filter(row => row.control.solved).map(row => row.id);
  const treatmentSolved = rows.filter(row => row.treatment.solved).map(row => row.id);
  const treatmentOnly = rows.filter(row => row.flip === 'treatment-only').map(row => row.id);
  const controlOnly = rows.filter(row => row.flip === 'control-only').map(row => row.id);
  const controlWork = rows.reduce((sum, row) => sum + row.control.workSpent, 0);
  const treatmentWork = rows.reduce((sum, row) => sum + row.treatment.workSpent, 0);
  const proxyExactDisagreements = rows.reduce((sum, row) =>
    sum + row.control.trace.proxyExactDisagreements + row.treatment.trace.proxyExactDisagreements, 0);

  const document = {
    schemaVersion: 1,
    kind: 'ws1-remaining-length-intrasolve-bridge-stage-a',
    generatedAt: new Date().toISOString(),
    researchQuestion: 'WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE',
    evidenceRole: 'development-discriminator',
    treatment: {
      frozenOrderingKey: 'requiredLength - destroyIdx',
      exactCountedResidualRole: 'observational-only',
      nodeBudget: NODE_BUDGET,
      wallMs: WALL_MS,
      candidatePerAttemptNodeCap: 15000,
      candidateSharedCallNodeCap: 90000,
    },
    population: {
      corpus: CORPUS_FILE,
      ids: FROZEN_STAGE_A_IDS,
      count: FROZEN_STAGE_A_IDS.length,
      historicalControlReference: 'reports/2026-08-07-repair-elite-prefix-dfs.md',
    },
    summary: {
      controlSolved,
      treatmentSolved,
      treatmentOnly,
      controlOnly,
      controlWork,
      treatmentWork,
      treatmentVsControlWorkRatio: controlWork > 0 ? treatmentWork / controlWork : null,
      proxyExactDisagreements,
    },
    rows,
  };

  console.log(JSON.stringify(document.summary, null, 2));
  if (OUT_FILE) {
    const target = path.resolve(process.cwd(), OUT_FILE);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(document, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
