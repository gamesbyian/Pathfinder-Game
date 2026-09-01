#!/usr/bin/env node
/**
 * Compact operator-facing status for the active naming-cleanup program.
 *
 * This deliberately derives volatile execution state from the ledger instead of duplicating
 * it in prose docs. Use --json for machine-readable output, or --phase=N / --batch=<id> to
 * inspect a particular slice. Declared serial phases may contain rowless lifecycle gates.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const args = new Map(
  process.argv.slice(2).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.length ? rest.join('=') : true];
  }),
);

if (args.has('--help')) {
  console.log('Usage: npm run naming:status -- [--phase=N] [--batch=<id>] [--json]');
  process.exit(0);
}

const phaseFilter = args.has('--phase') ? Number(args.get('--phase')) : null;
const batchFilter = args.get('--batch') || null;
const json = args.has('--json');
if (phaseFilter !== null && (!Number.isInteger(phaseFilter) || phaseFilter < 1)) {
  console.error('--phase must be a positive integer');
  process.exit(2);
}

const rows = ledger.entries ?? [];
const future = rows.filter(row => row.phase >= 8);
const phaseBatches = ledger.phaseBatches ?? {};
const phaseBatchKinds = ledger.phaseBatchKinds ?? {};
const batchCompletions = ledger.batchCompletions ?? {};

const batchKind = (phase, batch) => phaseBatchKinds?.[String(phase)]?.[batch] ?? 'implementation';
const declaredBatchPhase = batch => {
  for (const [phaseKey, order] of Object.entries(phaseBatches)) {
    if ((order ?? []).includes(batch)) return Number(phaseKey);
  }
  return null;
};

function rowSummary(row) {
  return {
    id: row.id,
    phase: row.phase,
    batch: row.batch ?? null,
    status: row.status,
    risk: row.risk,
    persistence: row.persistence,
    old: row.old,
    new: row.new,
    compatibility: row.compatibility ?? null,
    verificationRecord: row.verificationRecord ?? null,
  };
}

function statusCounts(selected) {
  return Object.fromEntries(
    ['pending', 'in-progress', 'done'].map(status => [
      status,
      selected.filter(row => row.status === status).length,
    ]),
  );
}

const nextPhase = Number(ledger.lastCompletedPhase) + 1;
const nextBatchOrder = phaseBatches?.[String(nextPhase)] ?? [];
let nextBatch = nextBatchOrder.find(batch => batchCompletions?.[batch]?.status !== 'merged') ?? null;
let nextBatchKind = nextBatch ? batchKind(nextPhase, nextBatch) : null;
let nextAction = nextBatchOrder.length ? (nextBatch ? 'start-batch' : 'phase-closeout') : 'start-phase';

if (nextBatch) {
  const batchRows = future.filter(row => row.phase === nextPhase && row.batch === nextBatch);
  const counts = statusCounts(batchRows);
  const activeHere = ledger.activeExecution?.status === 'active' &&
    ledger.activeExecution.phase === nextPhase &&
    ledger.activeExecution.batch === nextBatch;
  if (activeHere) {
    nextAction = nextBatchKind === 'implementation' ? 'continue-active-batch' : 'continue-active-gate';
  } else if (counts['in-progress'] > 0) {
    nextAction = 'repair-active-execution-state';
  } else if (batchRows.length > 0 && counts.done === batchRows.length) {
    nextAction = 'merge-or-record-batch-completion';
  } else if (nextBatchKind !== 'implementation') {
    nextAction = 'start-gate';
  }
}

if (ledger.activeExecution?.status === 'active' && ledger.activeExecution.phase === nextPhase) {
  nextBatch = ledger.activeExecution.batch ?? nextBatch;
  nextBatchKind = nextBatch ? batchKind(nextPhase, nextBatch) : null;
  if (!nextBatchOrder.length) nextAction = 'continue-active-phase';
}

let selected = future;
if (phaseFilter !== null) selected = selected.filter(row => row.phase === phaseFilter);
if (batchFilter) selected = selected.filter(row => row.batch === batchFilter);
if (batchFilter && selected.length === 0) {
  const batchPhase = declaredBatchPhase(batchFilter);
  if (batchPhase === null || (phaseFilter !== null && batchPhase !== phaseFilter)) {
    console.error(`No naming-cleanup ledger batch matches --batch=${batchFilter}${phaseFilter !== null ? ` in Phase ${phaseFilter}` : ''}`);
    process.exit(2);
  }
}

const nextScope = future.filter(row =>
  row.phase === nextPhase &&
  (!nextBatchOrder.length || row.batch === nextBatch),
);

const result = {
  schemaVersion: ledger.schemaVersion,
  completionContractVersion: ledger.completionContractVersion,
  lastCompletedPhase: ledger.lastCompletedPhase,
  nextPhase,
  nextBatch,
  nextBatchKind,
  nextAction,
  batchCompletion: nextBatch ? (batchCompletions[nextBatch] ?? null) : null,
  phase8Gate: ledger.phase8Gate?.status ?? null,
  activeExecution: ledger.activeExecution ?? null,
  selected: {
    phase: phaseFilter,
    batch: batchFilter,
    count: selected.length,
    counts: statusCounts(selected),
    rows: selected.map(rowSummary),
  },
  nextScope: {
    count: nextScope.length,
    counts: statusCounts(nextScope),
    highRisk: nextScope.filter(row => row.risk === 'high').map(rowSummary),
    compatibilityBoundaries: nextScope
      .filter(row => row.persistence === 'dual-read')
      .map(rowSummary),
    rows: nextScope.map(rowSummary),
  },
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

console.log('Naming cleanup status');
console.log(`  contract: schema v${result.schemaVersion}, completion v${result.completionContractVersion}`);
console.log(`  completed through: Phase ${result.lastCompletedPhase}`);
console.log(`  next: Phase ${result.nextPhase}${result.nextBatch ? ` / batch ${result.nextBatch}` : ''}${result.nextBatchKind ? ` [${result.nextBatchKind}]` : ''}`);
console.log(`  next action: ${result.nextAction}`);
if (result.batchCompletion) console.log(`  batch merge record: ${result.batchCompletion.status}`);
console.log(`  Phase-8 gate: ${result.phase8Gate}`);
console.log(`  active execution: ${result.activeExecution?.status ?? 'missing'}`);

if (result.activeExecution?.status === 'active') {
  console.log(`    branch: ${result.activeExecution.branch}`);
  console.log(`    record: ${result.activeExecution.recordPath}`);
  console.log(`    base main: ${result.activeExecution.baseMainSha}`);
}

console.log(
  `  next-scope rows: ${result.nextScope.count} ` +
  `(${result.nextScope.counts.pending} pending, ${result.nextScope.counts['in-progress']} in-progress, ${result.nextScope.counts.done} done)`,
);

if (result.nextScope.highRisk.length) {
  console.log('  high-risk rows:');
  for (const row of result.nextScope.highRisk) {
    console.log(`    ${row.id}  ${row.old} -> ${row.new}`);
  }
}

if (result.nextScope.compatibilityBoundaries.length) {
  console.log('  compatibility boundaries:');
  for (const row of result.nextScope.compatibilityBoundaries) {
    console.log(
      `    ${row.id}  ${row.old} -> ${row.new} ` +
      `[${row.compatibility.mode}; retire ${row.compatibility.retireWhen}; owner: ${row.compatibility.owner}]`,
    );
  }
}

if (phaseFilter !== null || batchFilter) {
  console.log(
    `  selected rows: ${result.selected.count} ` +
    `(${result.selected.counts.pending} pending, ${result.selected.counts['in-progress']} in-progress, ${result.selected.counts.done} done)`,
  );
  for (const row of result.selected.rows) {
    console.log(`    ${row.id} [${row.status}] ${row.old} -> ${row.new}`);
  }
}
