#!/usr/bin/env node
/**
 * Enforce the prospective completion/specification model for docs/naming-cleanup-ledger.json.
 *
 * Contract v5 extends v4 with explicit current-artifact ownership and structured Phase-9+ closure evidence:
 * - immutable row IDs so prose edits do not change row identity;
 * - explicit compatibility ownership/retirement for future dual-read rows;
 * - serial phase/batch dependency enforcement;
 * - durable verification-record requirements;
 * - one active execution claim at a time.
 *
 * Use --ledger=<path> to validate a mutated fixture in the checker self-test.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { repositoryPathKind } from './repository-file-view.mjs';

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
const phaseBatches = ledger.phaseBatches;
const phaseBatchOrders = new Map();
const expectedBatchKeys = new Set();
if (!phaseBatches || typeof phaseBatches !== 'object' || Array.isArray(phaseBatches)) {
  failures.push('phaseBatches must be an object keyed by phase number');
} else {
  for (const [phaseKey, order] of Object.entries(phaseBatches)) {
    const phase = Number(phaseKey);
    if (!Number.isInteger(phase) || phase < 1 || !Array.isArray(order) || !order.length ||
        new Set(order).size !== order.length || order.some(batch => typeof batch !== 'string' || !batch.trim())) {
      failures.push(`phaseBatches["${phaseKey}"] must be a non-empty unique ordered batch list`);
      continue;
    }
    phaseBatchOrders.set(phase, order);
    for (const batch of order) {
      if (expectedBatchKeys.has(batch)) failures.push(`batch id ${batch} is reused across phaseBatches`);
      expectedBatchKeys.add(batch);
    }
  }
}
const allowedPhaseBatchKinds = new Set(['implementation', 'specification-gate', 'merged-tree-closeout', 'finalization']);
const phaseBatchKinds = ledger.phaseBatchKinds ?? {};
if (typeof phaseBatchKinds !== 'object' || Array.isArray(phaseBatchKinds)) {
  failures.push('phaseBatchKinds must be an object keyed by batched phase');
}
function batchKind(phase, batch) {
  return phaseBatchKinds?.[String(phase)]?.[batch] ?? 'implementation';
}
for (const [phaseKey, kinds] of Object.entries(phaseBatchKinds ?? {})) {
  const phase = Number(phaseKey);
  const order = phaseBatchOrders.get(phase);
  if (!order || !kinds || typeof kinds !== 'object' || Array.isArray(kinds)) {
    failures.push(`phaseBatchKinds["${phaseKey}"] must describe an existing batched phase`);
    continue;
  }
  const kindKeys = Object.keys(kinds).sort();
  const expectedKeys = [...order].sort();
  if (JSON.stringify(kindKeys) !== JSON.stringify(expectedKeys)) {
    failures.push(`phaseBatchKinds["${phaseKey}"] keys must exactly match phaseBatches["${phaseKey}"]`);
  }
  for (const [batch, kind] of Object.entries(kinds)) {
    if (!allowedPhaseBatchKinds.has(kind)) failures.push(`phaseBatchKinds["${phaseKey}"].${batch} has invalid kind ${JSON.stringify(kind)}`);
  }
}

const batchCompletions = ledger.batchCompletions;
if (!batchCompletions || typeof batchCompletions !== 'object' || Array.isArray(batchCompletions)) {
  failures.push('batchCompletions must be an object keyed by every declared serial batch');
} else {
  const completionKeys = Object.keys(batchCompletions).sort();
  const expectedKeys = [...expectedBatchKeys].sort();
  if (JSON.stringify(completionKeys) !== JSON.stringify(expectedKeys)) {
    failures.push(`batchCompletions keys must exactly match all declared serial batches; found ${completionKeys.join(', ')}`);
  }
}
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
const allowedCloseoutCoverageKinds = new Set([
  'literal-legacy-surface',
  'semantic-contract',
  'retained-boundary',
  'compatibility-exemption',
]);
const allowedRetainedOwnerClasses = new Set([
  'behavior-sensitive',
  'compatibility-or-deferred',
  'distinct-semantic-contract',
  'frozen-history',
  'persisted-methodological',
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
    repositoryPathKind(root, relativePath) !== null;
}

function fail(message) {
  failures.push(message);
}

if (ledger.schemaVersion !== 5) {
  fail(`schemaVersion must be 5; found ${JSON.stringify(ledger.schemaVersion)}`);
}
if (ledger.completionContractVersion !== 5) {
  fail(`completionContractVersion must be 5; found ${JSON.stringify(ledger.completionContractVersion)}`);
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
for (const phase of phaseBatchOrders.keys()) {
  const recordPath = ledger.phaseExecutionRecords?.[String(phase)];
  if (typeof recordPath !== 'string' || !recordPath.startsWith('docs/naming-cleanup-phase-records/') || !repoPathExists(recordPath)) {
    fail(`Phase-${phase} declared serial execution must register an existing phaseExecutionRecords authority; found ${JSON.stringify(recordPath)}`);
  }
}

const phaseClosures = ledger.phaseClosures;
if (!phaseClosures || typeof phaseClosures !== 'object' || Array.isArray(phaseClosures)) {
  fail('phaseClosures must be an object keyed by phase number');
} else {
  for (const [phaseKey, closure] of Object.entries(phaseClosures)) {
    const phase = Number(phaseKey);
    if (!Number.isInteger(phase) || phase < 9) {
      fail(`phaseClosures key must be an integer Phase >= 9; found ${JSON.stringify(phaseKey)}`);
      continue;
    }
    if (!closure || typeof closure !== 'object' || Array.isArray(closure) ||
        !['reopened', 'closed'].includes(closure.status)) {
      fail(`phaseClosures["${phaseKey}"].status must be "reopened" or "closed"`);
      continue;
    }
    if (typeof closure.recordPath !== 'string' || !repoPathExists(closure.recordPath)) {
      fail(`phaseClosures["${phaseKey}"].recordPath must identify an existing checked-in phase record`);
    } else if (ledger.phaseExecutionRecords?.[phaseKey] !== closure.recordPath) {
      fail(`phaseClosures["${phaseKey}"].recordPath must match phaseExecutionRecords["${phaseKey}"]`);
    }
    if (closure.status === 'reopened') {
      if (phase <= Number(ledger.lastCompletedPhase)) {
        fail(`Phase ${phase} closure is reopened but lastCompletedPhase is ${ledger.lastCompletedPhase}`);
      }
      if (typeof closure.reason !== 'string' || !closure.reason.trim()) {
        fail(`phaseClosures["${phaseKey}"] reopened state requires a reason`);
      }
      continue;
    }

    const implementation = closure.implementation;
    if (!implementation || typeof implementation !== 'object' || Array.isArray(implementation)) {
      fail(`phaseClosures["${phaseKey}"].implementation must contain final merged implementation evidence`);
    } else {
      if (!Number.isInteger(implementation.pr) || implementation.pr < 1) {
        fail(`phaseClosures["${phaseKey}"].implementation.pr must be a positive PR number`);
      }
      for (const key of ['finalHeadSha', 'mergeCommit']) {
        if (typeof implementation[key] !== 'string' || !/^[0-9a-f]{40}$/u.test(implementation[key])) {
          fail(`phaseClosures["${phaseKey}"].implementation.${key} must be a full commit SHA`);
        }
      }
      if (!Number.isInteger(implementation.ciRunId) || implementation.ciRunId < 1 ||
          implementation.ciConclusion !== 'success') {
        fail(`phaseClosures["${phaseKey}"].implementation must record a successful exact-head CI run`);
      }
      if (Number(phaseKey) === 11 &&
          (!Number.isInteger(implementation.browserRunId) || implementation.browserRunId < 1 ||
           implementation.browserConclusion !== 'success')) {
        fail(`phaseClosures["${phaseKey}"].implementation must record the successful exact-head Phase-11 browser run`);
      }
    }

    if (Number(phaseKey) === 11) {
      const repair = closure.postCloseoutAuditRepair;
      if (!repair || typeof repair !== 'object' || Array.isArray(repair)) {
        fail(`phaseClosures["${phaseKey}"].postCloseoutAuditRepair must record the merged Phase-11 audit repair`);
      } else {
        if (!Number.isInteger(repair.pr) || repair.pr < 1) {
          fail(`phaseClosures["${phaseKey}"].postCloseoutAuditRepair.pr must be a positive PR number`);
        }
        for (const key of ['baseMainSha', 'finalHeadSha', 'mergeCommit']) {
          if (typeof repair[key] !== 'string' || !/^[0-9a-f]{40}$/u.test(repair[key])) {
            fail(`phaseClosures["${phaseKey}"].postCloseoutAuditRepair.${key} must be a full commit SHA`);
          }
        }
        if (!Number.isInteger(repair.ciRunId) || repair.ciRunId < 1 || repair.ciConclusion !== 'success') {
          fail(`phaseClosures["${phaseKey}"].postCloseoutAuditRepair must record successful exact-head CI`);
        }
        if (!Number.isInteger(repair.browserRunId) || repair.browserRunId < 1 ||
            repair.browserConclusion !== 'success') {
          fail(`phaseClosures["${phaseKey}"].postCloseoutAuditRepair must record the successful exact-head Phase-11 browser run`);
        }
      }
    }

    const closeout = closure.mergedTreeCloseout;
    if (!closeout || typeof closeout !== 'object' || Array.isArray(closeout)) {
      fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout must identify the merged-tree closure PR`);
    } else {
      if (typeof closeout.baseMainSha !== 'string' || !/^[0-9a-f]{40}$/u.test(closeout.baseMainSha)) {
        fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout.baseMainSha must be a full commit SHA`);
      }
      if (!Number.isInteger(closeout.pr) || closeout.pr < 1) {
        fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout.pr must be a positive PR number`);
      }
      if (closeout.ciPolicy !== 'exact-head-green-before-merge') {
        fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout.ciPolicy must require exact-head green CI before merge`);
      }
      if (Number(phaseKey) >= 10) {
        for (const key of ['finalHeadSha', 'mergeCommit']) {
          if (typeof closeout[key] !== 'string' || !/^[0-9a-f]{40}$/u.test(closeout[key])) {
            fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout.${key} must be a full commit SHA`);
          }
        }
        if (!Number.isInteger(closeout.ciRunId) || closeout.ciRunId < 1 ||
            closeout.ciConclusion !== 'success') {
          fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout must record a successful exact-head CI run`);
        }
      }
      if (Number(phaseKey) === 11 &&
          (!Number.isInteger(closeout.browserRunId) || closeout.browserRunId < 1 ||
           closeout.browserConclusion !== 'success')) {
        fail(`phaseClosures["${phaseKey}"].mergedTreeCloseout must record the successful exact-head Phase-11 browser run`);
      }
    }
  }
}

for (let phase = 9; phase <= Number(ledger.lastCompletedPhase); phase += 1) {
  const closure = phaseClosures?.[String(phase)];
  if (!closure || closure.status !== 'closed') {
    fail(`lastCompletedPhase=${ledger.lastCompletedPhase}, but Phase ${phase} lacks a closed structured phaseClosures record`);
  }
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

  if (Object.prototype.hasOwnProperty.call(entry, 'inventoryTerms')) {
    if (!Array.isArray(entry.inventoryTerms) || entry.inventoryTerms.length === 0 ||
        entry.inventoryTerms.some(term => typeof term !== 'string' || term.length < 3) ||
        new Set(entry.inventoryTerms).size !== entry.inventoryTerms.length) {
      fail(`${label}: inventoryTerms must be a non-empty unique array of strings at least 3 characters long`);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(entry, 'verificationRecord')) {
    fail(`${label}: Phase-8+ row must carry verificationRecord (null while pending, checked-in path while active/complete)`);
  } else if (entry.verificationRecord !== null && typeof entry.verificationRecord !== 'string') {
    fail(`${label}: verificationRecord must be null or a repository path string`);
  }

  const declaredBatchOrder = phaseBatchOrders.get(entry.phase);
  if (declaredBatchOrder && !declaredBatchOrder.includes(entry.batch)) {
    fail(`${label}: Phase ${entry.phase} row must be assigned to one of ${declaredBatchOrder.join(', ')}; found ${JSON.stringify(entry.batch)}`);
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

// Phase completion must not rely on a second hand-maintained list that can silently omit a row.
// The closeout checker consumes this ledger-indexed projection directly.
const phase8CoverageEntries = (ledger.entries ?? []).filter(entry => entry.phase === 8);
const phase8Coverage = ledger.phaseCloseoutCoverage?.['8'];
if (!phase8Coverage || typeof phase8Coverage !== 'object' || Array.isArray(phase8Coverage)) {
  fail('phaseCloseoutCoverage["8"] must be an object keyed by every Phase-8 ledger row');
} else {
  const expected = new Set(phase8CoverageEntries.map(entry => entry.id));
  for (const entry of phase8CoverageEntries) {
    const coverage = phase8Coverage[entry.id];
    if (!coverage || typeof coverage !== 'object' || Array.isArray(coverage)) {
      fail(`${entry.id}: missing Phase-8 closeout coverage classification`);
      continue;
    }
    if (!allowedCloseoutCoverageKinds.has(coverage.kind)) {
      fail(`${entry.id}: invalid closeout coverage kind ${JSON.stringify(coverage.kind)}`);
    }
    if (coverage.legacy !== entry.old) {
      fail(`${entry.id}: closeout coverage legacy must equal ledger old; found ${JSON.stringify(coverage.legacy)}`);
    }
    if (coverage.kind !== 'literal-legacy-surface' && (typeof coverage.contract !== 'string' || !coverage.contract.trim())) {
      fail(`${entry.id}: ${coverage.kind} coverage must name its semantic contract/exemption`);
    }
    if (Object.prototype.hasOwnProperty.call(coverage, 'files')) {
      if (!['retained-boundary', 'compatibility-exemption'].includes(coverage.kind) || !Array.isArray(coverage.files) || coverage.files.length === 0 ||
          coverage.files.some(file => typeof file !== 'string' || !repoPathExists(file)) ||
          new Set(coverage.files).size !== coverage.files.length) {
        fail(`${entry.id}: closeout coverage files must be a non-empty unique list of existing paths on a retained/compatibility boundary`);
      }
    }
    if (coverage.kind === 'compatibility-exemption' && !Object.prototype.hasOwnProperty.call(coverage, 'files')) {
      fail(`${entry.id}: compatibility-exemption coverage must enumerate its owning files`);
    }
  }
  for (const id of Object.keys(phase8Coverage)) {
    if (!expected.has(id)) fail(`phaseCloseoutCoverage["8"] contains unknown row ${id}`);
  }
}

const phase8RetainedSurfaces = ledger.phaseRetainedSurfaces?.['8'];
if (!Array.isArray(phase8RetainedSurfaces) || phase8RetainedSurfaces.length === 0) {
  fail('phaseRetainedSurfaces["8"] must be a non-empty retained-interface registry');
} else {
  const retainedIds = new Set();
  const retainedTermFiles = new Set();
  for (const retained of phase8RetainedSurfaces) {
    if (typeof retained.id !== 'string' || !/^NC-RET-P08-\d{3}$/u.test(retained.id) || retainedIds.has(retained.id)) {
      fail(`invalid or duplicate Phase-8 retained-surface id ${JSON.stringify(retained.id)}`);
    }
    retainedIds.add(retained.id);
    if (!Array.isArray(retained.matches) || retained.matches.length === 0) {
      fail(`${retained.id}: matches must be a non-empty term/file registry`);
    }
    if (typeof retained.owner !== 'string' || !retained.owner.trim() ||
        typeof retained.lifecycle !== 'string' || !retained.lifecycle.trim()) {
      fail(`${retained.id}: owner and lifecycle are required`);
    }
    if (!allowedRetainedOwnerClasses.has(retained.ownerClass)) {
      fail(`${retained.id}: invalid ownerClass ${JSON.stringify(retained.ownerClass)}`);
    }
    if (!Array.isArray(retained.ownerRowIds) || retained.ownerRowIds.length === 0 ||
        retained.ownerRowIds.some(id => typeof id !== 'string' || !ids.has(id)) ||
        new Set(retained.ownerRowIds).size !== retained.ownerRowIds.length ||
        !retained.ownerRowIds.some(id => id.startsWith('NC-P08-'))) {
      fail(`${retained.id}: ownerRowIds must be a non-empty unique list of existing rows including a Phase-8 owner`);
    }
    const matchTerms = new Set();
    for (const match of retained.matches ?? []) {
      if (!match || typeof match !== 'object' || typeof match.term !== 'string' || match.term.length < 3 || matchTerms.has(match.term)) {
        fail(`${retained.id}: every retained match must have a unique term of at least 3 characters`);
        continue;
      }
      matchTerms.add(match.term);
      if (!Array.isArray(match.files) || match.files.length === 0 ||
          match.files.some(file => typeof file !== 'string' || !repoPathExists(file)) ||
          new Set(match.files).size !== match.files.length) {
        fail(`${retained.id} ${match.term}: files must be a non-empty unique list of existing paths`);
      }
      for (const file of match.files ?? []) {
        const key = `${match.term}\0${file}`;
        if (retainedTermFiles.has(key)) fail(`${retained.id}: duplicate retained term/file ownership for ${match.term} @ ${file}`);
        retainedTermFiles.add(key);
      }
    }
  }
  const referencedRetainedIds = new Set();
  for (const entry of phase8CoverageEntries) {
    const references = phase8Coverage?.[entry.id]?.retainedSurfaceIds;
    if (references === undefined) continue;
    if (!Array.isArray(references) || references.length === 0 ||
        references.some(id => typeof id !== 'string' || !retainedIds.has(id)) ||
        new Set(references).size !== references.length) {
      fail(`${entry.id}: retainedSurfaceIds must be a non-empty unique list of registered Phase-8 retained surfaces`);
      continue;
    }
    for (const id of references) referencedRetainedIds.add(id);
  }
  for (const id of retainedIds) {
    if (!referencedRetainedIds.has(id)) fail(`${id}: retained surface must be referenced by at least one Phase-8 closeout coverage row`);
  }
}


/* Phase 10 records the intentionally retained external CLI/report spellings separately from the
 * retired internal local/transport identities, and registers live baseline artifacts explicitly. */
