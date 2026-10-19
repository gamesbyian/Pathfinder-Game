#!/usr/bin/env node
/**
 * PG-N: read-only, retrospective mechanic-neighborhood interface screen.
 *
 * No solver, oracle, historical winner policy, exact-cache or hard prune.
 * Raw prefix depth deliberately differs from portal-aware counted work.
 * An axis-use bit is a prefix-derived geometric proxy, not a canonical
 * production-state equivalence proof. A portal jump consumes no local axis.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCES=[
 ['reports/stress/class5-topology-fork-exact-labels-2026-09-16.json','6e044d1ae62cad6e4f678c9b13aabd67b805fab2898ad539ab42b0f5e62209e2'],
 ['reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json','3024ce09aa7693ba1c6d852def97192715a87ca725c7052332fe6984455e6589'],
 ['reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json','13671b809d8e0a6f36d86859f5165bceb82c986d8a011bd9a279fd4d47ebd13e'],
];
const requireTrue=(condition,why)=>{if(!condition)throw Error(why);};
const coord=p=>p.join(',');
const rawDepth=r=>r.prefix.length-1;
const endpoint=r=>r.prefix.at(-1);
const identity=r=>JSON.stringify([r.corpus,r.levelId,r.prefix]);
const neighbors=[[0,-1],[1,0],[0,1],[-1,0]]; // N/E/S/W, fixed order
const parentKey=r=>[r.corpus,r.levelId,endpoint(r),rawDepth(r)];

export function dedupe(rows){
 const kept=new Map(),aliases=[];
 for(const row of rows){
  requireTrue(['live','dead'].includes(row.referenceLabel),'non-decisive label: '+row.caseId);
  requireTrue(Array.isArray(row.prefix)&&row.prefix.length>=2
   &&row.prefix.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)),
   'bad prefix: '+row.caseId);
  const key=identity(row),prior=kept.get(key);
  if(prior){
   requireTrue(prior.referenceLabel===row.referenceLabel,'contradictory reference fates: '+row.caseId);
   aliases.push({kept:prior.caseId,duplicate:row.caseId});
  }else kept.set(key,row);
 }
 return {rows:[...kept.values()],aliases};
}

function incomingAxis(prefix){
 const a=prefix.at(-2),b=prefix.at(-1);
 if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)return 'portal';
 return a[0]!==b[0]?'H':'V';
}

export function localResourceSignature(row,kind){
 const p=row.prefix,e=endpoint(row),axis=incomingAxis(p);
 const base=parentKey(row);
 if(kind==='endpoint-depth-entry')return [...base,axis];
 const visited=new Set(p.map(coord));
 const usedAxis=new Map();
 for(let i=1;i<p.length;i++){
  const a=p[i-1],b=p[i];
  if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)continue;
  const bit=a[0]!==b[0]?1:2;
  for(const v of [a,b]){const k=coord(v);usedAxis.set(k,(usedAxis.get(k)||0)|bit)}
 }
 const around=neighbors.map(([dx,dy])=>{
  const k=coord([e[0]+dx,e[1]+dy]);
  return kind==='endpoint-depth-entry-neighbor-visits'?Number(visited.has(k))
   :usedAxis.get(k)||0;
 });
 requireTrue(['endpoint-depth-entry-neighbor-visits','endpoint-depth-entry-neighbor-axes'].includes(kind),
  'unknown signature: '+kind);
 return [...base,axis,around];
}

export const CANDIDATES=[
 'endpoint-depth-entry',
 'endpoint-depth-entry-neighbor-visits',
 'endpoint-depth-entry-neighbor-axes',
];

export function summarize(rows,kind){
 const groups=new Map();
 for(const r of rows){
  const key=JSON.stringify(localResourceSignature(r,kind)),group=groups.get(key)??[];
  group.push(r);groups.set(key,group);
 }
 const repeated=[...groups.values()].filter(g=>g.length>1);
 const mixed=repeated.filter(g=>new Set(g.map(r=>r.referenceLabel)).size>1);
 const describe=g=>({
  corpus:g[0].corpus,levelId:g[0].levelId,
  cases:g.map(r=>({caseId:r.caseId,referenceLabel:r.referenceLabel,source:r.sourcePath})),
 });
 return {
  distinctSignatures:groups.size,
  repeatedGroups:repeated.length,
  repeatedRows:repeated.reduce((n,g)=>n+g.length,0),
  mixedGroups:mixed.length,
  mixedIndependentParents:[...new Set(mixed.map(g=>g[0].levelId))].sort(),
  repeatedWitnesses:repeated.map(describe),
 };
}

function selfTest(){
 const row=(caseId,prefix,referenceLabel)=>({
  caseId,corpus:'test',levelId:'T',prefix,referenceLabel,
 });
 const a=row('a',[[0,0],[1,0],[1,1]],'live');
 const b=row('b',[[0,0],[0,1],[1,1]],'dead');
 const {rows,aliases}=dedupe([a,b,{...a,caseId:'alias'}]);
 requireTrue(rows.length===2&&aliases.length===1,'dedupe/alias');
 requireTrue(summarize(rows,'endpoint-depth-entry').mixedGroups===0,
  'entry distinguishes H/V fork');
 requireTrue(summarize(rows,'endpoint-depth-entry-neighbor-visits').mixedGroups===0,
  'local visit signature');
 requireTrue(summarize(rows,'endpoint-depth-entry-neighbor-axes').mixedGroups===0,
  'local consumed-axis signature');
 const c=row('c',[[0,0],[1,0],[2,0],[2,1]],'live');
 const d=row('d',[[0,0],[0,1],[1,1],[2,1]],'dead');
 requireTrue(summarize([c,d],'endpoint-depth-entry').mixedGroups===1,
  'same-entry mixed case');
 requireTrue(summarize([c,d],'endpoint-depth-entry-neighbor-visits').mixedGroups===0,
  'neighbor distinguishes same-entry mixed case');
 requireTrue(summarize([c,d],'endpoint-depth-entry-neighbor-axes').mixedGroups===0,
  'neighbor axis distinguishes same-entry mixed case');
 let rejected=false;
 try{dedupe([a,{...a,caseId:'contradiction',referenceLabel:'dead'}])}
 catch{rejected=true}
 requireTrue(rejected,'contradictory fates must fail closed');
 requireTrue(incomingAxis([[0,0],[4,4]])==='portal','portal jump must be distinct');
 console.log('PG-N neighborhood interface self-tests passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
const outArg=process.argv.find(s=>s.startsWith('--out='));
requireTrue(outArg,'--out=<path> is required');
const sources=SOURCES.map(([filename,expectedSha256])=>{
 const bytes=readFileSync(filename),sha256=createHash('sha256').update(bytes).digest('hex');
 requireTrue(sha256===expectedSha256,'reference source changed: '+filename);
 const data=JSON.parse(bytes.toString('utf8'));
 requireTrue(data.summary?.inputAlarms===0&&data.summary?.correctnessAlarms===0,
  'source alarms: '+filename);
 requireTrue(Array.isArray(data.rows)&&data.rows.every(r=>
  r.referenceLabel==='dead'?r.cpSatStatus==='INFEASIBLE':
  r.referenceLabel==='live'&&r.refereeValid===true),
  'non-exact source fate: '+filename);
 return {filename,sha256,rows:data.rows.map(r=>({...r,sourcePath:filename}))};
});
const all=sources.flatMap(s=>s.rows),{rows,aliases}=dedupe(all);
requireTrue(all.length===28&&rows.length===25&&aliases.length===3,
 'reference population drift');
requireTrue(new Set(rows.map(r=>r.levelId)).size===7,'parent population drift');
requireTrue(rows.filter(r=>r.referenceLabel==='live').length===17
 &&rows.filter(r=>r.referenceLabel==='dead').length===8,'fate population drift');
const candidates=Object.fromEntries(CANDIDATES.map(kind=>[kind,summarize(rows,kind)]));
const result={
 schema:'pathfinder.pg-n-neighborhood-history-interface/v1',
 evidenceRole:'selected-retrospective-falsifier',
 selection:'all three previously oracle-labelled topology-fork source tables; no new cases',
 sourceFiles:sources.map(s=>({path:s.filename,sha256:s.sha256,rows:s.rows.length})),
 summary:{sourceRows:28,uniquePrefixes:25,aliases:3,parents:7,live:17,dead:8},
 candidates,
 caveat:'No unlabeled controls, cold solves, production work or sound equivalence proof. No mixed fate with only one repeated same-DEAD pair is effectively zero demonstrated useful compression.',
};
const output=path.resolve(outArg.slice('--out='.length));
mkdirSync(path.dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('PG-N VERDICT '+JSON.stringify({
 summary:result.summary,
 candidates:Object.fromEntries(Object.entries(candidates).map(([k,v])=>[k,
  {keys:v.distinctSignatures,repeated:v.repeatedGroups,mixed:v.mixedGroups}])),
},null,2));
