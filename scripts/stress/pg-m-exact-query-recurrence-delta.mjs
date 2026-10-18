#!/usr/bin/env node
/**
 * PG-M Phase-0 delta: deterministic exact-query *identity* overlap census.
 *
 * This asks only whether newer offline reference experiments redundantly
 * purchased an identical exact-prefix fate query. It CANNOT measure recurrence
 * of a reusable *sound blocker certificate* within a cold solve invocation:
 * neither invocation/stage identity nor certificate dependency keys are present.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const inputs=[
 ['fresh75','reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json',75],
 ['multi50','reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json',50],
 ['revised12','reports/stress/pg-k-exact-12-parent-dead-revisions-20261017-001.json',12],
 ['topo12','reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',12],
 ['topo8ext','reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',8],
 ['topo8rep','reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',8],
];
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const identity=r=>JSON.stringify([r.corpus,r.levelId,r.prefix]);
const sha256=b=>createHash('sha256').update(b).digest('hex');
export function exactQueryDuplicates(rows){
 const byExact=new Map(),levelSources=new Map();
 for(const r of rows){
  assert(typeof r.corpus==='string'&&r.corpus.length>0,'no corpus identity');
  assert(typeof r.levelId==='string'&&r.levelId.length>0,'no parent identity');
  assert(Array.isArray(r.prefix)&&r.prefix.length>1&&r.prefix.every(p=>
   Array.isArray(p)&&p.length===2&&p.every(v=>Number.isSafeInteger(v)&&v>=1)),'invalid raw XY prefix');
  assert(r.fate==='live'||r.fate==='dead','unproven reference fate');
  const key=identity(r),g=byExact.get(key)??[];
  if(g.length)assert(g[0].fate===r.fate,'CONTRADICTORY exact labels at same prefix: '+key);
  g.push(r);byExact.set(key,g);
  const src=levelSources.get(r.levelId)??new Set();src.add(r.source);levelSources.set(r.levelId,src);
 }
 const aliases=[...byExact.values()].filter(g=>g.length>1);
 const crossSource=aliases.filter(g=>new Set(g.map(r=>r.source)).size>1);
 const parentOverlaps=[...levelSources].filter(([,s])=>s.size>1).map(([id,s])=>({levelId:id,sourceFamilies:[...s].sort()})).sort((a,b)=>a.levelId.localeCompare(b.levelId));
 return {
  rows:rows.length,uniqueExactPrefixQueries:byExact.size,uniqueParents:levelSources.size,
  exactPrefixAliasGroups:aliases.length,identicalQueriesAcrossSourceFamilies:crossSource.length,
  duplicatedQueriesWithinSourceFamilies:aliases.length-crossSource.length,
  parentIdsInMultipleSourceFamilies:parentOverlaps.length,
  parentSourceOverlaps:parentOverlaps,
  aliases:aliases.map(g=>g.map(r=>({source:r.source,caseId:r.caseId,fate:r.fate}))),
  crossSourceDuplicateCases:crossSource.map(g=>g.map(r=>({source:r.source,caseId:r.caseId,fate:r.fate}))),
 };
}
function selfTest(){
 const a={corpus:'A',levelId:'L',prefix:[[1,1],[1,2]],fate:'live',source:'A',caseId:'first'};
 const b={...a,source:'B',caseId:'duplicate'};
 const c={...a,prefix:[[1,1],[2,1]],fate:'dead',caseId:'other'};
 const x=exactQueryDuplicates([a,b,c]);
 assert(x.rows===3&&x.uniqueExactPrefixQueries===2&&x.identicalQueriesAcrossSourceFamilies===1,
  'cross-source exact-query alias');
 let rejection=false;try{exactQueryDuplicates([a,{...a,fate:'dead'}])}catch{rejection=true}
 assert(rejection,'same path opposing exact truth must fail');
 const y=exactQueryDuplicates([a,{...c,levelId:'M',source:'A'}]);
 assert(y.uniqueParents===2&&y.parentIdsInMultipleSourceFamilies===0,'parent not row independence');
 console.log('PG-M exact-query identity guard tests passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0);}
const out=process.argv.find(x=>x.startsWith('--out='));
assert(out,'--out=<path> required');
const rows=[],sources=[];
for(const [id,file,expected] of inputs){
 const b=readFileSync(file),doc=JSON.parse(b.toString('utf8'));
 assert(Array.isArray(doc.rows)&&doc.rows.length===expected
  &&doc.summary?.cases===expected,'frozen source size/schema changed: '+id);
 assert(doc.summary.correctnessAlarms===0&&doc.summary.inputAlarms===0,'reference has correctness alarms: '+id);
 const perParent=new Set(),fates={live:0,dead:0};
 for(const r of doc.rows){
  assert(['live','dead'].includes(r.referenceLabel),'unresolved oracle row in '+id);
  if(r.referenceLabel==='dead')assert(r.cpSatStatus==='INFEASIBLE','DEAD missing infeasibility proof');
  if(r.referenceLabel==='live')assert(r.refereeValid===true,'LIVE missing accepted referee witness');
  rows.push({corpus:r.corpus,levelId:r.levelId,prefix:r.prefix,source:id,
   caseId:r.caseId,fate:r.referenceLabel});
  perParent.add(r.levelId);fates[r.referenceLabel]++;
 }
 sources.push({source:id,path:file,sha256:sha256(b),rows:doc.rows.length,independentParents:perParent.size,exactFates:fates});
}
const result=exactQueryDuplicates(rows);
assert(result.rows===165&&result.uniqueExactPrefixQueries===162&&result.uniqueParents===32
 &&result.exactPrefixAliasGroups===3&&result.identicalQueriesAcrossSourceFamilies===0
 &&result.parentIdsInMultipleSourceFamilies===13,'frozen Phase-0 delta expected result changed');
const report={schema:'pathfinder.pg-m-exact-query-identity-delta/v1',
 evidenceRole:'retrospective-opportunity-audit',
 selection:'six full retained CP-SAT exact-prefix result sources: new 75/50/12 development campaigns and three existing topology-fork contrast controls',
 interpretation:'same (corpus,levelId,full raw XY prefix) is a conservative identical exact-fate query key, not a transferable blocker dependency key; same-level overlap is NOT same-fact recurrence',
 source:sources,summary:{
  rows:result.rows,uniqueExactPrefixQueries:result.uniqueExactPrefixQueries,
  uniqueParents:result.uniqueParents,
  identicalQueriesAcrossSourceFamilies:result.identicalQueriesAcrossSourceFamilies,
  duplicateExactPrefixAliasesWithinSources:result.duplicatedQueriesWithinSourceFamilies,
  parentsRepeatedAcrossFamilies:result.parentIdsInMultipleSourceFamilies},
 allAliasDetails:result.aliases,parentSourceOverlaps:result.parentSourceOverlaps,
 limit:'No source records one production invocation, attempt/stage sequence, derivation cost, or a sound dependency/certificate key. This result does NOT measure within-solve duplicate work and does not close possible per-instance certificate reuse.',
 decision:'Do not commission a generic new Phase-1 rediscovery observer from these offline exact-reference rows alone. Await typed current-invocation fact keys/consumer opportunity or an independent current telemetry nomination.'};
const pathOut=path.resolve(out.slice(6));mkdirSync(path.dirname(pathOut),{recursive:true});
writeFileSync(pathOut,JSON.stringify(report,null,2)+'\n');
console.log('PG-M PHASE-0 DELTA '+JSON.stringify({summary:report.summary,source:sources,aliasDetails:report.allAliasDetails,parentOverlaps:report.parentSourceOverlaps},null,2));
