#!/usr/bin/env node
/**
 * PG-L scheduled-isConnected() replay, read-only inside the actual production
 * 250k solveLevel() attempt ladder. No memo, scoring or pruning changes.
 *
 * Observe complete original connectivity calls (not just parent-expansion
 * overlap) with a conservative full-path + mechanic-state + config identity.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const FILE='data/stress/stress-levels-random.json';
const SOURCE='reports/stress/pg-l-independent-dispatch-24-20261018-001.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const IDS=['R00720','R01584'];
const PROFILES=['objectiveFirst','intersectionHarvest'];
const EXPECTED_CHARGE=12,MAX_KEYS=80000,MAX_KEY_CHARS=16000000;
const opts={baseWorkBudget:250000,nodeBudget:250000,timeBudgetMs:600000,strictTotalWorkBudget:true};
const arg=process.argv.find(a=>a.startsWith('--out='))?.slice(6);
const assert=(v,m)=>{if(!v)throw Error(m)};
const hash=s=>createHash('sha256').update(s).digest('hex');

/** Conservative current state identity: no hash-only equivalence. */
export function connectivityKey(record){
 const {state:s,prep,attemptContext:ctx,pos}=record;
 const visitedCells=[...new Set(s.path)].sort((a,b)=>a-b);
 const cfg=prep._cfg??null;
 const flags=cfg?Object.keys(cfg).sort().map(k=>[k,cfg[k]]):null;
 return JSON.stringify([
  ctx.gateKey,pos,s.path,s.ints,s.mustMask,s.mustCrossMask,
  [...s.crossCounts],s.mpVisitedMask,s.portalJumps,s.flipperUsedMask,
  !!s.lastWasPortalJump,s.surroundMask,[...s.surroundNeighborRemainingMasks],
  s.mustTurnMask,s.adjTurnMask,
  visitedCells.map(k=>[k,s.visited[k],s.edgeUsage[k]]),flags
 ]);
}
export function collector(expectedGate){
 const byProfile=new Map(PROFILES.map(p=>[p,new Map()]));
 const contextByOrdinal=new Map();
 const repeats=[];
 let calls=0,observed=0,otherWidth=0,keys=0,keyChars=0;
 let sameProfileLater=0,crossHits=0,crossEarlierOrdinals=0,crossResultDisagreements=0;
 let laterWork=0,matchedWork=0,laterTrue=0,laterFalse=0,zeroWorkCalls=0;
 let maxObservedFullPathDepth=0;
 const hitHashSample=[];
 const observer={
  observe(){}, // interface already requires this; no parent histories copied
  observeScheduledConnectivity(r){
   calls++;
   const c=r.attemptContext;
   if(!c||c.gateKey!==expectedGate||!PROFILES.includes(c.scoringProfileId))return;
   if(c.beamWidth!==5000){otherWidth++;return;}
   assert(Number.isSafeInteger(c.attemptOrdinal)&&c.attemptOrdinal>=0,'missing ordinal');
   assert(r.workAfter-r.workBefore===EXPECTED_CHARGE,
    'nonstandard canonical scheduled connectivity call charge');
   if(!contextByOrdinal.has(c.attemptOrdinal))
    contextByOrdinal.set(c.attemptOrdinal,{
     ordinal:c.attemptOrdinal,profile:c.scoringProfileId,gate:c.gateKey,
     width:c.beamWidth,mechanicBucketRetention:c.mechanicBucketRetention
    });
   observed++;maxObservedFullPathDepth=Math.max(maxObservedFullPathDepth,r.state.path.length);
   const key=connectivityKey(r);
   const own=byProfile.get(c.scoringProfileId);
   const other=byProfile.get(PROFILES.find(p=>p!==c.scoringProfileId));
   const prior=other.get(key);
   if(prior){
    assert(prior.ordinal<c.attemptOrdinal,'nonchronological other-profile fact');
    crossEarlierOrdinals++;
    crossHits++;
    if(prior.connected!==r.connected)crossResultDisagreements++;
    laterWork+=r.workAfter-r.workBefore;
    matchedWork+=Math.min(prior.charge,r.workAfter-r.workBefore);
    if(r.connected)laterTrue++;else laterFalse++;
    if(repeats.length<8)repeats.push({
     firstProfile:prior.profile,firstOrdinal:prior.ordinal,
     laterProfile:c.scoringProfileId,laterOrdinal:c.attemptOrdinal,
     sameOutcome:prior.connected===r.connected,laterTrue:r.connected,
     keySha256:hash(key)});
    if(hitHashSample.length<5)hitHashSample.push(hash(key));
   }
   if(own.has(key)){sameProfileLater++;return;}
   keyChars+=key.length;keys++;
   assert(keys<=MAX_KEYS&&keyChars<=MAX_KEY_CHARS,
    'PG-L observer key/memory ceiling exceeded; source result censored');
   own.set(key,{profile:c.scoringProfileId,ordinal:c.attemptOrdinal,
    connected:r.connected,charge:r.workAfter-r.workBefore});
  }
 };
 return {observer,snapshot(){
  return {allScheduledCalls: calls,qualifiedWidth5000TargetCalls:observed,otherWidthTargetCalls:otherWidth,
   observedAttemptContexts:[...contextByOrdinal.values()].sort((a,b)=>a.ordinal-b.ordinal),
   distinctFullKeysByProfile:Object.fromEntries(PROFILES.map(p=>[p,byProfile.get(p).size])),
   sameProfileLaterCalls:sameProfileLater,
   chronologicalCrossProfileLaterCalls:crossHits,
   crossProfileProducerEarlierEvents:crossEarlierOrdinals,
   crossProfileResultDisagreements:crossResultDisagreements,
   laterConnectivityCanonicalWork:laterWork,minimumMatchedConnectivityWork:matchedWork,
   laterConnected:laterTrue,laterRejected:laterFalse,
   maximumObservedPathDepth:maxObservedFullPathDepth,
   totalStoredKeys:keys,totalStoredCharacters:keyChars,
   sampleKeyHashes:hitHashSample,examples:repeats};
 }};
}
function fixture(profile,ordinal,pathCells,usedAxis=1,flagValue=true,connected=true){
 const visited=new Uint16Array(20),edgeUsage=new Uint8Array(20);
 for(const p of pathCells){visited[p]++;edgeUsage[p]=usedAxis;}
 return {pos:pathCells.at(-1),state:{path:pathCells,visited,edgeUsage,ints:0,
 mustMask:0,mustCrossMask:0,crossCounts:new Uint8Array(0),
 mpVisitedMask:0,portalJumps:0,flipperUsedMask:0,lastWasPortalJump:false,
 surroundMask:0,surroundNeighborRemainingMasks:new Uint8Array(0),
 mustTurnMask:0,adjTurnMask:0},prep:{_cfg:{PRUNE_CONNECTIVITY_AXIS_EXHAUSTED:flagValue}},
 attemptContext:{scoringProfileId:profile,attemptOrdinal:ordinal,gateKey:1,beamWidth:5000,
 mechanicBucketRetention:false},connected,workBefore:9,workAfter:21};
}
function selfTest(){
 const c=collector(1);
 const a=fixture('objectiveFirst',0,[1,2]),b=fixture('intersectionHarvest',1,[1,2]);
 const k=connectivityKey(a);
 assert(connectivityKey(fixture('objectiveFirst',0,[1,2],2))!==k,'consumed-axis key separation');
 assert(connectivityKey(fixture('objectiveFirst',0,[1,2],1,false))!==k,'cfg key separation');
 assert(connectivityKey(fixture('objectiveFirst',0,[1,2,3]))!==k,'path key separation');
 c.observer.observeScheduledConnectivity(a);
 c.observer.observeScheduledConnectivity(b);
 c.observer.observeScheduledConnectivity(fixture('intersectionHarvest',1,[1,3]));
 c.observer.observeScheduledConnectivity(fixture('intersectionHarvest',1,[1,2],2));
 let r=c.snapshot();
 assert(r.chronologicalCrossProfileLaterCalls===1&&r.laterConnectivityCanonicalWork===12
 &&r.crossProfileResultDisagreements===0&&r.totalStoredKeys===4,'same-call exact-key accounting');
 let d=collector(1);d.observer.observeScheduledConnectivity(a);
 d.observer.observeScheduledConnectivity(fixture('intersectionHarvest',1,[1,2],1,true,false));
 assert(d.snapshot().crossProfileResultDisagreements===1,'same-key contradictory result alarm');
 console.log('PG-L typed scheduled-connectivity collector identity and chronology self-test passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
assert(arg,'--out required');
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const buffer=readFileSync(FILE);assert(hash(buffer)===SHA,'source corpus SHA mismatch');
const doc=JSON.parse(buffer),all=Array.isArray(doc)?doc:doc.levels,byId=new Map(all.map(x=>[x.id,x]));
const source=JSON.parse(readFileSync(SOURCE));
assert(source.summary.independentParents===24&&source.summary.bothScorersWidth5000===9
 &&source.source.corpusSha256===SHA,'source-dispatch identity changed');
const src=new Map(source.rows.map(x=>[x.id,x]));
const solver=createSolver(),rows=[];
const attemptShape=a=>[a.gateKey??null,a.configKey??null,a.scoringProfileId??null,
 a.beamWidth??null,a.workSpent??null,a.nodesExpanded??null,a.status??null];
const signature=r=>({ok:r.ok,status:r.status,work:r.workSpent,nodes:r.nodesExpanded,
 solution:JSON.stringify(r.solution),attempts:r.attempts.map(attemptShape)});
for(const id of IDS){
 const raw=byId.get(id),ref=src.get(id);
 assert(raw&&ref&&ref.bothSameWide5000,'source frozen co-dispatch entry missing '+id);
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_p,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 assert(level.gateKeys.includes(ref.gateKey),'source production gate changed');
 const control=await solver.solveLevel(level,{...opts});
 const c=collector(ref.gateKey);
 const observed=await solver.solveLevel(level,{...opts,beamResearchObserver:c.observer});
 const a=signature(control),b=signature(observed);
 assert(JSON.stringify(a)===JSON.stringify(b),'observer violated native parity on '+id);
 const sn=c.snapshot();
 assert(sn.crossProfileResultDisagreements===0,'semantic state collision changed Boolean truth');
 const actual=observed.attempts.filter(x=>x.gateKey===ref.gateKey
  &&x.beamWidth===5000&&PROFILES.includes(x.scoringProfileId)
  &&Number(x.workSpent)>0);
 const positive=PROFILES.every(p=>actual.some(x=>x.scoringProfileId===p));
 rows.push({id,gateKey:ref.gateKey,control:a,
  actualTargetAttemptShapes:actual.map(attemptShape),
  bothProfilesObservedPositiveWork:positive,shadow:sn,parity:true});
 console.log('PG-L CONNECTIVITY '+JSON.stringify({
  id,positive,scheduledCalls:sn.qualifiedWidth5000TargetCalls,
  crossHits:sn.chronologicalCrossProfileLaterCalls,
  laterConnectivityWork:sn.laterConnectivityCanonicalWork,
  storageKeys:sn.totalStoredKeys,allWork:observed.workSpent,status:observed.status
 }));
}
const summary={parents:IDS.length,parityPasses:rows.filter(x=>x.parity).length,
 bothTargetProfilesPositive:rows.filter(x=>x.bothProfilesObservedPositiveWork).length,
 chronologicalCrossProfileLaterCalls:rows.reduce((x,r)=>x+r.shadow.chronologicalCrossProfileLaterCalls,0),
 repeatConnectivityWork:rows.reduce((x,r)=>x+r.shadow.laterConnectivityCanonicalWork,0),
 totalTargetScheduledConnectivityCalls:rows.reduce((x,r)=>x+r.shadow.qualifiedWidth5000TargetCalls,0),
 contradictionAlarms:rows.reduce((x,r)=>x+r.shadow.crossProfileResultDisagreements,0),
 materialSourcePositive:rows.some(r=>r.shadow.laterConnectivityCanonicalWork>=1200),
 sourceCensored:false};
const report={schema:'pathfinder.pg-l-source-native-chronological-connectivity-call-shadow/v1',
 evidenceRole:'postselected-development-typed-fact-opportunity',
 executionSha:process.env.GITHUB_SHA??null,corpusFile:FILE,corpusSha256:SHA,
 dispatchEvidence:SOURCE,selection:'first two frozen same-width production co-dispatch parents selected after standalone and actual full-path overlap were measured',
 contract:{...opts,canonCharge:EXPECTED_CHARGE,exactStateKey:'full packed path, all visited path cell axis/visit counts, complete remaining mechanic scalars, full sorted effective config',storedKeyCap:MAX_KEYS,storedCharacterCap:MAX_KEY_CHARS,
  observerMutatesSolver:false,observesScheduledConnectivityOnly:true,
  limitation:'Observer charges no saved work and leaves mutable flood scratch in place. Boolean reuse only; downstream scratch consumer still needs flood. Not independent parent efficacy.'},
 summary,rows};
mkdirSync(path.dirname(path.resolve(arg)),{recursive:true});
writeFileSync(path.resolve(arg),JSON.stringify(report,null,2)+'\n');
console.log('PG-L CONNECTIVITY VERDICT '+JSON.stringify(summary));
