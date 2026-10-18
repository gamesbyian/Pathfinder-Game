#!/usr/bin/env node
/**
 * PG-D bounded, soundly over-permissive ordinary-route flipper automata.
 *
 * Neither arm calls CP-SAT, knows reference labels when computing a route, or
 * changes production. The first arm retains position, incoming axis, unused
 * flipper mask and exact remaining move count. The second additionally forbids
 * entry via axis bits ALREADY USED at the frozen prefix. Both deliberately
 * forget future visited/edge-axis mutations, turn-at-used-cell restrictions,
 * all intersections and other outstanding obligations. Hence a missing route
 * is a sound necessary-condition reject on supported portal-free ordinary
 * prefixes, but a found route DOES NOT imply feasible completion.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const SOURCES=[
 'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
 'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
 'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',
];
const assert=(v,m)=>{if(!v)throw Error(m)};
const packed=([x,y])=>((y-1)<<16)|(x-1);
const axisBetween=(p,q)=>((p>>>16)===(q>>>16)?1:2);
const countBits=n=>{let b=0;while(n){n&=n-1;b++}return b};
const signature=(p,a,m)=>p+':'+a+':'+m;
const fileSha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function relaxedFlipperCompletion({pos,entryAxis,usedMask,edgeUsage,remaining,level,prep,freezeExistingAxis}){
 assert(Number.isSafeInteger(remaining)&&remaining>=0,'remaining move count');
 assert(level.portalMap.size===0,'ordinary-only relaxation: portal level must abstain');
 const goal=level.goalKey;
 let frontier=new Map([[signature(pos,entryAxis,usedMask),[pos,entryAxis,usedMask]]]);
 let maxFrontier=frontier.size,transitions=0;
 if(remaining===0)return {feasible:pos===goal,terminalStates:pos===goal?1:0,maxFrontier,transitions};
 for(let depth=1;depth<=remaining;depth++){
  const nextFrontier=new Map();
  for(const [from,incoming,mask] of frontier.values()){
   const dense=((from>>>16)*prep.gridW)+(from&65535);
   const start=dense*4;
   for(let direction=0;direction<4;direction++){
    const coded=prep.staticNeighborKeys[start+direction];
    if(!coded)continue;
    const target=coded-1,axis=axisBetween(from,target);
    if(freezeExistingAxis&&(edgeUsage[target]&axis)!==0)continue;
    if(level.flippingFilterMap.has(from)&&incoming!==0&&incoming!==axis)continue;
    const fi=prep.flipperIndexMap[target]-1;
    if(fi>=0){
     if((mask&(1<<fi))!==0)continue;
     const initialAxis=prep.flipperInitAxes[fi];
     const currentAxis=(countBits(mask)&1)===0?initialAxis:initialAxis===1?2:1;
     if(axis!==currentAxis)continue;
    }
    const isGoal=target===goal;
    if((depth===remaining)!==isGoal)continue;
    const newMask=fi>=0?mask|(1<<fi):mask;
    const key=signature(target,axis,newMask);
    nextFrontier.set(key,[target,axis,newMask]);transitions++;
   }
  }
  frontier=nextFrontier;
  maxFrontier=Math.max(maxFrontier,frontier.size);
  if(frontier.size===0)break;
 }
 return {feasible:frontier.size>0,terminalStates:frontier.size,maxFrontier,transitions};
}
function testTiny(){
 const adj=new Int32Array(12);adj[0]=2;adj[4]=3;
 const mk=(init)=>({gridW:3,staticNeighborKeys:adj,
  flipperIndexMap:Int8Array.from([0,1,0]),flipperInitAxes:Uint8Array.from([init])});
 const level={goalKey:2,portalMap:new Map(),flippingFilterMap:new Map([[1,1]])};
 let z=relaxedFlipperCompletion({pos:0,entryAxis:0,usedMask:0,edgeUsage:new Uint8Array(3),
  remaining:2,level,prep:mk(1),freezeExistingAxis:false});
 assert(z.feasible&&z.terminalStates===1,'straight flipper should be passable');
 let n=relaxedFlipperCompletion({pos:0,entryAxis:0,usedMask:0,edgeUsage:new Uint8Array(3),
  remaining:2,level,prep:mk(2),freezeExistingAxis:false});
 assert(!n.feasible,'rotated flipper must block H approach');
 let e=Uint8Array.from([0,1,0]);
 let r=relaxedFlipperCompletion({pos:0,entryAxis:0,usedMask:0,edgeUsage:e,
  remaining:2,level,prep:mk(1),freezeExistingAxis:true});
 assert(!r.feasible,'historical target axis use must be excluded');
 assert(relaxedFlipperCompletion({pos:0,entryAxis:0,usedMask:0,edgeUsage:e,
  remaining:2,level,prep:mk(1),freezeExistingAxis:false}).feasible,'frozen history must be opt-in');
 console.log('PG-D ordinary flipper relaxation self-test passed');
}
if(process.argv.includes('--self-test')){testTiny();process.exit(0)}
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
assert(out,'--out=<path> required');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const Solver=createSolver();
const rawLevels=JSON.parse(readFileSync('data/levels.json','utf8'));
const byId=new Map(rawLevels.map(l=>[l.id,l]));
const inputs=[],unique=new Map();let aliases=0,rawCount=0;
for(const source of SOURCES){
 const json=JSON.parse(readFileSync(source,'utf8'));
 assert(json.summary?.correctnessAlarms===0&&json.summary?.inputAlarms===0,'source alarm '+source);
 const rows=json.rows;assert(Array.isArray(rows),'reference rows missing');
 for(const row of rows){
  assert(['live','dead'].includes(row.referenceLabel),'abstain not permitted');
  const key=JSON.stringify([row.corpus,row.levelId,row.prefix]);
  const prev=unique.get(key);
  if(prev){assert(prev.referenceLabel===row.referenceLabel,'contradictory oracle cases');aliases++}
  else unique.set(key,{...row,source});
  rawCount++;
 }
 inputs.push({path:source,sha256:fileSha(source),rows:rows.length});
}
assert(rawCount===28&&unique.size===25&&aliases===3,'unexpected frozen source population');
const supported=[],abstained=[],alarms=[];
for(const row of unique.values()){
 const raw=byId.get(row.levelId);assert(raw,'missing level '+row.levelId);
 const {id:_id,provenance:_pr,designerName:_dn,description:_de,difficulty:_di,...wire}=raw;
 const level=Solver.prepareLevelForSolver(wire,{source:'raw'});
 if(level.portalMap.size!==0){abstained.push({caseId:row.caseId,reason:'portal-bearing-board'});continue;}
 const prefix=row.prefix.map(packed),prep=api.prepLevel(level);prep._cfg=null;
 const state=api.createState(prefix[0],level,prep);
 assert(level.gateKeys.includes(prefix[0]),'wrong gate '+row.caseId);
 for(let index=1;index<prefix.length;index++){
  const from=prefix[index-1],target=prefix[index];
  assert(api.getNeighbors(from,state,level,prep).includes(target),'invalid replay '+row.caseId+'@'+index);
  api.applyMove(target,state,level,prep,false);
 }
 const rawDepth=prefix.length-1,actualSteps=api.getRealLengthFromState(state);
 assert(actualSteps===rawDepth,'portal-free counted depth mismatch');
 const remaining=level.requiredLength-actualSteps;
 assert(remaining>=0,'prefix already over length');
 const pos=state.path.at(-1),last=state.path.at(-2);
 const entryAxis=last===undefined?0:axisBetween(last,pos);
 const usedMask=state.flipperUsedMask;
 const common={pos,entryAxis,usedMask,edgeUsage:state.edgeUsage,remaining,level,prep};
 const forgetful=relaxedFlipperCompletion({...common,freezeExistingAxis:false});
 const frozen=relaxedFlipperCompletion({...common,freezeExistingAxis:true});
 if(frozen.feasible&&!forgetful.feasible)alarms.push({caseId:row.caseId,reason:'frozen cannot be broader than forgetful'});
 if(row.referenceLabel==='live'&&(!forgetful.feasible||!frozen.feasible))alarms.push({caseId:row.caseId,reason:'LIVE rejected by sound necessary relaxation'});
 supported.push({caseId:row.caseId,levelId:row.levelId,referenceLabel:row.referenceLabel,
  source:row.source,rawDepth,remaining,endpointXY:row.prefix.at(-1),entryAxis,usedFlipperMask:usedMask,
  initialUsedAxisCells:state.edgeUsage.filter(v=>v!==0).length,
  initialUsedAxisBits:state.edgeUsage.reduce((n,v)=>n+countBits(v),0),
  forgettingHistory:forgetful,withFrozenHistory:frozen});
}
const focal=supported.filter(r=>r.levelId==='P00009');
assert(supported.length===13&&abstained.length===12,'unsupported/supported selection changed');
assert(focal.length===4&&focal.filter(r=>r.referenceLabel==='live').length===2
 &&focal.filter(r=>r.referenceLabel==='dead').length===2,'P00009 source contrasting states changed');
const pairs=new Map();
for(const r of focal){const k=JSON.stringify([r.endpointXY,r.rawDepth]);let g=pairs.get(k)||[];g.push(r);pairs.set(k,g)}
assert(pairs.size===2&&[...pairs.values()].every(g=>g.length===2&&
 g.some(r=>r.referenceLabel==='live')&&g.some(r=>r.referenceLabel==='dead')),'matched exact contrast changed');
const second=[...pairs.values()].find(g=>g[0].rawDepth===6);
assert(second&&second[0].entryAxis===second[1].entryAxis&&second[0].usedFlipperMask===second[1].usedFlipperMask,
 'depth-six pair should be provably indistinguishable to memoryless automaton');
const summary={sourceRows:rawCount,uniquePrefixes:unique.size,aliasRows:aliases,
  supportedPrefixes:supported.length,abstainedPortalPrefixes:abstained.length,
  supportedParents:new Set(supported.map(r=>r.levelId)).size,
  supportedLive:supported.filter(r=>r.referenceLabel==='live').length,
  supportedDead:supported.filter(r=>r.referenceLabel==='dead').length,
  liveFalseRejects:alarms.filter(x=>x.reason.includes('LIVE')).length,
  deadRejectedHistoryFree:supported.filter(r=>r.referenceLabel==='dead'&&!r.forgettingHistory.feasible).length,
  deadRejectedFrozenHistory:supported.filter(r=>r.referenceLabel==='dead'&&!r.withFrozenHistory.feasible).length,
  matchedFocalCases:focal.length,focalContrasts:pairs.size,
  focalDeadRejectedFrozenHistory:focal.filter(r=>r.referenceLabel==='dead'&&!r.withFrozenHistory.feasible).length,
  depthSixSameAbstractSeed:true,
  alarms:alarms.length};
const verdict={schema:'pathfinder.pg-d-flipper-relaxation-boundary/v1',
 evidenceRole:'forensic-development',selection:'all exact-labelled topology forks, portal-bearing boards abstain, P00009 contrasts preregistered',
 scope:'optimistic discrete flipper orientation/entry and exact remaining length plus optionally prefix-history USED TARGET AXIS. Forgets future axis use, intersections, exact obligations; cannot establish LIVE.',
 method:'dynamic-programming reachability on position × incoming-axis × flipper-used-mask × remaining steps; existing staticNeighborKeys from production prep; optional static prohibition on the original prefix edgeUsage target-axis; never mutate future edgeUsage.',
 inputs,summary,rows:supported,abstained,alarms,
 next:'Do not purchase an exact oracle or introduce these cheap flipper automata as prunes for the tested contrasts if both DEAD pass. Seek a genuinely path-history-sensitive necessary condition with nonredundant measured future work first.'};
const file=path.resolve(out);mkdirSync(path.dirname(file),{recursive:true});
writeFileSync(file,JSON.stringify(verdict,null,2)+'\n');
console.log('PG-D FLIPPER RELAXATION VERDICT '+JSON.stringify(summary));
for(const r of focal)console.log('PG-D FOCAL '+JSON.stringify({
 id:r.caseId,fate:r.referenceLabel,rawDepth:r.rawDepth,entryAxis:r.entryAxis,flipperMask:r.usedFlipperMask,
 frozenHistoryTerminal:r.withFrozenHistory.terminalStates,historyFreeTerminal:r.forgettingHistory.terminalStates}));
if(alarms.length)throw Error('soundness/dominance alarms');
