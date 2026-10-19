#!/usr/bin/env node
/**
 * PG-L actual solver: baseline versus exact whole-flood replay, neutral work
 * control and saving mode. No hints, no production default, no chosen winner
 * profile. Only the two already source-nominated development parents here.
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const CORPUS='data/stress/stress-levels-random.json';
const DISPATCH='reports/stress/pg-l-independent-dispatch-24-20261018-001.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const IDS=['R00720','R01584'];
const BUDGET={baseWorkBudget:250000,nodeBudget:250000,timeBudgetMs:600000,strictTotalWorkBudget:true};
const arg=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const assert=(x,m)=>{if(!x)throw Error(m)};
const sha=x=>createHash('sha256').update(x).digest('hex');
function freshStats(){return {lookups:0,misses:0,chronologicalHits:0,
 trueHits:0,falseHits:0,nativeWorkDisplaced:0,storedKeys:0,
 serializedKeyCharacters:0,rawReachRowBytes:0,storageCensored:false}}
function attempt(a){return [a.gateKey??null,a.configKey??null,a.scoringProfileId??null,
 a.beamWidth??null,a.workSpent??null,a.nodesExpanded??null,a.status??null]}
function signature(r){return {ok:r.ok,status:r.status,work:r.workSpent,
 nodes:r.nodesExpanded,solution:JSON.stringify(r.solution),attempts:r.attempts.map(attempt)}}
if(process.argv.includes('--self-test')){
 const s=freshStats();
 assert(s.lookups===0&&s.nativeWorkDisplaced===0&&!s.storageCensored,'stat shape');
 assert(sha('a').length===64,'hash format');
 console.log('PG-L replay A/B harness contract passed');
 process.exit(0);
}
assert(arg,'--out missing');
const bytes=readFileSync(CORPUS),digest=sha(bytes);
assert(digest===SHA,'Corpus2 source SHA mismatch');
const corpus=JSON.parse(bytes),all=Array.isArray(corpus)?corpus:corpus.levels;
const byId=new Map(all.map(x=>[x.id,x]));
const dispatcher=JSON.parse(readFileSync(DISPATCH));
assert(dispatcher.summary.independentParents===24&&dispatcher.summary.bothScorersWidth5000===9
 &&dispatcher.source.corpusSha256===SHA,'source producer changed');
const source=new Map(dispatcher.rows.map(x=>[x.id,x]));
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const solver=createSolver();
const rows=[];
for(const id of IDS){
 const ref=source.get(id),raw=byId.get(id);
 assert(ref?.bothSameWide5000&&raw,'previously frozen source-positive same-width case missing');
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_p,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 assert(level.gateKeys.includes(ref.gateKey),'original gate changed');
 const base=await solver.solveLevel(level,{...BUDGET});
 const statsN=freshStats(),neutral=await solver.solveLevel(level,{
  ...BUDGET,experimentalConnectivityReplay:{mode:'neutral',stats:statsN}});
 const baseSig=signature(base),neutralSig=signature(neutral);
 assert(JSON.stringify(baseSig)===JSON.stringify(neutralSig),
  'PG-L SAME-BUDGET SCRATCH REPLAY SEMANTICS DIVERGED '+id);
 assert(statsN.chronologicalHits>0&&statsN.nativeWorkDisplaced===0
   &&statsN.trueHits+statsN.falseHits===statsN.chronologicalHits
   &&!statsN.storageCensored,'neutral complete source replay/counters invalid '+id);
 const statsS=freshStats(),saving=await solver.solveLevel(level,{
  ...BUDGET,experimentalConnectivityReplay:{mode:'saving',stats:statsS}});
 assert(!statsS.storageCensored&&statsS.chronologicalHits>0
  &&statsS.nativeWorkDisplaced===12*statsS.chronologicalHits,
  'saving replay source/meter identity invalid '+id);
 let refereeValid=null,refereeReason=null;
 if(saving.ok){
  const verdict=solver.validateCandidatePath(level,saving.solution);
  refereeValid=verdict.ok===true;refereeReason=verdict.reason??null;
  assert(refereeValid,'PG-L saving mode proposed invalid path '+id);
 }
 rows.push({id,sourceGate:ref.gateKey,sourcePositiveWidth5000:true,
  control:baseSig,neutral:neutralSig,saving:signature(saving),
  neutralCache:statsN,savingCache:statsS,
  exactNeutralParity:true,refereeValidIfSolved:refereeValid,refereeReason});
 console.log('PG-L REPLAY '+JSON.stringify({
  id,original:base.status,neutral:neutral.status,saving:saving.status,
  neutralHits:statsN.chronologicalHits,savingHits:statsS.chronologicalHits,
  displaced:statsS.nativeWorkDisplaced,baselineWork:base.workSpent,
  savingWork:saving.workSpent,coldGain:!base.ok&&saving.ok
 }));
}
const summary={parents:rows.length,neutralParityPasses:rows.length,
 neutralChronologicalHits:rows.reduce((n,r)=>n+r.neutralCache.chronologicalHits,0),
 savingChronologicalHits:rows.reduce((n,r)=>n+r.savingCache.chronologicalHits,0),
 savingNativeWorkDisplaced:rows.reduce((n,r)=>n+r.savingCache.nativeWorkDisplaced,0),
 baselineSolves:rows.filter(x=>x.control.ok).length,
 savingSolves:rows.filter(x=>x.saving.ok).length,
 sourceSelectedNewColdSolves:rows.filter(x=>!x.control.ok&&x.saving.ok).length,
 sourceSelectedLostColdSolves:rows.filter(x=>x.control.ok&&!x.saving.ok).length,
 anyStorageCensoring:rows.some(x=>x.neutralCache.storageCensored||x.savingCache.storageCensored),
 allSavingResultsRefereeValid:rows.every(x=>!x.saving.ok||x.refereeValidIfSolved===true)};
const output={schema:'pathfinder.pg-l-typed-full-reach-replay-two-parent-ab/v1',
 evidenceRole:'two-result-selected-development-parents-fixed-total-250k-experimental-consumer',
 executionSha:process.env.GITHUB_SHA??null,
 source:{corpusSha256:digest,dispatchLedger:DISPATCH,selectedIds:IDS,
   selection:'two already postselected source-positive development parents; not independent generalization'},
 protocol:{budget:BUDGET,attemptsPerParent:['control','neutral-replay','saving-replay'],
  neutralCharges12PerHit:true,savingChargesZeroOnExactHit:true,
  storesFullSnapshotRowsAndConservativeMechanicPathConfigKey:true,
  forbiddenProductionDefault:true,sourceHintsUsed:false},
 summary,rows};
mkdirSync(path.dirname(path.resolve(arg)),{recursive:true});
writeFileSync(path.resolve(arg),JSON.stringify(output,null,2)+'\n');
console.log('PG-L REPLAY VERDICT '+JSON.stringify(summary));
assert(summary.neutralParityPasses===2&&!summary.anyStorageCensoring
 &&summary.allSavingResultsRefereeValid,'ablation source invariant violation');
