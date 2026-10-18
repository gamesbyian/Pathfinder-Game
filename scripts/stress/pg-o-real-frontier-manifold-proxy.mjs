#!/usr/bin/env node
/**
 * PG-O Stage-2 read-only real-frontier/solution-manifold proxy.
 *
 * All features are computed BEFORE joining the frozen exact LIVE/DEAD labels.
 * Stored accepted solution paths are an offline oracle for research comparisons,
 * never a cold/current-input policy. No solver attempt, CP-SAT, or solution repair.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
import {readLevelCorpusDocumentWithHints} from '../level-data-io.mjs';

const corpusPath='data/stress/stress-levels-random.json';
const labelsPath='reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json';
const frontierPath='reports/stress/class5-production-search-frontier-multi-pick-population-2026-09-17.json';
const maxAcceptedHints=20;
const hashBytes=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const hashValue=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const assert=(condition,msg)=>{if(!condition)throw Error(msg);};
const cell=p=>String(p);
const pack=([x,y])=>((x-1)&65535)|(((y-1)&65535)<<16);
function stats(values){
 if(!values.length)return {count:0,median:null,min:null,max:null,mean:null};
 const a=[...values].sort((x,y)=>x-y);
 return {count:a.length,median:a[Math.floor(a.length/2)],min:a[0],max:a.at(-1),mean:a.reduce((x,y)=>x+y,0)/a.length};
}
function jaccard(a,b){
 const aa=new Set(a.map(cell)),bb=new Set(b.map(cell));
 let common=0;for(const x of aa)if(bb.has(x))common++;
 const union=aa.size+bb.size-common;
 return union?1-common/union:0;
}
export function prefixProxy(prefix,accepted){
 assert(Array.isArray(prefix)&&prefix.length>=2,'non-empty packed prefix required');
 const eligible=accepted.filter(p=>p.length>=prefix.length&&p[0]===prefix[0]);
 if(!eligible.length)return {eligibleHints:0,minPrefixJaccard:null,minPosMismatch:null,maxLcp:null,
  nearestHash:null,maxMatchedCells:null};
 let best=null,minM=Infinity,maxL=0,maxC=0;
 for(const p of eligible){
  const aligned=p.slice(0,prefix.length);
  const dist=jaccard(prefix,aligned);
  const matches=prefix.reduce((n,v,i)=>n+Number(v===aligned[i]),0);
  const mismatch=1-matches/prefix.length;
  let lcp=0;while(lcp<prefix.length&&prefix[lcp]===aligned[lcp])lcp++;
  let set=new Set(aligned.map(cell)),overlap=prefix.filter(x=>set.has(cell(x))).length;
  maxC=Math.max(maxC,overlap);
  if(dist < (best?.distance ?? Infinity)
   ||(dist===(best?.distance??Infinity)&&hashValue(p)<best.hash)){
    best={distance:dist,hash:hashValue(p)};
  }
  minM=Math.min(minM,mismatch);maxL=Math.max(maxL,lcp);
 }
 return {eligibleHints:eligible.length,minPrefixJaccard:best.distance,minPosMismatch:minM,
  maxLcp:maxL,nearestHash:best.hash,maxMatchedCells:maxC};
}
function selfTests(){
 const a=[1,2,3,4], b=[1,2,5,4],p=[1,2,3,4,5];
 assert(jaccard(a,b)===0.4,'Jaccard should count set overlap');
 const exact=prefixProxy(a,[p,b]);
 assert(exact.minPrefixJaccard===0&&exact.minPosMismatch===0&&exact.maxLcp===4,
  'identical prefix must dominate');
 const changed=prefixProxy(a,[b]);
 assert(changed.minPrefixJaccard===0.4&&changed.maxLcp===2&&changed.minPosMismatch===0.25,
  'changed prefix metrics');
 assert(prefixProxy(a,[[8,9,10,11]]).eligibleHints===0,'different gate abstains');
 console.log('PG-O real-frontier manifold proxy tests pass');
}
if(process.argv.includes('--self-test')){selfTests();process.exit(0)}
const outArg=process.argv.find(s=>s.startsWith('--out='));
assert(outArg,'--out= must be provided');
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const {validateCandidatePath}=await import('../../modules/domain/path-validator.ts');
const Solver=createSolver();
const labels=JSON.parse(readFileSync(labelsPath,'utf8'));
const frontier=JSON.parse(readFileSync(frontierPath,'utf8'));
assert(labels.summary?.cases===50&&labels.summary?.live===2&&labels.summary?.dead===48
 &&labels.summary?.abstain===0&&labels.summary?.correctnessAlarms===0
 &&labels.summary?.inputAlarms===0,'labelled frontier population changed');
assert(frontier.rows?.length===50&&frontier.width===5000
 &&frontier.profile==='intersectionHarvest'&&frontier.depthFraction===0.1,
 'frontier provenance changed');
const ids=[...new Set(labels.rows.map(r=>r.levelId))].sort();
assert(JSON.stringify(ids)===JSON.stringify(['R01600','R03147']),'frontier parent IDs changed');
const byFrontierId=new Map(frontier.rows.map(r=>[r.levelId+':multi-pick-'+r.frontierIndex,r]));
assert(byFrontierId.size===50,'duplicate frontier selection IDs');
const {levels}=readLevelCorpusDocumentWithHints(path.resolve(corpusPath));
const levelById=new Map(levels.filter(l=>ids.includes(l.id)).map(l=>[l.id,l]));
const references={};
for(const id of ids){
 const raw=levelById.get(id);assert(raw,'missing parent '+id);
 const {id:_id,stressMeta:_sm,hintRecords:_h,hints:_legacy,...wire}=raw;
 const level=Solver.prepareLevelForSolver(wire,{source:'raw'});
 const rows=(raw.hintRecords||[]).filter(h=>Array.isArray(h.path)&&h.path.length>1)
  .sort((a,b)=>hashValue(a.path).localeCompare(hashValue(b.path)));
 const chosen=[],unique=new Set();
 for(const r of rows){
  const finger=hashValue(r.path);if(unique.has(finger))continue;
  unique.add(finger);
  if(!validateCandidatePath(level,r.path).ok)continue;
  chosen.push(r.path);
  if(chosen.length>=maxAcceptedHints)break;
 }
 assert(chosen.length>=1,'no referee-accepted reference hints for '+id);
 references[id]={chosen,considered:rows.length};
 console.log('PG-O REFERENCE '+JSON.stringify({id,retained:chosen.length,available:rows.length}));
}
const cases=[];
for(const label of labels.rows){
 assert(label.referenceLabel==='live'||label.referenceLabel==='dead','unknown label');
 if(label.referenceLabel==='live')assert(label.refereeValid===true,'unrefereed LIVE');
 else assert(label.cpSatStatus==='INFEASIBLE','unproven DEAD');
 const frontierRow=byFrontierId.get(label.caseId);
 assert(frontierRow&&frontierRow.levelId===label.levelId,'missing frontier identity '+label.caseId);
 const literal=label.prefix.map(pack);
 assert(JSON.stringify(literal)===JSON.stringify(frontierRow.prefix),
  'frontier XY/packed paths mismatch '+label.caseId);
 const features=prefixProxy(literal,references[label.levelId].chosen);
 assert(features.eligibleHints>0,'no same-gate hint for '+label.caseId);
 cases.push({caseId:label.caseId,levelId:label.levelId,
  frontierIndex:frontierRow.frontierIndex,depth:literal.length-1,
  score:frontierRow.score,features});
}
assert(cases.length===50,'incomplete feature population');
for(const row of cases){
 const original=labels.rows.find(x=>x.caseId===row.caseId);
 row.exactLabel=original.referenceLabel;
}
const metricNames=['minPrefixJaccard','minPosMismatch','maxLcp'];
const perLevel=ids.map(id=>{
 const rows=cases.filter(x=>x.levelId===id);
 const metricSummaries=Object.fromEntries(metricNames.map(m=>[m,{
  live:stats(rows.filter(x=>x.exactLabel==='live').map(x=>x.features[m])),
  dead:stats(rows.filter(x=>x.exactLabel==='dead').map(x=>x.features[m])),
 }]));
 const live=rows.filter(x=>x.exactLabel==='live'),dead=rows.filter(x=>x.exactLabel==='dead');
 const pairwiseMetric=(m,smallerIsBetter)=>{
  if(!live.length||!dead.length)return null;
  let total=0,correct=0;
  for(const l of live)for(const d of dead){let a=l.features[m],b=d.features[m];total++;
   correct+=a===b?0.5:(smallerIsBetter?(a<b?1:0):(a>b?1:0));}
  return {comparablePairs:total,observedPairwiseOrdering:correct/total};
 };
 return {levelId:id,independentUnit:'parent',frontierSamples:rows.length,
  live:live.length,dead:dead.length,metricSummaries,
  liveCaseMetrics:live.map(x=>({caseId:x.caseId,features:x.features})),
  observedPairwise:{
   jaccard:pairwiseMetric('minPrefixJaccard',true),
   position:pairwiseMetric('minPosMismatch',true),
   commonPrefix:pairwiseMetric('maxLcp',false)}};
});
const report={schema:'pathfinder.pg-o-real-frontier-manifold-proxy/v1',
 source:{labels:labelsPath,labelsSha256:hashBytes(labelsPath),
  population:frontierPath,populationSha256:hashBytes(frontierPath),
  corpus:corpusPath,corpusSha256:hashBytes(corpusPath),headSha:process.env.GITHUB_SHA||null},
 design:{role:'development-precondition-only',parents:ids,depthFraction:0.1,
  technique:'intersectionHarvest',width:5000,independentUnits:2,
  exactLabelBlindFeatures:true,maxAcceptedHints,chosenHintMethod:'sha256-sorted distinct native-refereed stored accepted paths',
  features:'Jaccard of equal-depth PREFIX cell supports, aligned per-position mismatch, and common-prefix length; all conditioned on same original gate',
  caveat:'Historical accepted solutions are forbidden in cold policy. Scores cannot be interpreted as learned predictors from a selected two-parent/2-LIVE pilot.'},
 summary:{parents:2,cases:cases.length,live:2,dead:48,
  allFeatureCases:cases.filter(x=>x.features.eligibleHints>0).length,
  hintCounts:Object.fromEntries(ids.map(id=>[id,references[id].chosen.length]))},
 perLevel,cases};
const outPath=path.resolve(outArg.slice('--out='.length));
mkdirSync(path.dirname(outPath),{recursive:true});
writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');
console.log('PG-O VERDICT '+JSON.stringify({summary:report.summary,perLevel:report.perLevel}));
