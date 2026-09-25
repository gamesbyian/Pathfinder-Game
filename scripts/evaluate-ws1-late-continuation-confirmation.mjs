#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = name => argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const input = arg('input');
const out = arg('out');
if (!input || !out) {
  console.error('usage: node scripts/evaluate-ws1-late-continuation-confirmation.mjs --input=<scoring.json> --out=<verdict.json>');
  process.exit(2);
}

let doc;
try {
  doc = JSON.parse(fs.readFileSync(input, 'utf8'));
} catch (error) {
  console.error(`unable to read scoring input: ${error.message}`);
  process.exit(2);
}

const result = doc?.combined;
if (!result || result.kind !== 'pathfinder-action-selection-frozen-legal-signal-evaluation') {
  console.error('scoring input is missing combined frozen-model evaluation');
  process.exit(2);
}

const requiredNumeric = [
  ['endangeredWinnerLevels', result.endangeredWinnerLevels],
  ['nominatedPreWinnerLevels', result.nominatedPreWinnerLevels],
];
for (const [name, value] of requiredNumeric) {
  if (!Number.isFinite(value)) {
    console.error(`scoring input is missing numeric ${name}`);
    process.exit(2);
  }
}

const capturedShare = result.capturedPreWinnerWorkShare;
const sameStageShare = result?.diagnostics?.nominatedSameStageContinuationWorkShare;
const maxParentShare = result?.diagnostics?.maxNominatedParentWorkShare;

const criteria = [
  {
    id: 'winner-safety',
    description: 'zero recorded winner endangerment',
    observed: result.endangeredWinnerLevels,
    pass: result.endangeredWinnerLevels === 0,
  },
  {
    id: 'captured-work-share',
    description: 'captured canonical pre-winner work share >= 5%',
    observed: capturedShare,
    pass: Number.isFinite(capturedShare) && capturedShare >= 0.05,
  },
  {
    id: 'independent-parent-breadth',
    description: 'at least 3 independently nominated parents',
    observed: result.nominatedPreWinnerLevels,
    pass: result.nominatedPreWinnerLevels >= 3,
  },
  {
    id: 'parent-concentration',
    description: 'no single parent contributes more than 35% of nominated work',
    observed: maxParentShare,
    pass: Number.isFinite(maxParentShare) && maxParentShare <= 0.35,
  },
  {
    id: 'same-stage-majority',
    description: 'more than 50% of nominated pre-winner work is same-stage late continuation',
    observed: sameStageShare,
    pass: Number.isFinite(sameStageShare) && sameStageShare > 0.50,
  },
];

const verdict = criteria.every(row => row.pass) ? 'positive' : 'negative';
const output = {
  schemaVersion: 1,
  kind: 'pathfinder-ws1-late-continuation-single-stage-verdict',
  researchQuestion: 'WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE',
  frozenProtocol: {
    parentCount: 160,
    masterSeed: 2026092591,
    blockId: 'ws1-late-continuation-single-001',
    idPrefix: 'U',
    breadthFloor: 3,
    capturedWorkShareFloor: 0.05,
    maxParentWorkShare: 0.35,
    sameStageWorkShareFloorExclusive: 0.50,
  },
  scoringInput: input,
  actionBoundaryDigest: doc.actionBoundaryDigest ?? null,
  verdict,
  criteria,
};

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
