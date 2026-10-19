#!/usr/bin/env node
/**
 * PG-J independent source-accepted LIVE suffix projection correctness controls.
 * Never calls a solve, passes a hint, or changes search policy.
 * Invoke through scripts/run-bundled.mjs; --self-test works under plain Node.
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const SOURCE='reports/stress/pg-i-early-equal-work-cold-solves-20261018.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const DEPTHS=[1,9,17,25,33,41,49,57,65];
const arg=k=>process.argv.find(s=>s.startsWith('--'+k+'='))?.slice(k.length+3);
const sha=x=>createHash('sha256').update(x).digest('hex');
const assert=(b,m)=>{if(!b)throw Error(m);};
const H=(a,b)=>((a>>>16)&65535)===((b>>>16)&65535);
const distance=(a,b)=>Math.abs((a&65535)-(b&65535))+Math.abs(((a>>>16)&65535)-((b>>>16)&65535));
if(process.argv.includes('--self-test')){
 assert(distance(0,(2<<16)+3)===5,'Manhattan');
 assert(H(1,2)&&!H(1,65537),'axis');
 assert(DEPTHS.length===9&&DEPTHS[0]===1&&DEPTHS[8]===65,'fixed sampling');
 console.log('PG-J stress witness projection self-test passed');
 process.exit(0);
}
assert(arg('out'),'--out is required');
const corpusBuf=readFileSync(CORPUS),sourceBuf=readFileSync(SOURCE);
assert(sha(corpusBuf)===SHA,'source corpus checksum drift');
const corpusDoc=JSON.parse(corpusBuf),corpus=Array.isArray(corpusDoc)?corpusDoc:corpusDoc.levels;
const source=JSON.parse(sourceBuf);
assert(source.sourceCorpusSha256===SHA&&source.solutions?.length===3
 &&new Set(source.solutions.map(s=>s.levelId)).size===2
 &&new Set(source.solutions.map(s=>s.levelId)).has('R03031')
 &&new Set(source.solutions.map(s=>s.levelId)).has('R02108'),
 'accepted original PG-I source population changed');
const levels=new Map(corpus.map(v=>[v.id,v]));
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const solver=createSolver();
function replay(prefix,level,prep,tag){
 const state=api.createState(prefix[0],level,prep);
 for(const next of prefix.slice(1)){
  const from=state.path.at(-1),opts=api.getNeighbors(from,state,level,prep);
  assert(opts.includes(next),'witness prefix illegal '+tag);
  const jump=!!(!state.lastWasPortalJump&&level.portalMap.get(from)?.dest===next);
  api.applyMove(next,state,level,prep,jump);
 }
 return state;
}
function select(raw,level,state){
 if(state.path.at(-1)===level.goalKey)return {reason:'at-goal'};
 const at=state.path.at(-1);
 const mp=level.mustPassKeys.filter((k,i)=>(state.mpVisitedMask&(1<<i))===0)
   .sort((a,b)=>distance(at,a)-distance(at,b)||a-b);
 if(mp.length<2)return {reason:'fewer-than-two-outstanding-MP'};
 const mc=level.mustCrossKeys.filter((k,i)=>state.crossCounts[i]===0
   &&(state.mustCrossMask&(1<<i))!==0)
   .sort((a,b)=>distance(at,a)-distance(at,b)||a-b);
 if(!mc.length)return {reason:'no-zero-visit-MC'};
 const portals=(raw.portals??[]).map(p=>[api.PACK(p.x1-1,p.y1-1),api.PACK(p.x2-1,p.y2-1)].sort((a,b)=>a-b))
   .filter(pair=>pair.every(k=>state.visited[k]===0))
   .map(pair=>({pair,dist:Math.min(...pair.flatMap(k=>mp.slice(0,2).map(m=>distance(k,m))))}))
   .sort((a,b)=>a.dist-b.dist||a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]);
 if(!portals.length)return {reason:'no-unused-portal-pair'};
 return {reason:null,mp:mp.slice(0,2),mc:mc[0],pair:portals[0].pair};
}
function shadowSuccessors(node,level,prep,frozen,chosen){
 const {pos,entry,jumped,usedPair}=node;
 if(pos===level.goalKey)return [];
 const portal=level.portalMap.get(pos);
 const pair=new Set(chosen.pair);
 if(portal&&!jumped){
  return [{pos:portal.dest,entry:0,jumped:true,
   usedPair:usedPair||pair.has(pos)||pair.has(portal.dest),weight:0}];
 }
 const x=pos&65535,y=(pos>>>16)&65535,offset=(y*level.grid.w+x)*4;
 const out=[];
 for(let d=0;d<4;d++){
  const biased=prep.staticNeighborKeys[offset+d];if(!biased)continue;
  const target=biased-1,axis=H(pos,target)?1:2;
  if(frozen.edgeUsage[target]&axis)continue;
  if(entry&&entry!==axis&&(frozen.edgeUsage[pos]&axis))continue;
  if(pos===chosen.mc&&entry&&entry!==axis)continue;
  if(usedPair&&pair.has(target))continue;
  out.push({pos:target,entry:axis,jumped:false,
   usedPair:usedPair||pair.has(target),weight:1});
 }
 return out;
}
const rows=[];
for(const [ordinal,record] of source.solutions.entries()){
 const raw=levels.get(record.levelId);
 assert(raw,'source winner level missing');
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_p,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 const verdict=solver.validateCandidatePath(level,record.path);
 assert(verdict.ok,'previously accepted source winner now referee invalid');
 const attempts=[];
 for(const depth of DEPTHS){
  if(depth>=record.path.length)continue;
  const prep=api.prepLevel(level),prefix=record.path.slice(0,depth);
  const frozen=replay(prefix,level,prep,record.levelId+':'+ordinal+':'+depth);
  const chosen=select(raw,level,frozen);
  const base={sourceOrdinal:ordinal+1,parentId:record.levelId,depth,
   sourcePathSha256:sha(JSON.stringify(record.path)),
   sourceRemaining:level.requiredLength-api.getRealLengthFromState(frozen),
   selected:chosen.reason?null:{mp:chosen.mp,mc:chosen.mc,pair:chosen.pair}};
  if(chosen.reason){attempts.push({...base,status:'ineligible',reason:chosen.reason});continue;}
  let shadow={pos:prefix.at(-1),
   entry:frozen.lastWasPortalJump||prefix.length<2?0:
     (H(prefix.at(-1),prefix.at(-2))?1:2),
   jumped:!!frozen.lastWasPortalJump,
   usedPair:chosen.pair.some(k=>frozen.visited[k]>0)};
  const events=new Set(),mp=new Set(chosen.mp);
  let ordinaryMoves=0,transitions=0;
  for(const next of record.path.slice(depth)){
   const candidates=shadowSuccessors(shadow,level,prep,frozen,chosen).filter(v=>v.pos===next);
   assert(candidates.length===1,'ACCEPTED LIVE WITNESS LOST FROM SHADOW GRAPH: '+record.levelId
      +' ordinal='+ordinal+' depth='+depth+' suffixMove='+transitions+' from='+shadow.pos+' to='+next);
   shadow=candidates[0];ordinaryMoves+=shadow.weight;transitions++;
   if(mp.has(next))events.add(next===chosen.mp[0]?'MP0':'MP1');
   if(next===chosen.mc&&shadow.weight===1)
    events.add(shadow.entry===1?'MC-H':'MC-V');
  }
  assert(events.size===4,'accepted LIVE suffix lacks one of selected four terminal events: '
   +record.levelId+' depth '+depth+' events='+[...events]);
  assert(ordinaryMoves===base.sourceRemaining,'accepted LIVE remaining counted length mismatch');
  assert(shadow.pos===level.goalKey,'accepted LIVE suffix not at goal');
  attempts.push({...base,status:'live-witness-included',chosen,
   terminalEvents:[...events].sort(),shadowCost:ordinaryMoves,suffixTransitions:transitions});
 }
 rows.push({sourceOrdinal:ordinal+1,parentId:record.levelId,
  sourcePathSha256:sha(JSON.stringify(record.path)),sourceWinnerLength:record.path.length,
  validRefereeWitness:true,attempts});
 console.log('PG-J LIVE WITNESS '+JSON.stringify({id:record.levelId,ordinal:ordinal+1,
  tested:attempts.length,applicable:attempts.filter(x=>x.status==='live-witness-included').length,
  ineligible:attempts.filter(x=>x.status==='ineligible').length}));
}
const all=rows.flatMap(x=>x.attempts);
const summary={sourceAcceptedPaths:rows.length,independentParents:new Set(rows.map(x=>x.parentId)).size,
 plannedDepthCells:3*DEPTHS.length,observedCells:all.length,eligibleWitnesses:all.filter(x=>x.status==='live-witness-included').length,
 independentParentsWithEligibleWitness:new Set(all.filter(x=>x.status==='live-witness-included').map(x=>x.parentId)).size,
 ineligible:all.filter(x=>x.status==='ineligible').length,
 missingAbstractTransitions:0,failedTerminalEvents:0,failedCountedLength:0,
 noSourceOrRefereeAlarms:true,
 soundnessGatePassed:new Set(all.filter(x=>x.status==='live-witness-included').map(x=>x.parentId)).size===2};
const report={schema:'pathfinder.pg-j-independent-stress-live-witness-projection/v1',
 sourceCommit:process.env.GITHUB_SHA??null,sourceCorpusSha256:sha(corpusBuf),
 sourceAcceptedWitnessArtifact:SOURCE,sourceAcceptedWitnessSha256:sha(sourceBuf),
 evidenceRole:'source-valid-two-parent-shadow-inclusion-correctness-only',
 selection:'all 3 existing isolated accepted source paths, 2 parents, immutable prefix length 1,9,17,25,33,41,49,57,65',
 limitations:'No Dijkstra lower-bound computed; validates that complete real witness exists in relaxed graph for selected subsets and source-native counted length; not independent oracle fate, saved work or cold solution discovery.',
 summary,rows};
const target=path.resolve(arg('out'));mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log('PG-J LIVE WITNESS VERDICT '+JSON.stringify(summary));
assert(summary.soundnessGatePassed,'source-accepted positive witness opportunity absent on one parent');
