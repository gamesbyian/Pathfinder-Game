#!/usr/bin/env node
/**
 * PG-N: retrospective exact-fate collision falsifier for intentionally lossy
 * path-boundary summaries on retained topology-fork reference labels.
 *
 * It never calls a solver, never uses reference outcomes to form a signature,
 * and makes no claim that a collision-free (singleton) key is sufficient.
 * Prefix length is RAW transitions, not game counted length on portal levels.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCES=[
 'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
 'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
 'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',
];
const fail=(condition,message)=>{if(!condition)throw Error(message);};
const cell=p=>p.join(',');
const canonicalPrefix=r=>JSON.stringify([r.corpus,r.levelId,r.prefix]);
const signatures={
 'endpoint-raw-depth':r=>[r.corpus,r.levelId,r.prefix.at(-1),r.prefix.length-1],
 'endpoint-unique-visit-count':r=>[r.corpus,r.levelId,r.prefix.at(-1),new Set(r.prefix.map(cell)).size],
 'endpoint-raw-depth-bbox':r=>{
  const xs=r.prefix.map(p=>p[0]),ys=r.prefix.map(p=>p[1]);
  return [r.corpus,r.levelId,r.prefix.at(-1),r.prefix.length-1,
   [Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)]];
 },
 'endpoint-raw-depth-visited-support':r=>[r.corpus,r.levelId,r.prefix.at(-1),
   r.prefix.length-1,[...new Set(r.prefix.map(cell))].sort()],
};

export function dedupeExactFateRows(rows){
 const unique=new Map(),duplicates=[];
 for(const r of rows){
  fail(['live','dead'].includes(r.referenceLabel),'non-decisive exact label '+r.caseId);
  fail(Array.isArray(r.prefix)&&r.prefix.length>=2&&r.prefix.every(
    p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)),'invalid prefix '+r.caseId);
  const k=canonicalPrefix(r),prev=unique.get(k);
  if(prev){
   fail(prev.referenceLabel===r.referenceLabel,'CONTRADICTORY exact labels on one path: '+r.caseId);
   duplicates.push({kept:prev.caseId,duplicate:r.caseId});
  }else unique.set(k,r);
 }
 return {rows:[...unique.values()],duplicates};
}

export function summarizeInterfaceCandidate(rows,signature){
 const groups=new Map();
 for(const r of rows){
  const key=JSON.stringify(signature(r)),g=groups.get(key)??[];
  g.push(r);groups.set(key,g);
 }
 const repeated=[...groups.values()].filter(g=>g.length>1);
 const mixed=repeated.filter(g=>new Set(g.map(x=>x.referenceLabel)).size>1);
 return {
  distinctSignatures:groups.size,repeatedGroups:repeated.length,
  repeatedRows:repeated.reduce((n,g)=>n+g.length,0),
  mixedGroups:mixed.length,
  mixedIndependentParents:[...new Set(mixed.flatMap(g=>g.map(r=>r.levelId)))].sort(),
  mixedWitnesses:mixed.map(g=>({
   levelId:g[0].levelId,corpus:g[0].corpus,
   endpoint:g[0].prefix.at(-1),rawDepth:g[0].prefix.length-1,
   cases:g.map(r=>({id:r.caseId,referenceLabel:r.referenceLabel,source:r.sourcePath})),
  })),
 };
}

function selfTest(){
 const make=(id,prefix,label)=>({caseId:id,corpus:'X',levelId:'A',prefix,referenceLabel:label});
 const a=make('a',[[0,0],[1,0],[1,1]],'live');
 const b=make('b',[[0,0],[0,1],[1,1]],'dead');
 const {rows,duplicates}=dedupeExactFateRows([a,b,{...a,caseId:'a-dup'}]);
 fail(rows.length===2&&duplicates.length===1,'exact path dedupe');
 fail(summarizeInterfaceCandidate(rows,signatures['endpoint-raw-depth']).mixedGroups===1,'weak counterexample');
 fail(summarizeInterfaceCandidate(rows,signatures['endpoint-raw-depth-visited-support']).mixedGroups===0,'support distinguishes counterexample');
 let rejected=false;try{dedupeExactFateRows([a,{...a,referenceLabel:'dead'}])}catch{rejected=true}
 fail(rejected,'must reject contradictory oracle labels');
 console.log('PG-N exact-fate interface collision self-tests passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0);}
const arg=process.argv.find(s=>s.startsWith('--out='));
fail(arg,'--out=<path> is required');
const inputs=SOURCES.map(file=>{
 const bytes=readFileSync(file),doc=JSON.parse(bytes.toString('utf8'));
 fail(Array.isArray(doc.rows),'missing rows in '+file);
 fail(doc.summary?.correctnessAlarms===0&&doc.summary?.inputAlarms===0,
  'reference alarms in '+file);
 fail(doc.rows.every(r=>r.referenceLabel==='dead'
  ? r.cpSatStatus==='INFEASIBLE'
  : r.referenceLabel==='live'&&r.refereeValid===true), 'unknown or invalid reference evidence in '+file);
 return {path:file,sha256:createHash('sha256').update(bytes).digest('hex'),
  rows:doc.rows.length,rowsData:doc.rows.map(r=>({...r,sourcePath:file}))};
});
const all=inputs.flatMap(x=>x.rowsData);
fail(all.length===28,'unexpected reference population size');
const {rows,duplicates}=dedupeExactFateRows(all);
fail(rows.length===25,'unexpected unique prefix size');
const result={
 schema:'pathfinder.pg-n-retained-exact-fate-interface-collision/v1',
 evidenceRole:'retrospective-falsifier',
 selection:'complete three pre-existing topology-fork exact-label sets; outcomes did not select cases or keys',
 scope:'published topology-fork selected cases, not a population prevalence or production optimization claim',
 corpus:'data/levels.json',
 sourceFiles:inputs.map(({path,sha256,rows})=>({path,sha256,rows})),
 summary:{sourceRows:all.length,distinctExactPrefixes:rows.length,
  duplicateAliases:duplicates.length,independentParents:new Set(rows.map(r=>r.levelId)).size,
  live:rows.filter(r=>r.referenceLabel==='live').length,
  dead:rows.filter(r=>r.referenceLabel==='dead').length},
 duplicates,
 candidates:Object.fromEntries(Object.entries(signatures).map(([name,fn])=>
  [name,{meaning:name.includes('visited-support')?'visited support forgets order, visit multiplicity and used axes':name,
   ...summarizeInterfaceCandidate(rows,fn)}])),
 note:'One mixed LIVE/DEAD signature is a valid insufficiency witness for that exact lossy candidate. Zero collisions with no repeated signatures is no evidence of sufficient exact state identity or useful compression. Raw prefix length is not portal-aware counted length.',
};
const out=path.resolve(arg.slice(6));mkdirSync(path.dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('PG-N VERDICT '+JSON.stringify({summary:result.summary,
 candidates:Object.fromEntries(Object.entries(result.candidates).map(([k,v])=>[k,
 {distinctSignatures:v.distinctSignatures,repeatedGroups:v.repeatedGroups,
 mixedGroups:v.mixedGroups,mixedIndependentParents:v.mixedIndependentParents}])),
 sourceFiles:result.sourceFiles},null,2));
