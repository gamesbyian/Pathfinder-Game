#!/usr/bin/env node
/** PG-H bounded, read-only weak-deadness and existing-terminal overlap census.
 * Uses no stored solution, prior oracle label, or per-level identity at runtime.
 * Accepted input is an offline explicitly selected prefix set; output is
 * diagnostic only, not a production pruning policy.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';

const args=new Map(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
 const i=x.indexOf('=');return i<0?[x,null]:[x.slice(0,i),x.slice(i+1)];
}));
const key=(x,y)=>(y<<16)|x;
const rawKey=p=>key(p.x-1,p.y-1);
function portalPairs(level) {
 const out=[];
 for(const p of level.portals||[]) {
  out.push([key(p.x1-1,p.y1-1),key(p.x2-1,p.y2-1)]);
 }
 return out;
}
function countMoves(prefix,portals) {
 const edges=new Set(portals.flatMap(([a,b])=>[a+':'+b,b+':'+a]));
 let jumps=0;
 for(let i=1;i<prefix.length;i++){
  if(edges.has(prefix[i-1]+':'+prefix[i]))jumps++;
 }
 return {jumps,countedMoves:prefix.length-1-jumps};
}
function optimisticGoalDistance(src,dest,grid,portals) {
 if(src===dest)return 0;
 const portalEdges=new Map();
 for(const [a,b] of portals) {
  portalEdges.set(a,[...(portalEdges.get(a)||[]),b]);
  portalEdges.set(b,[...(portalEdges.get(b)||[]),a]);
 }
 // A deliberately optimistic supergraph: no blocks, geese, visited-axis
 // constraints, limited portal use or mandatory-order requirements. Hence its
 // distance never overestimates the remaining legal counted move length.
 const W=grid.w,H=grid.h;
 const distances=new Map([[src,0]]),queue=[src];
 // Repeated relaxations; graph has at most 225 cells and nonnegative weights.
 for(let i=0;i<queue.length;i++){
  const v=queue[i],d=distances.get(v),x=v&65535,y=v>>>16;
  const neighbors=[];
  if(x>0)neighbors.push([key(x-1,y),1]);
  if(x+1<W)neighbors.push([key(x+1,y),1]);
  if(y>0)neighbors.push([key(x,y-1),1]);
  if(y+1<H)neighbors.push([key(x,y+1),1]);
  for(const dest of portalEdges.get(v)||[])neighbors.push([dest,0]);
  for(const [to,weight] of neighbors){
   if(d+weight<(distances.get(to)??Infinity)){
    distances.set(to,d+weight);
    queue.push(to);
   }
  }
 }
 return distances.get(dest)??Infinity;
}
function diagnose(level,prefix) {
 const portals=portalPairs(level);
 const {jumps,countedMoves}=countMoves(prefix,portals);
 const remaining=level.reqLen-countedMoves;
 const last=prefix.at(-1);
 const goal=rawKey(level.goal);
 const distanceLowerBound=optimisticGoalDistance(last,goal,level.grid,portals);
 const beforeGoalTerminal=last===goal&&remaining>0;
 const needOverrun=remaining<0;
 const staticGoalBoundReject=distanceLowerBound>remaining;
 const visited=new Map();
 for(const p of prefix)visited.set(p,(visited.get(p)||0)+1);
 const pendingMustPass=(level.mustPass||[]).filter(p=>!visited.get(rawKey(p))).length;
 const pendingMustCross=(level.mustCross||[]).filter(p=>(visited.get(rawKey(p))||0)<2).length;
 return {countedMoves,portalJumps:jumps,remaining,
   rawPrefixDepth:prefix.length-1,
   distanceLowerBound,
   goalEnteredBeforeLengthComplete:beforeGoalTerminal,
   countedLengthOverrun:needOverrun,
   optimisticGoalBoundImpossible:staticGoalBoundReject,
   pendingMustPass,pendingMustCross,
   terminalOverlap:beforeGoalTerminal,
   passesAllTheseWeakChecks:!(beforeGoalTerminal||needOverrun||staticGoalBoundReject)};
}
function assert(ok,msg){if(!ok)throw Error(msg);}
function test() {
 const lev={grid:{w:3,h:3},goal:{x:3,y:3},reqLen:5,portals:[{x1:1,y1:2,x2:3,y2:2}],mustPass:[],mustCross:[]};
 const q=diagnose(lev,[0,65536,65538]);
 assert(q.portalJumps===1&&q.countedMoves===1&&q.remaining===4,'portal jump zero-step count');
 assert(q.distanceLowerBound<=q.remaining,'optimistic distance');
 assert(diagnose({...lev,goal:{x:1,y:2}},[0,65536]).goalEnteredBeforeLengthComplete,'early goal flagged');
 assert(diagnose({...lev,reqLen:0},[0,1]).countedLengthOverrun,'overrun flagged');
 console.log('PG-H weak-bound self-test PASS');
}
if(args.has('--self-test')){test();process.exit(0);}
const corpusPath=args.get('--corpus')||'data/stress/stress-levels-random.json';
const casesPath=args.get('--cases');
const out=args.get('--out');
if(!casesPath||!out)throw Error('--cases and --out required');
const corpusBytes=readFileSync(corpusPath);
const corpus=JSON.parse(corpusBytes.toString('utf8'));
const levels=Array.isArray(corpus)?corpus:corpus.levels;
const source=new Map(levels.map(l=>[l.id,l]));
const raw=JSON.parse(readFileSync(casesPath,'utf8'));
assert(raw.kind==='pathfinder-semantic-forcedness-explicit-prefix-cases','wrong case type');
const rows=raw.cases.map(c=>{
 const level=source.get(c.levelId);
 assert(level,'level not in corpus: '+c.levelId);
 assert(Array.isArray(c.prefix)&&c.prefix.length>=2,'invalid prefix: '+c.id);
 const result=diagnose(level,c.prefix);
 return {caseId:c.id,levelId:c.levelId,
  stateId:c.source.stateId,childIndex:c.source.childIndex,
  parentExpansionWork:c.source.parentExpansionWork,
  ...result};
});
assert(rows.length===35&&new Set(rows.map(x=>x.caseId)).size===35,'wrong frozen case count');
assert(new Set(rows.map(x=>x.stateId)).size===16,'wrong frozen state count');
const count=k=>rows.filter(x=>x[k]).length;
const summed=rows.reduce((s,r)=>s+r.parentExpansionWork,0);
const verdict={
 schema:'pathfinder.pg-h-deep-weak-bound-audit/v1',
 sourceCorpus:corpusPath,sourceCorpusSha256:createHash('sha256').update(corpusBytes).digest('hex'),
 sourceCaseSet:casesPath,rows:rows.length,independentParents:new Set(rows.map(r=>r.levelId)).size,
 states:new Set(rows.map(x=>x.stateId)).size,
 terminalAlreadyHandledNextBeamStep:count('terminalOverlap'),
 countedLengthOverruns:count('countedLengthOverrun'),
 optimisticGoalBoundRejects:count('optimisticGoalBoundImpossible'),
 passingAllWeakChecks:count('passesAllTheseWeakChecks'),
 rawRemainingMin:Math.min(...rows.map(x=>x.remaining)),
 rawRemainingMax:Math.max(...rows.map(x=>x.remaining)),
 duplicatedGroupParentExpansionWork:summed,
 caution:'Offline label-enriched development set; no proof of incremental pruning value and no production code change.',
 cases:rows,
};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(out,JSON.stringify(verdict,null,2)+'\n');
console.log('PG-H WEAK BOUND VERDICT '+JSON.stringify({...verdict,cases:undefined}));