const phase10Entries = futureEntries.filter(entry => entry.phase === 10);
const phase10Coverage = ledger.phaseCloseoutCoverage?.['10'];
if (!phase10Coverage || typeof phase10Coverage !== 'object' || Array.isArray(phase10Coverage)) {
  fail('phaseCloseoutCoverage["10"] must be an object keyed by every Phase-10 row');
} else {
  const expected = phase10Entries.map(entry => entry.id).sort();
  const actual = Object.keys(phase10Coverage).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('phaseCloseoutCoverage["10"] keys must exactly match Phase-10 rows');
  for (const entry of phase10Entries) {
    const coverage = phase10Coverage[entry.id];
    if (!coverage || !allowedCloseoutCoverageKinds.has(coverage.kind) || coverage.legacy !== entry.old) {
      fail(`${entry.id}: missing/drifted Phase-10 closeout coverage`);
    }
  }
}
const phase10Retained = ledger.phaseRetainedSurfaces?.['10'];
if (!Array.isArray(phase10Retained) || phase10Retained.length !== 2) {
  fail('phaseRetainedSurfaces["10"] must register the distinct CLI and report-schema boundaries');
} else {
  const retainedIds = new Set(phase10Retained.map(entry => entry.id));
  for (const retained of phase10Retained) {
    if (!/^NC-RET-P10-\d{3}$/u.test(retained.id) || !allowedRetainedOwnerClasses.has(retained.ownerClass) ||
        !Array.isArray(retained.ownerRowIds) || !retained.ownerRowIds.includes('NC-P10-007') ||
        !Array.isArray(retained.matches) || retained.matches.length === 0) {
      fail(`${retained.id}: invalid Phase-10 retained-surface ownership`);
    }
    for (const match of retained.matches ?? []) {
      if (typeof match.term !== 'string' || !Array.isArray(match.files) || match.files.length === 0 ||
          match.files.some(file => !repoPathExists(file))) fail(`${retained.id}: retained match files must exist`);
    }
  }
  for (const id of phase10Coverage?.['NC-P10-007']?.retainedSurfaceIds ?? []) {
    if (!retainedIds.has(id)) fail(`NC-P10-007: unknown retained Phase-10 surface ${id}`);
  }
}
const phase10CurrentArtifacts = ledger.phaseCurrentArtifacts?.['10'];
if (!Array.isArray(phase10CurrentArtifacts) || phase10CurrentArtifacts.length === 0 ||
    new Set(phase10CurrentArtifacts).size !== phase10CurrentArtifacts.length ||
    phase10CurrentArtifacts.some(file => !repoPathExists(file))) {
  fail('phaseCurrentArtifacts["10"] must be a unique non-empty registry of existing paths');
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

/* Declared batched phases have explicit serial order and a durable merge barrier.
 * Rowless lifecycle gates are permitted only when phaseBatchKinds declares them explicitly. */
for (const [phase, batchOrder] of phaseBatchOrders.entries()) {
  const phaseEntries = futureEntries.filter(entry => entry.phase === phase);
  for (let i = 0; i < batchOrder.length; i += 1) {
    const batch = batchOrder[i];
    const rows = phaseEntries.filter(entry => entry.batch === batch);
    const completion = batchCompletions?.[batch];
    const kind = batchKind(phase, batch);
    const rowlessGate = kind !== 'implementation';

    if (rowlessGate && rows.length) {
      fail(`Phase-${phase} batch ${batch} is kind ${kind} and must be rowless; found ${rows.length} row(s)`);
    }
    if (!rowlessGate && rows.length === 0) {
      fail(`Phase-${phase} implementation batch ${batch} must own at least one ledger row`);
    }

    if (!completion || !['pending', 'merged'].includes(completion.status)) {
      fail(`batchCompletions.${batch}.status must be "pending" or "merged"`);
    } else if (completion.status === 'pending') {
      if (completion.pr !== null || completion.mergeCommit !== null) {
        fail(`batchCompletions.${batch} is pending, so pr and mergeCommit must be null`);
      }
    } else {
      if (!Number.isInteger(completion.pr) || completion.pr < 1) {
        fail(`batchCompletions.${batch}.pr must be a positive PR number when merged`);
      }
      if (typeof completion.mergeCommit !== 'string' || !/^[0-9a-f]{40}$/u.test(completion.mergeCommit)) {
        fail(`batchCompletions.${batch}.mergeCommit must be a full commit SHA when merged`);
      }
      const incompleteOwnRows = rows.filter(entry => entry.status !== 'done');
      if (incompleteOwnRows.length) {
        fail(`batchCompletions.${batch} is merged but ${incompleteOwnRows.length} row(s) are not done`);
      }
      for (const previousBatch of batchOrder.slice(0, i)) {
        if (batchCompletions?.[previousBatch]?.status !== 'merged') {
          fail(`batchCompletions.${batch} cannot be merged before predecessor ${previousBatch}`);
        }
      }
    }

    const batchHasStarted = rows.some(entry => entry.status !== 'pending') ||
      (ledger.activeExecution?.status === 'active' &&
       ledger.activeExecution.phase === phase &&
       ledger.activeExecution.batch === batch);
    if (!batchHasStarted) continue;

    for (const previousBatch of batchOrder.slice(0, i)) {
      const previousRows = phaseEntries.filter(entry => entry.batch === previousBatch);
      const incomplete = previousRows.filter(entry => entry.status !== 'done');
      if (incomplete.length) {
        fail(`Phase-${phase} batch ${batch} has started before predecessor ${previousBatch} is fully done (${incomplete.length} incomplete row(s))`);
      }
      if (batchCompletions?.[previousBatch]?.status !== 'merged') {
        fail(`Phase-${phase} batch ${batch} has started before predecessor ${previousBatch} is recorded merged`);
      }
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
  } else if (ledger.phaseExecutionRecords?.[String(active.phase)] !== active.recordPath) {
    fail(`activeExecution.recordPath must match phaseExecutionRecords["${active.phase}"]; found ${JSON.stringify(active.recordPath)}`);
  }
  const activeBatchOrder = phaseBatchOrders.get(active.phase);
  const activeKind = activeBatchOrder ? batchKind(active.phase, active.batch) : null;
  if (activeBatchOrder && !activeBatchOrder.includes(active.batch)) {
    fail(`activeExecution.batch must be one of ${activeBatchOrder.join(', ')} for Phase ${active.phase}; found ${JSON.stringify(active.batch)}`);
  }
  if (activeBatchOrder && activeKind !== 'implementation') {
    if (inProgressEntries.length) {
      fail(`active rowless ${activeKind} batch ${active.batch} cannot have in-progress implementation rows`);
    }
  } else if (!inProgressEntries.length) {
    fail('activeExecution is active but no implementation ledger row is in-progress');
  }
  for (const entry of inProgressEntries) {
    if (entry.phase !== active.phase) {
      fail(`in-progress row ${entry.id} belongs to Phase ${entry.phase}, not active Phase ${active.phase}`);
    }
    if (activeBatchOrder && entry.batch !== active.batch) {
      fail(`in-progress Phase-${active.phase} row ${entry.id} belongs to ${entry.batch}, not active batch ${active.batch}`);
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

for (const [phase, batchOrder] of phaseBatchOrders.entries()) {
  if (Number(ledger.lastCompletedPhase) < phase) continue;
  const unmergedBatches = batchOrder.filter(batch => batchCompletions?.[batch]?.status !== 'merged');
  if (unmergedBatches.length) {
    fail(`lastCompletedPhase=${ledger.lastCompletedPhase}, but Phase-${phase} batch merge completion is missing for: ${unmergedBatches.join(', ')}`);
  }
}

if (failures.length) {
  console.error(`Naming-cleanup ledger contract check failed for ${ledgerRelativePath}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const batchCounts = Object.fromEntries(
  [...phaseBatchOrders.entries()].map(([phase, order]) => [
    String(phase),
    Object.fromEntries(order.map(batch => [batch, futureEntries.filter(entry => entry.phase === phase && entry.batch === batch).length])),
  ]),
);
console.log(
  `Naming-cleanup ledger contract valid: schema=v5; gate=${gate.status}; active=${active.status}; ` +
  `${futureEntries.length} Phase-8+ rows carry verification state/evidence pointers; ` +
  `serial batches=${JSON.stringify(batchCounts)}.`,
);
