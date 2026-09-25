import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir=mkdtempSync(path.join(os.tmpdir(),'ws1-confirmation-evaluator-'));
const script=path.resolve('scripts/evaluate-ws1-late-continuation-confirmation.mjs');

function run(name, combined) {
  const input=path.join(dir,`${name}-scoring.json`);
  const out=path.join(dir,`${name}-verdict.json`);
  writeFileSync(input,JSON.stringify({
    schemaVersion:1,
    kind:'pathfinder-action-selection-frozen-model-challenge',
    actionBoundaryDigest:'sha256:test',
    combined:{
      schemaVersion:1,
      kind:'pathfinder-action-selection-frozen-legal-signal-evaluation',
      ...combined,
    },
  }));
  execFileSync(process.execPath,[script,`--input=${input}`,`--out=${out}`],{stdio:'pipe'});
  return JSON.parse(readFileSync(out,'utf8'));
}

const positive=run('positive',{
  endangeredWinnerLevels:0,
  nominatedPreWinnerLevels:3,
  capturedPreWinnerWorkShare:0.05,
  diagnostics:{
    maxNominatedParentWorkShare:0.35,
    nominatedSameStageContinuationWorkShare:0.500001,
  },
});
assert.equal(positive.verdict,'positive');
assert.equal(positive.frozenProtocol.masterSeed,2026092591);
assert.equal(positive.frozenProtocol.parentCount,160);
assert.equal(positive.criteria.every(row=>row.pass),true);

const breadthNegative=run('breadth-negative',{
  endangeredWinnerLevels:0,
  nominatedPreWinnerLevels:2,
  capturedPreWinnerWorkShare:0.50,
  diagnostics:{
    maxNominatedParentWorkShare:0.20,
    nominatedSameStageContinuationWorkShare:0.90,
  },
});
assert.equal(breadthNegative.verdict,'negative');
assert.equal(breadthNegative.criteria.find(row=>row.id==='independent-parent-breadth').pass,false);

const safetyNegative=run('safety-negative',{
  endangeredWinnerLevels:1,
  nominatedPreWinnerLevels:10,
  capturedPreWinnerWorkShare:0.50,
  diagnostics:{
    maxNominatedParentWorkShare:0.20,
    nominatedSameStageContinuationWorkShare:0.90,
  },
});
assert.equal(safetyNegative.verdict,'negative');
assert.equal(safetyNegative.criteria.find(row=>row.id==='winner-safety').pass,false);

console.log('WS1 late-continuation confirmation evaluator: ok');
