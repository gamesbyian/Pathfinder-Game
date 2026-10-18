#!/usr/bin/env node
/**
 * PG-P actual repair-descent observer (NOT the already-completed September WS6
 * exact-divergence microscope). Runs current unmodified repair on a frozen
 * current-corpus sample and observes choices and elite acquisition.
 * Historic hints are only a retrospective path contrast, never a policy input.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {readLevelCorpusDocumentWithHints} from '../level-data-io.mjs';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const argv=process.argv.slice(2);
const arg=(name,fallback)=>argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const positive=(name,fallback)=>{const n=Number(arg(name,String(fallback)));if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid '+name);return n};
const sha=s=>createHash('sha256').update(s).digest('hex');
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const commonPrefix=(a,b)=>{let n=0;while(n<a.length&&n<b.length&&a[n]===b[n])n++;return n};
const popcount=n=>{let c=0;for(n>>>=0;n;n&=n-1)c++;return c};
function getHistory(pathKeys,level){
 const seen=new Map(),types={},events=[],mustPass=new Set(level.mustPassKeys),mustCross=new Set(level.mustCrossKeys),mustTurn=new Set(level.mustTurnKeys);
 let lastJump=false;
 for(let i=0;i<pathKeys.length;i++){
  const k=pathKeys[i],from=pathKeys[i-1];
  const jump=i>0&&!lastJump&&level.portalMap.get(from)?.dest===k;
  const before=seen.get(k)||0;
  seen.set(k,before+1);
  const hits=[];
  if(i>0&&jump)hits.push('portal-jump');
  if(i>0&&before>0)hits.push('cell-revisit');
  if(mustPass.has(k))hits.push('must-pass-visit');
  if(mustCross.has(k))hits.push('must-cross-visit');
  if(mustTurn.has(k))hits.push('must-turn-visit');
  if(i>=2&&!jump&&!lastJump){
   const a=pathKeys[i-2],b=from;
   const aa=(a&65535)===(b&65535)?'vertical':'horizontal';
   const bb=(b&65535)===(k&65535)?'vertical':'horizontal';
   if(aa!==bb)hits.push('turn');
  }
  if(i>0)for(const h of hits){types[h]=(types[h]||0)+1;events.push({depth:i,type:h})}
  lastJump=!!jump;
 }
 return {counts:types,events,uniqueVisitedCells:seen.size,revisitedCells:[...seen.values()].filter(c=>c>1).length};
}
function compareElite(elite,hint,level){
 const shared=commonPrefix(elite.path,hint);
 const chosen=elite.path[shared],alternative=hint[shared];
 const eliteHist=getHistory(elite.path,level),hintHist=getHistory(hint,level);
 const counts={};
 for(const k of new Set([...Object.keys(eliteHist.counts),...Object.keys(hintHist.counts)])){
  const d=(eliteHist.counts[k]||0)-(hintHist.counts[k]||0);if(d!==0)counts[k]=d;
 }
 return {sharedPrefixNodes:shared,divergenceDepth:shared,divergenceBeforeTerminal:elite.path.length-shared,
  eliteDecision:chosen??null,historicSolutionDecision:alternative??null,
  deltaEventCounts:counts,eliteUniqueVisited:eliteHist.uniqueVisitedCells,
  eliteRevisitedCells:eliteHist.revisitedCells,acceptedHintRevisitedCells:hintHist.revisitedCells,
  eliteEventsBeforeHalfDepth:eliteHist.events.filter(x=>x.depth<=Math.floor((elite.path.length-1)/2)),
  // A hint is a descriptive comparator. The trace has no exact prefix-fate labels.
 };
}
function selfTest(){
 const p=[0,1,2,3],q=[0,1,4,3];
 if(commonPrefix(p,q)!==2||!same([1,2],[1,2])||same([1,2],[2,1])||popcount(11)!==3)throw Error('descent helper contract');
 console.log('PG-P descent shadow helper tests passed');
}
if(argv.includes('--self-test')){selfTest();process.exit(0)}
const out=arg('out',null);
if(!out)throw Error('--out required');
const maxParents=positive('parents',12),nodeBudget=positive('node-budget',20000),maxElites=positive('elites',4);
const corpusPath=arg('corpus','data/stress/stress-levels-random.json');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {repairSearchFromGate}=await import('../../modules/solver/repair-search.ts');
const Solver=createSolver(),rawDoc=readLevelCorpusDocumentWithHints(path.resolve(corpusPath));
const eligible=rawDoc.levels.filter(l=>(l.hintRecords?.length||0)>0);
const selected=[...eligible].sort((a,b)=>sha('pg-p-real-descent-20261018:'+a.id).localeCompare(sha('pg-p-real-descent-20261018:'+b.id))).slice(0,maxParents);
if(selected.length!==maxParents||new Set(selected.map(x=>x.id)).size!==maxParents)throw Error('insufficient independent parents');
const report=[];
for(const source of selected){
 const {id:_id,stressMeta:_sm,hintRecords:_hr,hints:_h,...raw}=source;
 const level=Solver.prepareLevelForSolver(raw,{source:'raw'});
 const accepted=source.hintRecords.map(h=>h.path).filter(p=>Array.isArray(p)&&p.length>=2&&Solver.validateCandidatePath(level,p).ok);
 if(!accepted.length)throw Error('invalid hint-bearing parent '+source.id);
 const gate=accepted[0][0];
 const hints=accepted.filter(x=>x[0]===gate);
 if(!hints.length)throw Error('wrong accepted gate '+source.id);
 const prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};
 const choices=new Map(),modeCounts={},elites=[];
 let totalChoices=0,forcedChoices=0,choiceEventsWithBranch=0;
 prep._repairChoiceResearchObserver={observe(rec){
  totalChoices++;
  modeCounts[rec.mode]=(modeCounts[rec.mode]||0)+1;
  if(rec.survivors.length===1)forcedChoices++;else choiceEventsWithBranch++;
  const key=JSON.stringify([...rec.prefix,rec.chosen]);
  if(choices.size<nodeBudget*2||choices.has(key))choices.set(key,{mode:rec.mode,branching:rec.survivors.length,seenAtChoice:totalChoices});
 }};
 prep._repairEliteResearchObserver={observe(rec){
  if(elites.length<1500)elites.push({path:rec.path,badness:rec.badness,arrivalNodes:rec.arrivalNodes,restart:rec.restart,choiceOrdinal:totalChoices});
 }};
 const start=Date.now(),startWork=prep._workMeter.units,outcome={};
 const solution=await repairSearchFromGate(gate,level,prep,api.SCORING_PROFILES.repair,180000,start,null,null,false,nodeBudget,outcome);
 prep._repairChoiceResearchObserver=null;
 prep._repairEliteResearchObserver=null;
 const work=prep._workMeter.units-startWork;
 const unique=new Map();
 for(const e of elites){const k=e.path.join(',');const p=unique.get(k);if(!p||e.badness<p.badness)unique.set(k,e)}
 const top=[...unique.values()].sort((a,b)=>a.badness-b.badness||b.path.length-a.path.length).slice(0,maxElites);
 const rows=top.map((e,i)=>{
  const hint=hints.map(p=>({path:p,shared:commonPrefix(e.path,p)})).sort((a,b)=>b.shared-a.shared)[0];
  const trajectory=e.path.slice(1).map((_,j)=>{
   const prefix=e.path.slice(0,j+2);
   const c=choices.get(JSON.stringify(prefix));
   return {depth:j+1,mode:c?.mode??'unobserved',branching:c?.branching??null};
  });
  return {rank:i,badness:e.badness,rawDepth:e.path.length-1,arrivalNodes:e.arrivalNodes,
   restart:e.restart,choiceOrdinal:e.choiceOrdinal,
   moveHistory:getHistory(e.path,level),
   predecessorBranching:trajectory.filter(x=>(x.branching??0)>1).length,
   unseenDescentChoices:trajectory.filter(x=>x.mode==='unobserved').length,
   descentChoiceTail:trajectory.slice(-32),
   comparison:compareElite(e,hint.path,level)};
 });
 const sameBadnessDistinct=top.filter((x,i)=>i>0&&x.badness===top[0]?.badness&&commonPrefix(x.path,top[0].path)<Math.min(x.path.length,top[0].path.length)-2);
 report.push({levelId:source.id,acceptedHintCount:hints.length,gate,normalRepairOutcome:solution?'solved':outcome.timedOut?'timed-out':'not-solved',
   elapsedMs:Date.now()-start,measuredCanonicalWork:work,nodesExpanded:prep._metrics.nodesExpanded,
   observedChoices:totalChoices,distinctChosenPrefixes:choices.size,forcedChoices,choiceEventsWithBranch,
   choiceModeCounts:modeCounts,observedEliteEvents:elites.length,distinctElitePaths:unique.size,
   bestEliteBadness:top[0]?.badness??null,
   sameBadnessEarlyDistinctEliteCount:sameBadnessDistinct.length,elites:rows});
 console.log('PG-P DESCENT PARENT '+JSON.stringify({id:source.id,choices:totalChoices,elites:elites.length,uniqueElites:unique.size,best:top[0]?.badness,work,nodesExpanded:prep._metrics.nodesExpanded}));
}
const valid=report.filter(x=>x.observedEliteEvents>0);
const output={schema:'pathfinder.pg-p-real-repair-descent-shadow/v1',
 source:{corpusPath,corpusSha256:sha(readFileSync(corpusPath)),solverHead:process.env.GITHUB_SHA??null},
 protocol:{selectedBy:'SHA256(pathfinder pg-p real descent seed + level id) over hint-bearing Corpus-2 parents; hint availability offline selection criterion only',levelIds:selected.map(x=>x.id),maxParents,nodeBudget,maxElites,attemptProfile:'repair',researchHooks:['repairChoice','repairElite'],backend:'actual current repairSearchFromGate unchanged',mechanicTags:'history-derived events are descriptive, not proof of causality or exact completion fate',noReferenceQueries:true},
 summary:{parents:report.length,parentsWithElite:valid.length,parentsWithMultipleElites:report.filter(r=>r.distinctElitePaths>=2).length,parentsWithSameBadnessEarlyDivergentElites:report.filter(r=>r.sameBadnessEarlyDistinctEliteCount>0).length,totalObservedChoices:report.reduce((n,x)=>n+x.observedChoices,0),totalCanonicalWork:report.reduce((n,x)=>n+x.measuredCanonicalWork,0),parentsSolvedByProbe:report.filter(x=>x.normalRepairOutcome==='solved').length},
 rows:report,
 caveat:'Historical accepted paths are used ONLY in the offline elite comparison, never to direct repair; deficits/commitments compared descriptively. If no independent parent has an early shared commitment signature and a marked real-solve economic gap, a repair operator is not earned.'};
if(output.summary.parentsWithElite<3)throw Error('insufficient observed elite parents');
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(path.resolve(out),JSON.stringify(output,null,2)+'\n');
console.log('PG-P DESCENT VERDICT '+JSON.stringify(output.summary));
