#!/usr/bin/env node
/**
 * PG-I current-code late beam taper: literal source-authentic BEAM continuation,
 * phase8/16 5000→512, all at a hard 250k work cap; comparison to width5000.
 * Deep historical winners nominate the gate/technique and are POST-HOC labels,
 * NEVER passed into a search primitive or a move ranking policy.
 *
 * node scripts/run-bundled.mjs scripts/stress/pg-i-late-beam-taper-250k.mjs -- --out=...
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
import {reconstructBeamPath} from './production-search-frontier-sampler-lib.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const WITNESSES='reports/stress/pg-i-early-equal-work-cold-solves-20261018.json';
const EXPECTED_SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const WORK=250000,NODES=250000,TIME=600000,EARLY_WIDTH=5000,LATE_WIDTH=512;
const ARMS=[{name:'wide-control',checkpoint:null},{name:'taper-depth8',checkpoint:8},{name:'taper-depth16',checkpoint:16}];
const arg=process.argv.slice(2).find(x=>x.startsWith('--out='))?.slice(6);
const assert=(v,m)=>{if(!v)throw Error(m)};
const hash=x=>createHash('sha256').update(x).digest('hex');
function parse(method){
 const profile=method.match(/score=([^|]+)/)?.[1],width=Number(method.match(/width=(\d+)/)?.[1]);
 assert(width===EARLY_WIDTH&&['objectiveFirst','intersectionHarvest'].includes(profile),'PG-I method changed');
 return {profile,mechanicBuckets:method.includes('retention=mechanic-buckets')};
}
function observedRankOnly(frontier,winner,depth){
 const prefix=winner.slice(0,depth+1);let index=-1,score=null;
 for(let k=0;k<frontier.length;k++){
  const candidate=reconstructBeamPath(frontier[k]);
  if(candidate.length===prefix.length&&candidate.every((v,i)=>v===prefix[i])){
   index=k;score=frontier[k].score;break;
  }
 }
 return {winnerPrefixRetained:index>=0,winnerRetainedPosition:index<0?null:index+1,
  winnerRetainedScore:score,frontierCount:frontier.length,
  allCandidatesComparedAfterNativePause:true};
}
if(process.argv.includes('--self-test')){
 assert(parse('beam|score=objectiveFirst|bias=none|width=5000|retention=plain').mechanicBuckets===false,'plain parser');
 assert(parse('beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets').mechanicBuckets===true,'bucket parser');
 const nodes=[{key:1,prev:null,score:42,depth:0}];
 assert(observedRankOnly(nodes,[1],0).winnerRetainedPosition===1,'read-only winner rank');
 assert(ARMS.length===3&&ARMS[1].checkpoint===8&&ARMS[2].checkpoint===16,'taper preregistration');
 console.log('PG-I delayed width taper source contract and witness-only rank self-test passed');
 process.exit(0);
}
assert(arg,'--out=<path> required');
const bytes=readFileSync(CORPUS),sourceDigest=hash(bytes);
assert(sourceDigest===EXPECTED_SHA,'source corpus changed');
const doc=JSON.parse(bytes),list=Array.isArray(doc)?doc:doc.levels;
assert(Array.isArray(list),'source schema');
const source=new Map(list.map(x=>[x.id,x]));
const history=JSON.parse(readFileSync(WITNESSES,'utf8'));
assert(history.sourceCorpusSha256===EXPECTED_SHA&&history.solutions?.length===3
 &&new Set(history.solutions.map(x=>x.levelId)).size===2,'frozen source winner population changed');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {StrictWorkBudgetExhausted}=await import('../../modules/solver/work-meter.js');
const solver=createSolver(),rows=[];
for(const [i,witness] of history.solutions.entries()){
 const raw=source.get(witness.levelId);
 assert(raw,'missing frozen source parent: '+witness.levelId);
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_pr,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 const gate=witness.path[0];assert(level.gateKeys.includes(gate),'historical source gate not present');
 assert(solver.validateCandidatePath(level,witness.path).ok,'10M reference winner referee changed');
 const {profile:score,mechanicBuckets}=parse(witness.method),profile=api.SCORING_PROFILES[score];
 assert(profile,'current scorer missing');
 const arms=[];
 for(const a of ARMS){
  const prep=api.prepLevel(level);prep._cfg=null;prep._metrics={nodesExpanded:0};
  prep._workCap=WORK;prep._atomicStrictWorkCap=WORK;
  const started=Date.now();let status='exhausted',found=null,refereeValid=null,error=null;
  let pause=null,finalOut={},phaseEarly=null;
  try {
   if(a.checkpoint!==null){
    const pre={};
    found=await api.beamSearchFromGate(gate,level,prep,profile,TIME,started,
     null,EARLY_WIDTH,null,mechanicBuckets,pre,NODES,undefined,a.checkpoint);
    if(pre.pausedContinuation){
     const continuation=pre.pausedContinuation;
     phaseEarly={checkpoint:a.checkpoint,completedDepth:continuation.phasesCompleted,
       workSpentAtPause:prep._workMeter.units,
       ...observedRankOnly(continuation.frontier,witness.path,continuation.phasesCompleted)};
     assert(phaseEarly.completedDepth===a.checkpoint,'pause checkpoint identity changed');
     // Change ONLY width for the next expansion+retention phase. No restart,
     // fresh PrepLevel or native meter replacement.
     found=await api.beamSearchFromGate(gate,level,prep,profile,TIME,started,
      null,LATE_WIDTH,null,mechanicBuckets,finalOut,NODES,continuation);
    }else{
     finalOut=pre;
     status='early-stage-exhausted-or-censored';
    }
   }else{
    found=await api.beamSearchFromGate(gate,level,prep,profile,TIME,started,
     null,EARLY_WIDTH,null,mechanicBuckets,finalOut,NODES);
   }
   if(found){
    const ref=solver.validateCandidatePath(level,found);
    refereeValid=ref.ok===true;status=ref.ok?'referee-valid-solve':'invalid-referee-result';
   }else if(finalOut.timedOut){
    status=prep._workMeter.units>=WORK?'work-budget-reached':
       (Date.now()-started>=TIME?'wall-safety-censored':'node-or-work-budget-reached');
   }
  }catch(e){
   if(e instanceof StrictWorkBudgetExhausted)status='strict-work-charge-refused';
   else{status='unexpected-error';error=String(e?.stack??e);}
  }
  const work=prep._workMeter.units;
  const valid=work<=WORK&&status!=='unexpected-error'&&status!=='invalid-referee-result';
  arms.push({name:a.name,widthAtFirstPhase:EARLY_WIDTH,lateWidth:a.checkpoint===null?null:LATE_WIDTH,
   checkpoint:a.checkpoint,scoreProfile:score,mechanicBuckets,
   status,workSpent:work,actualNodes:(status==='strict-work-charge-refused'||status==='unexpected-error')?
      null:prep._metrics.nodesExpanded,phaseEarly,refereeValid,
   winnerPathOnlyObservedAfterPause:true,winningPath:refereeValid?found:null,
   elapsedMs:Date.now()-started,valid,error});
 }
 const [control,...treatments]=arms;
 rows.push({sourceMethodOrdinal:i+1,parentId:witness.levelId,
  gateChosenFromDeepHistoricalWinner:gate,methodChosenFrom10MWinner:witness.method,
  originalDeepSolveWork:witness.workSpent,
  arms,added250kSolves:treatments.filter(x=>x.refereeValid===true&&control.refereeValid!==true).map(x=>x.name),
  controlRefereeValid:control.refereeValid===true});
 console.log('PG-I DELAYED TAPER '+JSON.stringify({id:witness.levelId,score,mechanicBuckets,
  arms:arms.map(x=>({arm:x.name,status:x.status,work:x.workSpent,checkpoint:x.phaseEarly?.completedDepth??null,
   retained:x.phaseEarly?.winnerPrefixRetained??null,position:x.phaseEarly?.winnerRetainedPosition??null,solve:x.refereeValid===true}))}));
}
const all=rows.flatMap(r=>r.arms),summary={
 sourceSelectedParents:2,methodCells:3,armCells:all.length,validCells:all.filter(x=>x.valid).length,
 original5000Solves:rows.filter(x=>x.arms[0].refereeValid===true).length,
 after8Solves:rows.filter(x=>x.arms[1].refereeValid===true).length,
 after16Solves:rows.filter(x=>x.arms[2].refereeValid===true).length,
 methodCellsWithNew250kSolve:rows.filter(x=>x.added250kSolves.length>0).length,
 independentSourceParentsWithNew250kSolve:new Set(rows.filter(x=>x.added250kSolves.length>0).map(x=>x.parentId)).size,
 worstWork:Math.max(...all.map(x=>x.workSpent)),
 errors:all.filter(x=>!x.valid).length,
 successfulTaperPauses:all.filter(x=>x.phaseEarly!==null).length,
 retainedWinnerPrefixesAmongTaperPauses:all.filter(x=>x.phaseEarly?.winnerPrefixRetained===true).length,
};
const report={schema:'pathfinder.pg-i-delayed-width-512-continuation-strict250k-development/v1',
 evidenceRole:'retrospective-development-cold-isolated-technique',
 executionSha:process.env.GITHUB_SHA??null,corpusSha256:sourceDigest,
 historicalWinnerData:WITNESSES,sourceHistoricalWinnerCommit:history.sourceCommit,
 selection:'three earlier 10M successful isolated technique/gate cells on two historically hard parent IDs, outcome-chosen for mechanism microscope, no independent transfer',
 workContract:{strictTotalIsolatedCap:WORK,atomicChargePrecondition:true,nodeCap:NODES,timeMs:TIME,
  earlyWidth:EARLY_WIDTH,lateWidth:LATE_WIDTH,transitionAfterCompletedDepths:[8,16],
  winnerPassedToScorerOrPrune:false,winnerUsedOnlyForPostPauseRank:true},
 summary,rows,interpretationLimit:'Only post-selected method-cell development. Referee valid new path not product-ladder 250k win. Previous fixed512-from-gate result remains negative regardless of this result.'};
const dest=path.resolve(arg);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('PG-I DELAYED TAPER VERDICT '+JSON.stringify(summary));
assert(summary.validCells===9&&summary.errors===0,'PG-I source/strict-work/referee/censoring error, see artifact');
