#!/usr/bin/env node
/** PG-I 512-versus-5000 development-only isolated beam width falsifier.
 * All inner searches are level-history-blind, but parent/gate/profile choices
 * were retrospectively nominated from PG-I deep winners. Not production evidence.
 * Invocation: node scripts/run-bundled.mjs scripts/stress/pg-i-beam-512-strict-250k.mjs -- --out=...
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const WITNESSES='reports/stress/pg-i-early-equal-work-cold-solves-20261018.json';
const EXPECTED_SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const WIDTHS=[5000,512],CAP=250000,NODE_CAP=250000,TIME_CAP_MS=600000;
const arg=process.argv.slice(2).find(x=>x.startsWith('--out='))?.slice(6);
const fail=message=>{throw Error(message);};
function parseWinnerMethod(method){
 const score=method.match(/score=([^|]+)/)?.[1];
 const width=Number(method.match(/width=(\d+)/)?.[1]);
 const buckets=method.includes('retention=mechanic-buckets');
 if(!['objectiveFirst','intersectionHarvest'].includes(score)||width!==5000)
   fail('unexpected original PG-I method: '+method);
 return {score,buckets};
}
if(process.argv.includes('--self-test')){
 if(parseWinnerMethod('beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets').buckets!==true)fail('method parser');
 if(parseWinnerMethod('beam|score=objectiveFirst|bias=none|width=5000|retention=plain').buckets!==false)fail('method parser default');
 console.log('PG-I 512 strict-250k source-contract self-test passed');process.exit(0);
}
if(!arg)fail('--out=<path> is required');
const source=readFileSync(CORPUS);
const digest=createHash('sha256').update(source).digest('hex');
if(digest!==EXPECTED_SHA)fail('corpus source identity mismatch');
const document=JSON.parse(source.toString('utf8'));
const corpus=Array.isArray(document)?document:document.levels;
if(!Array.isArray(corpus))fail('corpus schema');
const levels=new Map(corpus.map(x=>[x.id,x]));
const evidence=JSON.parse(readFileSync(WITNESSES,'utf8'));
if(evidence.sourceCorpusSha256!==digest||evidence.solutions?.length!==3
  ||new Set(evidence.solutions.map(x=>x.levelId)).size!==2)
  fail('source witness cohort/identity mismatch');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {StrictWorkBudgetExhausted}=await import('../../modules/solver/work-meter.js');
const Solver=createSolver(),rows=[];
for(const [i,label] of evidence.solutions.entries()){
 const src=levels.get(label.levelId);
 if(!src)fail('missing frozen parent '+label.levelId);
 const {id:_id,stressMeta:_stressMeta,hints:_h,hintRecords:_hr,provenance:_p,...coldInput}=src;
 const level=Solver.prepareLevelForSolver(coldInput,{source:'raw'});
 const sourceVerdict=Solver.validateCandidatePath(level,label.path);
 if(!sourceVerdict.ok)fail('saved deep reference path is invalid: '+label.levelId);
 const gate=label.path[0];
 if(!level.gateKeys.includes(gate))fail('saved deep winner gate does not belong to level');
 const {score,buckets}=parseWinnerMethod(label.method);
 const profile=api.SCORING_PROFILES[score];
 if(!profile)fail('missing current source scorer');
 const arms=[];
 for(const width of WIDTHS){
  const prep=api.prepLevel(level);
  prep._cfg=null; prep._metrics={nodesExpanded:0};
  prep._workCap=CAP;
  // True primitive-level refusal: unlike phase-complete research observation,
  // this cell NEVER charges work beyond the exact experiment cap.
  prep._atomicStrictWorkCap=CAP;
  let returnedPath=null,refereeValid=null,status='exhausted',error=null;
  const out={};
  const start=Date.now();
  try{
   returnedPath=await api.beamSearchFromGate(gate,level,prep,profile,TIME_CAP_MS,
      start,null,width,null,buckets,out,NODE_CAP);
   if(returnedPath){
    const v=Solver.validateCandidatePath(level,returnedPath);
    refereeValid=!!v.ok;
    status=v.ok?'referee-valid-solve':'referee-invalid-solution';
   }else if(out.timedOut){
    status=prep._workMeter.units>=CAP?'work-budget-reached':
      (Date.now()-start>=TIME_CAP_MS?'wall-time-censored':'node-or-work-budget-reached');
   }
  }catch(e){
   if(e instanceof StrictWorkBudgetExhausted){
     status='strict-work-charge-refused';
   }else{
     status='unexpected-error';error=String(e?.stack??e);
   }
  }
  const workSpent=prep._workMeter.units;
  // On strict primitive refusal the beam is interrupted *within* a parent
  // batch: nodesExpanded is not finalised. Keep null rather than claiming 0.
  const nodesExpanded=(status==='strict-work-charge-refused'||status==='unexpected-error')?
    null:prep._metrics.nodesExpanded;
  arms.push({arm:width===5000?'original-5000':'narrow-512',width,scorer:score,buckets,
   status,workSpent,nodesExpanded,refereeValid,
   attemptedTimeMs:Date.now()-start,finalBadness:out.finalBadness??null,
   solution:refereeValid===true?returnedPath:null,
   error,sourceValid:workSpent<=CAP&&status!=='unexpected-error'&&status!=='referee-invalid-solution'});
 }
 const control=arms[0],treatment=arms[1];
 rows.push({
   parentId:label.levelId,methodOrdinal:i+1,independentUnit:label.levelId,
   gateChosenRetrospectively:gate,sourceIsolatedSuccessWork:label.workSpent,
   scoreProfile:score,mechanicBucketRetention:buckets,
   control,treatment,
   gain:control.refereeValid!==true&&treatment.refereeValid===true,
   loss:control.refereeValid===true&&treatment.refereeValid!==true,
 });
 console.log('PG-I WIDTH512 '+JSON.stringify({
  id:label.levelId,score,buckets,
  control:{work:control.workSpent,status:control.status},
  narrow:{work:treatment.workSpent,status:treatment.status},
  gain:rows.at(-1).gain,loss:rows.at(-1).loss
 }));
}
const summary={
 independentParents:2,pairs:3,cells:6,
 validCells:rows.reduce((n,r)=>n+Number(r.control.sourceValid)+Number(r.treatment.sourceValid),0),
 controlSolves:rows.filter(r=>r.control.refereeValid===true).length,
 narrowSolves:rows.filter(r=>r.treatment.refereeValid===true).length,
 gains:rows.filter(r=>r.gain).length,losses:rows.filter(r=>r.loss).length,
 actualWork:rows.reduce((n,r)=>n+r.control.workSpent+r.treatment.workSpent,0),
 errors:rows.flatMap(r=>[r.control,r.treatment]).filter(a=>!a.sourceValid).length,
 maxWorkSpent:Math.max(...rows.flatMap(r=>[r.control.workSpent,r.treatment.workSpent])),
};
const report={
 schema:'pathfinder.pg-i-512-isolated-strict250k-development/v1',
 sourceExecutionCommit:process.env.GITHUB_SHA??null,evidenceRole:'development',
 populationSelection:'two outcome-selected historical-resistant parents with three 10M isolated source-success methods; profiles and gates frozen before width test',
 corpusSha256:digest,sourceWitnessEvidence:WITNESSES,sourceWitnessCommit:evidence.sourceCommit,
 workContract:{widths:WIDTHS,strictAtomicCap:CAP,nodeCap:NODE_CAP,timeCapMs:TIME_CAP_MS,
  noSavedHintsInBeam:true,onlyWidthChangedWithinPair:true},
 summary,rows,
 interpretationBoundary:'A new path is an isolated method cold-inner-search development solve only, not unbiased production-ladder cold capability. Source champion path selects experiment gate/method but is not supplied during execution.'};
const dest=path.resolve(arg);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('PG-I WIDTH512 VERDICT '+JSON.stringify(summary));
if(summary.validCells!==6||summary.errors)fail('source/strict-work/referee validation failed; see saved evidence');
