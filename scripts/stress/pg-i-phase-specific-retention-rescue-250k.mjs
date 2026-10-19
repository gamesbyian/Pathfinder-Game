#!/usr/bin/env node
/** PG-I exact-source phase19 width544 and phase29 plain-bucket counterfactual.
 * Historical path is a POST-DECISION label only, never a solver input or selector.
 * Reuse one live BeamContinuation, PrepLevel and native 250k work meter per arm.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
import {reconstructBeamPath} from './production-search-frontier-sampler-lib.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const WINNERS='reports/stress/pg-i-early-equal-work-cold-solves-20261018.json';
const FIRSTLOSS='reports/stress/pg-i-post-taper-first-loss-20261019-001.json';
const CASES=[
 {id:'R03031',scorer:'objectiveFirst',bucket:false,firstPause:16,beforeTarget:18,target:19,kind:'margin544',expectedStatus:'exhausted',expectedWork:239505},
 {id:'R02108',scorer:'intersectionHarvest',bucket:true,firstPause:8,beforeTarget:28,target:29,kind:'plainBucket',expectedStatus:'strict-work-charge-refused',expectedWork:249995},
];
const ARMS=['control','pulse','sustained'],CAP=250000,NODE=250000,TIME=600000;
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6);
const assert=(x,m)=>{if(!x)throw Error(m)};
const hash=x=>createHash('sha256').update(x).digest('hex');
const retain=(frontier,winner,depth)=>{
 const expected=winner.slice(0,depth+1);
 let i=0;
 for(const node of frontier){const p=reconstructBeamPath(node);if(p.length===expected.length&&p.every((v,k)=>v===expected[k]))return {retained:true,position:i+1,pool:frontier.length};i++;}
 return {retained:false,position:null,pool:frontier.length};
};
if(process.argv.includes('--self-test')){
 assert(CASES.length===2&&ARMS.length===3,'frozen arms');
 const n=[{key:42,prev:null,score:0,depth:0}];
 assert(retain(n,[42],0).position===1&&!retain(n,[39],0).retained,'post-pause rank check');
 console.log('PG-I source-phase precision counterfactual fixture passed');
 process.exit(0);
}
assert(out,'--out=<path> required');
const bytes=readFileSync(CORPUS),sha=hash(bytes);
assert(sha===SHA,'Corpus2 SHA source mismatch');
const source=JSON.parse(bytes),byId=new Map((Array.isArray(source)?source:source.levels).map(x=>[x.id,x]));
const history=JSON.parse(readFileSync(WINNERS)),before=JSON.parse(readFileSync(FIRSTLOSS));
assert(history.sourceCorpusSha256===SHA&&history.solutions?.length===3&&before.summary?.sourceExactWorkAndStatusParity===2,'historical source changed');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {StrictWorkBudgetExhausted}=await import('../../modules/solver/work-meter.js');
const solver=createSolver(),rows=[];

/** True original settings until first-loss phase; pulse changes only one full selection. */
function segmentPolicy(c,arm,stage){
 if(stage===0)return {width:5000,bucket:c.bucket,stop:c.firstPause};
 if(stage===1)return {width:512,bucket:c.bucket,stop:c.beforeTarget};
 const selected=arm!=='control'&&(stage===2||arm==='sustained');
 return {width:selected&&c.kind==='margin544'?544:512,
  bucket:selected&&c.kind==='plainBucket'?false:c.bucket,
  stop:stage===2?c.target:undefined};
}
async function run(c,arm,level,gate,scoring,label){
 const prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};prep._workCap=CAP;prep._atomicStrictWorkCap=CAP;
 const knownIndex=new api.KnownSolutionPrefixIndex([{path:label.path,provenance:'10m-source-historical-observer-only'}]);
 const observer=new api.KnownSolutionPrefixSurvivalObserver(knownIndex);
 prep._beamResearchObserver=observer;
 let continuation=null,found=null,status='exhausted',error=null,finished=false,atPhase=null;
 const stages=[],start=Date.now();
 try{
  for(let st=0;st<4;st++){
   const cfg=segmentPolicy(c,arm,st),report={};
   // The previous continuation carries live undo/state/metrics/counters.
   found=await api.beamSearchFromGate(gate,level,prep,scoring,TIME,start,
      null,cfg.width,null,cfg.bucket,report,NODE,continuation??undefined,cfg.stop);
   const halted=report.pausedContinuation;
   stages.push({stage:st,width:cfg.width,bucket:cfg.bucket,
    pauseTarget:cfg.stop??null,pauseReached:halted?.phasesCompleted??null,
    workAfter:prep._workMeter.units});
   if(st<3){
    assert(!found&&halted&&halted.phasesCompleted===cfg.stop,
      'unexpected source phase termination '+c.id+' '+arm+' stage='+st);
    continuation=halted;
    if(st===2)atPhase={depth:cfg.stop,work:prep._workMeter.units,
      ...retain(halted.frontier,label.path,cfg.stop)};
   }else{
    finished=true;
    if(found){
     const v=solver.validateCandidatePath(level,found);
     status=v.ok===true?'referee-valid-solve':'invalid-referee-result';
    }else if(report.timedOut){
     status=prep._workMeter.units>=CAP?'work-budget-reached':
       Date.now()-start>=TIME?'wall-safety-censored':'node-or-work-budget-reached';
    }
   }
  }
 }catch(err){
  if(err instanceof StrictWorkBudgetExhausted)status='strict-work-charge-refused';
  else{status='unexpected-error';error=String(err?.stack??err);}
 }
 const work=prep._workMeter.units,summary=observer.summary(level.requiredLength);
 assert(work<=CAP,'source strict work exceeded '+c.id+' '+arm);
 assert(status!=='invalid-referee-result'&&status!=='unexpected-error','source invalid path/error '+c.id+' '+arm+': '+error);
 assert(summary.correctnessAlarms.length===0,'source hard prune of valid known path '+c.id+' '+arm);
 assert(atPhase?.depth===c.target,'target phase did not finish '+c.id+' '+arm);
 const frontierAfter=summary.stages.filter(x=>x.stage.includes('frontier')&&x.depth>=c.target).map(x=>({
   stage:x.stage,depth:x.depth,work:x.workSpent,support:x.supportedCandidates,
   total:x.candidateCount
 }));
 return {arm,status,work,refereeValid:status==='referee-valid-solve',solution:status==='referee-valid-solve'?found:null,
  completedNormally:finished,nodeCount:status==='strict-work-charge-refused'?null:prep._metrics.nodesExpanded,
  stages,atPhase,
  firstLoss:summary.firstSupportLoss?{stage:summary.firstSupportLoss.stage,
    reason:summary.firstSupportLoss.lossCause??null,depth:summary.firstSupportLoss.depth,
    work:summary.firstSupportLoss.workSpent}:null,
  finalLoss:summary.finalSupportLoss?{stage:summary.finalSupportLoss.stage,
    reason:summary.finalSupportLoss.lossCause??null,depth:summary.finalSupportLoss.depth,
    work:summary.finalSupportLoss.workSpent}:null,
  lastSupportDepth:summary.lastSupportDepth,workAfterKnownSupport:summary.workAfterFinalKnownSupport,
  correctnessAlarms:summary.correctnessAlarms.length,
  frontierAfterTarget:frontierAfter,
  stageEventCount:summary.stages.length};
}
for(const c of CASES){
 const raw=byId.get(c.id);assert(raw,'missing source level '+c.id);
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_p,...cold}=raw;
 const level=solver.prepareLevelForSolver(cold,{source:'raw'});
 const label=history.solutions.find(x=>x.levelId===c.id&&x.method.includes('score='+c.scorer+'|')
  &&x.method.includes(c.bucket?'retention=mechanic-buckets':'retention=plain'));
 assert(label&&solver.validateCandidatePath(level,label.path).ok,'source deep path mismatched '+c.id);
 const gate=label.path[0],scoring=api.SCORING_PROFILES[c.scorer];
 assert(level.gateKeys.includes(gate)&&scoring,'source gate/scorer changed');
 const record=before.rows.find(x=>x.parentId===c.id&&x.profile===c.scorer);
 assert(record&&record.actualWork===c.expectedWork&&record.sourceResult===c.expectedStatus
  &&record.firstWitnessLoss.depth===c.target,'prior first-loss source mismatch');
 const arms=[];
 for(const arm of ARMS)arms.push(await run(c,arm,level,gate,scoring,label));
 const baseline=arms[0];
 assert(baseline.work===c.expectedWork&&baseline.status===c.expectedStatus,
  'segmented same-policy replay changed original native work/status on '+c.id);
 assert(baseline.atPhase.retained===false,'source previously culled path unexpectedly retained at target');
 rows.push({id:c.id,scorer:c.scorer,originalBuckets:c.bucket,firstPause:c.firstPause,
  previousFirstLossDepth:c.target,developmentIntervention:c.kind,
  originalDeepWitnessSha256:hash(JSON.stringify(label.path)),
  exactControlParity:true,arms});
 console.log('PG-I SOURCE PHASE RESCUE '+JSON.stringify({
  id:c.id,kind:c.kind,controlStatus:baseline.status,controlWork:baseline.work,
  treatments:arms.map(a=>({arm:a.arm,status:a.status,work:a.work,
   liveAfterTarget:a.atPhase.retained,rankAfterTarget:a.atPhase.position,
   lastKnownSupportDepth:a.lastSupportDepth,workAfterSupport:a.workAfterKnownSupport,solve:a.refereeValid}))
 }));
}
const all=rows.flatMap(x=>x.arms);
const summary={sourceSelectedParents:rows.length,armCells:all.length,
 exactControlParities:rows.filter(x=>x.exactControlParity).length,
 originalSolves:rows.filter(x=>x.arms[0].refereeValid).length,
 pulseSolves:rows.filter(x=>x.arms[1].refereeValid).length,
 sustainedSolves:rows.filter(x=>x.arms[2].refereeValid).length,
 newIsolated250kSolves:rows.reduce((n,r)=>n+r.arms.slice(1).filter(a=>a.refereeValid&&!r.arms[0].refereeValid).length,0),
 targetWitnessRescuedByPulse:rows.filter(x=>x.arms[1].atPhase.retained).length,
 targetWitnessRescuedBySustained:rows.filter(x=>x.arms[2].atPhase.retained).length,
 sourceWorkCapViolations:all.filter(x=>x.work>CAP).length,
 sourceRefereeOrPruneAlarms:all.reduce((n,a)=>n+a.correctnessAlarms,0),
 maxWork:Math.max(...all.map(x=>x.work))};
const result={schema:'pathfinder.pg-i-phase-specific-retention-counterfactual-strict250k/v1',
 evidenceRole:'retrospective-post-outcome-development-only',
 sourceExecutionSha:process.env.GITHUB_SHA??null,sourceCorpusSha256:sha,
 inputs:{history:WINNERS,priorFirstLoss:FIRSTLOSS,parents:CASES.map(({id,scorer,target,kind})=>({id,scorer,target,kind}))},
 protocol:{workCap:CAP,nodeCap:NODE,wallSafetyMs:TIME,
  arms:ARMS,historyWinnerSearchInput:false,historyOnlyObserverAfterDecisions:true,
  actualNativeSamePrepContinuation:true,originalPrunes:true,sourceSelected:true},
 summary,rows,
 limit:'Pulses deliberately triggered at retrospectively observed loss phase on winner-positive parents; never claim an independent product cold capability from either a rescued prefix or a solve.'};
const dest=path.resolve(out);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log('PG-I RESCUE VERDICT '+JSON.stringify(summary));
assert(summary.armCells===6&&summary.exactControlParities===2&&summary.sourceWorkCapViolations===0
  &&summary.sourceRefereeOrPruneAlarms===0,'PG-I source-control/correctness invariant');
