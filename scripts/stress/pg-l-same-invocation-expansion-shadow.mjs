#!/usr/bin/env node
/**
 * PG-L: source-frozen, same-solve-invocation cross-scorer chronological
 * *parent-expansion* shadow. Never stores historical results in cold policy.
 *
 * This is an opportunity probe, not a cache: production search still computes
 * EVERY candidate and charges EVERY original canonical work unit. A repeated
 * full path proves equal literal move history within one normalized level,
 * but does NOT authorize a prune, transposition, or replay-invariant proof.
 *
 * Node self-test: node scripts/stress/pg-l-same-invocation-expansion-shadow.mjs --self-test
 * Run: node scripts/run-bundled.mjs scripts/stress/pg-l-same-invocation-expansion-shadow.mjs -- --out=<file>
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const CORPUS='data/stress/stress-levels-random.json';
const SOURCE='reports/stress/pg-l-independent-dispatch-24-20261018-001.json';
const CORPUS_SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const PARENTS=['R00720','R01584']; // first two same-width successes by frozen dispatch order
const PROFILES=['objectiveFirst','intersectionHarvest'];
const WORK=250000,NODES=250000,WALL_MS=600000,MAX_UNIQUE_PATHS=350000;
const assert=(ok,why)=>{if(!ok)throw Error(why)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);

export function chronologyObserver(gateKey){
 const perProfile=new Map(PROFILES.map(p=>[p,new Map()]));
 const seenOther=[];
 const repeatedKeys=new Set();
 const firstByOrdinal=new Map();
 const observedOrdinals=new Set();
 let eligibleRecords=0,allGeneratedRecords=0,allBeamParentEvents=0,ignoredDifferentWidth=0;
 let crossScorerLaterParentExpansions=0,crossScorerLaterWork=0,crossScorerMatchedMinWork=0;
 let sameProfileLaterWork=0,overallKeyChars=0,maxEntries=0;
 const exemplarHashes=[];
 return {
  includeParentExpansionWork:true,
  observe(record){
   if(record.stage!=='generated')return;
   allGeneratedRecords++;
   const ctx=record.attemptContext,parents=record.details?.parentExpansions;
   if(!ctx||!PROFILES.includes(ctx.scoringProfileId)||ctx.gateKey!==gateKey)return;
   if(ctx.beamWidth!==5000){ignoredDifferentWidth++;return;}
   assert(Number.isSafeInteger(ctx.attemptOrdinal)&&ctx.attemptOrdinal>=0,
    'missing stable production ordinal');
   assert(Array.isArray(parents),'missing real parent expansions in source-generated stage');
   eligibleRecords++;observedOrdinals.add(ctx.attemptOrdinal);
   if(!firstByOrdinal.has(ctx.attemptOrdinal))firstByOrdinal.set(ctx.attemptOrdinal,{
    ordinal:ctx.attemptOrdinal,profile:ctx.scoringProfileId,gate:ctx.gateKey,
    beamWidth:ctx.beamWidth,configKey:ctx.configKey,
    mechanicBucketRetention:ctx.mechanicBucketRetention
   });
   const own=perProfile.get(ctx.scoringProfileId);
   const other=perProfile.get(PROFILES.find(p=>p!==ctx.scoringProfileId));
   for(const e of parents){
    assert(Array.isArray(e.path)&&e.path.length>0
      &&Number.isSafeInteger(e.workSpent)&&e.workSpent>=0,
      'invalid native work/path observer record');
    allBeamParentEvents++;
    const key=e.path.join(',');
    const old=own.get(key);
    if(old){
     // These duplicates are within a scorer, never cross-scorer *reuse*.
     sameProfileLaterWork+=e.workSpent;
     continue;
    }
    const prior=other.get(key);
    if(prior){
     assert(prior.ordinal<ctx.attemptOrdinal,
      'same literal parent path crossed scorers without prior producer ordinal');
     crossScorerLaterParentExpansions++;
     crossScorerLaterWork+=e.workSpent;
     crossScorerMatchedMinWork+=Math.min(e.workSpent,prior.work);
     repeatedKeys.add(key);
     if(exemplarHashes.length<4)exemplarHashes.push(sha(key));
     if(seenOther.length<12)seenOther.push({producerOrdinal:prior.ordinal,
      producerProfile:prior.profile,consumerOrdinal:ctx.attemptOrdinal,
      consumerProfile:ctx.scoringProfileId,
      producerWork:prior.work,laterExpansionWork:e.workSpent,fullPathSha256:sha(key)});
    }
    own.set(key,{ordinal:ctx.attemptOrdinal,profile:ctx.scoringProfileId,work:e.workSpent});
    overallKeyChars+=key.length;
    maxEntries++;
    assert(maxEntries<=MAX_UNIQUE_PATHS && overallKeyChars<=50000000,
      'observer storage ceiling exceeded: abstain without economic inference');
   }
  },
  snapshot(){
   const size=Object.fromEntries(PROFILES.map(p=>[p,perProfile.get(p).size]));
   return {allGeneratedRecords,eligibleRecords,ignoredDifferentWidth,allBeamParentEvents,
    observedAttemptOrdinals:[...observedOrdinals].sort((a,b)=>a-b),
    observedAttemptContexts:[...firstByOrdinal.values()].sort((a,b)=>a.ordinal-b.ordinal),
    uniqueFullPathKeysByProfile:size,
    crossScorerLaterParentExpansions,
    crossScorerLaterDistinctPaths:repeatedKeys.size,
    crossScorerLaterWork,crossScorerMatchedMinWork,
    sameProfileLaterWork,maxStoredEntries:maxEntries,maxStoredKeyCharacters:overallKeyChars,
    distinctExamplePathHashes:exemplarHashes,firstChronologicalExamples:seenOther,
    caveat:'Second scorer paid the native parent expansion work after an earlier opposite-scorer expansion of identical full path; not an actual cache hit or proven avoidable work.'};
  }
 };
}

function selfTest(){
 const make=(profile,ordinal,entries,width=5000)=>({
  stage:'generated',attemptContext:{scoringProfileId:profile,attemptOrdinal:ordinal,gateKey:3,beamWidth:width,configKey:'test'},
  details:{parentExpansions:entries.map(([p,w])=>({path:p,workSpent:w}))}
 });
 const c=chronologyObserver(3);
 c.observe(make('objectiveFirst',0,[[[3,4],12],[[3,5],4]]));
 c.observe(make('objectiveFirst',0,[[[3,4],6]]));
 c.observe(make('intersectionHarvest',1,[[[3,4],10],[[3,6],8]]));
 c.observe(make('objectiveFirst',2,[[[3,6],7]],2000)); // different width abstains
 const x=c.snapshot();
 assert(x.crossScorerLaterParentExpansions===1&&x.crossScorerLaterDistinctPaths===1
  &&x.crossScorerLaterWork===10&&x.crossScorerMatchedMinWork===10,'chronology');
 assert(x.sameProfileLaterWork===6&&x.ignoredDifferentWidth===1,'same-scorer and width separation');
 assert(JSON.stringify(x.observedAttemptOrdinals)===JSON.stringify([0,1]),'ordinals');
 assert(x.maxStoredEntries===4&&x.uniqueFullPathKeysByProfile.objectiveFirst===2,'unique mapping');
 console.log('PG-L same-invocation chronological shadow self-test passed');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
assert(out,'--out=<file> required');
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const bytes=readFileSync(CORPUS),corpusSha=sha(bytes);
assert(corpusSha===CORPUS_SHA,'frozen Corpus-2 source revision changed');
const data=JSON.parse(bytes),levels=Array.isArray(data)?data:data.levels;
const byId=new Map(levels.map(row=>[row.id,row]));
const dispatch=JSON.parse(readFileSync(SOURCE));
assert(dispatch.summary.independentParents===24&&dispatch.summary.bothScorersWidth5000===9
 &&dispatch.source.corpusSha256===CORPUS_SHA,'source-frozen PG-L dispatch ledger changed');
const srcById=new Map(dispatch.rows.map(r=>[r.id,r]));
const solver=createSolver();
const cells=[];
const budget={baseWorkBudget:WORK,nodeBudget:NODES,timeBudgetMs:WALL_MS,
 strictTotalWorkBudget:true};
function attemptShape(a){
 return [a.gateKey??null,a.configKey??null,a.scoringProfileId??null,
  a.beamWidth??null,a.workSpent??null,a.nodesExpanded??null,a.status??null];
}
function controlShape(r){
 return {ok:r.ok,status:r.status,workSpent:r.workSpent,nodesExpanded:r.nodesExpanded,
  path:JSON.stringify(r.solution),attempts:r.attempts.map(attemptShape)};
}
for(const id of PARENTS){
 const src=srcById.get(id),raw=byId.get(id);
 assert(src&&raw&&src.bothSameWide5000,'selected parent no longer in precommitted co-dispatch');
 const match=PROFILES.map(profile=>src.positiveWorkTargetBeams.filter(a=>
  a.profile===profile&&a.width===5000&&a.gate===src.gateKey&&a.work>0));
 assert(match.every(a=>a.length===1),'source both profiles must have exact same gate/width');
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_prov,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 assert(level.gateKeys.includes(src.gateKey),'actual source gate no longer reachable');
 const before=await solver.solveLevel(level,{...budget});
 const obs=chronologyObserver(src.gateKey);
 const withObserver=await solver.solveLevel(level,{...budget,beamResearchObserver:obs});
 const beforeShape=controlShape(before),observedShape=controlShape(withObserver);
 assert(JSON.stringify(beforeShape)===JSON.stringify(observedShape),
  'OBSERVER CHANGED SOLVER STATUS, WIN, CANONICAL WORK, NODES OR ATTEMPT IDENTITY '+id);
 const snap=obs.snapshot();
 const actual=withObserver.attempts.filter(a=>a.gateKey===src.gateKey
  &&a.beamWidth===5000&&PROFILES.includes(a.scoringProfileId)
  &&Number(a.workSpent)>0);
 const byProfile=Object.fromEntries(PROFILES.map(p=>
  [p,actual.filter(a=>a.scoringProfileId===p).length]));
 const bothPositive=PROFILES.every(p=>byProfile[p]>0);
 cells.push({parentId:id,sourceProductionGate:src.gateKey,
  sourcePositiveTargetWork:match.map(xs=>xs[0].work),
  control:beforeShape,sourceActualTargetAttempts:actual.map(attemptShape),
  realBothPositiveSameWidth:bothPositive,byProfile,
  shadow:snap,observerParityPassed:true});
 console.log('PG-L SAME INVOCATION '+JSON.stringify({
  id,bothPositive,byProfile,crossScorerLaterParentExpansions:snap.crossScorerLaterParentExpansions,
  laterWork:snap.crossScorerLaterWork,minMatchedWork:snap.crossScorerMatchedMinWork,
  storageKeys:snap.maxStoredEntries,allWork:withObserver.workSpent,status:withObserver.status
 }));
}
const eligible=cells.filter(x=>x.realBothPositiveSameWidth);
const summary={frozenIndependentParents:PARENTS.length,completedParents:cells.length,
 observerParityPasses:cells.length,sourcePositiveCoDispatchParents:eligible.length,
 crossScorerLaterParents:eligible.filter(x=>x.shadow.crossScorerLaterParentExpansions>0).length,
 chronologicalCrossScorerDuplicateParentExpansions:cells.reduce((a,x)=>a+x.shadow.crossScorerLaterParentExpansions,0),
 chronologicalLaterExpansionCanonicalWork:cells.reduce((a,x)=>a+x.shadow.crossScorerLaterWork,0),
 chronologicalMatchedMinCanonicalWork:cells.reduce((a,x)=>a+x.shadow.crossScorerMatchedMinWork,0),
 passes1000WorkPrecommit:eligible.some(x=>x.shadow.crossScorerLaterWork>=1000),
 anyObserverCensoring:false};
const output={schema:'pathfinder.pg-l-same-invocation-cross-scorer-parent-work/v1',
 evidenceRole:'bounded-development-canary',sourceExecutionSha:process.env.GITHUB_SHA??null,
 input:{corpus:CORPUS,corpusSha256:corpusSha,productionDispatchLedger:SOURCE,
  selectedParents:PARENTS,gateChoice:'source-first actual production gate from frozen dispatch'},
 contract:{budget,observerInert:true,parentKeys:'full literal packed path within same level and gate',memoryKeysCeiling:MAX_UNIQUE_PATHS,
  noHints:true,precommitPassWork:1000,
  noSolverImplementationChange:true,
  caveat:'A replayed parent expansion is only an opportunity shadow. Any actual cache must match complete mechanic prerequisites and be charged under matched TOTAL cold work.'},
 summary,rows:cells};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(path.resolve(out),JSON.stringify(output,null,2)+'\n');
console.log('PG-L SAME INVOCATION VERDICT '+JSON.stringify(summary));
assert(cells.length===2&&cells.every(c=>c.observerParityPassed),'pilot incomplete');
