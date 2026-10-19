#!/usr/bin/env node
/**
 * PG-J research-only terminal-metric relaxation. No production prune/routing.
 * Exact P00137 source-prefix replay, full live witness soundness projection and
 * two historically exact-DEAD labels are the ONLY initial test cohort.
 * Run: node scripts/run-bundled.mjs scripts/stress/pg-j-metric-terminal-route.mjs -- --out=tmp/pg-j-metric.json
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const args=process.argv.slice(2),out=args.find(s=>s.startsWith('--out='))?.slice(6);
const assert=(c,s)=>{if(!c)throw Error(s);};
const encode=(p,a,j,u)=>(p*3+a)*4+(j?2:0)+(u?1:0);
const decode=k=>{
 const low=k%4,high=Math.floor(k/4);
 return [Math.floor(high/3),high%3,!!(low&2),!!(low&1)];
};
function heapPush(h,v){
 let i=h.length;h.push(v);
 while(i>0){const p=(i-1)>>1;if(h[p][0]<=v[0])break;h[i]=h[p];i=p;}h[i]=v;
}
function heapPop(h){
 const res=h[0],last=h.pop();if(h.length){
 let i=0;while(i*2+1<h.length){
  const a=i*2+1,b=a+1,k=b<h.length&&h[b][0]<h[a][0]?b:a;
  if(last[0]<=h[k][0])break;h[i]=h[k];i=k;
 }h[i]=last;}return res;
}
if(args.includes('--self-test')){
 for(const p of [0,1,65537,983050])for(const a of [0,1,2])
 for(const j of [false,true])for(const u of [false,true])
  assert(JSON.stringify(decode(encode(p,a,j,u)))===JSON.stringify([p,a,j,u]),'roundtrip');
 const h=[];for(const k of [5,2,9,1,1])heapPush(h,[k,k]);
 assert([1,1,2,5,9].every(k=>heapPop(h)[0]===k),'heap ordering');
 console.log('PG-J terminal metric self-test passed');process.exit(0);
}
assert(out,'--out=<file> required');
const files=[
 'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
 'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
 'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json'
];
const hash=s=>createHash('sha256').update(s).digest('hex');
const rows=[],sourceFiles=[];
for(const file of files){
 const buf=readFileSync(file),doc=JSON.parse(buf);
 assert(doc.summary?.correctnessAlarms===0&&doc.summary?.inputAlarms===0,'source alarm '+file);
 sourceFiles.push({path:file,sha256:hash(buf)});
 for(const r of doc.rows??[])if(r.levelId==='P00137')rows.push(r);
}
const unique=new Map();
for(const r of rows){
 const id=JSON.stringify(r.prefix),prior=unique.get(id);
 assert(!prior||prior.referenceLabel===r.referenceLabel,'contradictory source fate');
 if(!prior)unique.set(id,r);
}
const cases=[...unique.values()].sort((a,b)=>a.caseId.localeCompare(b.caseId));
assert(cases.length===4&&cases.filter(x=>x.referenceLabel==='live').length===2
 &&cases.filter(x=>x.referenceLabel==='dead').length===2,'frozen exact source changed');
const corpus='data/levels.json',corpusBuf=readFileSync(corpus);
const raw=JSON.parse(corpusBuf).find(x=>x.id==='P00137');
assert(raw&&raw.mustPass?.length===2&&raw.mustCross?.length===1
 &&raw.portals?.length===3,'original source topology identity changed');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const solver=createSolver(),level=solver.prepareLevelForSolver(raw,{source:'raw'});
const PACK=(x,y)=>api.PACK(x-1,y-1);
const mustPass=raw.mustPass.map(x=>PACK(x.x,x.y));
const mc=PACK(raw.mustCross[0].x,raw.mustCross[0].y);
const isH=(a,b)=>((a>>>16)&65535)===((b>>>16)&65535);
const manhattan=(a,b)=>Math.abs((a&65535)-(b&65535))+
 Math.abs(((a>>>16)&65535)-((b>>>16)&65535));
function choosePair(mp,prepState){
 const unsatisfied=mp.filter((k,i)=>(prepState.mpVisitedMask&(1<<i))===0);
 const pairs=raw.portals.map(p=>[PACK(p.x1,p.y1),PACK(p.x2,p.y2)].sort((a,b)=>a-b))
  .map(pair=>({pair,dist:Math.min(...pair.flatMap(k=>unsatisfied.map(q=>manhattan(k,q))))}));
 pairs.sort((a,b)=>a.dist-b.dist||a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]);
 assert(!!pairs[0],'no pair');
 return pairs[0].pair;
}
function neighbors(encoded,sourceState,prep,tracked){
 const [pos,entry,jumped,usedPair]=decode(encoded),portal=level.portalMap.get(pos);
 if(pos===level.goalKey)return [];
 if(portal&&!jumped){
  const pairUsed=usedPair||tracked.has(pos)||tracked.has(portal.dest);
  return [[encode(portal.dest,0,true,pairUsed),0]];
 }
 const out=[];
 const x=pos&65535,y=(pos>>>16)&65535,base=(y*level.grid.w+x)*4;
 for(let d=0;d<4;d++){
  const nk=prep.staticNeighborKeys[base+d];if(!nk)continue;
  const target=nk-1,axis=isH(pos,target)?1:2;
  // Previously consumed axis never recovers, regardless of future path.
  if(sourceState.edgeUsage[target]&axis)continue;
  if(entry&&entry!==axis&&(sourceState.edgeUsage[pos]&axis))continue;
  // Canonical must-cross first visit must leave straight; after the other
  // axis is consumed, turning is also forbidden by actual edgeUsage[pos].
  // This condition holds for all legal MC exits, not only first crossings.
  if(pos===mc&&entry&&entry!==axis)continue;
  // This single portal pair is tracked end-to-end between mandatory visits.
  if(usedPair&&tracked.has(target))continue;
  out.push([encode(target,axis,false,usedPair||tracked.has(target)),1]);
 }
 return out;
}
function dijkstra(seed,sourceState,prep,tracked){
 const distances=new Map([[seed,0]]),heap=[[0,seed]];
 let popped=0,edges=0;
 while(heap.length){
  const [cost,node]=heapPop(heap);
  if(cost!==distances.get(node))continue;
  popped++;
  if(popped>5000)return {distances:null,popped,edges,capHit:true};
  for(const [target,weight] of neighbors(node,sourceState,prep,tracked)){
   edges++;
   const next=cost+weight;
   if(next<(distances.get(target)??Infinity)){
    distances.set(target,next);heapPush(heap,[next,target]);
   }
  }
 }
 return {distances,popped,edges,capHit:false};
}
function metricBound(state,prep,tracked){
 // Initial P00137 cohort has two not-yet-visited MP and one unvisited MC.
 // The four *mandatory visit types* are MP0, MP1, MC-H and MC-V.
 // MP0/MP1 permit either arriving axis, MC types require one arrival of
 // each orientation. Cross state is deliberately forgotten BETWEEN trips.
 const pos=state.path.at(-1),prev=state.path.at(-2);
 const entry=state.lastWasPortalJump||prev===undefined?0:(isH(pos,prev)?1:2);
 const initialUsed=([...tracked].some(k=>state.visited[k]>0));
 const source=encode(pos,entry,!!state.lastWasPortalJump,initialUsed);
 const terminal=[
  [mustPass[0],1,0],[mustPass[0],2,0],
  [mustPass[1],1,1],[mustPass[1],2,1],
  [mc,1,2],[mc,2,3]
 ];
 const seeds=[source,...terminal.flatMap(([k,axis])=>[
  encode(k,axis,false,false),encode(k,axis,false,true)])];
 const D=seeds.map(seed=>dijkstra(seed,state,prep,tracked));
 const popped=D.reduce((n,r)=>n+r.popped,0),edges=D.reduce((n,r)=>n+r.edges,0);
 if(D.some(x=>x.capHit))return {minimumLength:null,abstain:'fuel',popped,edges,terminalStates:null};
 const goal=level.goalKey;
 const boundEnd=(dist)=>{
  let best=Infinity;
  for(const [key,cost] of dist){
   const [p]=decode(key);if(p===goal&&cost<best)best=cost;
  }
  return best;
 };
 const seedIndex=(end,used)=>1+2*(end-1)+(used?1:0);
 const dp=new Map([['0,0,0',0]]);
 let dpStates=0;
 for(let mask=0;mask<16;mask++)for(let end=0;end<=6;end++)
 for(const used of [false,true]){
  const prev=dp.get(`${mask},${end},${Number(used)}`);
  if(prev===undefined)continue;
  dpStates++;
  const dist=D[end===0?0:seedIndex(end,used)].distances;
  for(let k=0;k<terminal.length;k++){
   const [cell,axis,group]=terminal[k];if(mask&(1<<group))continue;
   for(const newUsed of [false,true]){
    const target=encode(cell,axis,false,newUsed),increment=dist.get(target);
    if(increment===undefined)continue;
    const nextMask=mask|(1<<group),code=`${nextMask},${k+1},${Number(newUsed)}`;
    const next=prev+increment;
    if(next<(dp.get(code)??Infinity))dp.set(code,next);
   }
  }
 }
 let min=Infinity;
 for(let end=1;end<=6;end++)for(const used of [false,true]){
  const pre=dp.get(`15,${end},${Number(used)}`);
  if(pre===undefined)continue;
  const rem=boundEnd(D[seedIndex(end,used)].distances);
  min=Math.min(min,pre+rem);
 }
 return {minimumLength:Number.isFinite(min)?min:null,unreachable:!Number.isFinite(min),
  abstain:null,popped,edges,terminalStates:dpStates,selectedPair:[...tracked].sort((a,b)=>a-b)};
}
function witnessAudit(row,state,prep,tracked){
 const witness=row.emittedPath;
 assert(row.refereeValid===true&&witness,'source LIVE witness missing');
 assert(solver.validateCandidatePath(level,witness).ok,'LIVE candidate no longer referee accepted');
 const k=witness.map(([x,y])=>PACK(x,y));
 assert(state.path.every((q,i)=>k[i]===q),'source path not an extension');
 const start=state.path.at(-1),prev=state.path.at(-2);
 const entry=state.lastWasPortalJump?0:(isH(start,prev)?1:2);
 let cursor=encode(start,entry,!!state.lastWasPortalJump,
  [...tracked].some(p=>state.visited[p]>0));
 let cost=0;
 for(const target of k.slice(state.path.length)){
  const next=neighbors(cursor,state,prep,tracked).filter(([t])=>decode(t)[0]===target);
  assert(next.length===1,'actual referee LIVE suffix excluded by metric graph');
  cursor=next[0][0];cost+=next[0][1];
 }
 const counted=level.requiredLength-api.getRealLengthFromState(state);
 assert(cost===counted,'LIVE suffix counted length mismatch');
 return {stepwiseIncluded:true,countedMoves:cost,suffixMoves:k.length-state.path.length};
}
const results=[];
for(const row of cases){
 const prep=api.prepLevel(level),keys=row.prefix.map(([x,y])=>PACK(x,y));
 const state=api.createState(keys[0],level,prep);
 for(const next of keys.slice(1)){
  const from=state.path.at(-1),options=api.getNeighbors(from,state,level,prep);
  assert(options.includes(next),'source prefix not canonical move legal');
  const jump=!!(!state.lastWasPortalJump&&level.portalMap.get(from)?.dest===next);
  api.applyMove(next,state,level,prep,jump);
 }
 assert(state.mpVisitedMask===0&&state.crossCounts[0]===0&&state.flipperUsedMask===0
 &&state.portalJumps===0,'unqualified source prefix seed');
 const tracked=new Set(choosePair(mustPass,state));
 const result=metricBound(state,prep,tracked);
 const remaining=level.requiredLength-api.getRealLengthFromState(state);
 const witness=row.referenceLabel==='live'?witnessAudit(row,state,prep,tracked):null;
 results.push({caseId:row.caseId,label:row.referenceLabel,depth:row.depth,
  remaining,countedExclusion:result.minimumLength!==null&&result.minimumLength>remaining,
  ...result,witness});
 console.log('PG-J METRIC ROUTE '+JSON.stringify(results.at(-1)));
}
const summary={cases:4,exactLive:2,exactDead:2,liveFalseExclusion:results.filter(x=>x.label==='live'&&x.countedExclusion).length,
 deadExcluded:results.filter(x=>x.label==='dead'&&x.countedExclusion).length,
 witnesses:results.filter(x=>x.witness?.stepwiseIncluded).length,abstentions:results.filter(x=>x.abstain).length,
 totalDijkstraPops:results.reduce((n,x)=>n+x.popped,0),
 totalDijkstraEdges:results.reduce((n,x)=>n+x.edges,0)};
const result={schema:'pathfinder.pg-j-metric-terminal-route/v1',
 evidenceRole:'source-selected retrospective semantic/cost falsifier',sourceCommit:process.env.GITHUB_SHA??null,
 sourceFiles,corpus,corpusSha256:hash(corpusBuf),
 selection:'All four previously CP-SAT-labelled P00137 prefixes, two dependent depth-pairs on one human board; hindsight used to nominate question, never to guide route DP.',
 premise:'Minimum of shortest relaxed concatenated trips visiting two mandatory MP positions and MC in both entrance axes, accounting for one chosen portal pair used across all trips and immutable prefix consumed axes. Inter-segment future occupancy and nonselected portals deliberately forgotten; immutable MC straight-exit follows native first-cross lock and the fully consumed two-axis turn ban.',
 limitations:'Separate Dijkstra search costs are only abstract operations, not canonical primitive work; no fixed-work A/B, independent transfer, automatic solver prune, or new cold solve.',
 summary,rows:results};
const dest=path.resolve(out);mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log('PG-J METRIC ROUTE VERDICT '+JSON.stringify(summary));
assert(summary.liveFalseExclusion===0&&summary.witnesses===2&&summary.abstentions===0,
 'metric necessary-bound soundness qualification failed');
