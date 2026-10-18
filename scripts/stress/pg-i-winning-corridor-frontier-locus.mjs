#!/usr/bin/env node
/**
 * PG-I development-only beam microscope.
 * Pure solver execution is history-free; historical winners annotate completed
 * checkpoints afterward. Gate/technique cases are retrospectively selected from
 * isolated-source successes, so results are NOT an unbiased product cold score.
 * Invoke through node scripts/run-bundled.mjs scripts/stress/pg-i-winning-corridor-frontier-locus.mjs -- --out=...
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
import {reconstructBeamPath} from './production-search-frontier-sampler-lib.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const WITNESSES='reports/stress/pg-i-early-equal-work-cold-solves-20261018.json';
const EXPECTED_SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const WORK_CAP=250000;
const NODE_CAP=250000;
const CHECKPOINTS=[4,8,12,16,24,32,40,48,56,64,80,104];
const args=process.argv.slice(2);
const outPath=args.find(x=>x.startsWith('--out='))?.slice(6);
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
function commonPrefixCount(a,b){
 let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;return i;
}
function snapshot(frontier,winner,completedPhases) {
 const depth=completedPhases;
 let exact=0,longestCommonPrefix=0,exactScore=null;
 const scores=[];
 for(const node of frontier){
   const prefix=reconstructBeamPath(node);
   assert(prefix.length===depth+1,'frontier node depth disagrees with phase');
   const common=commonPrefixCount(prefix,winner);
   if(common>longestCommonPrefix)longestCommonPrefix=common;
   if(common===prefix.length&&prefix.length<=winner.length){
     exact++; exactScore=node.score;
   }
   scores.push(node.score);
 }
 scores.sort((a,b)=>b-a);
 return {phaseDepth:depth,frontierSize:frontier.length,fullKnownWinnerPrefixRetained:exact>0,
  exactWinnerPrefixCandidates:exact,longestKnownPrefixCount:longestCommonPrefix,
  exactWinnerFrontierScore:exactScore,
  scoreMax:scores[0]??null,scoreMedian:scores.length?scores[Math.floor((scores.length-1)/2)]:null,
  scoreMin:scores.at(-1)??null};
}
if(args.includes('--self-test')){
 assert(commonPrefixCount([1,2,3],[1,2,4])===2,'common prefix test');
 const chain={key:3,depth:2,score:5,prev:{key:2,depth:1,score:0,prev:{key:1,depth:0,score:0,prev:null}}};
 const s=snapshot([chain],[1,2,3,4],2);
 assert(s.fullKnownWinnerPrefixRetained===true&&s.longestKnownPrefixCount===3,'known path observer');
 assert(snapshot([chain],[1,2,9],2).fullKnownWinnerPrefixRetained===false,'negative observer');
 console.log('PG-I frontier-locus self-test passed');process.exit(0);
}
assert(!!outPath,'--out=<file> is required');
const corpusBytes=readFileSync(CORPUS);
const corpusSha=createHash('sha256').update(corpusBytes).digest('hex');
assert(corpusSha===EXPECTED_SHA,'corpus checksum differs from frozen source');
const corpusDoc=JSON.parse(corpusBytes.toString('utf8'));
const corpus=Array.isArray(corpusDoc)?corpusDoc:corpusDoc.levels;
assert(Array.isArray(corpus),'missing corpus levels');
const levels=new Map(corpus.map(x=>[x.id,x]));
const evidence=JSON.parse(readFileSync(WITNESSES,'utf8'));
assert(evidence.sourceCorpusSha256===corpusSha,'witness corpus mismatch');
assert(evidence.solutions?.length===3,'expected original three isolated method witnesses');
assert(new Set(evidence.solutions.map(x=>x.levelId)).size===2,'expected two independent parents');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const solver=createSolver();
const outputRows=[];
for(const [ordinal,record] of evidence.solutions.entries()){
  const raw=levels.get(record.levelId);
  assert(!!raw,'missing winner parent from original corpus: '+record.levelId);
  const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_prov,...mechanics}=raw;
  const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
  const verdict=solver.validateCandidatePath(level,record.path);
  assert(verdict.ok,'source winner no longer referee-valid: '+record.levelId);
  const profileName=record.method.match(/score=([^|]+)/)?.[1];
  const width=Number(record.method.match(/width=(\d+)/)?.[1]);
  const mechanicRetention=record.method.includes('retention=mechanic-buckets');
  assert(width===5000&&['objectiveFirst','intersectionHarvest'].includes(profileName),
    'unrecognized winner technique contract');
  const profile=api.SCORING_PROFILES[profileName];
  assert(!!profile,'missing source profile');
  const gate=record.path[0];
  assert(level.gateKeys.includes(gate),'source winning gate does not exist');
  const prep=api.prepLevel(level);
  prep._cfg=null; prep._metrics={nodesExpanded:0};
  // Deliberately NOT the whole-solve strictTotalWorkBudget flag: this is a
  // phase-complete isolated microscope. Actual overrun, if any, is reported,
  // and a >250k checkpoint is never counted as exact 250k evidence.
  prep._workCap=WORK_CAP;
  const checkpoints=[];
  const startMs=Date.now();
  let continuation=undefined,status='checkpoint-exhausted',maybePath=null;
  for(const depth of CHECKPOINTS){
    const out={};
    const result=await api.beamSearchFromGate(gate,level,prep,profile,600000,startMs,
      null,width,null,mechanicRetention,out,NODE_CAP,continuation,depth,true);
    if(result){
      const v=solver.validateCandidatePath(level,result);
      assert(v.ok,'new beam path failed canonical referee');
      maybePath=result;status='source-valid-solve';break;
    }
    if(!out.pausedContinuation){
      status=out.timedOut?'node-or-time-budget-exit':'frontier-exhausted';
      break;
    }
    continuation=out.pausedContinuation;
    const snap=snapshot(continuation.frontier,record.path,continuation.phasesCompleted);
    snap.actualCumulativeWork=prep._workMeter.units;
    snap.actualCumulativeNodes=continuation.nodesExpandedTotal;
    snap.reachedTargetPhase=continuation.phasesCompleted===depth;
    snap.workExceededNominalCap=prep._workMeter.units>WORK_CAP;
    checkpoints.push(snap);
    if(prep._workMeter.units>=WORK_CAP){
      status=prep._workMeter.units>WORK_CAP?'phase-boundary-work-overrun':'nominal-work-cap';
      break;
    }
    if(continuation.nodesExpandedTotal>=NODE_CAP){status='node-cap';break;}
    if(Date.now()-startMs>=600000){status='time-safety';break;}
  }
  if(status==='checkpoint-exhausted') status='all-predeclared-checkpoints-complete';
  const row={
   ordinal:ordinal+1,parentId:record.levelId,sourceMethod:record.method,
   sourceWinnerWork:record.workSpent,sourceWinnerPathLength:record.path.length,
   sourceWinnerPathSha256:createHash('sha256').update(JSON.stringify(record.path)).digest('hex'),
   hindsightChosenGate:gate,profileName,beamWidth:width,mechanicBucketRetention:mechanicRetention,
   status,actualTotalWork:prep._workMeter.units,actualTotalNodes:prep._metrics.nodesExpanded,
   sourceValidSolve:!!maybePath,
   solution:maybePath??null,checkpoints,
  };
  outputRows.push(row);
  console.log('PG-I FRONTIER LOCUS '+JSON.stringify({parentId:row.parentId,profileName,
    status,actualTotalWork:row.actualTotalWork,checkpointDepths:checkpoints.map(x=>x.phaseDepth),
    exactWinnerRetained:checkpoints.map(x=>x.fullKnownWinnerPrefixRetained)}));
}
const summary={
  independentParents:2,cells:outputRows.length,
  sourceValidSolves:outputRows.filter(x=>x.sourceValidSolve).length,
  phaseOverrunCells:outputRows.filter(x=>x.actualTotalWork>WORK_CAP).length,
  winnerPrefixSeenAtAnyCheckpoint:outputRows.filter(x=>x.checkpoints.some(p=>p.fullKnownWinnerPrefixRetained)).length,
  winnerPrefixSeenAtLastCheckpoint:outputRows.filter(x=>x.checkpoints.at(-1)?.fullKnownWinnerPrefixRetained).length,
};
const result={schema:'pathfinder.pg-i-winning-corridor-frontier-locus/v1',
 sourceExecutionCommit:process.env.GITHUB_SHA??null,corpusFile:CORPUS,corpusSha256,
 sourceWinnerEvidence:WITNESSES,sourceWinnerCommit:evidence.sourceCommit,
 selection:'retrospective winner-positive parent, method and gate chosen from stored 10M isolated successes',
 evidenceRole:'selected-development-only',
 contract:{phaseCheckpoints:CHECKPOINTS,nominalWorkCap:WORK_CAP,nodeCap:NODE_CAP,
  beamRetainsHistoryBlind:true,offlineWinnerComparisonOnly:true,
  phaseBudgetMayOvershoot:true,sourceBudgetMs:600000,
  limitation:'Neither source-method/gate selection nor outcome labels are eligible cold policy; only phase checkpoint observations.'},
 summary,rows:outputRows};
const abs=path.resolve(outPath);mkdirSync(path.dirname(abs),{recursive:true});
writeFileSync(abs,JSON.stringify(result,null,2)+'\n');
console.log('PG-I FRONTIER LOCUS VERDICT '+JSON.stringify(summary));
assert(outputRows.length===3&&outputRows.every(r=>r.checkpoints.length>0||r.sourceValidSolve),
  'no useful checkpoint participation in an isolated method');
