#!/usr/bin/env node
/**
 * Source-native PG-J eligibility observer, NOT a solver experiment or prune.
 * Uses only a fixed, outcome-blind 12-parent Corpus2 input roster.
 *
 * node scripts/run-bundled.mjs scripts/stress/pg-j-corpus2-subset-opportunity.mjs -- --out=tmp/pg-j-opportunity.json
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
import {reconstructBeamPath} from './production-search-frontier-sampler-lib.mjs';

const SOURCE='data/stress/stress-levels-random.json';
const FREEZE='reports/stress/pg-j-coupled-obligation-transfer-12-parent-20261018.json';
const PHASES=[8,16,24,32,48];
const WIDTH=128,WORK_CAP=40000,NODE_CAP=50000,WALL_CAP_MS=120000;
const arg=process.argv.slice(2).find(x=>x.startsWith('--out='))?.slice(6);
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const rankIndices=count=>[...new Set([0,Math.floor((count-1)/4),Math.floor((count-1)/2),
  Math.floor(3*(count-1)/4),count-1])].filter(x=>x>=0&&x<count);
const sha=b=>createHash('sha256').update(b).digest('hex');
if(process.argv.includes('--self-test')){
 assert(JSON.stringify(rankIndices(5))==='[0,1,2,3,4]','rank sample five');
 assert(JSON.stringify(rankIndices(1))==='[0]','rank sample one');
 assert(JSON.stringify(rankIndices(0))==='[]','rank sample zero');
 console.log('PG-J subset opportunity self-test passed');
 process.exit(0);
}
assert(arg,'--out=<path> required');
const source=readFileSync(SOURCE),sourceHash=sha(source);
const freeze=JSON.parse(readFileSync(FREEZE,'utf8'));
assert(freeze.schema==='pathfinder.pg-j-coupled-obligation-transfer-opportunity-freeze/v1'
 &&freeze.frozenBeforeAnyNewPGJTransferProbe===true
 &&sourceHash===freeze.sourceSha256
 &&freeze.rows.length===12,'frozen PG-J source identity changed');
const parsed=JSON.parse(source.toString('utf8'));
const corpus=Array.isArray(parsed)?parsed:parsed.levels;
assert(Array.isArray(corpus)&&corpus.length===freeze.sourceRecords,'corpus size changed');
const rows=[];
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const Solver=createSolver();
const profile=api.SCORING_PROFILES.objectiveFirst;
assert(profile,'objectiveFirst profile missing');
const pack=(x,y)=>api.PACK(x-1,y-1);
const portalPairs=raw=>(raw.portals??[]).map(p=>[pack(p.x1,p.y1),pack(p.x2,p.y2)]);
const assess=(keys,level,prep,replayPrep,pairs)=>{
 const state=api.createState(keys[0],level,replayPrep,0);
 const initialWork=replayPrep._workMeter.units;
 for(let k=1;k<keys.length;k++){
  const from=state.path.at(-1),target=keys[k];
  const options=api.getNeighbors(from,state,level,replayPrep);
  assert(options.includes(target),'captured source beam node replays illegal next key');
  const jump=!state.lastWasPortalJump&&level.portalMap.get(from)?.dest===target;
  api.applyMove(target,state,level,replayPrep,!!jump);
 }
 assert(state.path.length===keys.length,'replay path length mismatch');
 const outstandingMP=level.mustPassKeys.filter((_,i)=>(state.mpVisitedMask&(1<<i))===0).length;
 const pendingMC=level.mustCrossKeys.filter((_,i)=>(state.mustCrossMask&(1<<i))!==0).length;
 const unconsumedPairs=pairs.filter(pair=>pair.every(key=>state.visited[key]===0)).length;
 const remaining=level.requiredLength-api.getRealLengthFromState(state);
 return {depth:keys.length-1,outstandingMP,pendingMC,unconsumedPairs,
   eligible:outstandingMP>=2&&pendingMC>=1&&unconsumedPairs>=1,
   countedRemaining:remaining,replayWork:replayPrep._workMeter.units-initialWork,
   // Paths retained only so future consumer can prove what was actually measured,
   // never used as hints or passed into this original beam search.
   path:keys};
};
for(const [index,item] of freeze.rows.entries()){
 const raw=corpus[item.corpusPosition-1];
 assert(raw?.id===item.parentId,'roster changed at '+item.parentId);
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_prov,...mechanics}=raw;
 const level=Solver.prepareLevelForSolver(mechanics,{source:'raw'});
 const prep=api.prepLevel(level),replayPrep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};prep._workCap=WORK_CAP;
 const gate=level.gateKeys[0],pairs=portalPairs(raw);
 // The immutable roster recorded RAW MP count. Normalization also makes
 // mustTurn/mustPass landmarks mandatory visits; comparing directly with raw
 // mustPass is a false identity alarm (observed on source R00565).
 const sourceRequiredMP=new Set((raw.mustPass??[]).map(p=>pack(p.x,p.y)));
 for(const landmark of raw.landmarks??[]){
  const role=landmark.role??'';
  if(role==='mustPass'||role==='mustTurn'||role==='mustTurnCw'||role==='mustTurnCcw')
    sourceRequiredMP.add(pack(landmark.x,landmark.y));
 }
 assert((raw.mustPass?.length??0)===item.mustPass&&(raw.mustCross?.length??0)===item.mustCross
  &&pairs.length===item.portals
  &&level.mustPassKeys.length===sourceRequiredMP.size
  &&level.mustCrossKeys.length===item.mustCross,
  'board mechanics changed: '+JSON.stringify({
    id:item.parentId,rawMP:item.mustPass,normalizedMP:level.mustPassKeys.length,
    derivedSourceMP:sourceRequiredMP.size,mc:level.mustCrossKeys.length,
    expectedMC:item.mustCross,pairs:pairs.length,expectedPairs:item.portals,
  }));
 const startTime=Date.now(),checkpoints=[];
 let continuation=undefined,resultPath=null,status='checkpoints-complete';
 for(const desired of PHASES){
  const output={};
  const result=await api.beamSearchFromGate(gate,level,prep,profile,WALL_CAP_MS,startTime,
    null,WIDTH,null,false,output,NODE_CAP,continuation,desired,true);
  if(result){
   assert(Solver.validateCandidatePath(level,result).ok,'unexpected invalid isolated cold solve');
   resultPath=result;status='source-valid-isolated-beam-solve';break;
  }
  if(!output.pausedContinuation){
   status=output.timedOut?'budget-stop-no-continuation':'frontier-exhausted';break;
  }
  continuation=output.pausedContinuation;
  const frontier=continuation.frontier,indices=rankIndices(frontier.length);
  const sampled=indices.map(rank=>{
   const keys=reconstructBeamPath(frontier[rank]);
   return {scoreRank:rank,score:frontier[rank].score,
      ...assess(keys,level,prep,replayPrep,pairs)};
  });
  checkpoints.push({phase:continuation.phasesCompleted,
   actualWork:prep._workMeter.units,actualNodes:continuation.nodesExpandedTotal,
   frontierSize:frontier.length,sampled,
   eligibleSampled:sampled.filter(x=>x.eligible).length});
  if(prep._workMeter.units>=WORK_CAP){status='phase-boundary-work-stop';break;}
  if(continuation.nodesExpandedTotal>=NODE_CAP){status='node-stop';break;}
  if(Date.now()-startTime>=WALL_CAP_MS){status='wall-stop';break;}
 }
 const eligible=checkpoints.reduce((sum,c)=>sum+c.eligibleSampled,0);
 const sampled=checkpoints.reduce((sum,c)=>sum+c.sampled.length,0);
 const row={rank:index+1,parentId:item.parentId,gate,
  selectedBy:'first normalized gate / objectiveFirst / width128',status,
  workSpent:prep._workMeter.units,
  nominalCapExceeded:prep._workMeter.units>WORK_CAP,
  observedNodes:continuation?.nodesExpandedTotal??prep._metrics.nodesExpanded??0,
  sourceValidIsolatedSolve:!!resultPath,
  sourceValidSolution:resultPath,
  replayWorkSeparatelyMetered:replayPrep._workMeter.units,
  sampled,eligible,checkpoints};
 rows.push(row);
 console.log('PG-J SUBSET OPPORTUNITY '+JSON.stringify({id:row.parentId,
  status,workSpent:row.workSpent,sampled,eligible,phases:checkpoints.map(x=>x.phase)}));
}
const summary={
 independentParents:rows.length,
 parentsWithSampledFrontiers:rows.filter(x=>x.sampled>0).length,
 parentsWithEligibleRetainedPrefixes:rows.filter(x=>x.eligible>0).length,
 sampledPrefixes:rows.reduce((n,x)=>n+x.sampled,0),
 eligiblePrefixes:rows.reduce((n,x)=>n+x.eligible,0),
 sourceValidIsolatedSolves:rows.filter(x=>x.sourceValidIsolatedSolve).length,
 totalBeamWork:rows.reduce((n,x)=>n+x.workSpent,0),
 separateReplayWork:rows.reduce((n,x)=>n+x.replayWorkSeparatelyMetered,0),
 nominalPhaseOverruns:rows.filter(x=>x.nominalCapExceeded).length,
 participationGatePassed:rows.filter(x=>x.eligible>0).length>=2
  &&rows.reduce((n,x)=>n+x.eligible,0)>=8,
};
const report={schema:'pathfinder.pg-j-corpus2-subset-opportunity/v1',
 evidenceRole:'prospective-outcome-blind-real-beam-frontier-opportunity',
 sourceHead:process.env.GITHUB_SHA??null,corpusFile:SOURCE,corpusSha256:sourceHash,
 freezeFile:FREEZE,selection:'literal twelve distinct pre-frozen structural Corpus2 levels; first native gate, objectiveFirst width128 and phase sample; no level IDs or history affect solver policy',
 contract:{phases:PHASES,width:WIDTH,nominalWorkCap:WORK_CAP,
  nodeCap:NODE_CAP,wallSafetyMs:WALL_CAP_MS,phaseBudgetMayOvershoot:true,
  researchOnly:true,canonicalWork:'applyMove + 12*isConnected',
  control:'Observer replays sample on independent prep, never alters original frontier, work, scoring, pruning or ordering.'},
 summary,rows};
const dest=path.resolve(arg);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('PG-J SUBSET OPPORTUNITY VERDICT '+JSON.stringify(summary));
assert(summary.independentParents===12&&summary.parentsWithSampledFrontiers>0,'no viable beam source exposures');
