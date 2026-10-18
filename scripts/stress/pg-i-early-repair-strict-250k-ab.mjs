#!/usr/bin/env node
/** Bounded PG-I development A/B, frozen 12 parents, shared strict 250k work per arm.
 * Selection is frozen from the prior corrected-control artifact, without reading any
 * current or historical per-parent outcome as a cold runtime feature.
 * node scripts/run-bundled.mjs scripts/stress/pg-i-early-repair-strict-250k-ab.mjs -- --out=tmp/pg-i-ab.json
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const CONTROL='reports/stress/pg-i-strict-250k-fixed-control-20261018.json';
const CORPUS='data/stress/stress-levels-random.json';
const BUDGET=250_000;
const fail=s=>{throw Error(s);};
const argv=process.argv.slice(2);
const out=argv.find(a=>a.startsWith('--out='))?.slice(6);
const stageWork=a=>{
 const out={};
 for(const v of a||[]) {
   const key=v.stageId??'unclassified';
   const z=out[key]??{attempts:0,positiveWorkAttempts:0,work:0};
   z.attempts++;z.work+=(v.workSpent??0);if((v.workSpent??0)>0)z.positiveWorkAttempts++;
   out[key]=z;
 }
 return out;
};
function summarizeResult(result,level,solver){
 const attempts=result.attempts??[];
 const solution=result.solution??null;
 const valid=solution?solver.validateCandidatePath(level,solution).ok:null;
 const workSpent=result.workSpent??null;
 const chargeSum=attempts.reduce((s,a)=>s+(a.workSpent??0),0);
 const errors=attempts.filter(a=>a.error||a.outcome==='error').length;
 const censored=!!result.deadlineTruncated||result.status==='deadline-truncated';
 const validOutcome=Number.isSafeInteger(workSpent)&&workSpent>=0&&workSpent<=BUDGET
   &&workSpent===chargeSum&&errors===0&&!censored&&attempts.length>0
   &&(!result.ok||(!!solution&&valid===true));
 return {ok:!!result.ok,status:result.status,workSpent,nodesExpanded:result.nodesExpanded??null,
  attempts:attempts.length,attemptChargeSum:chargeSum,errors,censored,validOutcome,
  refereeValid:valid,solution:valid===true?solution:null,stageWork:stageWork(attempts),
  attemptDetails:attempts.map(a=>({stageId:a.stageId??null,
    scoringProfileId:a.scoringProfileId??null,beamWidth:a.beamWidth??null,
    allocatedWorkCeiling:a.allocatedWorkCeiling??null,workSpent:a.workSpent??null,
    nodesExpanded:a.nodesExpanded??null,outcome:a.outcome??null,error:a.error??null})),
 };
}
if(argv.includes('--self-test')){
 const a=stageWork([{stageId:'early-repair-search',workSpent:2},
                    {stageId:'early-repair-search',workSpent:0},
                    {stageId:'main-search',workSpent:3}]);
 if(a['early-repair-search'].work!==2||a['early-repair-search'].positiveWorkAttempts!==1||a['main-search'].work!==3) fail('stageWork aggregation');
 console.log('PG-I strict-250k early-repair A/B self-test passed');process.exit(0);
}
if(!out)fail('--out=<file> required');
const frozen=JSON.parse(readFileSync(CONTROL,'utf8'));
if(frozen.schema!=='pathfinder.pg-i-strict-250k-qualification-durable-summary/v1'
 || frozen.sourceRun!==39171380197||frozen.summary?.independentParents!==12
 || frozen.rows.length!==12)fail('frozen PG-I population summary not recognized');
const ids=frozen.rows.map(r=>r.parentId);
if(new Set(ids).size!==12)fail('duplicate frozen parent');
const corpus=readFileSync(CORPUS);
const hash=createHash('sha256').update(corpus).digest('hex');
if(hash!==frozen.corpusSha256)fail('corpus SHA changed');
const data=JSON.parse(corpus.toString('utf8'));
const levels=Array.isArray(data)?data:data.levels;
if(!Array.isArray(levels))fail('corpus invalid');
const byId=new Map(levels.map((raw,i)=>[raw.id,{raw,pos:i+1}]));
if(ids.some(id=>!byId.has(id)))fail('frozen parent missing');
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.ts');
const solver=createSolver();
const arms=[
 {id:'production-strict-250k',ablation:undefined},
 {id:'early-repair-disabled-strict-250k',ablation:{STRATEGY_EARLY_REPAIR_SEARCH:false}},
];
const rows=[];
for(const [i,id] of ids.entries()){
 const {raw,pos}=byId.get(id);
 const {id:_id,stressMeta:_sm,hints:_h,hintRecords:_hr,...coldRaw}=raw;
 const armResults=[];
 for(const arm of arms){
   const level=solver.prepareLevelForSolver(coldRaw,{source:'raw'});
   const result=await solver.solveLevel(level,{
      baseWorkBudget:BUDGET,nodeBudget:BUDGET,timeBudgetMs:600_000,
      strictTotalWorkBudget:true,attemptBudgetTelemetry:true,
      ...(arm.ablation?{ablation:arm.ablation}:{}),
   });
   armResults.push({armId:arm.id, ...summarizeResult(result,level,solver)});
 }
 const row={parentId:id,rank:i+1,levelPos:pos,
    control:armResults[0],treatment:armResults[1],
    gain:!armResults[0].ok&&armResults[1].ok,
    loss:armResults[0].ok&&!armResults[1].ok};
 rows.push(row);
 console.log('PG-I REPAIR ALLOCATION '+JSON.stringify({
   parentId:id,control:row.control.status,treatment:row.treatment.status,
   controlEarlyRepairWork:row.control.stageWork['early-repair-search']?.work??0,
   treatmentMainWork:row.treatment.stageWork['main-search']?.work??0,
   gain:row.gain,loss:row.loss,
 }));
}
const invalid=rows.filter(r=>!r.control.validOutcome||!r.treatment.validOutcome);
const summary={
 independentParents:12,cells:rows.length*2,
 validCells:rows.reduce((n,r)=>n+Number(r.control.validOutcome)+Number(r.treatment.validOutcome),0),
 controlsSolved:rows.filter(r=>r.control.ok).length,
 treatmentsSolved:rows.filter(r=>r.treatment.ok).length,
 gains:rows.filter(r=>r.gain).length,losses:rows.filter(r=>r.loss).length,
 invalidParents:invalid.map(r=>r.parentId),
 controlRepairMonopoly:rows.filter(r=>(r.control.stageWork['early-repair-search']?.work??0)===BUDGET).length,
 treatmentParentsMainPositive:rows.filter(r=>(r.treatment.stageWork['main-search']?.work??0)>0).length,
 controlEarlyRepairAggregateWork:rows.reduce((v,r)=>v+(r.control.stageWork['early-repair-search']?.work??0),0),
 treatmentMainAggregateWork:rows.reduce((v,r)=>v+(r.treatment.stageWork['main-search']?.work??0),0),
};
const report={schema:'pathfinder.pg-i-early-repair-strict-250k-shared-work-ab/v1',
 evidenceRole:'development',sourceHead:process.env.GITHUB_SHA??null,
 populationSource:CONTROL,corpusFile:CORPUS,corpusSha256:hash,parentIds:ids,
 contract:{baseWorkBudget:BUDGET,nodeBudget:BUDGET,timeBudgetMs:600_000,strictTotalWorkBudget:true,
   oneColdInvocationPerArmParent:true,historyAware:false,
   selection:'reused frozen hard-parent PG-I cohort; observed no-solve controls used for development'},
 arms,summary,rows,
 caveat:'Source-matched 12-parent cohort chosen for historic resistance and later investigation of early repair starvation; a gain would be a discovery candidate, not production evidence.'};
const dest=path.resolve(out);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('PG-I EARLY REPAIR 250K A/B '+JSON.stringify(summary));
if(invalid.length)fail('censored/invalid paired cells: '+invalid.map(r=>r.parentId).join(', '));
