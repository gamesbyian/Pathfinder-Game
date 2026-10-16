#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { analyzeConfirmation } from './pg-g-symmetry-confirmation-stage-lib.mjs';

const args=new Map(process.argv.slice(2).filter(a=>a.startsWith('--')&&a.includes('=')).map(a=>{
    const i=a.indexOf('='); return [a.slice(0,i),a.slice(i+1)];
}));
const required=name=>{const v=args.get(name);if(!v)throw new Error(`${name}=... is required`);return v;};
const spec=JSON.parse(readFileSync(path.resolve(required('--spec')),'utf8'));
const plan=JSON.parse(readFileSync(path.resolve(required('--stage-a-plan')),'utf8'));
const stageA=JSON.parse(readFileSync(path.resolve(required('--stage-a-results')),'utf8'));
const stageBArg=args.get('--stage-b-results');
const stageB=stageBArg ? JSON.parse(readFileSync(path.resolve(stageBArg),'utf8')) : null;
const outFile=path.resolve(required('--out'));
const result=analyzeConfirmation(spec,plan,stageA,stageB);
const out={
    schemaVersion:1,
    kind:'pathfinder-pg-g-independent-symmetry-confirmation-result',
    generatedAt:new Date().toISOString(),
    historicalDatasetRef:spec.historicalDatasetRef,
    evidenceRole:spec.evidenceRole,
    selection:spec.selection,
    decisionRule:spec.decisionRule,
    ...result,
};
mkdirSync(path.dirname(outFile),{recursive:true});
writeFileSync(outFile,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({verdict:out.verdict,eligibleParents:out.stageA.eligibleParentCount,discordantRows:out.stageA.discordantRows,restorationRate:out.stageB?.restorationRate??null}));
