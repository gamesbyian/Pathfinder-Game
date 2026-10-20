#!/usr/bin/env node
/** PG-I quota-diversity debt CENSUS on source-only, never-history-labelled parents.
 * Original current-code beamSearchFromGate vs numeric read-only observer, exact
 * strict 250k work envelope and independent source 12-parent denominator.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const CORPUS='data/stress/stress-levels-random.json';
const MANIFEST='reports/stress/pg-l-flood-replay-independent-24-source-freeze-20261019-001.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const N=12,WIDTHS=[512,5000],WORK=250000,NODE=250000,TIME=600000;
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const assert=(x,m)=>{if(!x)throw Error(m)};
const hash=s=>createHash('sha256').update(s).digest('hex');
function collector(width){
 let totalDecisions=0,displacingDecisions=0,heavyDecisions=0;
 let totalDisplaced=0,totalPromoted=0,topHalfRemoved=0,topQuarterRemoved=0,nonFinite=0;
 let scoreDebt=0,largestActiveBuckets=0,budgetRemainingHeavy=0,firstHeavy=null;
 let retainedRecords=0,sourceCensored=false;
 const events=[];
 const observe=e=>{
  totalDecisions++;
  assert(e.width===width,'width drift');
  assert(e.globallyTopKDisplaced===e.outsideTopKPromoted
   ||e.actualSelected!==width,'top-K / retained quota count mismatch');
  if(!Number.isFinite(e.totalScoreDebt)||!Number.isFinite(e.relativeScoreDebt)){
   nonFinite++;return;
  }
  const isHeavy=e.globallyTopKDisplaced>=Math.ceil(width*0.1);
  if(e.globallyTopKDisplaced>0)displacingDecisions++;
  if(isHeavy){
   heavyDecisions++;
   if(WORK-e.workSpent>=10000)budgetRemainingHeavy++;
   if(firstHeavy===null)firstHeavy={phaseDepth:e.phaseDepth,workSpent:e.workSpent,
     displaced:e.globallyTopKDisplaced,buckets:e.bucketCount,
     smallestRemovedRank:e.minimumDisplacedGlobalRank};
  }
  totalDisplaced+=e.globallyTopKDisplaced;
  totalPromoted+=e.outsideTopKPromoted;
  topHalfRemoved+=e.topHalfDisplaced;
  topQuarterRemoved+=e.topQuarterDisplaced;
  scoreDebt+=e.totalScoreDebt;
  largestActiveBuckets=Math.max(largestActiveBuckets,e.bucketCount);
  if(events.length<2000){
   events.push({depth:e.phaseDepth,work:e.workSpent,
    width:e.width,pool:e.rankedPoolSize,buckets:e.bucketCount,
    selected:e.actualSelected,globalTopKRemoved:e.globallyTopKDisplaced,
    topHalfRemoved:e.topHalfDisplaced,topQuarterRemoved:e.topQuarterDisplaced,
    bestRemovedRank:e.minimumDisplacedGlobalRank,
    lowerRankAdded:e.outsideTopKPromoted,lowestAddedRank:e.largestPromotedGlobalRank,
    scoreDebt:e.totalScoreDebt,relativeScoreDebt:e.relativeScoreDebt});
   retainedRecords++;
  }else sourceCensored=true;
 };
 return {observer:{observe},result:()=>({
  width,totalBucketDecisions:totalDecisions,withDisplacement:displacingDecisions,
  heavy10PercentDecisions:heavyDecisions,heavyWith10kFutureBudget:budgetRemainingHeavy,
  globalTopKDisplaced:totalDisplaced,outsideTopKPromoted:totalPromoted,
  upperHalfDisplaced:topHalfRemoved,topQuarterDisplaced:topQuarterRemoved,
  sumScoreDebt:scoreDebt,maxBucketCount:largestActiveBuckets,nonFiniteScoreRecords:nonFinite,
  firstHeavy,retainedRecords,sourceCensored,events
 })};
}
if(process.argv.includes('--self-test')){
 const c=collector(512);
 c.observer.observe({width:512,rankedPoolSize:750,bucketCount:4,phaseDepth:12,
  workSpent:1000,actualSelected:512,globallyTopKDisplaced:60,outsideTopKPromoted:60,
  topHalfDisplaced:15,topQuarterDisplaced:4,
  minimumDisplacedGlobalRank:173,largestPromotedGlobalRank:731,
  totalScoreDebt:123,relativeScoreDebt:0.02});
 const r=c.result();
 assert(r.heavy10PercentDecisions===1&&r.heavyWith10kFutureBudget===1&&r.upperHalfDisplaced===15,'collector fixture');
 console.log('PG-I source-only quota-debt observer fixture passed');
 process.exit(0);
}
assert(out,'--out required');
const bytes=readFileSync(CORPUS),digest=hash(bytes);
assert(digest===SHA,'source corpus SHA mismatch');
const doc=JSON.parse(bytes),all=Array.isArray(doc)?doc:doc.levels;
assert(all.length===1700,'Corpus2 size drift');
const byId=new Map(all.map(x=>[x.id,x]));
const prior=JSON.parse(readFileSync(MANIFEST));
assert(prior.schema==='pathfinder.pg-l-flood-replay-prospective-corpus2-24-source-freeze/v1'
 &&prior.corpusSha256===SHA&&prior.selected?.length===24,'source-only prior manifest drift');
const chosen=prior.selected.slice(0,N);
assert(new Set(chosen.map(x=>x.id)).size===N&&chosen.every(x=>all[x.sourceIndex]?.id===x.id),'source-only frozen ID/index mismatch');
assert(chosen.every(x=>x.id!=='R03031'&&x.id!=='R02108'),'retrospective PG-I parent contamination');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {StrictWorkBudgetExhausted}=await import('../../modules/solver/work-meter.js');
const solver=createSolver(),rows=[];
async function attempt(level,gate,width,monitor){
 const prep=api.prepLevel(level);prep._cfg=null;prep._metrics={nodesExpanded:0};
 prep._workCap=WORK;prep._atomicStrictWorkCap=WORK;
 const measured=monitor?collector(width):null;
 if(measured)prep._mechanicBucketOpportunityObserver=measured.observer;
 let returned=null,status='exhausted',refereeValid=null,error=null;
 const detail={},start=Date.now();
 try{
  returned=await api.beamSearchFromGate(gate,level,prep,api.SCORING_PROFILES.intersectionHarvest,
   TIME,start,null,width,null,true,detail,NODE);
  if(returned){
   const check=solver.validateCandidatePath(level,returned);
   refereeValid=check.ok===true;status=refereeValid?'referee-valid-solve':'invalid-referee-path';
  }else if(detail.timedOut){
   status=prep._workMeter.units>=WORK?'work-budget-reached':
     Date.now()-start>=TIME?'wall-censored':'node-or-work-budget-reached';
  }
 }catch(err){
  if(err instanceof StrictWorkBudgetExhausted)status='strict-work-charge-refused';
  else{status='unexpected-error';error=String(err?.stack??err);}
 }
 const work=prep._workMeter.units;
 const valid=work<=WORK&&status!=='unexpected-error'&&status!=='invalid-referee-path';
 return {status,workSpent:work,nodes:status==='strict-work-charge-refused'?null:prep._metrics.nodesExpanded,
  refereeValid,solution:refereeValid?returned:null,sourceValid:valid,
  ...(measured?{bucketOpportunity:measured.result()}:{}),
  error,elapsedMs:Date.now()-start};
}
for(const item of chosen){
 const raw=byId.get(item.id);assert(raw,'frozen parent absent');
 const {id:_id,hints:_h,hintRecords:_hr,provenance:_pr,stressMeta:_meta,...cold}=raw;
 const level=solver.prepareLevelForSolver(cold,{source:'raw'}),gate=level.gateKeys[0];
 assert(gate!==undefined,'source canonical first gate missing '+item.id);
 const methods=[];
 for(const width of WIDTHS){
  const base=await attempt(level,gate,width,false);
  const observed=await attempt(level,gate,width,true);
  const signature=a=>JSON.stringify([a.status,a.workSpent,a.nodes,a.refereeValid,a.solution]);
  assert(base.sourceValid&&observed.sourceValid
    &&signature(base)===signature(observed),'PG-I bucket observer changed actual solver '+item.id+' width'+width);
  const bucket=observed.bucketOpportunity;
  assert(!bucket.sourceCensored&&bucket.nonFiniteScoreRecords===0,'PG-I quota census overflow/nan '+item.id);
  methods.push({width,base:{status:base.status,workSpent:base.workSpent,
     nodes:base.nodes,refereeValid:base.refereeValid},
   shadow:{status:observed.status,workSpent:observed.workSpent,
     nodes:observed.nodes,refereeValid:observed.refereeValid},
   exactNativeParity:true,bucketOpportunity:bucket});
  console.log('PG-I BUCKET DEBT '+JSON.stringify({
   id:item.id,width,work:base.workSpent,status:base.status,
   phases:bucket.totalBucketDecisions,heavy:bucket.heavy10PercentDecisions,
   globalTopKDisplaced:bucket.globalTopKDisplaced,
   heavyWithFuture:bucket.heavyWith10kFutureBudget}));
 }
 rows.push({sourceOrdinal:item.ordinal,sourceIndex:item.sourceIndex,parentId:item.id,
  sourceGateChosenWithoutHistory:gate,methods});
}
const allPairs=rows.flatMap(x=>x.methods);
const summary={independentSourceParents:N,sourceActualPairs:allPairs.length,
  arms:allPairs.length*2,exactStatusWorkPathParity:allPairs.filter(x=>x.exactNativeParity).length,
  width512:{bucketDecisions:rows.reduce((n,r)=>n+r.methods[0].bucketOpportunity.totalBucketDecisions,0),
   parentsWithAnyDisplacement:rows.filter(r=>r.methods[0].bucketOpportunity.withDisplacement>0).length,
   parentsWithAtLeast3HeavyAnd10kFuture:rows.filter(r=>r.methods[0].bucketOpportunity.heavyWith10kFutureBudget>=3).length,
   topKDisplacedTotal:rows.reduce((n,r)=>n+r.methods[0].bucketOpportunity.globalTopKDisplaced,0)},
  width5000:{bucketDecisions:rows.reduce((n,r)=>n+r.methods[1].bucketOpportunity.totalBucketDecisions,0),
   parentsWithAnyDisplacement:rows.filter(r=>r.methods[1].bucketOpportunity.withDisplacement>0).length,
   topKDisplacedTotal:rows.reduce((n,r)=>n+r.methods[1].bucketOpportunity.globalTopKDisplaced,0)},
  qualificationMinimumIndependentParents:3,
  populationGateMet:rows.filter(r=>r.methods[0].bucketOpportunity.heavyWith10kFutureBudget>=3).length>=3,
  new250kSolvesAttributedToObserver:0,observerDecisionsChanged:false,
  sourceCensored:allPairs.some(x=>x.bucketOpportunity.sourceCensored)};
const report={schema:'pathfinder.pg-i-mechanic-bucket-debt-12-independent-source-250k-census/v1',
 evidenceRole:'source-only-frozen-readonly-native-opportunity-census',
 sourceSha:process.env.GITHUB_SHA??null,corpusSha256:digest,sourceOnlyManifest:MANIFEST,
 selection:'first twelve source-only manifest IDs, no winner or outcome selection, original first gate and intersectionHarvest scorer',
 workContract:{strictWorkCap:WORK,nodeCap:NODE,wallSafetyMs:TIME,widths:WIDTHS,
  bucketRetention:true,fullHardPrunes:true,hintsUsed:false},
 summary,rows};
const dest=path.resolve(out);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('PG-I BUCKET DEBT VERDICT '+JSON.stringify(summary));
assert(summary.exactStatusWorkPathParity===24&&!summary.sourceCensored,'source-parity/overflow gate');
