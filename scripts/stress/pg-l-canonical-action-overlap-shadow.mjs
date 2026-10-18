#!/usr/bin/env node
/**
 * PG-L read-only canonical-action overlap observer.
 *
 * Compares two legitimate isolated beam scoring actions with equal work caps
 * on the same first gate and frozen outcome-blind independent parents.
 * Observer OFF vs ON must match status, work, nodes and solution exactly;
 * historical hints or solved labels never enter selection or search.
 *
 * Full path hashes are identity ONLY for observational equality here;
 * hashed short prefixes are descriptive basin markers, NOT sound reusable
 * states, failure proofs or authorization to prune/steer.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createSolver,SOLVER_TESTING_API:api} from '../../modules/solver.js';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const corpusFile='data/stress/stress-levels-random.json';
const seed='pathfinder-pg-l-action-overlap-cold-8-20261017-001';
const profiles=['objectiveFirst','intersectionHarvest'];
const width=500,perArmWorkBudget=150000,budgetMs=600000,parentsRequested=8;
const assert=(p,m)=>{if(!p)throw Error(m)};
const hash=(x)=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
function share(a,b){
 const sA=a instanceof Set?a:new Set(a),sB=b instanceof Set?b:new Set(b);
 let overlap=0;for(const k of sA)if(sB.has(k))overlap++;
 const union=sA.size+sB.size-overlap;
 return {a:sA.size,b:sB.size,shared:overlap,union,
  jaccard:union?overlap/union:null,sharedFractionSmaller:Math.min(sA.size,sB.size)?overlap/Math.min(sA.size,sB.size):null};
}
export function overlapSummary(a,b){
 const overlaps={};
 for(const key of ['exactAll','exactDeep','prefixFour','prefixEight']){
  overlaps[key]=share(new Set(a[key].keys()),new Set(b[key].keys()));
 }
 const sharedWork=[...a.exactAll].filter(([k])=>b.exactAll.has(k))
  .reduce((n,[k,v])=>n+Math.min(v,b.exactAll.get(k)),0);
 const totalWork=[...a.exactAll.values(),...b.exactAll.values()].reduce((n,v)=>n+v,0);
 return {overlaps,matchingParentExpansionWorkLowerCount:sharedWork,
  workOfParentExpansionsAcrossBothActions:totalWork,
  overlappingExpansionWorkRatio:totalWork?2*sharedWork/totalWork:null,
  note:'Identical processed path occurrence is a descriptive work overlap, not a sound reusable proof or necessarily avoidable work.'};
}
function selfTest(){
 const m=v=>new Map(v.map(([a,b])=>[a,b]));
 const a={exactAll:m([['1',3],['2',4]]),exactDeep:m([['2',4]]),
  prefixFour:m([['x',1],['y',1]]),prefixEight:m([])};
 const b={exactAll:m([['2',7],['3',9]]),exactDeep:m([['2',7]]),
  prefixFour:m([['y',1],['z',1]]),prefixEight:m([])};
 const x=overlapSummary(a,b);
 assert(x.overlaps.exactAll.shared===1&&x.overlaps.exactAll.jaccard===1/3,'exact overlap');
 assert(x.matchingParentExpansionWorkLowerCount===4,'shared work lower count');
 assert(x.overlaps.prefixEight.jaccard===null,'empty bucket abstain');
 console.log('PG-L observational exact/coarse overlap tests passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
const outArg=process.argv.find(x=>x.startsWith('--out='));
assert(outArg,'--out=<file> required');
installBrowserStubs();
const Solver=createSolver();
const corpusBuffer=readFileSync(corpusFile);
const corpusSha256=createHash('sha256').update(corpusBuffer).digest('hex');
assert(corpusSha256==='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb',
 'frozen Corpus-2 input changed: do not silently select another parent population');
const doc=JSON.parse(corpusBuffer);
const levels=Array.isArray(doc)?doc:doc.levels;
assert(Array.isArray(levels)&&levels.length>=100,'corpus missing or too small');
const levelIds=levels.map(r=>String(r.id));
assert(new Set(levelIds).size===levels.length,'duplicate corpus level ids');
const frozen=levels.map(l=>({id:l.id,order:hash(seed+':'+l.id)}))
 .sort((a,b)=>a.order.localeCompare(b.order)||a.id.localeCompare(b.id))
 .slice(0,parentsRequested);
const cohort=frozen.map(({id,order})=>({id,selectionHash:order}));
const byId=new Map(levels.map(l=>[l.id,l]));
assert(profiles.every(n=>!!api.SCORING_PROFILES[n]),'unknown scoring profile');
function collector(){
 const exactAll=new Map(),exactDeep=new Map(),prefixFour=new Map(),prefixEight=new Map();
 let generatedRecords=0,parentEvents=0,parentExpansionWork=0,invalidParentPaths=0;
 return {
  observe(record){
   if(record.stage!=='generated'||!Array.isArray(record.details?.parentExpansions))return;
   generatedRecords++;
   for(const row of record.details.parentExpansions){
    if(!Array.isArray(row.path)||!row.path.length){invalidParentPaths++;continue}
    const p=row.path,work=Number(row.workSpent)||0;
    parentEvents++;parentExpansionWork+=work;
    const full=hash(p);
    exactAll.set(full,(exactAll.get(full)||0)+work);
    if(p.length>=9)exactDeep.set(full,(exactDeep.get(full)||0)+work);
    if(p.length>=4){const k=hash(p.slice(0,4));prefixFour.set(k,(prefixFour.get(k)||0)+work)}
    if(p.length>=8){const k=hash(p.slice(0,8));prefixEight.set(k,(prefixEight.get(k)||0)+work)}
   }
  },
  snapshot(){
   assert(invalidParentPaths===0,'invalid observer source parent paths');
   return {exactAll,exactDeep,prefixFour,prefixEight,generatedRecords,parentEvents,parentExpansionWork};
  }
 }
}
async function one({level,gateKey,profileName,observation}){
 const prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};
 const begin=prep._workMeter.units;
 prep._workCap=begin+perArmWorkBudget;
 const c=collector();
 if(observation)prep._beamResearchObserver={includeParentExpansionWork:true,
  observe(record){c.observe(record)}};
 const out={},started=Date.now();
 const found=await api.beamSearchFromGate(gateKey,level,prep,
  api.SCORING_PROFILES[profileName],budgetMs,started,null,width,
  null,false,out,Infinity,undefined,undefined,true);
 prep._beamResearchObserver=null;
 const result={gateKey,profileName,observation,
  found:!!found,solutionHash:found?hash(found):null,
  status:found?'solved':out.pausedContinuation?'work-budget-phase-boundary':
   out.timedOut?'timed-out':'exhausted',
  workSpent:prep._workMeter.units-begin,
  nodesExpanded:prep._metrics.nodesExpanded,elapsedMs:Date.now()-started};
 if(out.timedOut)throw Error('wall-deadline truncation on '+profileName);
 return {result,observed:c.snapshot()};
}
const parents=[];
for(let i=0;i<cohort.length;i++){
 const {id}=cohort[i],source=byId.get(id);
 const {id:_id,stressMeta:_meta,...raw}=source;
 const level=Solver.prepareLevelForSolver(raw,{source:'raw'});
 assert(Array.isArray(level.gateKeys)&&level.gateKeys.length>0,'missing gate '+id);
 const gateKey=level.gateKeys[0],arms=[];
 for(const profileName of profiles){
  const control=await one({level,gateKey,profileName,observation:false});
  const observed=await one({level,gateKey,profileName,observation:true});
  for(const field of ['found','solutionHash','status','workSpent','nodesExpanded']){
   assert(control.result[field]===observed.result[field],
    id+' '+profileName+' observer mutated '+field+' '+JSON.stringify([control.result[field],observed.result[field]]));
  }
  arms.push({name:profileName,control:control.result,observed:observed.result,
   trace:observed.observed});
 }
 const contrast=overlapSummary(arms[0].trace,arms[1].trace);
 const emitted={levelId:id,gateKey,
  armResults:arms.map(a=>({...a.observed,sourceIsolatedControlWork:a.control.workSpent,
   generatedRecords:a.trace.generatedRecords,parentEvents:a.trace.parentEvents,
   parentExpansionWork:a.trace.parentExpansionWork,
   uniqueExactProcessedPaths:a.trace.exactAll.size,uniqueDeepExactProcessedPaths:a.trace.exactDeep.size,
   exactSetHash:hash([...a.trace.exactAll.keys()].sort())})),
  contrasts:contrast};
 parents.push(emitted);
 console.log('PG-L OBSERVED '+JSON.stringify({index:i+1,levelId:id,
  work:emitted.armResults.map(a=>a.workSpent),status:emitted.armResults.map(a=>a.status),
  overlap:contrast.overlaps.exactAll,deepOverlap:contrast.overlaps.exactDeep,
  prefix8Overlap:contrast.overlaps.prefixEight}));
}
const informative=parents.filter(p=>p.armResults.every(a=>a.parentEvents>=2));
const mean=(v)=>v.length?v.reduce((x,y)=>x+y,0)/v.length:null;
const summary={parents:parents.length,informativeParents:informative.length,
 observerParityAlarms:0,scoringProfiles:profiles,perArmNominalWorkBudget:perArmWorkBudget,
 exactActionComparisonPairs:parents.length,
 aggregateObserverCanonicalWork:parents.reduce((n,p)=>n+p.armResults.reduce((a,x)=>a+x.workSpent,0),0),
 meanExactStateJaccard:mean(informative.map(p=>p.contrasts.overlaps.exactAll.jaccard).filter(Number.isFinite)),
 meanDeepExactStateJaccard:mean(informative.map(p=>p.contrasts.overlaps.exactDeep.jaccard).filter(Number.isFinite)),
 meanEightMovePrefixJaccard:mean(informative.map(p=>p.contrasts.overlaps.prefixEight.jaccard).filter(Number.isFinite))};
const report={schema:'pathfinder.pg-l-action-overlap-shadow/v1',kind:'read-only canonical beam action overlap',
 evidenceRole:'development',source:{code:process.env.GITHUB_SHA||null,corpusFile,
  corpusSha256},
 selection:{seed,selection:'outcome-blind SHA256 of seed + canonical levelId, first 8 independent corpus rows',
  selected:cohort,gateSelection:'first canonical prepared gate',profiles,
  perArmWorkBudget,width,budgetMs,control:'isolated identical beam attempt without observer for every observed arm'},
 caveat:'Full-prefix hashes are observational path identity, not complete state equivalence across histories; truncated root prefixes are ONLY basin descriptors. No cross-action shared runtime or transfer proof, no cold policy, no new solves claimed.',
 summary,parents};
const target=path.resolve(outArg.slice(6));
mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log('PG-L VERDICT '+JSON.stringify(summary));
