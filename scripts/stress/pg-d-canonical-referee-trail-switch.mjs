#!/usr/bin/env node
/**
 * PG-D: canonical accepted-path differential for the ordinary edge-simple
 * switch-route representation, on immutable published/Corpus-2 levels.
 *
 * Soundness direction: every native-referee-accepted portal-free trajectory
 * MUST satisfy the independent ordinary-edge switch-route verifier.
 * Portal jumps are unsupported/abstain, never mapped to ordinary grid edges.
 * Historical hints nominate referee-tested witnesses only (offline research).
 *
 * No production logic or level-specific runtime lookup; no exact oracle calls.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {readLevelCorpusDocumentWithHints} from '../level-data-io.mjs';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const sources=['data/levels.json','data/stress/stress-levels-random.json'];
const arg=(name,otherwise)=>{const v=process.argv.find(s=>s.startsWith('--'+name+'='));return v?v.slice(name.length+3):otherwise;};
const limit=Number(arg('max-levels',500));
const perLevel=Number(arg('hints-per-level',3));
const output=arg('out',null);
if(!output||!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(perLevel)||perLevel<1)
 throw Error('Usage: --out=path [--max-levels=500] [--hints-per-level=3]');

const unpack=k=>({x:k&65535,y:(k>>>16)&65535});
const key=(a,b)=>a<b?a+':'+b:b+':'+a;
const axis=(a,b)=>unpack(a).y===unpack(b).y?'h':'v';
const distance=(a,b)=>{const x=unpack(a),y=unpack(b);return Math.abs(x.x-y.x)+Math.abs(x.y-y.y)};
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');

/**
 * Independent static switch-route verifier on a chosen set of ordinary edges.
 * Uses only edge endpoints, axes and terminal gates; not the dynamic referee.
 * Return a reason, not an optimistic true, on every malformed/unsupported input.
 */
