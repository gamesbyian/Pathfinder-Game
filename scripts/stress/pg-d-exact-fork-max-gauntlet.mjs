#!/usr/bin/env node
/** PG-D: retrospective exact LIVE/DEAD topology-fork prefix vs current
 * full per-step hard-prune gauntlet, with connectivity scheduled EVERY step.
 * This is an optimistic maximum-pruning research counterfactual, NOT a replay
 * of any particular production technique's actual connectivity schedule.
 * Portal-bearing levels abstain from ordinary trail-switch successor claims.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const SOURCES=[
 'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
 'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
 'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json'
];
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const assert=(x,s)=>{if(!x)throw Error(s)};
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const packed=([x,y])=>((x-1)|((y-1)<<16));
const k=r=>JSON.stringify([r.corpus,r.levelId,r.prefix]);
function groupBy(arr,key){let out=new Map();for(const v of arr){let label=key(v);let l=out.get(label)||[];l.push(v);out.set(label,l)}return out}
if(process.argv.includes('--self-test')){
 const rows=[{corpus:'a',levelId:'x',prefix:[[1,1],[2,1]]},{corpus:'a',levelId:'x',prefix:[[1,1],[2,1]]}];
 assert(groupBy(rows,k).size===1,'identity dedupe');assert(packed([2,3])===((1)|(2<<16)),'canonical packed key');
 console.log('PG-D exact fork gauntlet self-test passed');process.exit(0);
}
assert(out,'--out is required');
const levels=JSON.parse(readFileSync('data/levels.json','utf8'));
const byId=new Map(levels.map(l=>[l.id,l]));
let rawRows=[];
const inputs=[];
for(const source of SOURCES){
 const doc=JSON.parse(readFileSync(source,'utf8'));
 assert(doc.summary?.correctnessAlarms===0&&doc.summary?.inputAlarms===0,'reference alarms in '+source);
 const rows=doc.rows||[];
 assert(rows.every(r=>['live','dead'].includes(r.referenceLabel)),'UNKNOWN exact label in '+source);
 rawRows.push(...rows.map(r=>({...r,sourceFile:source})));
 inputs.push({source,sha256:sha(source),count:rows.length});
}
assert(rawRows.length===28,'source material changed');
const unique=new Map();let aliases=0;
for(const row of rawRows){
 const key=k(row),old=unique.get(key);
 if(old){assert(old.referenceLabel===row.referenceLabel,'conflicting exact labels');aliases++}
 else unique.set(key,row);
}
assert(unique.size===25&&aliases===3,'unique prefix identity changed');
const groups=groupBy([...unique.values()],r=>JSON.stringify([r.levelId,r.prefix.at(-1),r.prefix.length]));
const mixedKeys=new Set([...groups].filter(([,v])=>new Set(v.map(x=>x.referenceLabel)).size>1).map(([k])=>k));
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const Solver=createSolver();
const cfg=api.normalizeAblationConfig({});
let checked=[],unsupported=[],alarms=[];
for(const row of unique.values()){
 const raw=byId.get(row.levelId);assert(raw,'missing board '+row.levelId);
 const {id:_id,provenance:_pro,designerName:_dn,description:_ds,difficulty:_df,...wire}=raw;
 const level=Solver.prepareLevelForSolver(wire,{source:'raw'});
 const keys=row.prefix.map(packed);
 if(level.portalMap.size>0){unsupported.push({levelId:row.levelId,id:row.caseId,reason:'portal-bearing-level'});continue}
 const prep=api.prepLevel(level);prep._cfg=cfg;prep._metrics={nodesExpanded:0};
 const state=api.createState(keys[0],level,prep);
 assert(level.gateKeys.includes(keys[0]),'prefix does not start on gate '+row.caseId);
 let firstReject=null;
 const lastAt=keys.at(-1);
 for(let i=1;i<keys.length;i++){
  const from=keys[i-1],next=keys[i];
  if(!api.getNeighbors(from,state,level,prep).includes(next)){
   alarms.push({id:row.caseId,role:'replay-invalid',at:i});break;
  }
  api.applyMove(next,state,level,prep,false);
  const realLen=api.getRealLengthFromState(state);
  const diagnostics={reached:{},rejected:{}};
  const verdict=api.evaluatePrunedMove(next,realLen,state,level,prep,cfg,true,{diagnostics});
  if(verdict==='reject'&&!firstReject){
   firstReject={rawDepth:i,reason:Object.keys(diagnostics.rejected).join('|')||'fundamental/goal',realLen};
  }
 }
 if(alarms.some(x=>x.id===row.caseId))continue;
 if(state.path.at(-1)!==lastAt)throw Error('did not reach endpoint');
 const current=api.evaluatePrunedMove(lastAt,api.getRealLengthFromState(state),state,level,prep,cfg,true);
 const bc1=api.bc1StrandedFreshVolume(lastAt,state,level,true);
 if(row.referenceLabel==='live'&&(firstReject||current==='reject'))alarms.push({id:row.caseId,role:'soundness-LIVE-pruned',firstReject,current});
 checked.push({id:row.caseId,levelId:row.levelId,referenceLabel:row.referenceLabel,
  source:row.sourceFile,rawDepth:keys.length-1,mixedContrast:mixedKeys.has(JSON.stringify([row.levelId,row.prefix.at(-1),row.prefix.length])),
  endpointXY:row.prefix.at(-1),maximalConnectivityEveryStep:true,
  firstReject,finalGauntlet:current,bc1:bc1?{bc1Conflict:bc1.bc1Conflict,vertexConflict:bc1.vertexConflict,strandedFresh:bc1.strandedFresh,freshVolume:bc1.freshVolume}:null});
 console.log('PG-D FORK '+JSON.stringify({id:row.caseId,fate:row.referenceLabel,firstReject,finalGauntlet:current}));
}
const pass=checked.filter(x=>x.finalGauntlet==='pass'),dead=checked.filter(x=>x.referenceLabel==='dead'),live=checked.filter(x=>x.referenceLabel==='live');
const summary={originalObservations:rawRows.length,distinctPrefixes:unique.size,aliasRows:aliases,allParents:new Set([...unique.values()].map(r=>r.levelId)).size,
 supportedRows:checked.length,unsupportedRows:unsupported.length,supportedParents:new Set(checked.map(x=>x.levelId)).size,
 supportedLive:live.length,supportedDead:dead.length,
 deadSurviveFinalMaxGauntlet:dead.filter(x=>x.finalGauntlet==='pass').length,
 deadNeverRejectedAlongPrefix:dead.filter(x=>!x.firstReject).length,
 liveEverRejected:live.filter(x=>x.firstReject).length,
 survivingMixedContrastParents:[...new Set(pass.filter(x=>x.mixedContrast).map(x=>x.levelId))].sort(),
 maximalFinalPassCount:pass.length,alarms:alarms.length};
const report={schema:'pathfinder.pg-d-exact-fork-max-gauntlet-census/v1',evidenceRole:'retrospective-development',
 design:{selection:'all three existing exact topology-fork tables, literal dedupe; portal-bearing levels omitted for future all-ordinary route logic',
 maxGauntlet:'after EVERY replayed prefix transition, evaluate whole shared hard-prune pipeline with connectivity=true, irrespective of production stage schedule; optimistic pruning opportunity bound only, not replay of production beam/DFS',
 pruneCfg:'production normalized ablation defaults',inference:'No novel switch constraint is being applied, only existing prune coverage to size its remaining test opportunity.'},
 inputs,summary,rows:checked,unsupported,alarms,
 caveats:['Exactly labelled historical selected topology forks are a forensic development cohort, not a representative random sample.',
 'A DEAD prefix surviving an optimistic full per-step gauntlet is not proof a novel switch-only condition can reject it.',
 'A LIVE prefix rejected by maximum sound pruning is a correctness alarm requiring investigation, not an accepted outcome.',
 'Historical family labels and witness paths are prohibited as cold solver features.']};
const f=path.resolve(out);mkdirSync(path.dirname(f),{recursive:true});
writeFileSync(f,JSON.stringify(report,null,2)+'\n');
console.log('PG-D FORK MAX GAUNTLET VERDICT '+JSON.stringify(summary));
if(alarms.length)throw Error('PG-D legal prefix or live-soundness alarms, see output artifact');
