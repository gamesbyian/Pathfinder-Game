#!/usr/bin/env node
/**
 * PG-I single-dose source-blind top75 global score/25% original buckets.
 * Exactly 12 source-only development parents, all original hard prunes, native
 * 250k primitive work and nodes. No historical winner, hint or phase routing.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const CORPUS='data/stress/stress-levels-random.json';
const MANIFEST='reports/stress/pg-l-flood-replay-independent-24-source-freeze-20261019-001.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const N=12,WIDTH=512,PROTECTED=384,WORK=250000,NODE=250000,TIME=600000;
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6);
const assert=(v,m)=>{if(!v)throw Error(m)};
const hash=s=>createHash('sha256').update(s).digest('hex');
if(process.argv.includes('--self-test')){
 assert(Math.floor(WIDTH*0.75)===PROTECTED,'source-locked protected count changed');
 console.log('PG-I protected-top75 strict-source A/B contract passed');
 process.exit(0);
}
assert(out,'--out=<path> required');
const bytes=readFileSync(CORPUS),digest=hash(bytes);
assert(digest===SHA,'Corpus2 source SHA mismatch');
const doc=JSON.parse(bytes),all=Array.isArray(doc)?doc:doc.levels;
const selected=JSON.parse(readFileSync(MANIFEST));
assert(all.length===1700&&selected.corpusSha256===digest&&selected.selected.length===24,
 'source-only manifest or corpus identity changed');
const chosen=selected.selected.slice(0,N);
assert(chosen.length===N&&new Set(chosen.map(x=>x.id)).size===N
 &&chosen.every(x=>all[x.sourceIndex]?.id===x.id),'source-only parent index mismatch');
assert(chosen.every(x=>x.id!=='R03031'&&x.id!=='R02108'),'deep-winner-selected parent unexpectedly leaked');
const byId=new Map(all.map(x=>[x.id,x]));
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {StrictWorkBudgetExhausted}=await import('../../modules/solver/work-meter.js');
const solver=createSolver(),rows=[];
async function run(level,gate,protectedTreatment){
 const prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};
 prep._workCap=WORK;prep._atomicStrictWorkCap=WORK;
 const info={},start=Date.now();let candidate=null,status='exhausted',refereeValid=null,error=null;
 try{
  if(protectedTreatment){
   candidate=await api.beamSearchFromGate(gate,level,prep,api.SCORING_PROFILES.intersectionHarvest,
    TIME,start,null,WIDTH,null,true,info,NODE,
    undefined,undefined,undefined,undefined,true);
  }else{
   candidate=await api.beamSearchFromGate(gate,level,prep,api.SCORING_PROFILES.intersectionHarvest,
    TIME,start,null,WIDTH,null,true,info,NODE);
  }
  if(candidate){
   const verdict=solver.validateCandidatePath(level,candidate);
   refereeValid=verdict.ok===true;
   status=refereeValid?'referee-valid-solve':'invalid-referee-path';
  }else if(info.timedOut){
   status=prep._workMeter.units>=WORK?'work-budget-reached':
    Date.now()-start>=TIME?'wall-safety-censored':'node-or-work-budget-reached';
  }
 }catch(e){
  if(e instanceof StrictWorkBudgetExhausted)status='strict-work-charge-refused';
  else{status='unexpected-error';error=String(e?.stack??e);}
 }
 return {status,workSpent:prep._workMeter.units,
  nodes:status==='strict-work-charge-refused'?null:prep._metrics.nodesExpanded,
  refereeValid,solution:refereeValid?candidate:null,
  sourceValid:prep._workMeter.units<=WORK && status!=='invalid-referee-path'&&status!=='unexpected-error',
  elapsedMs:Date.now()-start,error};
}
for(const item of chosen){
 const raw=byId.get(item.id);assert(raw,'missing frozen ID '+item.id);
 const {id:_id,hints:_h,hintRecords:_hr,provenance:_pr,stressMeta:_sm,...cold}=raw;
 const level=solver.prepareLevelForSolver(cold,{source:'raw'}),gate=level.gateKeys[0];
 assert(gate!==undefined,'first cold source gate absent');
 const control=await run(level,gate,false);
 const treatment=await run(level,gate,true);
 assert(control.sourceValid&&treatment.sourceValid,'referee/strict-source failure '+item.id);
 const gain=control.refereeValid!==true&&treatment.refereeValid===true;
 const loss=control.refereeValid===true&&treatment.refereeValid!==true;
 rows.push({ordinal:item.ordinal,sourceIndex:item.sourceIndex,parentId:item.id,
  sourceGateChosenWithoutHints:gate,control,treatment,
  newlySolvedAt250k:gain,lostAt250k:loss});
 console.log('PG-I PROTECTED TOP75 '+JSON.stringify({id:item.id,
  control:{status:control.status,work:control.workSpent,solve:control.refereeValid},
  protected:{status:treatment.status,work:treatment.workSpent,solve:treatment.refereeValid},
  gain,loss}));
}
const summary={sourceOnlyDevelopmentParents:12,
 validSourceArms:rows.reduce((n,r)=>n+Number(r.control.sourceValid)+Number(r.treatment.sourceValid),0),
 originalSolves:rows.filter(x=>x.control.refereeValid===true).length,
 protectedTop75Solves:rows.filter(x=>x.treatment.refereeValid===true).length,
 newSourceOnlyCold250kSolves:rows.filter(x=>x.newlySolvedAt250k).length,
 lostSourceOnlyCold250kSolves:rows.filter(x=>x.lostAt250k).length,
 viableForUntouchedSecond12:rows.some(x=>x.newlySolvedAt250k)&&!rows.some(x=>x.lostAt250k),
 noHistoryInput:true,
 maxSourceWork:Math.max(...rows.flatMap(x=>[x.control.workSpent,x.treatment.workSpent])),
 sourceCensoredByWall:rows.some(x=>[x.control,x.treatment].some(a=>a.status==='wall-safety-censored')),
 errors:rows.flatMap(x=>[x.control,x.treatment]).filter(a=>!a.sourceValid).length};
const result={schema:'pathfinder.pg-i-score-protected-bucket-top75-source12-250k-ab/v1',
 evidenceRole:'source-only-precommitted-one-dose-development-isolated-method',
 sourceExecutionSha:process.env.GITHUB_SHA??null,corpusSha256:digest,
 sourceOnlyManifest:MANIFEST,
 population:'first12 frozen source-only independent parents, not conditioned on any bucket pressure or prior solve outcomes',
 protocol:{strictAtomicWorkCap:WORK,nodeCap:NODE,timeMs:TIME,width:WIDTH,
  scoringProfile:'intersectionHarvest',mechanicBucketRetention:true,
  sourceGate:'first canonical gate, no winning-path routing',
  protectedGlobalScorePositions:PROTECTED,
  remainingBucketSeats:WIDTH-PROTECTED,
  historyUsedByAlgorithm:false,
  policy:'full original mechanic bucket selection then top75 scored overlay, no phase/parent ID trigger'},
 summary,rows,
 interpretation:'A positive is isolated-method cold under exactly 250k real canonical work, NOT automatically a new production-ladder solve; independent second12 confirmation only if at least one gain with zero losses.'};
const dest=path.resolve(out);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log('PG-I PROTECTED TOP75 VERDICT '+JSON.stringify(summary));
assert(summary.validSourceArms===24&&summary.errors===0&&summary.maxSourceWork<=WORK
 &&!summary.sourceCensoredByWall,'PG-I source validation failed');
