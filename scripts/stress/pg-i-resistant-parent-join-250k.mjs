#!/usr/bin/env node
/**
 * PG-I: exact-source paired opportunity accounting for the frozen twelve-parent cohort.
 *
 * This compares one current 250k *shared-ladder* cold control against 5 *isolated* 250k-work
 * methods per parent. Shared and isolated allocations are different treatments even when the
 * nominal cap matches. It discovers cold candidate opportunities, not a production A/B win.
 *
 * node scripts/stress/pg-i-resistant-parent-join-250k.mjs --self-test
 * node scripts/stress/pg-i-resistant-parent-join-250k.mjs --shallow=a.json --control=b.json --out=c.json
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';

const FREEZE='reports/stress/pg-i-resistant-parent-20261018-frozen-selection.json';
const assert=(x,message)=>{if(!x)throw Error(message)};
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const argv=process.argv.slice(2);
const arg=name=>argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3);
const unique=(rows,field)=>{
  const map=new Map();
  for(const row of rows){
    const id=row[field];
    assert(typeof id==='string'&&id.length>0&&!map.has(id),'missing/duplicate '+field+': '+id);
    map.set(id,row);
  }
  return map;
};
function join(shallow,control,freeze){
  assert(shallow.schema==='pathfinder.pg-i-parent-equal-work-exposure-result/v1',
    'unrecognized isolated method schema');
  assert(control.schema==='pathfinder.pg-i-resistance-production-250k-current-control/v1',
    'unrecognized current production control schema');
  assert(shallow.workBudgetPerTechnique===250000,
    'isolated work envelope is not 250k canonical work');
  assert(control.contract?.baseWorkBudget===250000
    && control.contract?.nodeBudget===250000
    && control.contract?.strictTotalWorkBudget===true
    && control.contract?.oneColdInvocationPerParent===true,
    'current cold production control does not carry strict 250k protocol');
  assert(shallow.corpusSha256===freeze.corpusSha256
    && control.corpusSha256===freeze.corpusSha256,
    'source puzzle corpus revisions differ');
  assert(/^[0-9a-f]{40}$/u.test(shallow.executionCommit??'')
    && shallow.executionCommit===control.sourceHead,
    'execution commits differ: no source-exact paired interpretation permitted');
  assert(shallow.summary?.independentParents===12
    && shallow.summary?.expectedCells===60 && shallow.summary?.observedCells===60
    && control.summary?.independentParents===12,
    'incomplete source population');
  assert(shallow.methods?.length===5
    && new Set(shallow.methods).size===5
    && shallow.population?.length===12
    && shallow.parents?.length===12
    && control.rows?.length===12
    && freeze.selected?.length===12,
    'population/method roster incomplete');
  const expected=unique(freeze.selected,'id');
  const shallowPop=unique(shallow.population,'id');
  const shallowParents=unique(shallow.parents,'parentId');
  const production=unique(control.rows,'parentId');
  assert([...expected.keys()].every(k=>shallowPop.has(k)&&shallowParents.has(k)&&production.has(k))
    && shallowPop.size===expected.size
    && shallowParents.size===expected.size
    && production.size===expected.size,'parent identity mismatch');
  const parents=[];
  for(const parent of freeze.selected){
    const p=shallowParents.get(parent.id),c=production.get(parent.id),pop=shallowPop.get(parent.id);
    assert(p.rank===parent.rank&&c.rank===parent.rank&&pop.rank===parent.rank
      && p.levelPos===c.levelPos&&p.levelPos===pop.levelPos,
      'rank or corpus level position mismatch for '+parent.id);
    assert(p.methodRows?.length===5
      && new Set(p.methodRows.map(r=>r.configKey)).size===5
      && shallow.methods.every(k=>p.methodRows.some(r=>r.configKey===k)),
      'method identity/coverage mismatch on '+parent.id);
    const successes=p.methodRows.filter(m=>m.classification==='SOLVED');
    const missing=p.methodRows.filter(m=>m.classification==='UNOBSERVED-OR-CENSORED');
    for(const m of successes) assert(m.refereeValid===true
      && Array.isArray(m.path)&&Number.isFinite(m.workSpent)
      && m.workSpent>=0&&m.workSpent<=250000,
      'unsupported/out-of-budget isolated solution on '+parent.id);
    assert(['SOLVED','NON-SUCCESS-AT-CAP','CENSORED'].includes(c.classification),
      'unknown current production disposition on '+parent.id);
    if(c.classification==='SOLVED')assert(c.refereeValid===true&&Array.isArray(c.solution),
      'production claimed success without referee path');
    const currentGap=c.classification==='NON-SUCCESS-AT-CAP';
    const category=c.classification==='SOLVED'?'ALREADY-CURRENT-SOLVED'
      :c.classification==='CENSORED'?'CURRENT-CONTROL-CENSORED'
      :successes.length>0?'250K-ISOLATED-RECOVERY-CANDIDATE'
      :missing.length>0?'CURRENT-GAP-METHOD-OBSERVABILITY-INCOMPLETE'
      :'NO-ISOLATED-250K-SUCCESS';
    parents.push({
      parentId:parent.id,rank:parent.rank,levelPos:p.levelPos,
      category,production:{status:c.status,classification:c.classification,
        workSpent:c.workSpent,attemptCount:c.attemptCount},
      isolated:{methodsObserved:p.methodRows.length,successCount:successes.length,
        censoredCount:missing.length,winners:successes.map(m=>({
          configKey:m.configKey,workSpent:m.workSpent,cellId:m.cellId,
        }))},currentGap,
    });
  }
  const summary={
    independentParents:parents.length,
    currentProductionSolves:parents.filter(x=>x.category==='ALREADY-CURRENT-SOLVED').length,
    currentProductionMeasuredGaps:parents.filter(x=>x.currentGap).length,
    currentProductionCensored:parents.filter(x=>x.category==='CURRENT-CONTROL-CENSORED').length,
    currentGapWithIsolated250kCandidate:parents.filter(x=>x.category==='250K-ISOLATED-RECOVERY-CANDIDATE').length,
    currentGapWithNoIsolated250kSuccess:parents.filter(x=>x.category==='NO-ISOLATED-250K-SUCCESS').length,
    currentGapWithMethodObservabilityIncomplete:parents.filter(x=>x.category==='CURRENT-GAP-METHOD-OBSERVABILITY-INCOMPLETE').length,
  };
  return {
    schema:'pathfinder.pg-i-parent-250k-exact-source-opportunity-join/v1',
    cohort:FREEZE,executionCommit:shallow.executionCommit,
    corpusSha256:freeze.corpusSha256,workBudget:250000,summary,parents,
    interpretation:{
      independenceUnit:'parentId',
      eligibleConclusion:'Cold current-production failure with at least one distinct referee-valid isolated 250k-work method success is a candidate for a shared-budget, current-input-only scheduler retest.',
      prohibitedConclusion:'No production A/B rescue established by separate isolated 250k experiments. No prevalence or independent-confirmation claim on historically outcome-selected parents.',
    },
  };
}
if(argv.includes('--self-test')){
  const freeze=read(FREEZE),commit='a'.repeat(40);
  const names=freeze.protocol.methodKeys,ids=freeze.selected;
  const shallow={
    schema:'pathfinder.pg-i-parent-equal-work-exposure-result/v1',
    workBudgetPerTechnique:250000,corpusSha256:freeze.corpusSha256,executionCommit:commit,
    summary:{independentParents:12,expectedCells:60,observedCells:60},
    methods:names,population:ids.map((x,i)=>({...x,levelPos:i+1})),
    parents:ids.map((x,i)=>({...x,levelPos:i+1,
      methodRows:names.map((key,k)=>({configKey:key,classification:
        i===0&&k===0?'SOLVED':'MEASURED-NON-SUCCESS',
        refereeValid:i===0&&k===0?true:null,path:i===0&&k===0?['x']:null,
        workSpent:2000,cellId:i+':'+k}))})),
  };
  const control={
    schema:'pathfinder.pg-i-resistance-production-250k-current-control/v1',
    corpusSha256:freeze.corpusSha256,sourceHead:commit,
    summary:{independentParents:12},
    contract:{baseWorkBudget:250000,nodeBudget:250000,strictTotalWorkBudget:true,
      oneColdInvocationPerParent:true},
    rows:ids.map((x,i)=>({...x,levelPos:i+1,parentId:x.id,
      classification:i===1?'SOLVED':'NON-SUCCESS-AT-CAP',
      refereeValid:i===1?true:null,solution:i===1?['y']:null,
      status:i===1?'success':'work-budget-reached',workSpent:250000,attemptCount:5})),
  };
  const verdict=join(shallow,control,freeze);
  assert(verdict.summary.currentGapWithIsolated250kCandidate===1
    && verdict.summary.currentProductionSolves===1
    && verdict.summary.currentProductionMeasuredGaps===11,
    'synthetic join classifications failed');
  const bad={...control,sourceHead:'b'.repeat(40)};
  let blocked=false;try{join(shallow,bad,freeze);}catch(e){blocked=/commits differ/u.test(e.message);}
  assert(blocked,'different solver code revisions must not be joined');
  console.log('PG-I 250k exact-source join self-test passed');
} else {
  const shallowPath=arg('shallow'),controlPath=arg('control'),out=arg('out');
  assert(shallowPath&&controlPath&&out,'--shallow, --control, and --out are required');
  const verdict=join(read(shallowPath),read(controlPath),read(FREEZE));
  mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
  writeFileSync(out,JSON.stringify(verdict,null,2)+'\n');
  console.log('PG-I JOIN '+JSON.stringify(verdict.summary));
}
