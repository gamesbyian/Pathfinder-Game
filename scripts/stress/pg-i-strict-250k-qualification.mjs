#!/usr/bin/env node
/**
 * PG-I issue #2202 qualification: one real current cold production solve for each
 * of the 12 frozen historically resistant parents. Work-limited, independent of hints.
 * Script is source pinned and does not promote a solver policy.
 *
 * node scripts/run-bundled.mjs scripts/stress/pg-i-strict-250k-qualification.mjs -- --out=tmp/pg-i-strict.json
 * node scripts/stress/pg-i-strict-250k-qualification.mjs --self-test
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const corpusFile='data/stress/stress-levels-random.json';
const corpusSha256='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const budget=250_000;
const parentIds=[
  'R03031','R00044','R02166','R03287','R00449','R02160',
  'R02550','R01351','R02839','R03092','R02701','R02108',
];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const argv=process.argv.slice(2);
const out=argv.find(a=>a.startsWith('--out='))?.slice('--out='.length);
function classify(result, refereeValid) {
  const attempts=result.attempts??[];
  const total=attempts.reduce((sum,a)=>sum+(a.workSpent??0),0);
  const errors=attempts.filter(a=>a.error||a.outcome==='error').length;
  if (result.workSpent>budget) return 'OVER-BUDGET';
  if (errors||result.status==='attempt-error') return 'ATTEMPT-ERROR';
  if (result.deadlineTruncated===true||result.status==='deadline-truncated') return 'DEADLINE-CENSORED';
  if (result.ok) return refereeValid===true?'REFEREE-VALID-SOLVE':'REFEREE-INVALID';
  if (attempts.length===0||total!==result.workSpent) return 'INCOMPLETE-ACCOUNTING';
  if (!['work-budget-reached','node-budget-reached','failed'].includes(result.status)) return 'UNKNOWN-STOP';
  return 'MEASURED-NON-SUCCESS';
}
if (argv.includes('--self-test')) {
  const ref={ok:false,workSpent:budget,attempts:[{workSpent:budget,outcome:'timed-out'}],status:'work-budget-reached'};
  assert(classify(ref,null)==='MEASURED-NON-SUCCESS','complete failure classification');
  assert(classify({...ref,workSpent:budget+1},null)==='OVER-BUDGET','overshoot classification');
  assert(classify({...ref,status:'deadline-truncated',deadlineTruncated:true},null)==='DEADLINE-CENSORED','deadline classification');
  assert(classify({...ref,ok:true,status:'success'},false)==='REFEREE-INVALID','referee invalid classification');
  assert(classify({...ref,ok:true,status:'success'},true)==='REFEREE-VALID-SOLVE','referee valid classification');
  assert(parentIds.length===12&&new Set(parentIds).size===12,'parent roster');
  console.log('PG-I strict-250k qualification contract self-test passed');
  process.exit(0);
}
assert(out,'--out=<file> required');
const source=readFileSync(corpusFile);
const digest=createHash('sha256').update(source).digest('hex');
assert(digest===corpusSha256,'corpus hash does not match original frozen PG-I sample');
const document=JSON.parse(source.toString('utf8'));
const levels=Array.isArray(document)?document:document.levels;
assert(Array.isArray(levels),'corpus level document missing levels');
const byId=new Map();
for(let i=0;i<levels.length;i++){
  const row=levels[i];
  assert(typeof row.id==='string'&&!byId.has(row.id),'missing/duplicate corpus id');
  byId.set(row.id,{raw:row,levelPos:i+1});
}
for(const id of parentIds)assert(byId.has(id),'frozen parent missing: '+id);
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const solver=createSolver();
const rows=[];
for(const [rank,parentId] of parentIds.entries()){
  const {raw,levelPos}=byId.get(parentId);
  // No hintRecords/hints or per-parent records are passed into either preparation or solving.
  const {id:_id,stressMeta:_sm,hints:_h,hintRecords:_hr,...coldRaw}=raw;
  const level=solver.prepareLevelForSolver(coldRaw,{source:'raw'});
  const result=await solver.solveLevel(level,{
    baseWorkBudget:budget,nodeBudget:budget,timeBudgetMs:600_000,
    strictTotalWorkBudget:true,attemptBudgetTelemetry:true,
  });
  assert(Number.isSafeInteger(result.workSpent)&&result.workSpent>=0,'invalid workSpent');
  const solution=result.solution??null;
  const refereeValid=solution?solver.validateCandidatePath(level,solution).ok:null;
  const disposition=classify(result,refereeValid);
  const sumAttempts=(result.attempts??[]).reduce((sum,a)=>sum+(a.workSpent??0),0);
  const row={parentId,rank:rank+1,levelPos,disposition,
    ok:!!result.ok,status:result.status,workSpent:result.workSpent,
    workOvershoot:Math.max(0,result.workSpent-budget),
    nodesExpanded:result.nodesExpanded??null,deadlineTruncated:!!result.deadlineTruncated,
    attemptCount:result.attempts?.length??0,attemptWorkSum:sumAttempts,
    attempts:(result.attempts??[]).map(a=>({
      stageId:a.stageId??null,scoringProfileId:a.scoringProfileId??null,
      outcome:a.outcome??null,allocatedWorkCeiling:a.allocatedWorkCeiling??null,
      workSpent:a.workSpent??null,nodesExpanded:a.nodesExpanded??null,error:a.error??null,
    })),
    refereeValid,solution:refereeValid===true?solution:null,
  };
  rows.push(row);
  console.log('PG-I STRICT250K '+JSON.stringify({
    parentId,disposition,workSpent:row.workSpent,status:row.status,
    attempts:row.attemptCount,workOvershoot:row.workOvershoot,
  }));
}
const summary={
  parents:rows.length,maximumWorkSpent:Math.max(...rows.map(x=>x.workSpent)),
  overBudget:rows.filter(x=>x.disposition==='OVER-BUDGET').length,
  validSolves:rows.filter(x=>x.disposition==='REFEREE-VALID-SOLVE').length,
  measuredNonSuccess:rows.filter(x=>x.disposition==='MEASURED-NON-SUCCESS').length,
  errorsOrUnusable:rows.filter(x=>!['REFEREE-VALID-SOLVE','MEASURED-NON-SUCCESS'].includes(x.disposition)).length,
  accountingMismatches:rows.filter(x=>x.attemptWorkSum!==x.workSpent).length,
};
const report={
  schema:'pathfinder.pg-i-strict-250k-qualification/v1',
  evidenceRole:'forensic-confirmation',
  selection:'exact original PG-I 12 IDs, historically selected before this fix',
  sourceHead:process.env.GITHUB_SHA??null,
  corpusFile,corpusSha256,parentIds,contract:{
    oneColdInvocationPerParent:true,noHistoricalRouting:true,
    baseWorkBudget:budget,nodeBudget:budget,strictTotalWorkBudget:true,
    timeBudgetMs:600_000,workUnit:'applyMove + 12 * isConnected',
  },summary,rows,
};
const destination=path.resolve(out);mkdirSync(path.dirname(destination),{recursive:true});
writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log('PG-I STRICT250K VERDICT '+JSON.stringify(summary));
assert(summary.overBudget===0&&summary.accountingMismatches===0&&summary.errorsOrUnusable===0,
  'strict qualification failed; full evidence preserved at '+out);
