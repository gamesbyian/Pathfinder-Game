#!/usr/bin/env node
/**
 * Source-pinned, read-only CURRENT production control for PG-I's already frozen twelve parents.
 * Exactly one real cold solveLevel invocation per parent at a STRICT TOTAL 250k canonical WORK
 * envelope. This is not an additional isolated method or a hint-fed baseline.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

const freezePath='reports/stress/pg-i-resistant-parent-20261018-frozen-selection.json';
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const argv=process.argv.slice(2);
const out=argv.find(x=>x.startsWith('--out='))?.slice(6);
const summary=(r)=>({status:r.status,ok:!!r.ok,workSpent:r.workSpent,
  nodesExpanded:r.nodesExpanded,attempts:r.attempts?.length??null});
if(argv.includes('--self-test')){
  const t=summary({status:'not-solved',ok:false,workSpent:250000,nodesExpanded:1234,attempts:[]});
  assert(t.workSpent===250000&&t.attempts===0,'summary field transport failed');
  console.log('PG-I 250k cold-production control self-test passes');
  process.exit(0);
}
assert(out,'--out=<file> required');
const frozen=JSON.parse(readFileSync(freezePath,'utf8'));
assert(frozen.schema==='pathfinder.pg-i-resistance-parent-exposure-freeze/v1','source freeze mismatch');
assert(frozen.selected?.length===12&&new Set(frozen.selected.map(s=>s.id)).size===12,
  'frozen twelve-parent selection duplicate/missing');
const corpusBytes=readFileSync(frozen.corpusFile);
const digest=createHash('sha256').update(corpusBytes).digest('hex');
assert(digest===frozen.corpusSha256,'corpus source revision changed');
const corpus=JSON.parse(corpusBytes), levels=Array.isArray(corpus)?corpus:corpus.levels;
assert(Array.isArray(levels),'corpus level rows absent');
const byId=new Map();
for(let i=0;i<levels.length;i++){
 const entry=levels[i];
 assert(entry.id&&!byId.has(entry.id),'invalid or duplicate level identity');
 byId.set(entry.id,{entry,levelPos:i+1});
}
const {installBrowserStubs}=await import('../test-lib/browser-stubs.mjs');
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const solver=createSolver();
const contract={baseWorkBudget:250000,nodeBudget:250000,timeBudgetMs:600000,
 strictTotalWorkBudget:true,historyAware:false,noHints:true,
 oneColdInvocationPerParent:true,sourceSelection:frozen.selectionSeed};
const rows=[];
for(const parent of frozen.selected){
 const source=byId.get(parent.id);
 assert(source,'missing selected parent '+parent.id);
 const {id:_id,stressMeta:_sm,...raw}=source.entry;
 const level=solver.prepareLevelForSolver(raw,{source:'raw'});
 const outcome=await solver.solveLevel(level,{baseWorkBudget:250000,nodeBudget:250000,
   timeBudgetMs:600000,strictTotalWorkBudget:true});
 assert(Number.isFinite(outcome.workSpent)&&outcome.workSpent>=0,'invalid control work');
 // The strict-total option is supposed to bound the whole invocation, but some atomic
 // search/repair steps can advance the work meter past its last pre-step check.
 // Persist each actual overrun, including any valid solution found beyond the target,
 // rather than aborting the source-pinned twelve-parent experiment or calling it 250k.
 const workOvershoot=Math.max(0,outcome.workSpent-250000);
 const solution=outcome.solution??null;
 const refereeValid=solution?solver.validateCandidatePath(level,solution).ok:null;
 assert(!outcome.ok||(Array.isArray(solution)&&refereeValid===true),
   'successful production control lacks valid path');
 const timedOut=outcome.deadlineTruncated===true
   ||outcome.status==='deadline-truncated';
 // Attempt errors, zero participation and premature deadline termination are never measured misses.
 // A timed-out early attempt can be followed by a valid later solve; the full solver status owns
 // whether its final unsolved outcome is censored.
 const measurable=['node-budget-reached','work-budget-reached','failed'].includes(outcome.status)
   && outcome.workSpent>0 && Array.isArray(outcome.attempts) && outcome.attempts.length>0;
 const classification=workOvershoot>0?'OVER-BUDGET'
   :outcome.ok&&refereeValid===true?'SOLVED'
   :timedOut||!measurable?'CENSORED':'NON-SUCCESS-AT-CAP';
 const row={parentId:parent.id,rank:parent.rank,levelPos:source.levelPos,
  status:outcome.status,ok:!!outcome.ok,classification,refereeValid,
  workSpent:outcome.workSpent,workOvershoot,
  nodesExpanded:outcome.nodesExpanded??null,
  totalMs:outcome.totalMs??null,attemptCount:outcome.attempts?.length??null,
  attemptStatuses:(outcome.attempts??[]).map(a=>({configKey:a.configKey??null,
    outcome:a.outcome??a.status??null,workSpent:a.workSpent??null,
    nodesExpanded:a.nodesExpanded??null})),
  solution:refereeValid===true?solution:null,
 };
 rows.push(row);
 console.log('PG-I 250K COLD '+JSON.stringify({parentId:row.parentId,
  classification:row.classification,workSpent:row.workSpent,
  workOvershoot:row.workOvershoot,attemptCount:row.attemptCount}));
}
const verdict={schema:'pathfinder.pg-i-resistance-production-250k-current-control/v1',
 sourceFreeze:freezePath,corpusSha256:digest,contract,sourceHead:process.env.GITHUB_SHA??null,
 summary:{independentParents:rows.length,solved:rows.filter(r=>r.classification==='SOLVED').length,
  measuredNonSuccess:rows.filter(r=>r.classification==='NON-SUCCESS-AT-CAP').length,
  censored:rows.filter(r=>r.classification==='CENSORED').length,
  overBudget:rows.filter(r=>r.classification==='OVER-BUDGET').length,
  maxWorkOvershoot:Math.max(0,...rows.map(r=>r.workOvershoot)),
  refereeInvalid:rows.filter(r=>r.ok&&r.refereeValid!==true).length},rows};
assert(rows.length===12&&verdict.summary.refereeInvalid===0,'incomplete control result');
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(out,JSON.stringify(verdict,null,2)+'\n');
console.log('PG-I 250K CONTROL VERDICT '+JSON.stringify(verdict.summary));
