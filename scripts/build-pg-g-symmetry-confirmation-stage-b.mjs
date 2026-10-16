#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildStageBPlan } from './pg-g-symmetry-confirmation-stage-lib.mjs';

const args=new Map(process.argv.slice(2).filter(a=>a.startsWith('--')&&a.includes('=')).map(a=>{
    const i=a.indexOf('='); return [a.slice(0,i),a.slice(i+1)];
}));
const required=name=>{const v=args.get(name);if(!v)throw new Error(`${name}=... is required`);return v;};
const spec=JSON.parse(readFileSync(path.resolve(required('--spec')),'utf8'));
const plan=JSON.parse(readFileSync(path.resolve(required('--stage-a-plan')),'utf8'));
const results=JSON.parse(readFileSync(path.resolve(required('--stage-a-results')),'utf8'));
const outFile=path.resolve(required('--out'));
const out=buildStageBPlan(spec,plan,results);
mkdirSync(path.dirname(outFile),{recursive:true});
writeFileSync(outFile,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({expectedCells:out.expectedCells,...out.opportunity}));
