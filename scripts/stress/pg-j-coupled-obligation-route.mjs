#!/usr/bin/env node
/**
 * PG-J: read-only bounded *necessary* residual route lower bound on source-exact
 * P00137 LIVE/DEAD prefixes. No runtime hard prune, policy, or hint consumption.
 *
 * Run through the repo's supported esbuild boundary:
 * node scripts/run-bundled.mjs scripts/stress/pg-j-coupled-obligation-route.mjs -- --out=tmp/pg-j-route.json
 *
 * The abstraction combines all outstanding must-pass cells, the 2-axis
 * must-cross, frozen prior axis consumption, the first-cross lock, forced
 * zero-cost portals and their single-use constraint, and ordered flip filters.
 * It forgets ALL axis uses created after the prefix except the crossing's
 * axis mask, arbitrary non-portal future cell revisits, and intersection
 * upper bounds. Thus real continuations are contained in abstract paths.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const sources=[
 'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
 'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
 'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',
];
const sourceHash=(content)=>createHash('sha256').update(content).digest('hex');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const popcount=x=>{let n=0;for(;x;x&=x-1)n++;return n;};
const out=process.argv.find(v=>v.startsWith('--out='))?.slice(6);
if(process.argv.includes('--self-test')){
 assert(popcount(0)===0&&popcount(3)===2&&popcount(255)===8,'popcount');
 // Minimum-distance arithmetic is deliberately integer canonical work-free,
 // not a mock implementation of the production move meter.
 console.log('PG-J coupled-obligation route contract self-test passed');
 process.exit(0);
}
assert(out,'--out=<path> is required');
const records=[],sourceFiles=[];
for(const file of sources){
 const bytes=readFileSync(file),json=JSON.parse(bytes.toString('utf8'));
 assert(json.summary?.correctnessAlarms===0&&json.summary?.inputAlarms===0,'untrusted CP-SAT source status: '+file);
 sourceFiles.push({path:file,sha256:sourceHash(bytes)});
 for(const r of json.rows??[])if(r.levelId==='P00137')records.push(r);
}
const unique=new Map();
for(const row of records){
 const key=JSON.stringify(row.prefix),prior=unique.get(key);
 if(prior)assert(prior.referenceLabel===row.referenceLabel,'conflicting exact prefix fates');
 else unique.set(key,row);
}
const cases=[...unique.values()].sort((a,b)=>a.caseId.localeCompare(b.caseId));
assert(cases.length===4&&cases.filter(x=>x.referenceLabel==='live').length===2
 &&cases.filter(x=>x.referenceLabel==='dead').length===2,'not the complete frozen P00137 four-case cohort');
const corpusPath='data/levels.json',buf=readFileSync(corpusPath);
const raw=JSON.parse(buf.toString('utf8')).find(x=>x.id==='P00137');
assert(raw&&raw.mustPass?.length===2&&raw.mustCross?.length===1
 &&raw.flippingFilters?.length===2&&raw.portals?.length===3,'unexpected source board contracts');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const solver=createSolver(),level=solver.prepareLevelForSolver(raw,{source:'raw'});
const id=(x,y)=>api.PACK(x-1,y-1);
const obligations=raw.mustPass.map(({x,y})=>id(x,y));
const cross=id(raw.mustCross[0].x,raw.mustCross[0].y);
const keysPort=[...level.portalMap.keys()].sort((a,b)=>a-b);
assert(keysPort.length===6,'expected three two-way portals');
const portalIdx=new Map(keysPort.map((k,i)=>[k,i]));
const gridW=level.grid.w;
const adj=(key,prep)=>{
 const x=key&65535,y=(key>>>16)&65535,off=(y*gridW+x)*4;
 const moves=[];
 for(let d=0;d<4;d++){
  const encoded=prep.staticNeighborKeys[off+d];
  if(!encoded)continue;
  const next=encoded-1;
  const axis=((next>>>16)&65535)===y?1:2;
  moves.push([next,axis]);
 }
 return moves;
};
// Binary min-heap, deterministic on equal-cost tie-breaking.
function push(heap,item){
 let i=heap.length;heap.push(item);
 for(;i>0;){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}
 heap[i]=item;
}
function pop(heap){
 const first=heap[0],last=heap.pop();
 if(heap.length){
  let i=0;
  for(;;){
   const a=i*2+1;if(a>=heap.length)break;
   const b=a+1,k=b<heap.length&&heap[b][0]<heap[a][0]?b:a;
   if(last[0]<=heap[k][0])break;
   heap[i]=heap[k];i=k;
  }
  heap[i]=last;
 }
 return first;
}
const recordKey=a=>a.join(',');
const maxAbstractStates=350000;
function initialAbstractNode(state){
 const final=state.path.at(-1),lastPortal=state.lastWasPortalJump,prev=state.path.at(-2);
 const incoming=prev===undefined||lastPortal?0:
  (((prev>>>16)&65535)===((final>>>16)&65535)?1:2);
 let portalMask=0;
 for(const p of keysPort)if(state.visited[p]>0)portalMask|=(1<<portalIdx.get(p));
 return [final,incoming,lastPortal?1:0,state.mpVisitedMask,
  state.edgeUsage[cross]&3,state.flipperUsedMask,portalMask];
}
/**
 * Every canonical continuation step has an abstract successor here.
 * The ONLY mutable resources kept are MP, MC entry axes, portal and flipper masks.
 * New future edge-axis uses at ordinary cells, visits, and total intersection
 * limits are purposefully omitted (relaxed), never guessed from oracle labels.
 */
