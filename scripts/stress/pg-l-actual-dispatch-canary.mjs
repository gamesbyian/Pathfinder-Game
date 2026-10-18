#!/usr/bin/env node
/** PG-L: actual same-invocation production attempt participation; no behavior change. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createSolver} from '../../modules/solver.js';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const assert=(x,s)=>{if(!x)throw Error(s)};
function stage(a){
 const key=String(a.configKey||a.technique||a.strategy||'');
 const profile=String(a.scoringProfileId||a.profile||'');
 return {stage:a.solverStage??a.stage??null,configKey:key,profile,
  width:a.beamWidth??a.width??null,gate:a.gateKey??a.gate??null,
  nodes:a.nodesExpanded??null,work:a.workSpent??null,
  status:a.status??null,knownKeys:Object.keys(a)};
}
if(process.argv.includes('--self-test')){
 const v=stage({configKey:'beam|score=objectiveFirst|width=5000',gateKey:4,workSpent:100,nodesExpanded:2});
 assert(v.work===100&&v.gate===4&&v.configKey.includes('objectiveFirst'),'attempt transport');
 console.log('PG-L dispatch telemetry parser self-test passes');process.exit(0);
}
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
assert(out,'--out required');
installBrowserStubs();
const solver=createSolver();
const b=readFileSync('data/stress/stress-levels-random.json');
const sha=createHash('sha256').update(b).digest('hex');
assert(sha==='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb','corpus drift');
const raw=JSON.parse(b),all=Array.isArray(raw)?raw:raw.levels;
const source=JSON.parse(readFileSync('reports/stress/pg-l-static-policy-eligibility-20261017-001.json'));
assert(source.summary.parents===8&&source.summary.bothScoringActionsEligible===8,'source cohort drift');
const byId=new Map(all.map(x=>[x.id,x]));
const rows=[];
for(const src of source.rows){
 const row=byId.get(src.levelId);assert(row,'missing source row');
 const {id:_id,stressMeta:_sm,...wire}=row;
 const level=solver.prepareLevelForSolver(wire,{source:'raw'});
 assert(level.gateKeys[0]===src.gateKey,'gate mismatch');
 const result=await solver.solveLevel(level,{baseWorkBudget:250000,nodeBudget:250000,budgetMs:600000,strictTotalWorkBudget:true});
 assert(Array.isArray(result.attempts),'missing execution attempt records');
 const attempts=result.attempts.map(stage);
 const beam=attempts.filter(a=>a.configKey.includes('beam'));
 const objective=beam.filter(a=>a.configKey.includes('objectiveFirst'));
 const harvest=beam.filter(a=>a.configKey.includes('intersectionHarvest'));
 rows.push({levelId:src.levelId,status:result.status,ok:result.ok,workSpent:result.workSpent,
   attempts,attemptCount:attempts.length,objectiveAttemptCount:objective.length,
   intersectionAttemptCount:harvest.length,bothExecuted:!!(objective.length&&harvest.length)});
 console.log('PG-L DISPATCH '+JSON.stringify({levelId:src.levelId,status:result.status,workSpent:result.workSpent,
  attempts:attempts.length,bothExecuted:!!(objective.length&&harvest.length)}));
}
const report={schema:'pathfinder.pg-l-actual-dispatch-250k-canary/v1',
 source:'frozen PG-L-002 static menu population',
 corpusSha256:sha,
 protocol:{baseWorkBudget:250000,nodeBudget:250000,budgetMs:600000,strictTotalWorkBudget:true,
 noObserver:true,noHints:true,oneFullInvocationPerParent:true},
 summary:{parents:rows.length,bothExecuted:rows.filter(r=>r.bothExecuted).length,
  eitherExecuted:rows.filter(r=>r.objectiveAttemptCount||r.intersectionAttemptCount).length,
  totalAttempts:rows.reduce((a,b)=>a+b.attemptCount,0),errors:rows.filter(r=>r.status==='attempt-error').length},
 rows};
assert(rows.length===8,'incomplete census');
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(path.resolve(out),JSON.stringify(report,null,2)+'\n');
console.log('PG-L DISPATCH VERDICT '+JSON.stringify(report.summary));
