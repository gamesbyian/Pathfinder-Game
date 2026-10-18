#!/usr/bin/env node
/** PG-G outcome-blind, control-only 12-independent-parent symmetry response census.
 * Historical family identity selects research pairs only, never solver behavior.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const flag=(k,def)=>{const x=process.argv.find(a=>a.startsWith('--'+k+'='));return x?x.slice(k.length+3):def};
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const hash=x=>createHash('sha256').update(x).digest('hex');
if(process.argv.includes('--self-test')){check(fnv('hello')===0x4f9f2cab,'FNV fixture');console.log('PG-G control stage-A self-test PASS');process.exit(0)}
const planFile=flag('plan','reports/stress/pg-g-independent-symmetry-stage-a-plan-20261018.json');
const dataRoot=flag('data-root','tmp/pg-g-blind-data'),outFile=flag('out',null);
check(outFile,'--out required');
const plan=JSON.parse(readFileSync(planFile,'utf8'));
check(plan.schema==='pathfinder.pg-g-independent-symmetry-plan/v1','plan identity');
const eligible=plan.completeRootSymmetryParents.filter(x=>!plan.excludedHistoricalParents.includes(x));
eligible.sort((a,b)=>fnv(plan.selectionSalt+':'+a)-fnv(plan.selectionSalt+':'+b)||a.localeCompare(b));
check(plan.completeRootSymmetryParents.length===50&&eligible.length===44&&
 JSON.stringify(eligible.slice(0,12))===JSON.stringify(plan.selectedParents),'frozen selection mismatch');
const shard=Number(flag('shard-index','0')),shards=Number(flag('shard-count','4'));
check(Number.isSafeInteger(shard)&&Number.isSafeInteger(shards)&&shard>=0&&shard<shards,'invalid shard');
const canary=process.argv.includes('--canary');
const ids=canary?[plan.selectedParents[0]]:plan.selectedParents.filter((_,i)=>i%shards===shard);
check(canary||ids.length===3,'expected 3 independent parents per shard');
const workCap=Number(flag('work-budget',String(canary?100000:10000000)));
const budgetMs=Number(flag('budget-ms','600000'));
check(canary?workCap===100000:workCap===plan.dose.workBudgetPerIsolatedCell,'work contract');
function levelArray(file){const d=JSON.parse(readFileSync(file,'utf8'));const rows=Array.isArray(d)?d:d.levels;check(Array.isArray(rows),'invalid corpus');return rows}
const corpora=new Map();function getParent(corpus,id){if(!corpora.has(corpus))corpora.set(corpus,levelArray(corpus));let x=corpora.get(corpus).find(x=>x.id===id);check(x,'missing parent '+id);return x}
const {installBrowserStubs}=await import('../test-lib/browser-stubs.mjs');installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {SCORING_PROFILES,STRUCTURAL_ORDERING_BIASES}=await import('../../modules/solver/policy.js');
const {getLevelFingerprint}=await import('../../modules/domain/level-fingerprint.ts');
const {makeAttemptConfigKeyParser}=await import('../attempt-config-key.mjs');
const parse=makeAttemptConfigKeyParser({SCORING_PROFILES,STRUCTURAL_ORDERING_BIASES,attemptConfigKey:api.attemptConfigKey});
const Solver=createSolver();
async function isolated(raw,technique){
 const level=Solver.prepareLevelForSolver(raw,{source:'raw'}),prep=api.prepLevel(level);
 prep._cfg=null;prep._metrics={nodesExpanded:0};prep._attemptBudgetTelemetry=true;
 prep._forcedFirstStepKey=null;prep._forcedPortalExitKey=null;
 const start=prep._workMeter.units;prep._workCap=start+workCap;prep._strictWorkCap=start+workCap;
 const config=parse(technique);const attempts=[];let solution=null,gate=null,truncated=false;
 const t=Date.now();
 for(const gateKey of level.gateKeys){
  if(prep._workMeter.units-start>=workCap)break;
  const r=await api.runAttempt(gateKey,level,prep,config,budgetMs,Date.now(),null,Infinity);
  attempts.push({gateKey,attempt:r.attempt});
  if(r.path){solution=r.path;gate=gateKey;break}
  if(r.attempt?.outcome==='timed-out'&&prep._workMeter.units-start<workCap){truncated=true;break}
 }
 const spent=prep._workMeter.units-start;const verdict=solution?Solver.validateCandidatePath(level,solution):null;
 check(!solution||verdict?.ok,'referee rejected solution');
 check(!truncated&&spent<=workCap*1.01,'invalid work cap / deadline');
 return {ok:!!solution,status:solution?'success':spent>=workCap?'work-budget-reached':'exhausted',
  workSpent:spent,nodesExpanded:prep._metrics.nodesExpanded,wallMs:Date.now()-t,winningGate:gate,
  path:solution,attempts};
}
const output={schema:'pathfinder.pg-g-independent-symmetry-control-stage-a/v1',
 plan:planFile,planSha256:hash(readFileSync(planFile)),historicalRef:plan.historicalDatasetRef,
 sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 shard,shards,canary,workCap,budgetMs,parents:[],
 summary:{parents:0,techniqueCells:0,discordantTechniquePairs:0,discordantParents:0}};
for(const id of ids){
 const prefix=path.join(dataRoot,'family-'+id+'-symmetry');
 const manifestBytes=readFileSync(prefix+'-manifest.json'),variantBytes=readFileSync(prefix+'.json');
 const manifest=JSON.parse(manifestBytes),siblings=JSON.parse(variantBytes);
 check(manifest.parentLevelId===id&&manifest.familyMode==='symmetry'&&siblings.length===7,'family coverage '+id);
 check(manifest.variants.length===7&&
 JSON.stringify(manifest.variants.map(v=>v.mutationManifest.variant))==='[1,2,3,4,5,6,7]','transform coverage '+id);
 siblings.forEach((x,i)=>check(x.id===manifest.variants[i].variantId,'variant identity '+id));
 const raw=getParent(manifest.parentCorpus,id),fingerprint=await getLevelFingerprint(raw);
 check(!manifest.parentContentHash||manifest.parentContentHash===fingerprint,'source parent hash mismatch '+id);
 const rows=[];
 for(const technique of (canary?[plan.methods[0]]:plan.methods)){
  const parent=await isolated(raw,technique),variants=[];
  for(let i=0;i<(canary?1:7);i++){
   const measured=await isolated(siblings[i],technique);
   variants.push({variantId:siblings[i].id,orientation:manifest.variants[i].mutationManifest.variant,
     control:measured,discordant:measured.ok!==parent.ok});
  }
  rows.push({technique,parent,variants});
 }
 const count=rows.reduce((n,r)=>n+r.variants.filter(v=>v.discordant).length,0);
 output.parents.push({id,corpus:manifest.parentCorpus,parentHash:fingerprint,
   sourceHashes:{manifest:hash(manifestBytes),variants:hash(variantBytes)},rows,discordantPairs:count});
 output.summary.parents++;output.summary.techniqueCells+=rows.reduce((n,r)=>n+1+r.variants.length,0);
 output.summary.discordantTechniquePairs+=count;if(count)output.summary.discordantParents++;
 console.log('PG-G HOLDOUT PARENT '+JSON.stringify({id,cellCount:rows.reduce((n,r)=>n+1+r.variants.length,0),discordant:count}));
}
mkdirSync(path.dirname(path.resolve(outFile)),{recursive:true});
writeFileSync(outFile,JSON.stringify(output,null,2)+'\n');
console.log('PG-G HOLDOUT VERDICT '+JSON.stringify(output.summary));