function abstractSuccessors(node,originalState,prep){
 const [pos,entryAxis,arrivedPortal,mpMask,mcAxes,flipperUsed,usedPortals]=node;
 if(pos===level.goalKey)return [];
 const portal=level.portalMap.get(pos);
 if(portal&&!arrivedPortal){
  assert(portalIdx.has(pos)&&portalIdx.has(portal.dest),'portal map inconsistency');
  const mask=usedPortals|(1<<portalIdx.get(pos))|(1<<portalIdx.get(portal.dest));
  return [[[portal.dest,0,1,mpMask,mcAxes,flipperUsed,mask],0]];
 }
 const successors=[];
 for(const [next,axis] of adj(pos,prep)){
  // Once an axis is consumed on the original prefix it is never available again.
  if(originalState.edgeUsage[next]&axis)continue;
  if(entryAxis&&axis!==entryAxis&&(originalState.edgeUsage[pos]&axis))continue;
  // The first crossing must exit on its entry axis to keep the other axis free.
  if(pos===cross&&(mcAxes===1||mcAxes===2)&&axis!==entryAxis)continue;
  if(level.flippingFilterMap.has(pos)&&entryAxis&&axis!==entryAxis)continue;
  const fi=prep.flipperIndexMap[next]-1;
  let nextFlip=flipperUsed;
  if(fi>=0){
   if(flipperUsed&(1<<fi))continue;
   const original=prep.flipperInitAxes[fi];
   const currently=(popcount(flipperUsed)&1)?3-original:original;
   if(axis!==currently)continue;
   nextFlip|=1<<fi;
  }
  if(portalIdx.has(next)&&(usedPortals&(1<<portalIdx.get(next))))continue;
  let nextMP=mpMask;
  const oi=obligations.indexOf(next);
  if(oi!==-1)nextMP|=1<<oi;
  if(next===cross&&(mcAxes&axis))continue;
  const nextMC=next===cross?mcAxes|axis:mcAxes;
  successors.push([[next,axis,0,nextMP,nextMC,nextFlip,usedPortals],1]);
 }
 return successors;
}
function completeAbstract(node){
 return node[0]===level.goalKey&&node[3]===3&&node[4]===3;
}
function witnessIncluded(row,originalState,prep,remaining){
 const witness=row.emittedPath;
 assert(Array.isArray(witness)&&row.refereeValid===true,'missing accepted source LIVE witness');
 const keys=witness.map(([x,y])=>id(x,y));
 const prefix=originalState.path;
 assert(keys.length>prefix.length,'LIVE witness has no continuation');
 assert(prefix.every((p,i)=>p===keys[i]),'LIVE emitted path does not extend chosen prefix');
 const referee=solver.validateCandidatePath(level,witness);
 assert(referee.ok===true,'source LIVE witness failed current referee');
 let node=initialAbstractNode(originalState),cost=0;
 for(const next of keys.slice(prefix.length)){
  const candidates=abstractSuccessors(node,originalState,prep).filter(([candidate])=>candidate[0]===next);
  assert(candidates.length===1,'accepted source LIVE suffix has no unique abstract successor');
  [node]=candidates[0];cost+=candidates[0][1];
 }
 assert(completeAbstract(node),'accepted LIVE witness fails abstract final obligations');
 assert(cost===remaining,'LIVE witness has incorrect remaining real counted length');
 return {refereeValid:true,abstractTransitionComplete:true,
  witnessRemainingLength:cost,witnessSuffixTransitions:keys.length-prefix.length};
}
function lowerBound(state,prep,remaining){
 const seed=initialAbstractNode(state),heap=[],dist=new Map([[recordKey(seed),0]]);
 push(heap,[0,seed]);let transitions=0;
 const relax=(node,cost)=>{
  if(cost>remaining+6)return;
  const skey=recordKey(node),prior=dist.get(skey);
  if(prior===undefined||cost<prior){
   dist.set(skey,cost);push(heap,[cost,node]);
  }
 };
 while(heap.length){
  const [cost,node]=pop(heap);
  if(cost!==dist.get(recordKey(node)))continue;
  if(cost>remaining+6)break;
  if(completeAbstract(node))
   return {minimumRequiredLength:cost,abstractStates:dist.size,transitions,capHit:false,
    comparedRemainingLength:remaining,possibleAtBudget:cost<=remaining};
  for(const [next,stepCost] of abstractSuccessors(node,state,prep)){
   relax(next,cost+stepCost);transitions++;
  }
  if(dist.size>maxAbstractStates)
   return {minimumRequiredLength:null,abstractStates:dist.size,transitions,
    capHit:true,comparedRemainingLength:remaining,possibleAtBudget:null};
 }
 // If no terminal found even after searching beyond remaining length,
 // every legal completion is longer than the allowed budget or absent.
 return {minimumRequiredLength:remaining+7,abstractStates:dist.size,transitions,
  capHit:false,comparedRemainingLength:remaining,possibleAtBudget:false,
  lowerBoundIsThreshold:true};
}
const results=[];
for(const row of cases){
 const prep=api.prepLevel(level);
 const keys=row.prefix.map(([x,y])=>id(x,y));
 const state=api.createState(keys[0],level,prep);
 for(let i=1;i<keys.length;i++){
  const from=state.path.at(-1),next=keys[i];
  assert(api.getNeighbors(from,state,level,prep).includes(next),'source prefix not canonically legal');
  const isPortalJump=level.portalMap.get(from)?.dest===next;
  api.applyMove(next,state,level,prep,isPortalJump);
 }
 // This narrow first version tests exactly the source cohort with no past
 // crossings, MP, flipper, or portals. The generic DP carries those bits,
 // but its soundness has not been checked on a larger input family.
 assert(state.mustCrossMask===1&&state.mpVisitedMask===0
   &&state.flipperUsedMask===0&&state.portalJumps===0,'unexpected P00137 prefix resource history');
 const remaining=level.requiredLength-api.getRealLengthFromState(state);
 const observed=lowerBound(state,prep,remaining);
 const witnessAudit=row.referenceLabel==='live'
  ?witnessIncluded(row,state,prep,remaining):null;
 results.push({caseId:row.caseId,referenceLabel:row.referenceLabel,depth:row.depth,
   remainingLength:remaining,...observed,witnessAudit});
 console.log('PG-J COUPLED ROUTE '+JSON.stringify(results.at(-1)));
}
const unsafe=results.filter(r=>r.referenceLabel==='live'&&(r.possibleAtBudget===false||r.capHit));
const newlyDiscriminated=results.filter(r=>r.referenceLabel==='dead'&&!r.capHit&&r.possibleAtBudget===false);
const report={
 schema:'pathfinder.pg-j-coupled-obligation-route/v1',sourceHead:process.env.GITHUB_SHA??null,
 evidenceRole:'selected-retrospective-cheap-semantic-falsifier',
 population:'all four exact P00137 prefixes from source oracle tables, one dependent parent',
 sourceFiles,levelFile:corpusPath,levelSha256:sourceHash(buf),
 abstraction:'joint MP+two-axis-MC terminal, immutable consumed axes, forced 0-length portal jumps and future portal single-use, first-MC-visit axis lock, global flipping-filter orientation order; forgets future edge-axis use except MC, other future cell revisits and intersection ceilings',
 assertScope:'A sound necessary infeasibility signal only if ALL canonical source continuations are represented; four-case witness validation does not independently prove that claim',
 summary:{cases:4,liveWitnesses:2,deadOracle:2,liveFalseNegatives:unsafe.length,
  deadDistinguished:newlyDiscriminated.length,maxAbstractStates:maxAbstractStates,
  noSourceAlarms:true},rows:results,
 decision:'Read-only preliminary logic gate. Even positive exact-DEAD separation does NOT earn a production prune or new cold solve without independent soundness, economical real-search participation and referrer checks.',
};
const target=path.resolve(out);mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log('PG-J COUPLED ROUTE VERDICT '+JSON.stringify(report.summary));
assert(!unsafe.length,'Known source LIVE witness excluded or capped');
assert(results.every(x=>!x.capHit),'Abstraction cardinality cap reached');
