#!/usr/bin/env node
/**
 * Enforce the prospective completion/specification model for docs/naming-cleanup-ledger.json.
 *
 * Contract v4 adds:
 * - immutable row IDs so prose edits do not change row identity;
 * - explicit compatibility ownership/retirement for future dual-read rows;
 * - serial phase/batch dependency enforcement;
 * - durable verification-record requirements;
 * - one active execution claim at a time.
 *
 * Use --ledger=<path> to validate a mutated fixture in the checker self-test.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledgerArg = process.argv.find(arg => arg.startsWith('--ledger='));
const ledgerRelativePath = ledgerArg?.slice('--ledger='.length) || 'docs/naming-cleanup-ledger.json';
const ledgerPath = path.resolve(root, ledgerRelativePath);
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));

const failures = [];
const allowedEntryStatuses = new Set(['pending', 'in-progress', 'done']);
const allowedVerification = new Set(['pending', 'done', 'not-applicable']);
const allowedMigrationClasses = new Set([
  'direct-current-surface-rename',
  'compatibility-boundary-migration',
  'current-surface-rename-preserve-frozen-history',
]);
const phase8Batches = ledger.phaseBatches?.['8'];
if (!Array.isArray(phase8Batches) || !phase8Batches.length || new Set(phase8Batches).size !== phase8Batches.length) {
  failures.push('phaseBatches["8"] must be a non-empty unique ordered batch list');
}
const phase8BatchSet = new Set(Array.isArray(phase8Batches) ? phase8Batches : []);
const verificationKeys = [
  'surfaceInventory',
  'implementation',
  'targetedValidation',
  'consumerAudit',
  'behavioralParity',
  'closeoutAudit',
];
const compatibilityPolicies = new Map([
  ['permanent-historical-read', 'never'],
  ['external-config-transition', 'phase-15-review'],
  ['wire-format-retained', 'never'],
  ['runtime-compatibility-transition', 'phase-15-review'],
]);

function expectedCompatibilityRetirement(entry) {
  if (entry.compatibility?.mode === 'temporary-command-alias') {
    return entry.batch ? 'owning-batch-closeout' : 'owning-phase-closeout';
  }
  return compatibilityPolicies.get(entry.compatibility?.mode);
}

function repoPathExists(relativePath) {
  return typeof relativePath === 'string' &&
    relativePath.length > 0 &&
    existsSync(path.join(root, relativePath));
}

function fail(message) {
  failures.push(message);
}

if (ledger.schemaVersion !== 4) {
  fail(`schemaVersion must be 4; found ${JSON.stringify(ledger.schemaVersion)}`);
}
if (ledger.completionContractVersion !== 4) {
  fail(`completionContractVersion must be 4; found ${JSON.stringify(ledger.completionContractVersion)}`);
}
if (ledger.processHardeningAuthority !== 'docs/naming-cleanup-process-hardening.md') {
  fail('processHardeningAuthority must point at docs/naming-cleanup-process-hardening.md');
}
if (ledger.historyAuthority !== 'docs/naming-cleanup-history-and-lessons.md') {
  fail('historyAuthority must point at docs/naming-cleanup-history-and-lessons.md');
}
if (ledger.phaseRecordTemplate !== 'docs/naming-cleanup-phase-record-template.md') {
  fail('phaseRecordTemplate must point at docs/naming-cleanup-phase-record-template.md');
}
if (!repoPathExists(ledger.historyAuthority)) {
  fail(`historyAuthority does not exist: ${JSON.stringify(ledger.historyAuthority)}`);
}
if (!repoPathExists(ledger.phaseRecordTemplate)) {
  fail(`phaseRecordTemplate does not exist: ${JSON.stringify(ledger.phaseRecordTemplate)}`);
}
if (ledger.phaseExecutionRecords?.['8'] !== 'docs/naming-cleanup-phase-records/phase-08.md') {
  fail('phaseExecutionRecords["8"] must point at docs/naming-cleanup-phase-records/phase-08.md');
}
if (!repoPathExists(ledger.phaseExecutionRecords?.['8'])) {
  fail(`Phase-8 execution authority does not exist: ${JSON.stringify(ledger.phaseExecutionRecords?.['8'])}`);
}

const gate = ledger.phase8Gate;
if (!gate || !['blocked', 'ready'].includes(gate.status)) {
  fail('phase8Gate.status must be "blocked" or "ready"');
}

const futureEntries = [];
const inProgressEntries = [];
const ids = new Map();

for (const [index, entry] of (ledger.entries ?? []).entries()) {
  const label = `entries[${index}] ${JSON.stringify(entry.old)} -> ${JSON.stringify(entry.new)}`;

  if (typeof entry.id !== 'string' || !/^NC-P\d{2}-\d{3}$/u.test(entry.id)) {
    fail(`${label}: id must match NC-P##-###; found ${JSON.stringify(entry.id)}`);
  } else {
    const encodedPhase = Number(entry.id.slice(4, 6));
    if (encodedPhase !== entry.phase) {
      fail(`${label}: id ${entry.id} encodes Phase ${encodedPhase}, but row phase is ${entry.phase}`);
    }
    if (ids.has(entry.id)) {
      fail(`${label}: duplicate id ${entry.id}; first used by ${ids.get(entry.id)}`);
    } else {
      ids.set(entry.id, label);
    }
  }

  if (!allowedEntryStatuses.has(entry.status)) {
    fail(`${label}: invalid status ${JSON.stringify(entry.status)}`);
  }
  if (!Number.isInteger(entry.phase) || entry.phase < 1) {
    fail(`${label}: phase must be a positive integer`);
    continue;
  }
  if (entry.phase < 8) continue;

  futureEntries.push(entry);
  if (entry.status === 'in-progress') inProgressEntries.push(entry);

  if (!allowedMigrationClasses.has(entry.migrationClass)) {
    fail(`${label}: Phase-8+ row is missing/has invalid migrationClass ${JSON.stringify(entry.migrationClass)}`);
  }

  if (!Object.prototype.hasOwnProperty.call(entry, 'verificationRecord')) {
    fail(`${label}: Phase-8+ row must carry verificationRecord (null while pending, checked-in path while active/complete)`);
  } else if (entry.verificationRecord !== null && typeof entry.verificationRecord !== 'string') {
    fail(`${label}: verificationRecord must be null or a repository path string`);
  }

  if (entry.phase === 8 && !phase8BatchSet.has(entry.batch)) {
    fail(`${label}: Phase-8 row must be assigned to one of 8A-8H; found ${JSON.stringify(entry.batch)}`);
  }

  if (entry.persistence === 'dual-read') {
    const compatibility = entry.compatibility;
    if (!compatibility || typeof compatibility !== 'object' || Array.isArray(compatibility)) {
      fail(`${label}: future dual-read row must define compatibility ownership and retirement`);
    } else {
      const expectedRetirement = expectedCompatibilityRetirement(entry);
      if (!expectedRetirement) {
        fail(`${label}: invalid compatibility.mode ${JSON.stringify(compatibility.mode)}`);
      } else if (compatibility.retireWhen !== expectedRetirement) {
        fail(`${label}: compatibility mode ${compatibility.mode} requires retireWhen=${expectedRetirement}; found ${JSON.stringify(compatibility.retireWhen)}`);
      }
      if (typeof compatibility.owner !== 'string' || !compatibility.owner.trim()) {
        fail(`${label}: compatibility.owner must name the owning boundary`);
      }
    }
  } else if (Object.prototype.hasOwnProperty.call(entry, 'compatibility')) {
    fail(`${label}: compatibility object is reserved for persistence="dual-read" rows`);
  }

  const verification = entry.verification;
  if (!verification || typeof verification !== 'object' || Array.isArray(verification)) {
    fail(`${label}: Phase-8+ row is missing verification object`);
    continue;
  }

  for (const key of verificationKeys) {
    if (!allowedVerification.has(verification[key])) {
      fail(`${label}: verification.${key} must be pending, done, or not-applicable; found ${JSON.stringify(verification[key])}`);
    }
  }

  const extraKeys = Object.keys(verification).filter(key => !verificationKeys.includes(key));
  if (extraKeys.length) {
    fail(`${label}: unknown verification key(s): ${extraKeys.join(', ')}`);
  }

  if (entry.status === 'done') {
    const pending = verificationKeys.filter(key => verification[key] === 'pending');
    if (pending.length) {
      fail(`${label}: status is done but verification remains pending: ${pending.join(', ')}`);
    }
  }

  if (entry.status === 'in-progress' || entry.status === 'done') {
    if (
      typeof entry.verificationRecord !== 'string' ||
      !entry.verificationRecord.startsWith('docs/naming-cleanup-phase-records/') ||
      !repoPathExists(entry.verificationRecord)
    ) {
      fail(`${label}: ${entry.status} row must point at an existing checked-in record under docs/naming-cleanup-phase-records/; found ${JSON.stringify(entry.verificationRecord)}`);
    }
  }

  if (gate?.status === 'blocked' && entry.status !== 'pending') {
    fail(`${label}: Phase-8 gate is blocked, so Phase-8+ implementation rows must remain pending`);
  }
}

if (gate?.status === 'blocked' && Number(ledger.lastCompletedPhase) >= 8) {
  fail(`lastCompletedPhase is ${ledger.lastCompletedPhase} while the Phase-8 gate is blocked`);
}

if (gate?.status === 'ready') {
  const progress = gate.progress;
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    fail('phase8Gate.status is ready but progress record is missing');
  } else {
    if ((progress.partial ?? []).length) {
      fail(`phase8Gate.status is ready but progress.partial is non-empty: ${progress.partial.join(', ')}`);
    }
    if ((progress.remaining ?? []).length) {
      fail(`phase8Gate.status is ready but progress.remaining is non-empty: ${progress.remaining.join(', ')}`);
    }
    if (typeof progress.reconciledAgainstMain !== 'string' || !/^[0-9a-f]{40}$/u.test(progress.reconciledAgainstMain)) {
      fail('phase8Gate.status is ready but progress.reconciledAgainstMain is not a full commit SHA');
    }
  }

  const futureRowsWithoutInventory = futureEntries
    .filter(entry => entry.verification?.surfaceInventory !== 'done');
  if (futureRowsWithoutInventory.length) {
    fail(`phase8Gate.status is ready but ${futureRowsWithoutInventory.length} Phase-8+ row(s) lack completed surface inventory`);
  }
}

/* Serial phase ordering: no future work may skip over the next incomplete phase. */
const nextIncompletePhase = Number(ledger.lastCompletedPhase) + 1;
for (const entry of futureEntries) {
  if (entry.phase > nextIncompletePhase && entry.status !== 'pending') {
    fail(`${entry.id}: Phase ${entry.phase} is ahead of next incomplete Phase ${nextIncompletePhase}, so status must remain pending`);
  }
}