export function verifySelectedOrdinaryRoute(pathKeys){
 if(!Array.isArray(pathKeys)||pathKeys.length<2)return {ok:false,reason:'short'};
 const selected=new Map(),incidence=new Map();
 for(let i=1;i<pathKeys.length;i++){
  const a=pathKeys[i-1],b=pathKeys[i];
  if(distance(a,b)!==1)return {ok:null,reason:'nonordinary-transition'};
  const id=key(a,b);
  if(selected.has(id))return {ok:false,reason:'reused-edge'};
  const e={id,a,b,axis:axis(a,b)};selected.set(id,e);
  for(const v of [a,b]){let list=incidence.get(v)||[];list.push(e);incidence.set(v,list)}
 }
 const start=pathKeys[0],goal=pathKeys.at(-1);
 if(start===goal)return {ok:false,reason:'same-terminals'};
 for(const [v,list] of incidence){
  if(v===start||v===goal){if(list.length!==1)return {ok:false,reason:'endpoint-degree'};continue}
  if(list.length!==2&&list.length!==4)return {ok:false,reason:'internal-degree'};
  if(list.length===4&&list.filter(e=>e.axis==='h').length!==2)return {ok:false,reason:'axis-pairing'};
 }
 const used=new Set();let at=start,prevEdge=null;
 for(let steps=0;steps<=selected.size;steps++){
  if(at===goal&&prevEdge)return {ok:used.size===selected.size,reason:used.size===selected.size?'matched':'disconnected-switch-strand'};
  const choices=(incidence.get(at)||[]).filter(e=>e.id!==prevEdge?.id);
  const incident=incidence.get(at)||[];
  const narrowed=prevEdge&&incident.length===4?choices.filter(e=>e.axis===prevEdge.axis):choices;
  if(narrowed.length!==1)return {ok:false,reason:'ambiguous-or-missing-exit'};
  const next=narrowed[0];
  if(used.has(next.id))return {ok:false,reason:'edge-cycle'};
  used.add(next.id);at=next.a===at?next.b:next.a;prevEdge=next;
 }
 return {ok:false,reason:'unclosed'};
}
function selfTest(){
 const p=(x,y)=>(x|(y<<16));
 const valid=[p(0,0),p(1,0),p(1,1),p(2,1)];
 if(!verifySelectedOrdinaryRoute(valid).ok)throw Error('ordinary legal control rejected');
 const bad=[p(0,0),p(1,0),p(0,0),p(0,1)];
 if(verifySelectedOrdinaryRoute(bad).ok!==false)throw Error('reused-edge control accepted');
 if(verifySelectedOrdinaryRoute([p(0,0),p(2,2)]).ok!==null)throw Error('portal-like nonordinary transition did not abstain');
 // 4x3 11-edge selected degree-correct graph: connected but route
 // has a separate 6-edge cycle; the verifier must reject its open branch
 // if given as a full route with chosen cycle edges. The complete subset
 // version is owned by research-trail-switch-toy.mjs.
 console.log('PG-D canonical switch-route self test passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const {decodeCandidatePath,validateCanonicalPath}=await import('../../modules/domain/path-validator.ts');
const Solver=createSolver();
const summary={
 schema:'pathfinder.pg-d-canonical-referee-trail-switch-differential/v1',
 selected:'published and first N Corpus-2 levels by corpus order, no hint/outcome-based selection',
 sampleCaps:{maxLevelsPerCorpus:limit,maxHintsPerLevel:perLevel},
 sources:[],totals:{levelsConsidered:0,levelsWithHints:0,refereeAccepted:0,refereeRejected:0,
 ordinarySupportedAccepted:0,portalOrNonordinaryAbstain:0,staticFalseRejects:0,
 strictEdgeReuseNegativeControls:0,negativeControlUnexpectedAcceptance:0,
 ordinaryCrossingWitnesses:0},
 alarms:[],examples:{crossings:[],unsupported:[],negativeUnexpected:[]},
 limitations:[
 'Referee-accepted historical hints are a convenience source of actual solutions, not independent cold solves.',
 'Portal-using routes are unsupported by the ordinary static graph and explicitly abstain.',
 'Only complete already-known routes are checked; this does not establish a useful NEW pruning consequence or savings.',
 'First-N level and per-level witness caps are development sampling, not solve-rate or population prevalence.'
 ]
};
for(const source of sources){
 const {levels}=readLevelCorpusDocumentWithHints(source);
 const selected=levels.slice(0,limit);
 const local={source,sha256:sha(source),totalLevels:levels.length,considered:selected.length,withHints:0,
  refereeAccepted:0,refereeRejected:0,ordinarySupported:0,abstained:0,staticFalseRejects:0,crossingWitnesses:0,negativeControls:0};
 for(const raw of selected){
  summary.totals.levelsConsidered++;
  const hints=(raw.hintRecords||[]).slice(0,perLevel);
  if(!hints.length)continue;
  local.withHints++;summary.totals.levelsWithHints++;
  const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,...levelRaw}=raw;
  const level=Solver.prepareLevelForSolver(levelRaw,{source:'raw'});
  for(let i=0;i<hints.length;i++){
   const keys=decodeCandidatePath(hints[i].path);
   if(!keys||keys.length<2)continue;
   const referee=validateCanonicalPath(level,keys);
   if(!referee.ok){local.refereeRejected++;summary.totals.refereeRejected++;continue;}
   local.refereeAccepted++;summary.totals.refereeAccepted++;
   const check=verifySelectedOrdinaryRoute(keys);
   if(check.ok===null){local.abstained++;summary.totals.portalOrNonordinaryAbstain++;
    if(summary.examples.unsupported.length<8)summary.examples.unsupported.push({source,levelId:raw.id,hintIndex:i,reason:check.reason});
    continue;
   }
   local.ordinarySupported++;summary.totals.ordinarySupportedAccepted++;
   if(!check.ok){local.staticFalseRejects++;summary.totals.staticFalseRejects++;
    summary.alarms.push({source,levelId:raw.id,hintIndex:i,reason:check.reason,pathSha256:createHash('sha256').update(JSON.stringify(keys)).digest('hex')});
    continue;
   }
   const visits=new Map();for(const p of keys)visits.set(p,(visits.get(p)||0)+1);
   const crossings=[...visits.values()].filter(x=>x>1).length;
   if(crossings){local.crossingWitnesses++;summary.totals.ordinaryCrossingWitnesses++;
    if(summary.examples.crossings.length<16)summary.examples.crossings.push({source,levelId:raw.id,hintIndex:i,crossings,rawDepth:keys.length-1});
   }
   // Canonical negative control: actively insert a reversed already-used ordinary
   // edge. Referee and abstraction should both reject; no novel-prune inference.
   const flipAt=keys.length>3?2:1;
   const mutated=[...keys.slice(0,flipAt+1),keys[flipAt-1],...keys.slice(flipAt+1)];
   const naive=verifySelectedOrdinaryRoute(mutated);
   const native=validateCanonicalPath(level,mutated);
   local.negativeControls++;summary.totals.strictEdgeReuseNegativeControls++;
   if(naive.ok!==false||native.ok){summary.totals.negativeControlUnexpectedAcceptance++;
    if(summary.examples.negativeUnexpected.length<8)
     summary.examples.negativeUnexpected.push({source,levelId:raw.id,hintIndex:i,naive,native});}
  }
 }
 summary.sources.push(local);
 console.log('PG-D SOURCE '+JSON.stringify(local));
}
if(summary.totals.ordinarySupportedAccepted<50)
 throw Error('too few accepted normal routes: '+summary.totals.ordinarySupportedAccepted);
if(summary.totals.staticFalseRejects||summary.totals.negativeControlUnexpectedAcceptance)
 throw Error('canonical switch/referee disagreement: '+JSON.stringify(summary.alarms.slice(0,5)));
const file=path.resolve(output);mkdirSync(path.dirname(file),{recursive:true});
writeFileSync(file,JSON.stringify(summary,null,2)+'\n');
console.log('PG-D DIFFERENTIAL VERDICT '+JSON.stringify(summary.totals));
