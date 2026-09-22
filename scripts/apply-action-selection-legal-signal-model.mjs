#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildActionBoundaryDataset, applyFrozenLegalSignalModel } from './analyze-action-selection-legal-signals.mjs';

const argv=process.argv.slice(2);
const arg=n=>argv.find(v=>v.startsWith(`--${n}=`))?.slice(n.length+3) ?? null;
const inputs=String(arg('inputs') ?? '').split(',').map(v=>v.trim()).filter(Boolean);
const modelPath=arg('model');
const out=arg('out');
if (!inputs.length || !modelPath || !out) {
  throw new Error('--inputs=<a.json,b.json> --model=<frozen-model.json> --out=<result.json> are required');
}

const model=JSON.parse(readFileSync(modelPath,'utf8'));
const merged={schemaVersion:1,kind:'pathfinder-action-boundary-retained-evidence',rows:[]};
for (const input of inputs) {
  const doc=JSON.parse(readFileSync(input,'utf8'));
  merged.rows.push(...buildActionBoundaryDataset(doc,{source:input}).rows);
}
const sources=[...new Set(merged.rows.map(r=>r.source))];
const result={
  schemaVersion:1,
  kind:'pathfinder-action-selection-frozen-model-challenge',
  modelPath,
  combined:applyFrozenLegalSignalModel(merged,model),
  bySource:Object.fromEntries(
    sources.map(source=>[
      source,
      applyFrozenLegalSignalModel({...merged,rows:merged.rows.filter(r=>r.source===source)},model),
    ])
  ),
};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(out,`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));
