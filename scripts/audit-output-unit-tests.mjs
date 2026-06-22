#!/usr/bin/env node
/** Unit tests for the audit-output guard script. */
import assert from 'node:assert/strict';
import { test, run } from './test-lib/harness.mjs';
import { spawnSync } from 'node:child_process';


const runGuard = (input) => spawnSync(process.execPath, ['scripts/check-audit-output.mjs'], {
  input,
  encoding: 'utf8',
});

const validAudit = {
  levels: [{
    level: 1,
    attempts: [{
      label: 'fixture-attempt',
      nodesExpanded: 10,
      pruneBreakdown: { total: 2 },
      memoHitRate: 0.1,
      dominanceHitRate: 0,
      nogoodHitRate: 0,
      counterIntegrityStatus: { generatedNodes: 8 },
      statsProvenance: { source: 'unit-test' },
    }],
  }],
};

test('check-audit-output accepts telemetry with required Segment-0 fields', () => {
  const result = runGuard(JSON.stringify(validAudit));
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Audit output check passed/);
});

test('check-audit-output rejects unexpected-exception pre-expansion aborts', () => {
  const result = runGuard(JSON.stringify({ preExpansionAbort: { code: 'unexpected-exception' } }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected-exception/);
});

test('check-audit-output rejects missing attempt telemetry fields', () => {
  const result = runGuard(JSON.stringify({ levels: [{ level: 1, attempts: [{ label: 'missing-fields', nodesExpanded: 1 }] }] }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /telemetry missing required fields/);
});

await run('Audit output guard tests');
