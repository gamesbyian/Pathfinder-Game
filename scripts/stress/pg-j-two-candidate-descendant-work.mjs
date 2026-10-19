#!/usr/bin/env node
/**
 * PG-J read-only actual-work microscope after TWO preidentified candidate
 * prefixes. No metric invocation, cold routing, hint use or production prune.
 * Run via node scripts/run-bundled.mjs scripts/stress/pg-j-two-candidate-descendant-work.mjs -- --out=...
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
import {reconstructBeamPath} from './production-search-frontier-sampler-lib.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const PRIOR='reports/stress/pg-j-metric-frozen-corpus2-transfer-20261018-001.json';
const EXPECTED_SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const BUDGET_AFTER_CHECKPOINT=150000;
const MAX_EXTRA_PHASES=8;
const NODE_SAFETY=500000;
const WALL_SAFETY_MS=600000;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const args=process.argv.slice(2);
const out=args.find(x=>x.startsWith('--out='))?.slice(6);
const prefixOf=(prefix,path)=>Array.isArray(path)&&path.length>=prefix.length&&prefix.every((x,i)=>x===path[i]);
if(args.includes('--self-test')){
 assert(prefixOf([1,2],[1,2,3])&&prefixOf([1,2],[1,2]),'prefix positive');
 assert(!prefixOf([1,2],[1,3,2])&&!prefixOf([1,2],[1]),'prefix negative');
 console.log('PG-J descendant-work observer prefix contract passed');process.exit(0);
}
assert(out,'--out=<file> required');
const corpusBuf=readFileSync(CORPUS),corpusSha=sha(corpusBuf);
assert(corpusSha===EXPECTED_SHA,'original corpus SHA mismatch');
const corpusDoc=JSON.parse(corpusBuf),corpus=Array.isArray(corpusDoc)?corpusDoc:corpusDoc.levels;
const priorBuf=readFileSync(PRIOR),prior=JSON.parse(priorBuf);
assert(prior.schema==='pathfinder.pg-j-original-artifact-metric-transfer-retained/v1'
 &&prior.corpusSha256===EXPECTED_SHA
 &&prior.summary.candidateRelaxedImpossibilities===2
 &&prior.summary.independentParentsWithCandidateImpossibility===2
 &&prior.candidates.length===2,'metric candidate evidence identity changed');
const ids=prior.candidates.map(x=>x.parentId);
assert(JSON.stringify(ids)===JSON.stringify(['R02182','R02801']),
 'candidate source parent order differs from frozen gate');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const solver=createSolver(),profile=api.SCORING_PROFILES.objectiveFirst;
assert(profile,'source scorer missing');
const rows=[];
for(const candidate of prior.candidates){
 const raw=corpus.find(x=>x.id===candidate.parentId);
 assert(raw,'source corpus parent unavailable');
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_prov,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 const prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};
 prep._workCap=candidate.sourceBeamWorkSpent+BUDGET_AFTER_CHECKPOINT;
 const gate=level.gateKeys[0],sourcePrefix=candidate.sourcePrefix;
 assert(gate===sourcePrefix[0],'candidate is not from the original first gate');
 const t0=Date.now();
 const paused={};
 const replay=await api.beamSearchFromGate(gate,level,prep,profile,WALL_SAFETY_MS,t0,
   null,128,null,false,paused,NODE_SAFETY,undefined,candidate.sourcePhase,true);
 assert(!replay&&paused.pausedContinuation,'source beam checkpoint failed to pause');
 const hold=paused.pausedContinuation;
 assert(hold.phasesCompleted===candidate.sourcePhase,
   'source original native phase checkpoint differs');
 const sourceWork=prep._workMeter.units;
 assert(sourceWork===candidate.sourceBeamWorkSpent,
  'source original work mismatch: '+candidate.parentId+
   ' actual '+sourceWork+' expected '+candidate.sourceBeamWorkSpent);
 const frontier=hold.frontier;
 assert(frontier.length===candidate.sourceFrontierSize,
  'source original width/retained frontier mismatch');
 const targetNode=frontier[candidate.scoreRank];
 assert(!!targetNode,'source original target rank missing');
 const capturedPath=reconstructBeamPath(targetNode);
 assert(JSON.stringify(capturedPath)===JSON.stringify(sourcePrefix),
  'source original exact ranked path mismatch; abort evidence');
 const byDepth=new Map();
 const get=depth=>{
  let row=byDepth.get(depth);
  if(!row){
   row={depth,incomingNodes:null,incomingSubtreeNodes:null,
    expandedParents:null,expandedSubtreeParents:null,
    generatedCandidates:null,generatedSubtreeCandidates:null,
    rawNeighborsSubtree:null,allParentExpansionWork:null,
    subtreeExpansionWork:null,retainedNodes:null,retainedSubtreeNodes:null};
   byDepth.set(depth,row);
  }
  return row;
 };
 let producedEvents=0;
 const observer={
  includeParentExpansionWork:true,
  observe(record){
   producedEvents++;
   if(record.stage==='incoming-frontier'){
    const paths=record.paths;
    const depth=paths[0]?.length-1??record.depth;
    const row=get(depth);
    row.incomingNodes=paths.length;
    row.incomingSubtreeNodes=paths.filter(p=>prefixOf(sourcePrefix,p)).length;
   }
   if(record.stage==='generated'){
    const entries=record.details?.parentExpansions;
    assert(Array.isArray(entries),'missing source-native parentExpansion work');
    const depth=entries[0]?.path?.length-1??record.depth-1;
    const row=get(depth);
    row.expandedParents=entries.length;
    row.expandedSubtreeParents=0;
    row.generatedCandidates=0;
    row.generatedSubtreeCandidates=0;
    row.rawNeighborsSubtree=0;
    row.allParentExpansionWork=0;
    row.subtreeExpansionWork=0;
    for(const e of entries){
     assert(Array.isArray(e.path)&&Number.isInteger(e.workSpent)&&e.workSpent>=0,
      'invalid source-native parent expansion record');
     row.allParentExpansionWork+=e.workSpent;
     row.generatedCandidates+=e.generatedCandidates??0;
     if(prefixOf(sourcePrefix,e.path)){
      row.expandedSubtreeParents++;
      row.subtreeExpansionWork+=e.workSpent;
      row.generatedSubtreeCandidates+=e.generatedCandidates??0;
      row.rawNeighborsSubtree+=e.rawNeighborCount??0;
     }
    }
   }
   if(record.stage==='post-score-width-cull'){
    const paths=record.paths;
    const depth=paths[0]?.length-1??record.depth;
    const row=get(depth);
    row.retainedNodes=paths.length;
    row.retainedSubtreeNodes=paths.filter(p=>prefixOf(sourcePrefix,p)).length;
   }
  }
 };
 // Research callback is attached ONLY after the source-neutral canonical
 // prefix and original frontier are fully replayed and verified.
 prep._beamResearchObserver=observer;
 const post={};
 const result=await api.beamSearchFromGate(gate,level,prep,profile,WALL_SAFETY_MS,t0,
   null,128,null,false,post,NODE_SAFETY,hold,candidate.sourcePhase+MAX_EXTRA_PHASES,true);
 let referee=null;
 if(result){
  referee=solver.validateCandidatePath(level,result);
  assert(referee.ok===true,'unexpected returned isolated native solution invalid');
 }
 const phaseWork=prep._workMeter.units-sourceWork;
 const detail=[...byDepth.values()].sort((a,b)=>a.depth-b.depth);
 const subtree=detail.reduce((n,r)=>n+(r.subtreeExpansionWork??0),0);
 const all=detail.reduce((n,r)=>n+(r.allParentExpansionWork??0),0);
 const firstDepth=detail.find(r=>r.expandedSubtreeParents>0)?.depth??null;
 const lastDepth=detail.filter(r=>r.expandedSubtreeParents>0).at(-1)?.depth??null;
 const retainedDepths=detail.filter(r=>r.retainedSubtreeNodes>0).map(r=>r.depth);
 const row={
  parentId:candidate.parentId,originalSourcePhase:candidate.sourcePhase,
  rank:candidate.scoreRank,originalWidth:128,
  sourceExactWork:sourceWork,sourceFrontierSize:frontier.length,
  sourceExactPath:sourcePrefix,
  sourceIdentityMatched:true,sourcePathSha256:sha(JSON.stringify(sourcePrefix)),
  originalMetricCandidatePoppedStates:candidate.metricPoppedStates,
  originalMetricCandidateArcs:candidate.metricCandidateArcs,
  postResumeWorkSpent:phaseWork,postResumeOutput:
    result?'source-valid-isolated-solve':post.pausedContinuation?'paused-on-phase-or-budget':
    post.timedOut?'safety-limit':'frontier-exhausted',
  postResumePhasesCompleted:post.pausedContinuation?.phasesCompleted??null,
  refereeValidIsolatedSolve:referee?.ok===true,
  refereeValidSolution:referee?.ok?result:null,
  observedEvents:producedEvents,
  firstExpandedDescendantDepth:firstDepth,lastExpandedDescendantDepth:lastDepth,
  observedRetainedDescendantDepths:retainedDepths,
  grossSubtreeCanonicalExpansionWork:subtree,
  allObservedParentExpansionWork:all,
  grossSubtreeWorkFraction:all>0?subtree/all:null,
  exceedsPrecommittedGrossWorkScreen:subtree>=10000,
  rows:detail
 };
 rows.push(row);
 console.log('PG-J DESCENDANT '+JSON.stringify({
  id:row.parentId,sourceWork:sourceWork,postWork:phaseWork,
  returned:row.postResumeOutput,firstDepth,lastDepth,
  retainedDepths,subtreeWork:subtree,
  allParentWork:all,gate:row.exceedsPrecommittedGrossWorkScreen
 }));
}
const summary={
 originalCandidates:2,distinctSourceParents:2,sourceReproductionAlarms:0,
 grossSubtreeWorkByParent:Object.fromEntries(rows.map(r=>[r.parentId,r.grossSubtreeCanonicalExpansionWork])),
 parentPassesEconomicsScreen:Object.fromEntries(rows.map(r=>[r.parentId,r.exceedsPrecommittedGrossWorkScreen])),
 observedIsolatedRefereeValidSolves:rows.filter(r=>r.refereeValidIsolatedSolve).length,
 totalActualPostResumeWork:rows.reduce((n,r)=>n+r.postResumeWorkSpent,0),
 totalGrossSubtreeWork:rows.reduce((n,r)=>n+r.grossSubtreeCanonicalExpansionWork,0),
 exactSourceCaptureSuccess:true
};
const report={schema:'pathfinder.pg-j-native-beam-two-prefix-descendant-economics/v1',
 evidenceRole:'post-selected-source-native-gross-beam-lineage-cost-only',
 sourceExecutionCommit:process.env.GITHUB_SHA??null,
 corpusFile:CORPUS,corpusSha256:corpusSha,
 frozenCandidates:PRIOR,frozenCandidatesSha256:sha(priorBuf),
 contract:{method:'objectiveFirst',width:128,firstGate:true,maxExtraPhases:MAX_EXTRA_PHASES,
  extraNominalCanonicalWork:BUDGET_AFTER_CHECKPOINT,timeBudgetMs:WALL_SAFETY_MS,
  nativeWork:'applyMove+12*isConnected',observerDecisionInert:true,
  limitation:'gross work expanding selected ancestry under unmodified beam; not net work saved or product 250k rate',
  defaultProductionEffect:'none'},summary,rows};
const target=path.resolve(out);mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log('PG-J DESCENDANT VERDICT '+JSON.stringify(summary));
assert(summary.sourceReproductionAlarms===0&&summary.exactSourceCaptureSuccess,
 'source reproduction failed');
