#!/usr/bin/env node
/**
 * Combine family-technique-response census shards with exact plan coverage.
 *
 * Usage:
 *   node scripts/combine-family-technique-response-shards.mjs \
 *     --plan=<campaign-plan.json> --staging-dir=<downloaded-artifacts> --out=<combined.json>
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argv=process.argv.slice(2);
const args=new Map(argv.filter(a=>a.startsWith('--')&&a.includes('=')).map(a=>{
  const i=a.indexOf('='); return [a.slice(0,i),a.slice(i+1)];
}));
const required=name=>{const v=args.get(name);if(!v)throw new Error(`${name}=... is required`);return v;};
const planFile=required('--plan');
const stagingDir=required('--staging-dir');
const outFile=required('--out');
const plan=JSON.parse(readFileSync(path.resolve(planFile),'utf8'));
if(!Array.isArray(plan.cells)) throw new Error('plan has no cells[]');
const expected=plan.cells.map(c=>c.cellId);
const expectedSet=new Set(expected);
if(expectedSet.size!==expected.length) throw new Error('plan contains duplicate cell ids');

function walk(dir){
  const out=[];
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p));
    else if(entry.isFile()&&entry.name.endsWith('.json')) out.push(p);
  }
  return out;
}
const files=walk(path.resolve(stagingDir));
const byId=new Map();
const duplicates=[];
let resultFiles=0;
for(const file of files){
  let doc;
  try{doc=JSON.parse(readFileSync(file,'utf8'));}catch{continue;}
  if(!Array.isArray(doc.results)) continue;
  resultFiles++;
  for(const row of doc.results){
    if(!row?.cellId) throw new Error(`${file} contains a result without cellId`);
    if(!expectedSet.has(row.cellId)) throw new Error(`unexpected cell result ${row.cellId} in ${file}`);
    if(byId.has(row.cellId)){duplicates.push(row.cellId);continue;}
    byId.set(row.cellId,row);
  }
}
if(!resultFiles) throw new Error('no shard result files found');
if(duplicates.length) throw new Error(`duplicate cell results: ${[...new Set(duplicates)].join(', ')}`);
const missing=expected.filter(id=>!byId.has(id));
if(missing.length) throw new Error(`missing ${missing.length}/${expected.length} planned cells; first: ${missing.slice(0,20).join(', ')}`);

const results=expected.map(id=>({ ...byId.get(id), id }));
const statusCounts={};
for(const r of results) statusCounts[r.status??'unknown']=(statusCounts[r.status??'unknown']??0)+1;
const invalidStatuses = new Set(['error','deadline-truncated','referee-invalid']);
const invalidRows = results.filter(r => invalidStatuses.has(r.status));
if (invalidRows.length) {
  throw new Error(`invalid decision-bearing rows: ${invalidRows.slice(0,20).map(r => r.cellId + ':' + r.status).join(', ')}${invalidRows.length > 20 ? ` (+${invalidRows.length - 20} more)` : ''}`);
}
const out={
  schemaVersion:1,
  kind:'pathfinder-family-technique-response-combined',
  generatedAt:new Date().toISOString(),
  planFile,
  expectedCells:expected.length,
  observedCells:results.length,
  resultFiles,
  complete:true,
  statusCounts,
  results,
};
mkdirSync(path.dirname(path.resolve(outFile)),{recursive:true});
writeFileSync(path.resolve(outFile),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({expectedCells:expected.length,observedCells:results.length,resultFiles,statusCounts}));
