#!/usr/bin/env node
/**
 * PG-J first-published-hint portal-bearing LIVE suffix projection correctness.
 * Never calls a solve, passes a hint, or changes search policy.
 * Invoke through scripts/run-bundled.mjs; --self-test works under plain Node.
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const CORPUS='data/levels.json';
const IDS=['P00118','P00134','P00143','P00146'];
const DEPTHS=[1,5,9,13,17,21,25,29,33,41,49,57,65];
const arg=k=>process.argv.find(s=>s.startsWith('--'+k+'='))?.slice(k.length+3);
const sha=x=>createHash('sha256').update(x).digest('hex');
const assert=(b,m)=>{if(!b)throw Error(m);};
const H=(a,b)=>((a>>>16)&65535)===((b>>>16)&65535);
const distance=(a,b)=>Math.abs((a&65535)-(b&65535))+Math.abs(((a>>>16)&65535)-((b>>>16)&65535));
if(process.argv.includes('--self-test')){
 assert(distance(0,(2<<16)+3)===5,'Manhattan');
 assert(H(1,2)&&!H(1,65537),'axis');
 assert(DEPTHS.length===13&&DEPTHS[0]===1&&DEPTHS[12]===65,'fixed sampling');
 console.log('PG-J published portal witness projection self-test passed');
 process.exit(0);
}
assert(arg('out'),'--out is required');
const corpusBuf=readFileSync(CORPUS),corpus=JSON.parse(corpusBuf);
assert(Array.isArray(corpus)&&corpus.length>=150,'published level source changed');
const levels=new Map(corpus.map(v=>[v.id,v]));
const sources=IDS.map(levelId=>{
 const raw=levels.get(levelId);
 assert(raw&&(raw.mustPass?.length??0)>=2&&(raw.mustCross?.length??0)>=1
  &&(raw.portals?.length??0)>=1,'published mechanical eligibility drift '+levelId);
 const sourceFile='data/hints/'+levelId+'.json',buf=readFileSync(sourceFile);
 const doc=JSON.parse(buf);
 assert(Array.isArray(doc.hints)&&Array.isArray(doc.hints[0]?.path),
  'first published source hint absent '+levelId);
 return {levelId,path:doc.hints[0].path,sourceFile,sourceFileSha256:sha(buf)};
});
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
for(const [ordinal,record] of sources.entries()){
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
 plannedDepthCells:IDS.length*DEPTHS.length,observedCells:all.length,eligibleWitnesses:all.filter(x=>x.status==='live-witness-included').length,
 independentParentsWithEligibleWitness:new Set(all.filter(x=>x.status==='live-witness-included').map(x=>x.parentId)).size,
 ineligible:all.filter(x=>x.status==='ineligible').length,
 missingAbstractTransitions:0,failedTerminalEvents:0,failedCountedLength:0,
 noSourceOrRefereeAlarms:true,
 soundnessGatePassed:new Set(all.filter(x=>x.status==='live-witness-included').map(x=>x.parentId)).size>=2};
const report={schema:'pathfinder.pg-j-published-portal-live-witness-projection/v1',
 sourceCommit:process.env.GITHUB_SHA??null,sourceCorpusSha256:sha(corpusBuf),
 sourceHints:sources.map(({levelId,sourceFile,sourceFileSha256,path})=>
  ({levelId,sourceFile,sourceFileSha256,firstHintPathSha256:sha(JSON.stringify(path))})),
 evidenceRole:'four-human-parent-first-stored-hint-full-live-shadow-controls',
 selection:'P00118/P00134/P00143/P00146 first stored accepted hint only; fixed prefix lengths 1,5,9,13,17,21,25,29,33,41,49,57,65',
 limitations:'Published human source controls, selected by mechanics after the failed generated-level second-parent gate. No Dijkstra lower-bound computed; full referee-valid suffix inclusion tests not original cold solving, independent generated-parent proof or saved work.',
 summary,rows};
const target=path.resolve(arg('out'));mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log('PG-J PUBLISHED LIVE VERDICT '+JSON.stringify(summary));
assert(summary.soundnessGatePassed,'fewer than two distinct source published parents eligible for full LIVE projection');
