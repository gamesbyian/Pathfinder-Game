#!/usr/bin/env node
/** PG-I post-taper actual winning-prefix first-loss microscope.
 * HISTORICAL paths are ONLY labels consumed by the read-only beam event observer.
 * The same native beam, prep and work counter run with no winner-conditioned moves.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const CORPUS='data/stress/stress-levels-random.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const WITNESS='reports/stress/pg-i-early-equal-work-cold-solves-20261018.json';
const PRIOR='reports/stress/pg-i-late-beam-taper-250k-20261019-001.json';
const WORK=250000,NODE=250000,TIME=600000;
const CASES=[
 {id:'R03031',profile:'objectiveFirst',buckets:false,depth:16,taperName:'taper-depth16'},
 {id:'R02108',profile:'intersectionHarvest',buckets:true,depth:8,taperName:'taper-depth8'},
];
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const assert=(yes,m)=>{if(!yes)throw Error(m)};
const hash=s=>createHash('sha256').update(s).digest('hex');
if(process.argv.includes('--self-test')){
 assert(CASES.length===2&&CASES[0].depth===16&&CASES[1].depth===8,'two-source precommit');
 console.log('PG-I post-taper native first-loss precommit shape passed');process.exit(0);
}
assert(out,'--out required');
const b=readFileSync(CORPUS),sha=hash(b);assert(sha===SHA,'Corpus2 changed');
const doc=JSON.parse(b),byId=new Map((Array.isArray(doc)?doc:doc.levels).map(x=>[x.id,x]));
const original=JSON.parse(readFileSync(PRIOR));
const winners=JSON.parse(readFileSync(WITNESS));
assert(original.summary?.armCells===9&&original.summary?.errors===0
 &&winners.solutions.length===3&&winners.sourceCorpusSha256===SHA,'source evidence changed');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {StrictWorkBudgetExhausted}=await import('../../modules/solver/work-meter.js');
const solver=createSolver(),rows=[];
for(const [ordinal,c] of CASES.entries()){
 const raw=byId.get(c.id);assert(raw,'missing source parent '+c.id);
 const originalRow=original.rows.find(r=>r.parentId===c.id &&r.profile===c.profile
  &&r.mechanicBucketRetention===c.buckets);
 const previous=originalRow?.arms.find(a=>a.name===c.taperName);
 assert(previous?.checkpointDepth===c.depth &&previous.refereeValidSolve===false,
  'prior fixed cell source mismatch');
 const label=winners.solutions.find(x=>x.levelId===c.id
  &&x.method.includes('score='+c.profile+'|')
  &&x.method.includes(c.buckets?'retention=mechanic-buckets':'retention=plain'));
 assert(label,'valid original 10M path label missing '+c.id);
 const {id:_id,stressMeta:_m,hints:_h,hintRecords:_hr,provenance:_p,...mech}=raw;
 const level=solver.prepareLevelForSolver(mech,{source:'raw'});
 const gate=label.path[0];assert(level.gateKeys.includes(gate),'gate mismatch');
 assert(solver.validateCandidatePath(level,label.path).ok,'label referee changed');
 const prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};prep._workCap=WORK;prep._atomicStrictWorkCap=WORK;
 const index=new api.KnownSolutionPrefixIndex([{path:label.path,provenance:'source-10M-only-posthoc'}]);
 const observer=new api.KnownSolutionPrefixSurvivalObserver(index);
 prep._beamResearchObserver=observer;
 const profile=api.SCORING_PROFILES[c.profile],start=Date.now();
 let finalPath=null,status='exhausted',error=null,atPause=null;
 try{
  const first={};
  finalPath=await api.beamSearchFromGate(gate,level,prep,profile,TIME,start,null,
   5000,null,c.buckets,first,NODE,undefined,c.depth);
  assert(!finalPath &&first.pausedContinuation,'source failed to pause at existing checkpoint');
  atPause={depth:first.pausedContinuation.phasesCompleted,work:prep._workMeter.units,
   frontierSize:first.pausedContinuation.frontier.length};
  const last={};
  finalPath=await api.beamSearchFromGate(gate,level,prep,profile,TIME,start,null,
   512,null,c.buckets,last,NODE,first.pausedContinuation);
  if(finalPath){
   const verdict=solver.validateCandidatePath(level,finalPath);
   status=verdict.ok?'referee-valid-solve':'invalid-referee-result';
  }else if(last.timedOut)status=prep._workMeter.units>=WORK?'work-budget-reached':
   'node-or-wall-censored';
 }catch(err){
  if(err instanceof StrictWorkBudgetExhausted)status='strict-work-charge-refused';
  else{status='unexpected-error';error=String(err?.stack??err);}
 }
 const work=prep._workMeter.units;
 assert(work<=WORK&&work===previous.actualWork&&status===previous.status,
  'observer has changed identical native source work/status: '+c.id+' '+status+'/'+work);
 assert(!finalPath&&status!=='unexpected-error'&&status!=='invalid-referee-result',
  'unexpected new path or source exception: '+c.id);
 const record=observer.summary(level.requiredLength);
 assert(record.correctnessAlarms.length===0,
  'known valid deep witness was hard-pruned at actual stage; correctness alarm '+c.id);
 const stageSummaries=record.stages.map(x=>({
  stage:x.stage,depth:x.depth,workSpent:x.workSpent,
  candidateCount:x.candidateCount,supportedCandidates:x.supportedCandidates,
  supportedPaths:x.supportedPaths,lossCause:x.lossCause??null,
  supportedPool:x.details?.supportedPool??null
 }));
 rows.push({ordinal:ordinal+1,parentId:c.id,profile:c.profile,buckets:c.buckets,
  taperAfterPhase:c.depth,sourceHistoricalPathDigest:hash(JSON.stringify(label.path)),
  sourceWorkExactParity:true,work,status,error,atPause,
  firstSupportLoss:record.firstSupportLoss,
  finalSupportLoss:record.finalSupportLoss,
  lastSupportedDepth:record.lastSupportDepth,
  lastNormalizedSupportDepth:record.normalizedLastSupportDepth,
  workAfterLastSupportedBoundary:record.workAfterFinalKnownSupport,
  correctnessAlarmCount:record.correctnessAlarms.length,stages:stageSummaries});
 console.log('PG-I POST-TAPER LOSS '+JSON.stringify({
  id:c.id,work,status,stageEvents:stageSummaries.length,firstLoss:record.firstSupportLoss?.lossCause??null,
  firstLossDepth:record.firstSupportLoss?.depth??null,lastSupportDepth:record.lastSupportDepth,
  remainingAfterLastSupportWork:record.workAfterFinalKnownSupport,
  correctnessAlarms:record.correctnessAlarms.length}));
}
const summary={sourceSelectedParents:2,cells:rows.length,exactSourceParity:rows.filter(x=>x.sourceWorkExactParity).length,
 correctnessAlarms:rows.reduce((n,r)=>n+r.correctnessAlarmCount,0),
 labelledLossObserved:rows.filter(x=>x.firstSupportLoss!==null).length,
 candidateStageRecords:rows.reduce((n,r)=>n+r.stages.length,0),
 newColdSolves:0};
const result={schema:'pathfinder.pg-i-post-taper-first-loss-source-native/v1',
 evidenceRole:'selected-development-readonly-forensic',executionSha:process.env.GITHUB_SHA??null,
 sourceCorpusSha256:sha,sourceHistoricalWinnerFile:WITNESS,previousTaperMachineFile:PRIOR,
 populationSelection:'two previous no-solve tapers selected retrospectively from original 10M-valid paths; historical winner labels enter only observer AFTER decisions',
 contract:{work:WORK,nodes:NODE,timeMs:TIME,sourceGateFromHistoricalWinner:true,historyAsSearchInput:false,
  prefixObserverDecisionInert:true,exactPriorWorkStatusExpected:true},summary,rows};
const dest=path.resolve(out);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log('PG-I FIRST LOSS VERDICT '+JSON.stringify(summary));
