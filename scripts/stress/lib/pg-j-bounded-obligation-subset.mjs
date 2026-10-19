/**
 * Source-native, offline-only PG-J tiny subset necessary condition.
 * Requires a normalized level, its prep and a canonical replayed state.
 * No source labels, hints, technique configs, global meters, or mutation.
 *
 * This product graph OVER-APPROXIMATES real continuations: exactly two
 * outstanding must-pass sites, one pending two-axis must-cross and one unused
 * portal pair are mandatory subset resources. All other future obligations,
 * flipper constraints, cell revisits and future ordinary edge-axis uses are
 * forgotten. A completed search of all abstract paths at <=remaining counted
 * length can issue a valid necessary rejection; fuel/timeout always abstains.
 */
const axisOf=(from,to)=>((from>>>16)&65535)===((to>>>16)&65535)?1:2;
const manhattan=(a,b)=>Math.abs((a&65535)-(b&65535))
  +Math.abs(((a>>>16)&65535)-((b>>>16)&65535));
const sortPacked=(a,b)=>a-b;
const token=node=>node.join(',');

function push(heap,item){
 let i=heap.length;heap.push(item);
 while(i>0){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}
 heap[i]=item;
}
function pop(heap){
 const first=heap[0],last=heap.pop();
 if(heap.length){
  let i=0;
  for(;;){const a=2*i+1;if(a>=heap.length)break;
   const b=a+1,k=b<heap.length&&heap[b][0]<heap[a][0]?b:a;
   if(last[0]<=heap[k][0])break;heap[i]=heap[k];i=k;
  }
  heap[i]=last;
 }
 return first;
}

export function chooseTinySubset(level,state,portalPairs){
 const outstanding=level.mustPassKeys.filter((_,i)=>(state.mpVisitedMask&(1<<i))===0).sort(sortPacked);
 const pending=level.mustCrossKeys.filter((_,i)=>(state.mustCrossMask&(1<<i))!==0).sort(sortPacked);
 const available=portalPairs
  .map(p=>[...p].sort(sortPacked))
  .filter(([a,b])=>state.visited[a]===0&&state.visited[b]===0);
 if(outstanding.length<2||pending.length<1||available.length<1)return null;
 let pair=null,largest=-1;
 for(let i=0;i<outstanding.length;i++)for(let j=i+1;j<outstanding.length;j++){
  const cand=[outstanding[i],outstanding[j]],d=manhattan(...cand);
  if(d>largest||(d===largest&&(cand[0]<pair[0]||(cand[0]===pair[0]&&cand[1]<pair[1])))){
   pair=cand;largest=d;
  }
 }
 const current=state.path.at(-1);
 const cross=[...pending].sort((a,b)=>manhattan(current,b)-manhattan(current,a)||a-b)[0];
 const portals=available.map(pairKeys=>({
   keys:pairKeys,dist:Math.min(...pairKeys.flatMap(p=>pair.map(m=>manhattan(p,m))))
 })).sort((a,b)=>a.dist-b.dist||a.keys[0]-b.keys[0]||a.keys[1]-b.keys[1]);
 const portalPair=portals[0].keys;
 return {mustPass:pair,mustCross:cross,portalPair,
   initialMustCrossAxes:state.edgeUsage[cross]&3,
   selector:'farthest two outstanding MP by Manhattan; pending MC farthest from current endpoint; unused pair nearest selected MP; packed-key tie-breaks'};
}

/** State [position,incomingAxis,arrivedViaPortal,MP2-mask,MC-axes,chosenPairUsed]. */
export function initialTinyNode(state,subset){
 const pos=state.path.at(-1),prev=state.path.at(-2);
 const incoming=prev===undefined||state.lastWasPortalJump?0:axisOf(prev,pos);
 return [pos,incoming,state.lastWasPortalJump?1:0,0,subset.initialMustCrossAxes,0];
}

