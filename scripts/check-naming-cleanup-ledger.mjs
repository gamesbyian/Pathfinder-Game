#!/usr/bin/env node
/**
 * Enforce the prospective completion model for docs/naming-cleanup-ledger.json.
 *
 * Phase 1-7 predate the stronger verification model and are intentionally left historical.
 * Phase 8+ rows must carry explicit verification dimensions, and a row cannot be marked done
 * while any applicable dimension is still pending. The Phase-8 implementation gate also prevents
 * work from being marked in-progress/done before the table-setting prerequisite is recorded ready.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledgerPath = path.join(root, 'docs', 'naming-cleanup-ledger.json');
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));

const failures = [];
const allowedEntryStatuses = new Set(['pending', 'in-progress', 'done']);
const allowedVerification = new Set(['pending', 'done', 'not-applicable']);
const verificationKeys = [
  'surfaceInventory',
  'implementation',
  'targetedValidation',
  'consumerAudit',
  'behavioralParity',
  'closeoutAudit',
];

if (ledger.schemaVersion !== 2) {
  failures.push(`schemaVersion must be 2; found ${JSON.stringify(ledger.schemaVersion)}`);
}
if (ledger.completionContractVersion !== 2) {
  failures.push(`completionContractVersion must be 2; found ${JSON.stringify(ledger.completionContractVersion)}`);
}
if (ledger.processHardeningAuthority !== 'docs/naming-cleanup-process-hardening.md') {
  failures.push('processHardeningAuthority must point at docs/naming-cleanup-process-hardening.md');
}

const gate = ledger.phase8Gate;
if (!gate || !['blocked', 'ready'].includes(gate.status)) {
  failures.push('phase8Gate.status must be "blocked" or "ready"');
}

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

  if (gate?.status === 'blocked' && entry.status !== 'pending') {
    failures.push(`${label}: Phase-8 gate is blocked, so Phase-8+ implementation rows must remain pending`);
  }
}

if (gate?.status === 'blocked' && Number(ledger.lastCompletedPhase) >= 8) {
  failures.push(`lastCompletedPhase is ${ledger.lastCompletedPhase} while the Phase-8 gate is blocked`);
}

if (failures.length) {
  console.error('Naming-cleanup ledger contract check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const future = (ledger.entries ?? []).filter(entry => entry.phase >= 8);
console.log(`Naming-cleanup ledger contract valid: Phase-8 gate=${gate.status}; ${future.length} Phase-8+ rows have explicit verification state.`);
