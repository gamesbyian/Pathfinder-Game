#!/usr/bin/env node
/**
 * Compact operator-facing status for the active naming-cleanup program.
 *
 * This deliberately derives volatile execution state from the ledger instead of duplicating
 * it in prose docs. Use --json for machine-readable output, or --phase=N / --batch=8A to
 * inspect a particular slice.
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
  console.log('Usage: npm run naming:status -- [--phase=N] [--batch=8A] [--json]');
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
const phase8BatchOrder = ledger.phaseBatches?.['8'] ?? [];
const batchCompletions = ledger.batchCompletions ?? {};

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
let nextBatch = null;
let nextAction = 'start-phase';
if (nextPhase === 8) {
  nextBatch = phase8BatchOrder.find(batch => batchCompletions?.[batch]?.status !== 'merged') ?? null;
  if (nextBatch) {
    const rows = future.filter(row => row.phase === 8 && row.batch === nextBatch);
    const counts = statusCounts(rows);
    if (ledger.activeExecution?.status === 'active' && ledger.activeExecution.batch === nextBatch) {
      nextAction = 'continue-active-batch';
    } else if (counts['in-progress'] > 0) {
      nextAction = 'repair-active-execution-state';
    } else if (counts.done === rows.length && rows.length > 0) {
      nextAction = 'merge-or-record-batch-completion';
    } else {
      nextAction = 'start-batch';
    }
  } else {
    nextAction = 'phase-closeout';
  }
}
if (ledger.activeExecution?.status === 'active') {
  nextBatch = ledger.activeExecution.batch ?? nextBatch;
  if (nextPhase !== 8) nextAction = 'continue-active-phase';
}

let selected = future;
if (phaseFilter !== null) selected = selected.filter(row => row.phase === phaseFilter);
if (batchFilter) selected = selected.filter(row => row.batch === batchFilter);
if (batchFilter && selected.length === 0) {
  console.error(`No naming-cleanup ledger rows match --batch=${batchFilter}${phaseFilter !== null ? ` in Phase ${phaseFilter}` : ''}`);
  process.exit(2);
}

const nextScope = future.filter(row =>
  row.phase === nextPhase &&
  (nextPhase !== 8 || row.batch === nextBatch),
);

const result = {
  schemaVersion: ledger.schemaVersion,
  completionContractVersion: ledger.completionContractVersion,
  lastCompletedPhase: ledger.lastCompletedPhase,
  nextPhase,
  nextBatch,
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
console.log(`  next: Phase ${result.nextPhase}${result.nextBatch ? ` / batch ${result.nextBatch}` : ''}`);
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