/* Phase 8 has an explicit serial batch order. */
const phase8Entries = futureEntries.filter(entry => entry.phase === 8);
for (let i = 0; i < phase8Batches.length; i += 1) {
  const batch = phase8Batches[i];
  const rows = phase8Entries.filter(entry => entry.batch === batch);
  const batchHasStarted = rows.some(entry => entry.status !== 'pending');
  if (!batchHasStarted) continue;

  for (const previousBatch of phase8Batches.slice(0, i)) {
    const previousRows = phase8Entries.filter(entry => entry.batch === previousBatch);
    const incomplete = previousRows.filter(entry => entry.status !== 'done');
    if (incomplete.length) {
      fail(`Phase-8 batch ${batch} has started before predecessor ${previousBatch} is fully done (${incomplete.length} incomplete row(s))`);
    }
  }
}

const active = ledger.activeExecution;
if (!active || !['idle', 'active'].includes(active.status)) {
  fail('activeExecution.status must be "idle" or "active"');
} else if (active.status === 'idle') {
  if (inProgressEntries.length) {
    fail(`activeExecution is idle but ${inProgressEntries.length} Phase-8+ row(s) are in-progress`);
  }
  for (const key of ['phase', 'batch', 'branch', 'pr', 'recordPath', 'baseMainSha']) {
    if (active[key] !== null) {
      fail(`activeExecution is idle but ${key} is not null: ${JSON.stringify(active[key])}`);
    }
  }
} else {
  if (!Number.isInteger(active.phase) || active.phase < 8) {
    fail(`activeExecution.phase must be an integer >= 8; found ${JSON.stringify(active.phase)}`);
  } else if (active.phase !== nextIncompletePhase) {
    fail(`activeExecution.phase must equal next incomplete Phase ${nextIncompletePhase}; found ${active.phase}`);
  }
  if (typeof active.branch !== 'string' || !active.branch.trim()) {
    fail('activeExecution.branch must identify the one active implementation branch');
  }
  if (typeof active.baseMainSha !== 'string' || !/^[0-9a-f]{40}$/u.test(active.baseMainSha)) {
    fail('activeExecution.baseMainSha must be a full current-main SHA');
  }
  if (
    typeof active.recordPath !== 'string' ||
    !active.recordPath.startsWith('docs/naming-cleanup-phase-records/') ||
    !repoPathExists(active.recordPath)
  ) {
    fail(`activeExecution.recordPath must be an existing file under docs/naming-cleanup-phase-records/; found ${JSON.stringify(active.recordPath)}`);
  }
  if (active.phase === 8 && !phase8BatchSet.has(active.batch)) {
    fail(`activeExecution.batch must be one of 8A-8H for Phase 8; found ${JSON.stringify(active.batch)}`);
  }
  if (!inProgressEntries.length) {
    fail('activeExecution is active but no Phase-8+ ledger row is in-progress');
  }
  for (const entry of inProgressEntries) {
    if (entry.phase !== active.phase) {
      fail(`in-progress row ${entry.id} belongs to Phase ${entry.phase}, not active Phase ${active.phase}`);
    }
    if (active.phase === 8 && entry.batch !== active.batch) {
      fail(`in-progress Phase-8 row ${entry.id} belongs to ${entry.batch}, not active batch ${active.batch}`);
    }
    if (entry.verificationRecord !== active.recordPath) {
      fail(`in-progress row ${entry.id} must use activeExecution.recordPath ${JSON.stringify(active.recordPath)}`);
    }
  }
}

for (let phase = 8; phase <= Number(ledger.lastCompletedPhase); phase += 1) {
  const phaseRows = futureEntries.filter(entry => entry.phase === phase);
  const incomplete = phaseRows.filter(entry => entry.status !== 'done');
  if (phaseRows.length && incomplete.length) {
    fail(`lastCompletedPhase=${ledger.lastCompletedPhase}, but Phase ${phase} still has ${incomplete.length} non-done row(s)`);
  }
}

if (failures.length) {
  console.error(`Naming-cleanup ledger contract check failed for ${ledgerRelativePath}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const phase8Counts = Object.fromEntries(
  (Array.isArray(phase8Batches) ? phase8Batches : []).map(batch => [batch, phase8Entries.filter(entry => entry.batch === batch).length]),
);
console.log(
  `Naming-cleanup ledger contract valid: schema=v4; gate=${gate.status}; active=${active.status}; ` +
  `${futureEntries.length} Phase-8+ rows carry verification state/evidence pointers; ` +
  `Phase-8 batches=${JSON.stringify(phase8Counts)}.`,
);
