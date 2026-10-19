#!/usr/bin/env node
/**
 * PG-J: original-artifact-only Corpus2 terminal-metric subset transfer.
 * Read-only. Does not rerun search, pass hints, or use result labels.
 * node scripts/run-bundled.mjs scripts/stress/pg-j-metric-frozen-corpus2-transfer.mjs -- \
 *   --source=tmp/source/opportunity.json --out=tmp/metric.json
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const FREEZE='reports/stress/pg-j-coupled-obligation-transfer-12-parent-20261018.json';
const ARTIFACT_SHA='11c3415fbf45b2ed87565414520b811f348419337680983be1a770a0e4928918';
const PREVIOUS_EXECUTION='ca05b01f6af7870833d7afefc9ba2f8039641df1';
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const arg=k=>process.argv.find(s=>s.startsWith('--'+k+'='))?.slice(k.length+3);
const hash=x=>createHash('sha256').update(x).digest('hex');
const encode=(p,a,j,u)=>(p*3+a)*4+(j?2:0)+(u?1:0);
const decode=k=>{const low=k%4,high=Math.floor(k/4);return [Math.floor(high/3),high%3,!!(low&2),!!(low&1)];};
function push(h,x){let i=h.length;h.push(x);while(i>0){const p=(i-1)>>1;if(h[p][0]<=x[0])break;h[i]=h[p];i=p;}h[i]=x;}
function pop(h){const first=h[0],last=h.pop();if(h.length){let i=0;while(i*2+1<h.length){const a=i*2+1,b=a+1,k=b<h.length&&h[b][0]<h[a][0]?b:a;if(last[0]<=h[k][0])break;h[i]=h[k];i=k;}h[i]=last;}return first;}
const manhattan=(a,b)=>Math.abs((a&65535)-(b&65535))+Math.abs(((a>>>16)&65535)-((b>>>16)&65535));
const horizontal=(a,b)=>((a>>>16)&65535)===((b>>>16)&65535);
if(process.argv.includes('--self-test')){
 for(const k of [0,1,65537,917505])for(let a=0;a<3;a++)
 for(const j of [false,true])for(const u of [false,true])
  assert(JSON.stringify(decode(encode(k,a,j,u)))===JSON.stringify([k,a,j,u]),'state encoding');
 const heap=[];[4,6,1,2,2].forEach(n=>push(heap,[n,n]));
 assert([1,2,2,4,6].every(x=>pop(heap)[0]===x),'heap ordering');
 console.log('PG-J frozen transfer self-test passed');process.exit(0);
}
assert(arg('source')&&arg('out'),'--source and --out required');
const corpusBuf=readFileSync(CORPUS);
const freeze=JSON.parse(readFileSync(FREEZE,'utf8'));
assert(hash(corpusBuf)===freeze.sourceSha256&&freeze.rows.length===12
 &&freeze.frozenBeforeAnyNewPGJTransferProbe,'frozen source contract changed');
const inputBuf=readFileSync(arg('source'));
assert(hash(inputBuf)===ARTIFACT_SHA,'read-only original Actions artifact member checksum changed');
const old=JSON.parse(inputBuf);
assert(old.sourceHead===PREVIOUS_EXECUTION&&old.rows.length===12
 &&old.corpusSha256===freeze.sourceSha256
 &&old.summary.sampledPrefixes===297&&old.summary.eligiblePrefixes===287,
 'prior source execution, census or sample contract differs');
const corpusDoc=JSON.parse(corpusBuf),corpus=Array.isArray(corpusDoc)?corpusDoc:corpusDoc.levels;
assert(corpus?.length===freeze.sourceRecords,'frozen source size changed');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const solver=createSolver();
function chosenResources(raw,level,state){
 const end=state.path.at(-1);
 if(end===level.goalKey)return {abstain:'at-goal'};
 const MPs=level.mustPassKeys.filter((k,i)=>(state.mpVisitedMask&(1<<i))===0)
  .sort((a,b)=>manhattan(end,a)-manhattan(end,b)||a-b);
 if(MPs.length<2)return {abstain:'fewer-than-two-outstanding-MP'};
 const MCs=level.mustCrossKeys.filter((k,i)=>state.crossCounts[i]===0
  &&(state.mustCrossMask&(1<<i))!==0)
  .sort((a,b)=>manhattan(end,a)-manhattan(end,b)||a-b);
 if(!MCs.length)return {abstain:'no-zero-visit-MC'};
 const pairs=(raw.portals??[]).map(p=>[api.PACK(p.x1-1,p.y1-1),api.PACK(p.x2-1,p.y2-1)].sort((a,b)=>a-b))
  .filter(([a,b])=>state.visited[a]===0&&state.visited[b]===0)
  .map(pair=>({pair,d:Math.min(...pair.flatMap(p=>MPs.slice(0,2).map(mp=>manhattan(p,mp))))}))
  .sort((a,b)=>a.d-b.d||a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]);
 if(!pairs.length)return {abstain:'no-unused-portal-pair'};
 return {mp:MPs.slice(0,2),mc:MCs[0],pair:pairs[0].pair,abstain:null};
}
function terminalMetric(level,prep,state,mp,mc,pair){
 const tracked=new Set(pair);
 const successors=k=>{
  const [pos,entry,jumped,usedPair]=decode(k);
  if(pos===level.goalKey)return [];
  const portal=level.portalMap.get(pos);
  if(portal&&!jumped)return [[encode(portal.dest,0,true,usedPair||tracked.has(pos)||tracked.has(portal.dest)),0]];
  const out=[],x=pos&65535,y=(pos>>>16)&65535;
  const base=(y*level.grid.w+x)*4;
  for(let d=0;d<4;d++){
   const biased=prep.staticNeighborKeys[base+d];
   if(!biased)continue;
   const target=biased-1,axis=horizontal(pos,target)?1:2;
   if(state.edgeUsage[target]&axis)continue;
   if(entry&&entry!==axis&&(state.edgeUsage[pos]&axis))continue;
   if(pos===mc&&entry&&entry!==axis)continue;
   if(usedPair&&tracked.has(target))continue;
   out.push([encode(target,axis,false,usedPair||tracked.has(target)),1]);
  }
  return out;
 };
 const dijkstra=seed=>{
  const d=new Map([[seed,0]]),h=[[0,seed]];
  let popped=0,arcs=0;
  while(h.length){
   const [cost,node]=pop(h);
   if(cost!==d.get(node))continue;
   popped++;
   if(popped>5000)return {distances:null,popped,arcs,abstain:'fuel'};
   for(const [target,increment] of successors(node)){
    arcs++;
    const next=cost+increment;
    if(next<(d.get(target)??Infinity)){d.set(target,next);push(h,[next,target]);}
   }
  }
  return {distances:d,popped,arcs,abstain:null};
 };
 const endpoint=state.path.at(-1),prev=state.path.at(-2);
 const entry=state.lastWasPortalJump||prev===undefined?0:(horizontal(endpoint,prev)?1:2);
 const start=encode(endpoint,entry,!!state.lastWasPortalJump,
  pair.some(k=>state.visited[k]>0));
 const term=[[mp[0],1,0],[mp[0],2,0],[mp[1],1,1],[mp[1],2,1],[mc,1,2],[mc,2,3]];
 const seeds=[start,...term.flatMap(([p,ax])=>[encode(p,ax,false,false),encode(p,ax,false,true)])];
 const D=seeds.map(dijkstra);
 const popped=D.reduce((a,b)=>a+b.popped,0),arcs=D.reduce((a,b)=>a+b.arcs,0);
 if(D.some(r=>r.abstain))return {min:null,popped,arcs,dpStates:0,abstain:'fuel'};
 const idx=(end,used)=>1+2*(end-1)+(used?1:0);
 const dp=new Map([['0,0,0',0]]);
 let states=0;
 for(let m=0;m<16;m++)for(let end=0;end<=6;end++)
 for(const used of [false,true]){
  const oldCost=dp.get(m+','+end+','+Number(used));
  if(oldCost===undefined)continue;states++;
  const distances=D[end===0?0:idx(end,used)].distances;
  for(let k=0;k<term.length;k++){
   const [p,ax,g]=term[k];
   if(m&(1<<g))continue;
   for(const newUsed of [false,true]){
    const cost=distances.get(encode(p,ax,false,newUsed));
    if(cost===undefined)continue;
    const mask=m|(1<<g),key=mask+','+(k+1)+','+Number(newUsed);
    const sum=oldCost+cost;
    if(sum<(dp.get(key)??Infinity))dp.set(key,sum);
   }
  }
 }
 let best=Infinity;
 for(let end=1;end<=6;end++)for(const used of [false,true]){
  const oldCost=dp.get('15,'+end+','+Number(used));
  if(oldCost===undefined)continue;
  let goalDist=Infinity;
  for(const [token,cost] of D[idx(end,used)].distances){
   if(decode(token)[0]===level.goalKey&&cost<goalDist)goalDist=cost;
  }
  best=Math.min(best,oldCost+goalDist);
 }
 return {min:Number.isFinite(best)?best:null,unreachable:!Number.isFinite(best),
  popped,arcs,dpStates:states,abstain:null};
}
const results=[];
for(let i=0;i<freeze.rows.length;i++){
 const item=freeze.rows[i],previous=old.rows[i];
 assert(previous.parentId===item.parentId&&item.corpusPosition>0,'frozen source order changed');
 const raw=corpus[item.corpusPosition-1];
 assert(raw?.id===item.parentId,'corpus lookup drift');
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_provenance,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'}),prep=api.prepLevel(level);
 const checkpoints=previous.checkpoints;
 assert(Array.isArray(checkpoints)&&checkpoints.length>0,'parent has no frozen frontier');
 const last=checkpoints.reduce((a,b)=>b.phase>a.phase?b:a,checkpoints[0]);
 const ranks=[...new Set([0,Math.floor((last.frontierSize-1)/2)])];
 const candidates=ranks.map(rank=>{
  const sourceSample=last.sampled.find(x=>x.scoreRank===rank);
  assert(!!sourceSample&&Array.isArray(sourceSample.path),'missing frozen score rank '+rank);
  const keys=sourceSample.path;
  const ws=api.createState(keys[0],level,prep);
  const before=prep._workMeter.units;
  for(const next of keys.slice(1)){
   const from=ws.path.at(-1);
   const options=api.getNeighbors(from,ws,level,prep);
   assert(options.includes(next),'original beam prefix not canonically replay-legal');
   const jump=!!(!ws.lastWasPortalJump&&level.portalMap.get(from)?.dest===next);
   api.applyMove(next,ws,level,prep,jump);
  }
  const resource=chosenResources(raw,level,ws);
  const remaining=level.requiredLength-api.getRealLengthFromState(ws);
  const base={scoreRank:rank,phase:last.phase,remaining,depth:keys.length-1,
    sourcePath:keys,canonicalReplayWork:prep._workMeter.units-before,
    outstandingMP:sourceSample.outstandingMP,pendingMC:sourceSample.pendingMC,
    unconsumedPairs:sourceSample.unconsumedPairs};
  if(resource.abstain)return {...base,abstain:resource.abstain};
  const metric=terminalMetric(level,prep,ws,resource.mp,resource.mc,resource.pair);
  const candidateExcluded=!metric.abstain&&(metric.unreachable===true||
    (metric.min!==null&&metric.min>remaining));
  return {...base,selected:{mp:resource.mp,mc:resource.mc,pair:resource.pair},
   ...metric,candidateExcluded};
 });
 const observed={parentId:item.parentId,phase:last.phase,frontierSize:last.frontierSize,
  beamSourceWork:previous.workSpent,candidates,
  candidateExcludedCount:candidates.filter(x=>x.candidateExcluded).length,
  nominalEligibleCount:candidates.filter(x=>!x.abstain).length};
 results.push(observed);
 console.log('PG-J TRANSFER '+JSON.stringify({id:item.parentId,phase:last.phase,
  nominated:observed.candidateExcludedCount,eligible:observed.nominalEligibleCount,
  metrics:candidates.map(x=>({rank:x.scoreRank,remaining:x.remaining,
    min:x.min??null,popped:x.popped??0,abstain:x.abstain??null}))}));
}
const summary={independentParents:results.length,
 selectedPrefixCells:results.reduce((n,r)=>n+r.candidates.length,0),
 metricParticipatingCells:results.reduce((n,r)=>n+r.nominalEligibleCount,0),
 candidateExcludedCells:results.reduce((n,r)=>n+r.candidateExcludedCount,0),
 independentParentsWithExcludedCandidate:results.filter(x=>x.candidateExcludedCount>0).length,
 sourceNativeReplayAlarms:0,
 abstractPops:results.reduce((n,r)=>n+r.candidates.reduce((a,b)=>a+(b.popped??0),0),0),
 abstractArcs:results.reduce((n,r)=>n+r.candidates.reduce((a,b)=>a+(b.arcs??0),0),0),
 outcomeGateMet:results.filter(x=>x.candidateExcludedCount>0).length>=2,
 coldSolves:0};
const report={schema:'pathfinder.pg-j-original-artifact-terminal-metric-transfer/v1',
 evidenceRole:'post-selected same-twelve-parent native-frontier read-only metric opportunity',
 sourceHead:process.env.GITHUB_SHA??null,corpusFile:CORPUS,corpusSha256:hash(corpusBuf),
 sourceArtifactFile:arg('source'),sourceArtifactSha256:hash(inputBuf),sourceArtifactRun:39197248687,
 sourceArtifactId:12162297866,sourceArtifactExecution:PREVIOUS_EXECUTION,
 sampleRule:'last available phase per source parent, score rank 0 and floor((frontierSize-1)/2), fixed before metric observation',
 selector:'Manhattan two nearest outstanding normalized MP and one nearest zero-visit MC, nearest fully unvisited portal pair to either MP; ties by packed ID',
 qualityGate:'At least two distinct source parents with candidate necessary exclusions; even a positive is not a new referee-exact DEAD label or cold solve.',
 originalSourceWorkCurrency:'Original phase-complete beam cumulative meter only, not paired with metric cost',
 metricUnits:'Dijkstra popped states/arcs and terminal DP cells are not native canonical work',
 summary,rows:results};
const dest=path.resolve(arg('out'));
mkdirSync(path.dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log('PG-J TRANSFER VERDICT '+JSON.stringify(summary));
assert(summary.independentParents===12&&summary.selectedPrefixCells>=12,
 'frozen transfer population incomplete');
