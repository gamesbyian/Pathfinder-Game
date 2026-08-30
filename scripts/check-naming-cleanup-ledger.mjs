#!/usr/bin/env node
/**
 * Enforce the prospective completion model for docs/naming-cleanup-ledger.json.
 *
 * Phase 1-7 predate the stronger verification model and remain historical.
 * Phase 8+ rows carry explicit verification dimensions and durable evidence pointers.
 * Phase 8 is split into serial batches 8A-8H, and exactly one implementation batch may
 * be active at a time. The checker intentionally validates execution authority as well
 * as row state so stacked/duplicate naming-cleanup work cannot look complete by accident.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledgerPath = path.join(root, 'docs', 'naming-cleanup-ledger.json');
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));

const failures = [];
const allowedEntryStatuses = new Set(['pending', 'in-progress', 'done']);
const allowedVerification = new Set(['pending', 'done', 'not-applicable']);
const allowedMigrationClasses = new Set([
  'direct-current-surface-rename',
  'compatibility-boundary-migration',
  'current-surface-rename-preserve-frozen-history',
]);
const phase8Batches = new Set(['8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H']);
const verificationKeys = [
  'surfaceInventory',
  'implementation',
  'targetedValidation',
  'consumerAudit',
  'behavioralParity',
  'closeoutAudit',
];

function repoPathExists(relativePath) {
  return typeof relativePath === 'string' &&
    relativePath.length > 0 &&
    existsSync(path.join(root, relativePath));
}

if (ledger.schemaVersion !== 3) {
  failures.push(`schemaVersion must be 3; found ${JSON.stringify(ledger.schemaVersion)}`);
}
if (ledger.completionContractVersion !== 3) {
  failures.push(`completionContractVersion must be 3; found ${JSON.stringify(ledger.completionContractVersion)}`);
}
if (ledger.processHardeningAuthority !== 'docs/naming-cleanup-process-hardening.md') {
  failures.push('processHardeningAuthority must point at docs/naming-cleanup-process-hardening.md');
}
if (ledger.historyAuthority !== 'docs/naming-cleanup-history-and-lessons.md') {
  failures.push('historyAuthority must point at docs/naming-cleanup-history-and-lessons.md');
}
if (ledger.phaseRecordTemplate !== 'docs/naming-cleanup-phase-record-template.md') {
  failures.push('phaseRecordTemplate must point at docs/naming-cleanup-phase-record-template.md');
}
if (!repoPathExists(ledger.historyAuthority)) {
  failures.push(`historyAuthority does not exist: ${JSON.stringify(ledger.historyAuthority)}`);
}
if (!repoPathExists(ledger.phaseRecordTemplate)) {
  failures.push(`phaseRecordTemplate does not exist: ${JSON.stringify(ledger.phaseRecordTemplate)}`);
}
if (ledger.phaseExecutionRecords?.['8'] !== 'docs/naming-cleanup-phase-records/phase-08.md') {
  failures.push('phaseExecutionRecords["8"] must point at docs/naming-cleanup-phase-records/phase-08.md');
}
if (!repoPathExists(ledger.phaseExecutionRecords?.['8'])) {
  failures.push(`Phase-8 execution authority does not exist: ${JSON.stringify(ledger.phaseExecutionRecords?.['8'])}`);
}

const gate = ledger.phase8Gate;
if (!gate || !['blocked', 'ready'].includes(gate.status)) {
  failures.push('phase8Gate.status must be "blocked" or "ready"');
}

const futureEntries = [];
const inProgressEntries = [];

for (const [index, entry] of (ledger.entries ?? []).entries()) {
  const label = `entries[${index}] ${JSON.stringify(entry.old)} -> ${JSON.stringify(entry.new)}`;
  if (!allowedEntryStatuses.has(entry.status)) {
    failures.push(`${label}: invalid status ${JSON.stringify(entry.status)}`);
  }
  if (!Number.isInteger(entry.phase) || entry.phase < 1) {
    failures.push(`${label}: phase must be a positive integer`);
    continue;
  }
  if (entry.phase < 8) continue;

  futureEntries.push(entry);
  if (entry.status === 'in-progress') inProgressEntries.push(entry);

  if (!allowedMigrationClasses.has(entry.migrationClass)) {
    failures.push(`${label}: Phase-8+ row is missing/has invalid migrationClass ${JSON.stringify(entry.migrationClass)}`);
  }

  if (!Object.prototype.hasOwnProperty.call(entry, 'verificationRecord')) {
    failures.push(`${label}: Phase-8+ row must carry verificationRecord (null while pending, checked-in path while active/complete)`);
  } else if (entry.verificationRecord !== null && typeof entry.verificationRecord !== 'string') {
    failures.push(`${label}: verificationRecord must be null or a repository path string`);
  }

  if (entry.phase === 8 && !phase8Batches.has(entry.batch)) {
    failures.push(`${label}: Phase-8 row must be assigned to one of 8A-8H; found ${JSON.stringify(entry.batch)}`);
  }

  const verification = entry.verification;
  if (!verification || typeof verification !== 'object' || Array.isArray(verification)) {
    failures.push(`${label}: Phase-8+ row is missing verification object`);
    continue;
  }

  for (const key of verificationKeys) {
    if (!allowedVerification.has(verification[key])) {
      failures.push(`${label}: verification.${key} must be pending, done, or not-applicable; found ${JSON.stringify(verification[key])}`);
    }
  }

  const extraKeys = Object.keys(verification).filter(key => !verificationKeys.includes(key));
  if (extraKeys.length) {
    failures.push(`${label}: unknown verification key(s): ${extraKeys.join(', ')}`);
  }

  if (entry.status === 'done') {
    const pending = verificationKeys.filter(key => verification[key] === 'pending');
    if (pending.length) {
      failures.push(`${label}: status is done but verification remains pending: ${pending.join(', ')}`);
    }
  }

  if (entry.status === 'in-progress' || entry.status === 'done') {
    if (!repoPathExists(entry.verificationRecord)) {
      failures.push(`${label}: ${entry.status} row must point at an existing checked-in verificationRecord; found ${JSON.stringify(entry.verificationRecord)}`);
    }
  }

  if (gate?.status === 'blocked' && entry.status !== 'pending') {
    failures.push(`${label}: Phase-8 gate is blocked, so Phase-8+ implementation rows must remain pending`);
  }
}

if (gate?.status === 'blocked' && Number(ledger.lastCompletedPhase) >= 8) {
  failures.push(`lastCompletedPhase is ${ledger.lastCompletedPhase} while the Phase-8 gate is blocked`);
}

if (gate?.status === 'ready') {
  const progress = gate.progress;
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    failures.push('phase8Gate.status is ready but progress record is missing');
  } else {
    if ((progress.partial ?? []).length) {
      failures.push(`phase8Gate.status is ready but progress.partial is non-empty: ${progress.partial.join(', ')}`);
    }
    if ((progress.remaining ?? []).length) {
      failures.push(`phase8Gate.status is ready but progress.remaining is non-empty: ${progress.remaining.join(', ')}`);
    }
    if (typeof progress.reconciledAgainstMain !== 'string' || !/^[0-9a-f]{40}$/u.test(progress.reconciledAgainstMain)) {
      failures.push('phase8Gate.status is ready but progress.reconciledAgainstMain is not a full commit SHA');
    }
  }

  const futureRowsWithoutInventory = futureEntries
    .filter(entry => entry.verification?.surfaceInventory !== 'done');
  if (futureRowsWithoutInventory.length) {
    failures.push(`phase8Gate.status is ready but ${futureRowsWithoutInventory.length} Phase-8+ row(s) lack completed surface inventory`);
  }
}

const active = ledger.activeExecution;
if (!active || !['idle', 'active'].includes(active.status)) {
  failures.push('activeExecution.status must be "idle" or "active"');
} else if (active.status === 'idle') {
  if (inProgressEntries.length) {
    failures.push(`activeExecution is idle but ${inProgressEntries.length} Phase-8+ row(s) are in-progress`);
  }
  for (const key of ['phase', 'batch', 'branch', 'pr', 'recordPath']) {
    if (active[key] !== null) {
      failures.push(`activeExecution is idle but ${key} is not null: ${JSON.stringify(active[key])}`);
    }
  }
  if (active.baseMainSha !== null && (typeof active.baseMainSha !== 'string' || !/^[0-9a-f]{40}$/u.test(active.baseMainSha))) {
    failures.push('activeExecution.baseMainSha must be null or a full commit SHA while idle');
  }
} else {
  if (!Number.isInteger(active.phase) || active.phase < 8) {
    failures.push(`activeExecution.phase must be an integer >= 8; found ${JSON.stringify(active.phase)}`);
  }
  if (typeof active.branch !== 'string' || !active.branch.trim()) {
    failures.push('activeExecution.branch must identify the one active implementation branch');
  }
  if (typeof active.baseMainSha !== 'string' || !/^[0-9a-f]{40}$/u.test(active.baseMainSha)) {
    failures.push('activeExecution.baseMainSha must be a full current-main SHA');
  }
  if (!repoPathExists(active.recordPath)) {
    failures.push(`activeExecution.recordPath must exist in the repository; found ${JSON.stringify(active.recordPath)}`);
  }
  if (active.phase === 8 && !phase8Batches.has(active.batch)) {
    failures.push(`activeExecution.batch must be one of 8A-8H for Phase 8; found ${JSON.stringify(active.batch)}`);
  }
  if (!inProgressEntries.length) {
    failures.push('activeExecution is active but no Phase-8+ ledger row is in-progress');
  }
  for (const entry of inProgressEntries) {
    if (entry.phase !== active.phase) {
      failures.push(`in-progress row ${JSON.stringify(entry.old)} belongs to Phase ${entry.phase}, not active Phase ${active.phase}`);
    }
    if (active.phase === 8 && entry.batch !== active.batch) {
      failures.push(`in-progress Phase-8 row ${JSON.stringify(entry.old)} belongs to ${entry.batch}, not active batch ${active.batch}`);
    }
    if (entry.verificationRecord !== active.recordPath) {
      failures.push(`in-progress row ${JSON.stringify(entry.old)} must use activeExecution.recordPath ${JSON.stringify(active.recordPath)}`);
    }
  }
}

for (let phase = 8; phase <= Number(ledger.lastCompletedPhase); phase += 1) {
  const phaseRows = futureEntries.filter(entry => entry.phase === phase);
  const incomplete = phaseRows.filter(entry => entry.status !== 'done');
  if (phaseRows.length && incomplete.length) {
    failures.push(`lastCompletedPhase=${ledger.lastCompletedPhase}, but Phase ${phase} still has ${incomplete.length} non-done row(s)`);
  }
}

if (failures.length) {
  console.error('Naming-cleanup ledger contract check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const phase8Counts = Object.fromEntries(
  [...phase8Batches].map(batch => [batch, futureEntries.filter(entry => entry.phase === 8 && entry.batch === batch).length]),
);
console.log(
  `Naming-cleanup ledger contract valid: gate=${gate.status}; active=${active.status}; ` +
  `${futureEntries.length} Phase-8+ rows carry verification state/evidence pointers; ` +
  `Phase-8 batches=${JSON.stringify(phase8Counts)}.`,
);
