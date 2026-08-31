#!/usr/bin/env node
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const source = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
mkdirSync('tmp', { recursive: true });
const fixturePath = `tmp/naming-cleanup-ledger-contract-${process.pid}.json`;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function run(ledger) {
  writeFileSync(fixturePath, `${JSON.stringify(ledger, null, 2)}\n`);
  return spawnSync(process.execPath, ['scripts/check-naming-cleanup-ledger.mjs', `--ledger=${fixturePath}`], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function expectPass(name, ledger) {
  const result = run(ledger);
  if (result.status !== 0) {
    throw new Error(`${name}: expected pass, got ${result.status}\n${result.stdout}\n${result.stderr}`);
  }
}

function expectFail(name, ledger, pattern) {
  const result = run(ledger);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0) throw new Error(`${name}: expected failure`);
  if (!pattern.test(output)) {
    throw new Error(`${name}: failure did not match ${pattern}\n${output}`);
  }
}

try {
  expectPass('current ledger', source);

  {
    const status = spawnSync(process.execPath, ['scripts/naming-cleanup-status.mjs', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    if (status.status !== 0) throw new Error(`naming status failed:\n${status.stdout}\n${status.stderr}`);
    const parsed = JSON.parse(status.stdout);
    // Assert the live invariants of naming:status's --json shape without hardcoding a
    // transient batch. This covers normal Phase-8 batch work, the post-8H phase-closeout state,
    // and later phases after lastCompletedPhase advances.
    const expectedNextPhase = Number(source.lastCompletedPhase) + 1;
    if (parsed.nextPhase !== expectedNextPhase) {
      throw new Error(`naming status expected next Phase ${expectedNextPhase}, got ${parsed.nextPhase}`);
    }

    if (parsed.nextPhase === 8) {
      const phase8BatchOrder = source.phaseBatches?.['8'] ?? [];
      if (parsed.nextBatch === null) {
        if (parsed.nextAction !== 'phase-closeout') {
          throw new Error(`all Phase-8 batches merged expects phase-closeout, got ${JSON.stringify(parsed.nextAction)}`);
        }
        if (!phase8BatchOrder.every(batch => source.batchCompletions?.[batch]?.status === 'merged')) {
          throw new Error('phase-closeout requires every Phase-8 batchCompletion to be merged');
        }
        if (parsed.nextScope.count !== 0) {
          throw new Error(`phase-closeout expects an empty batch-scoped nextScope, got ${parsed.nextScope.count}`);
        }
      } else {
        if (!phase8BatchOrder.includes(parsed.nextBatch)) {
          throw new Error(`naming status returned unknown Phase-8 batch ${parsed.nextBatch}`);
        }
        if (parsed.nextAction === 'start-batch') {
          if (parsed.batchCompletion?.status !== 'pending') {
            throw new Error(`start-batch action expects a pending batchCompletion, got ${parsed.batchCompletion?.status}`);
          }
          if (parsed.nextScope.counts.done !== 0) {
            throw new Error(`start-batch action expects zero done rows in next-scope, got ${parsed.nextScope.counts.done}`);
          }
        } else if (parsed.nextAction === 'merge-or-record-batch-completion') {
          if (parsed.batchCompletion?.status !== 'pending') {
            throw new Error(`merge-or-record-batch-completion expects a pending batchCompletion, got ${parsed.batchCompletion?.status}`);
          }
          if (parsed.nextScope.counts.pending !== 0 || parsed.nextScope.counts['in-progress'] !== 0) {
            throw new Error('merge-or-record-batch-completion expects every next-scope row done');
          }
        } else if (!['continue-active-batch', 'repair-active-execution-state'].includes(parsed.nextAction)) {
          throw new Error(`naming status returned unexpected Phase-8 nextAction ${JSON.stringify(parsed.nextAction)}`);
        }
        if (!parsed.nextScope.rows.every(row => typeof row.id === 'string' && row.id.startsWith('NC-P08-'))) {
          throw new Error('naming status did not expose stable Phase-8 row IDs');
        }
      }
    } else {
      if (parsed.nextBatch !== null) {
        throw new Error(`non-Phase-8 status must not expose a Phase-8 batch, got ${parsed.nextBatch}`);
      }
      const expectedAction = parsed.activeExecution?.status === 'active' ? 'continue-active-phase' : 'start-phase';
      if (parsed.nextAction !== expectedAction) {
        throw new Error(`non-Phase-8 status expected ${expectedAction}, got ${parsed.nextAction}`);
      }
      if (!parsed.nextScope.rows.every(row => row.phase === parsed.nextPhase && typeof row.id === 'string')) {
        throw new Error('naming status nextScope does not match the next incomplete phase');
      }
    }
  }

  {
    const ledger = clone(source);
    ledger.phaseBatches['8'] = ['8A', '8A'];
    expectFail('batch order must be unique', ledger, /phaseBatches\["8"\] must be a non-empty unique ordered batch list/u);
  }

  {
    const ledger = clone(source);
    delete ledger.batchCompletions['8A'];
    expectFail('batch completion record required', ledger, /batchCompletions keys must exactly match Phase-8 batches/u);
  }

  {
    const ledger = clone(source);
    // Force this batch's own merge barrier back to unmerged/pending regardless of the real
    // ledger's current batchCompletions state, so this negative case stays meaningful once 8A
    // (or any predecessor batch) has actually merged on `main`.
    ledger.batchCompletions['8A'] = { status: 'pending', pr: null, mergeCommit: null };
    for (const row of ledger.entries.filter(entry => entry.phase === 8 && entry.batch === '8A')) {
      row.status = 'done';
      row.verificationRecord = 'docs/naming-cleanup-phase-records/phase-08.md';
      for (const key of Object.keys(row.verification)) row.verification[key] = 'done';
    }
    const row = ledger.entries.find(entry => entry.phase === 8 && entry.batch === '8B');
    row.status = 'in-progress';
    row.verificationRecord = 'docs/naming-cleanup-phase-records/phase-08.md';
    ledger.activeExecution = {
      status: 'active',
      phase: 8,
      batch: '8B',
      branch: 'test/same-branch-stack',
      pr: null,
      baseMainSha: 'a2cb5162c551a700672e2edd7756af5785bc8aff',
      recordPath: 'docs/naming-cleanup-phase-records/phase-08.md',
      notes: 'fixture',
    };
    expectFail('done rows do not satisfy merge barrier', ledger, /8B has started before predecessor 8A is recorded merged/u);
  }

  {
    const ledger = clone(source);
    ledger.entries[1].id = ledger.entries[0].id;
    expectFail('duplicate row id', ledger, /duplicate id/u);
  }

  {
    const ledger = clone(source);
    const row = ledger.entries.find(entry => entry.phase >= 8 && entry.persistence === 'dual-read');
    delete row.compatibility;
    expectFail('dual-read compatibility policy required', ledger, /must define compatibility ownership and retirement/u);
  }

  {
    const ledger = clone(source);
    const nextIncompletePhase = Number(source.lastCompletedPhase) + 1;
    const skippedPhase = nextIncompletePhase + 1;
    const row = ledger.entries.find(entry => entry.phase === skippedPhase);
    if (!row) throw new Error(`skip-phase fixture needs a row after Phase ${nextIncompletePhase}`);
    row.status = 'in-progress';
    row.verificationRecord = 'docs/naming-cleanup-phase-records/phase-08.md';
    ledger.activeExecution = {
      status: 'active',
      phase: skippedPhase,
      batch: null,
      branch: `test/phase${skippedPhase}-skip`,
      pr: null,
      baseMainSha: 'a2cb5162c551a700672e2edd7756af5785bc8aff',
      recordPath: 'docs/naming-cleanup-phase-records/phase-08.md',
      notes: 'fixture',
    };
    expectFail('cannot skip incomplete phase', ledger, /ahead of next incomplete Phase|must equal next incomplete Phase/u);
  }

  {
    const ledger = clone(source);
    delete ledger.phaseClosures['10'].mergedTreeCloseout.finalHeadSha;
    expectFail('Phase-10+ closeout requires final head evidence', ledger, /mergedTreeCloseout\.finalHeadSha must be a full commit SHA/u);
  }

  {
    const ledger = clone(source);
    delete ledger.phaseClosures['11'].implementation.browserRunId;
    expectFail('Phase-11 implementation requires browser evidence', ledger, /implementation must record the successful exact-head Phase-11 browser run/u);
  }

  {
    const ledger = clone(source);
    delete ledger.phaseClosures['11'].mergedTreeCloseout.browserRunId;
    expectFail('Phase-11 closeout requires browser evidence', ledger, /mergedTreeCloseout must record the successful exact-head Phase-11 browser run/u);
  }

  {
    const ledger = clone(source);
    // As above: force the predecessor merge barrier back to unmerged so this negative case is
    // meaningful regardless of whether 8A (or any predecessor batch) has actually merged.
    ledger.batchCompletions['8A'] = { status: 'pending', pr: null, mergeCommit: null };
    const row = ledger.entries.find(entry => entry.phase === 8 && entry.batch === '8B');
    row.status = 'in-progress';
    row.verificationRecord = 'docs/naming-cleanup-phase-records/phase-08.md';
    ledger.activeExecution = {
      status: 'active',
      phase: 8,
      batch: '8B',
      branch: 'test/phase8b-skip',
      pr: null,
      baseMainSha: 'a2cb5162c551a700672e2edd7756af5785bc8aff',
      recordPath: 'docs/naming-cleanup-phase-records/phase-08.md',
      notes: 'fixture',
    };
    expectFail('cannot skip predecessor batch', ledger, /8B has started before predecessor 8A/u);
  }

  {
    const ledger = clone(source);
    const row = ledger.entries.find(entry => entry.phase === 8 && entry.batch === '8A');
    row.status = 'in-progress';
    row.verificationRecord = 'docs/naming-cleanup-phase-records/does-not-exist.md';
    ledger.activeExecution = {
      status: 'active',
      phase: 8,
      batch: '8A',
      branch: 'test/missing-record',
      pr: null,
      baseMainSha: 'a2cb5162c551a700672e2edd7756af5785bc8aff',
      recordPath: 'docs/naming-cleanup-phase-records/does-not-exist.md',
      notes: 'fixture',
    };
    expectFail('verification record must exist', ledger, /existing checked-in record|recordPath must be an existing file/u);
  }


  {
    const ledger = clone(source);
    delete ledger.phaseCloseoutCoverage['10']['NC-P10-006'];
    expectFail('Phase-10 closeout coverage must own every row', ledger, /keys must exactly match Phase-10 rows/u);
  }

  {
    const ledger = clone(source);
    ledger.phaseCurrentArtifacts['10'] = [];
    expectFail('Phase-10 current artifacts cannot be blanket-excluded', ledger, /unique non-empty registry/u);
  }

  {
    const ledger = clone(source);
    for (const row of ledger.entries.filter(entry => entry.phase === 9)) {
      row.status = 'done';
      row.verificationRecord = 'docs/naming-cleanup-phase-records/phase-09-final-audit.md';
      for (const key of Object.keys(row.verification)) row.verification[key] = 'done';
    }
    // Isolate the closed-Phase-9 fixture from whichever later phase is active in the source ledger.
    for (const row of ledger.entries.filter(entry => entry.phase > 9)) row.status = 'pending';
    ledger.lastCompletedPhase = 9;
    ledger.activeExecution = {
      status: 'idle', phase: null, batch: null, branch: null, pr: null,
      baseMainSha: null, recordPath: null, notes: 'fixture closed',
    };
    ledger.phaseClosures['9'] = {
      status: 'closed',
      recordPath: 'docs/naming-cleanup-phase-records/phase-09-final-audit.md',
      implementation: {
        pr: 9991,
        finalHeadSha: '1111111111111111111111111111111111111111',
        ciRunId: 9992,
        ciConclusion: 'success',
        mergeCommit: '2222222222222222222222222222222222222222',
      },
      mergedTreeCloseout: {
        baseMainSha: '2222222222222222222222222222222222222222',
        pr: 9993,
        ciPolicy: 'exact-head-green-before-merge',
      },
    };
    expectPass('structured Phase-9 closure can complete the phase', ledger);

    const missing = clone(ledger);
    delete missing.phaseClosures['9'];
    expectFail('completed Phase-9 requires structured closure evidence', missing, /lacks a closed structured phaseClosures record/u);

    const failedCi = clone(ledger);
    failedCi.phaseClosures['9'].implementation.ciConclusion = 'failure';
    expectFail('structured closure requires green implementation CI', failedCi, /successful exact-head CI run/u);

    const driftedRecord = clone(ledger);
    driftedRecord.phaseClosures['9'].recordPath = 'docs/naming-cleanup-phase-records/phase-09-repair.md';
    expectFail('structured closure record must match phase execution authority', driftedRecord, /must match phaseExecutionRecords/u);

    const reopened = clone(ledger);
    reopened.phaseClosures['9'] = {
      status: 'reopened',
      recordPath: 'docs/naming-cleanup-phase-records/phase-09-final-audit.md',
      reason: 'fixture',
    };
    expectFail('completed Phase-9 cannot have reopened closure evidence', reopened, /closure is reopened|lacks a closed structured/u);
  }

  console.log('Naming-cleanup ledger checker self-test passed.');
} finally {
  rmSync(fixturePath, { force: true });
}