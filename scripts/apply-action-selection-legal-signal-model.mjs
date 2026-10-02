#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { actionBoundaryDigest, attemptWorkCoverage, buildActionBoundaryDataset, applyFrozenLegalSignalModel } from './analyze-action-selection-legal-signals.mjs';

const argv=process.argv.slice(2);
const arg=n=>argv.find(v=>v.startsWith(`--${n}=`))?.slice(n.length+3) ?? null;
const inputs=String(arg('inputs') ?? '').split(',').map(v=>v.trim()).filter(Boolean);
const modelPath=arg('model');
const out=arg('out');
if (!inputs.length || !modelPath || !out) {
  throw new Error('--inputs=<a.json,b.json> --model=<frozen-model.json> --out=<result.json> are required');
}

const allowMissingWork=argv.includes('--allow-missing-work');
const model=JSON.parse(readFileSync(modelPath,'utf8'));
const merged={schemaVersion:1,kind:'pathfinder-action-boundary-retained-evidence',rows:[]};
const inputMetadata=[];
const coverageByInput={};
for (const input of inputs) {
  const doc=JSON.parse(readFileSync(input,'utf8'));
  coverageByInput[input]=attemptWorkCoverage(doc);
  const ds=buildActionBoundaryDataset(doc,{source:input});
  merged.rows.push(...ds.rows);
  inputMetadata.push({
    source:input,
    timestamp:doc?.timestamp ?? null,
    commitSha:doc?.commitSha ?? null,
    configurationHash:doc?.configurationHash ?? null,
    solved:doc?.solved ?? null,
    observedLevels:Array.isArray(doc?.levels) ? doc.levels.length : null,
    actionBoundaryDigest:actionBoundaryDigest(ds),
  });
}
const sources=[...new Set(merged.rows.map(r=>r.source))];
const result={
  schemaVersion:1,
  kind:'pathfinder-action-selection-frozen-model-challenge',
  modelPath,
  inputMetadata,
  actionBoundaryDigest:actionBoundaryDigest(merged),
  attemptWorkCoverage:{ complete:Object.values(coverageByInput).every(c=>c.complete), byInput:coverageByInput },
  combined:applyFrozenLegalSignalModel(merged,model),
  bySource:Object.fromEntries(
    sources.map(source=>[
      source,
      ({...applyFrozenLegalSignalModel({...merged,rows:merged.rows.filter(r=>r.source===source)},model), actionBoundaryDigest:actionBoundaryDigest({...merged,rows:merged.rows.filter(r=>r.source===source)})}),
    ])
  ),
};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(out,`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));
if (!result.attemptWorkCoverage.complete && !allowMissingWork) {
  console.error('apply-action-selection-legal-signal-model: INSTRUMENT INVALID -- not every reachable attempt carries workSpent (see attemptWorkCoverage). '
    + 'The work-banded signatures cannot match without it; a zero-nomination result is not a transfer result. '
    + 'Re-produce the input with --lifecycle-telemetry (level-blind-capability-sweep) or pass --allow-missing-work for exploratory use only.');
  process.exit(3);
}