export function tinySuccessors(level,prep,state,subset,node){
 const [pos,incoming,arrivedViaPortal,mp,mc,usedPair]=node;
 const portal=level.portalMap.get(pos);
 if(portal&&!arrivedViaPortal){
  const pairUsed=usedPair||(pos===subset.portalPair[0]||pos===subset.portalPair[1])?1:0;
  // Every portal entry has exactly one forced, non-counted outgoing jump.
  return [[[portal.dest,0,1,mp,mc,pairUsed],0]];
 }
 const w=prep.gridW, x=pos&65535,y=(pos>>>16)&65535,off=(y*w+x)*4;
 const out=[];
 for(let d=0;d<4;d++){
  const v=prep.staticNeighborKeys[off+d];
  if(v===0)continue;
  const to=v-1,axis=axisOf(pos,to);
  // Prefix axis bits are immutable; forgetting all NEW non-crossing axis bits
  // is a permissive relaxation, not a restriction of valid continuations.
  if(state.edgeUsage[to]&axis)continue;
  if(incoming&&axis!==incoming&&(state.edgeUsage[pos]&axis))continue;
  // Canonical MC first-visit lock; its second entry must use other axis.
  if(pos===subset.mustCross&&(mc===1||mc===2)&&axis!==incoming)continue;
  if(to===subset.mustCross&&(mc&axis))continue;
  if(usedPair&&(to===subset.portalPair[0]||to===subset.portalPair[1]))continue;
  let mpNext=mp;
  if(to===subset.mustPass[0])mpNext|=1;
  if(to===subset.mustPass[1])mpNext|=2;
  out.push([[to,axis,0,mpNext,to===subset.mustCross?mc|axis:mc,usedPair],1]);
 }
 return out;
}

export function tinyComplete(level,node){
 return node[0]===level.goalKey&&node[3]===3&&node[4]===3;
}

export function runTinyNecessaryBound({level,prep,state,portalPairs,
 maxDiscovered=6000,maxTransitions=20000}){
 const subset=chooseTinySubset(level,state,portalPairs);
 if(!subset)return {verdict:'ineligible',subset:null,discovered:0,settled:0,transitions:0};
 const spent=state.path.length-1-state.portalJumps;
 const remaining=level.requiredLength-spent;
 if(!Number.isInteger(remaining)||remaining<0)
  return {verdict:'invalid-state',subset,remaining,discovered:0,settled:0,transitions:0};
 const seed=initialTinyNode(state,subset),heap=[],dist=new Map([[token(seed),0]]);
 push(heap,[0,seed]);
 let settled=0,transitions=0;
 const abstain=(reason)=>({verdict:'unknown-fuel',reason,remaining,subset,
   discovered:dist.size,settled,transitions});
 while(heap.length){
  const [cost,node]=pop(heap);
  if(dist.get(token(node))!==cost)continue;
  if(cost>remaining)break;
  if(++settled>maxDiscovered)return abstain('settled');
  if(tinyComplete(level,node)){
   return {verdict:'possible',minimumRequiredLength:cost,remaining,subset,
     discovered:dist.size,settled,transitions};
  }
  // Deliberately allow continuation past an incomplete visit to goal:
  // over-permissive even if the game treats goal as terminal.
  for(const [to,edgeCost] of tinySuccessors(level,prep,state,subset,node)){
   if(++transitions>maxTransitions)return abstain('transitions');
   const candidate=cost+edgeCost;
   if(candidate>remaining)continue;
   const key=token(to),old=dist.get(key);
   if(old===undefined||candidate<old){
    dist.set(key,candidate);push(heap,[candidate,to]);
    if(dist.size>maxDiscovered)return abstain('discovered');
   }
  }
 }
 return {verdict:'necessary-reject',minimumRequiredLengthAtLeast:remaining+1,
   remaining,subset,discovered:dist.size,settled,transitions};
}

/** Replay any referee-accepted LIVE suffix *through the same abstraction*.
 * Never use this as a runtime/retention policy or as a stored history input. */
export function projectTinyWitness({level,prep,state,subset,acceptedPath}){
 const prefix=state.path;
 if(!prefix.every((key,i)=>acceptedPath[i]===key)||acceptedPath.length<=prefix.length)
  throw Error('accepted witness does not extend source prefix');
 let node=initialTinyNode(state,subset),cost=0;
 for(const next of acceptedPath.slice(prefix.length)){
  const options=tinySuccessors(level,prep,state,subset,node).filter(([n])=>n[0]===next);
  if(options.length!==1)throw Error('accepted LIVE suffix missing from abstract successor graph');
  [node]=options[0];cost+=options[0][1];
 }
 if(!tinyComplete(level,node))throw Error('accepted LIVE suffix fails selected MP/MC obligations');
 return {projected:true,remainingCountedCost:cost,suffixTransitions:acceptedPath.length-prefix.length};
}

export function tinySubsetSelfTest(){
 const fake={mustPassKeys:[1,10,20],mustCrossKeys:[35],goalKey:90};
 const state={path:[0],mpVisitedMask:0,mustCrossMask:1,
  edgeUsage:new Uint8Array(128),visited:new Uint8Array(128),lastWasPortalJump:false,portalJumps:0};
 const chosen=chooseTinySubset(fake,state,[[40,41],[60,61]]);
 if(!chosen||chosen.mustPass.join(',')!=='1,20'||chosen.mustCross!==35)throw Error('deterministic tiny selector self-test');
 if(tinyComplete(fake,[90,1,0,3,3,0])!==true)throw Error('terminal contract self-test');
 return true;
}
