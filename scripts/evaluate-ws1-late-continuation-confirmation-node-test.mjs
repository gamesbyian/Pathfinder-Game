import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir=mkdtempSync(path.join(os.tmpdir(),'ws1-verdict-'));
const script=path.resolve('scripts/evaluate-ws1-late-continuation-confirmation.mjs');

function run(name, combined) {
  const input=path.join(dir,`${name}-input.json`);
  const out=path.join(dir,`${name}-out.json`);
  writeFileSync(input, JSON.stringify({
    kind:'pathfinder-action-selection-frozen-model-challenge',
    actionBoundaryDigest:'sha256:fixture',
    combined:{kind:'pathfinder-action-selection-frozen-legal-signal-evaluation', ...combined},
  }));
  execFileSync(process.execPath,[script,`--input=${input}`,`--out=${out}`],{stdio:'pipe'});
  return JSON.parse(readFileSync(out,'utf8'));
}

try {
  const positive=run('positive',{
    endangeredWinnerLevels:0,
    nominatedPreWinnerLevels:4,
    capturedPreWinnerWorkShare:0.08,
    diagnostics:{
      maxNominatedParentWorkShare:0.30,
      nominatedSameStageContinuationWorkShare:0.75,
    },
  });
  assert.equal(positive.verdict,'positive');
  assert.ok(positive.criteria.every(row=>row.pass));

  const negative=run('negative',{
    endangeredWinnerLevels:0,
    nominatedPreWinnerLevels:2,
    capturedPreWinnerWorkShare:0.08,
    diagnostics:{
      maxNominatedParentWorkShare:0.30,
      nominatedSameStageContinuationWorkShare:0.75,
    },
  });
  assert.equal(negative.verdict,'negative');
  assert.equal(negative.criteria.find(row=>row.id==='independent-parent-breadth').pass,false);

  const concentrated=run('concentrated',{
    endangeredWinnerLevels:0,
    nominatedPreWinnerLevels:4,
    capturedPreWinnerWorkShare:0.08,
    diagnostics:{
      maxNominatedParentWorkShare:0.36,
      nominatedSameStageContinuationWorkShare:0.75,
    },
  });
  assert.equal(concentrated.verdict,'negative');

  const halfSameStage=run('half-same-stage',{
    endangeredWinnerLevels:0,
    nominatedPreWinnerLevels:4,
    capturedPreWinnerWorkShare:0.08,
    diagnostics:{
      maxNominatedParentWorkShare:0.30,
      nominatedSameStageContinuationWorkShare:0.50,
    },
  });
  assert.equal(halfSameStage.verdict,'negative');
} finally {
  rmSync(dir,{recursive:true,force:true});
}

console.log('WS1 single-stage verdict evaluator tests passed');
