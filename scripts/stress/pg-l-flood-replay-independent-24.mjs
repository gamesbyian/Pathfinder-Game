#!/usr/bin/env node
/**
 * PG-L actual solver: baseline versus exact whole-flood replay, neutral work
 * control and saving mode. No hints, no production default, no chosen winner
 * profile. 24 prospectively source-only heldout parents from the frozen manifest.
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const CORPUS='data/stress/stress-levels-random.json';
const FREEZE='reports/stress/pg-l-flood-replay-independent-24-source-freeze-20261019-001.json';
const SHA='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
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
const freeze=JSON.parse(readFileSync(FREEZE));
assert(freeze.independentParentCount===24&&freeze.selected?.length===24
 &&freeze.corpusSha256===SHA&&freeze.selector?.sourceSelectionAlgorithmPrecommittedBeforeReplayResults,
 'independent source-only manifest identity changed');
const ordered=freeze.selected.map(x=>{
 const record=all[x.sourceIndex];
 assert(record?.id===x.id,'frozen source index/id mismatch: '+x.id);
 return x.id;
});
assert(new Set(ordered).size===24,'duplicate independent parent');
installBrowserStubs();
const {createSolver}=await import('../../modules/solver.js');
const solver=createSolver();
const rows=[];
for(const id of ordered){
 const raw=byId.get(id);
 assert(raw,'frozen source-only parent missing');
 const {id:_id,hints:_h,hintRecords:_hr,stressMeta:_sm,provenance:_p,...mechanics}=raw;
 const level=solver.prepareLevelForSolver(mechanics,{source:'raw'});
 assert(level.gateKeys.length>0,'source missing gate');
 const base=await solver.solveLevel(level,{...BUDGET});
 const statsN=freshStats(),neutral=await solver.solveLevel(level,{
  ...BUDGET,experimentalConnectivityReplay:{mode:'neutral',stats:statsN}});
 const baseSig=signature(base),neutralSig=signature(neutral);
 assert(JSON.stringify(baseSig)===JSON.stringify(neutralSig),
  'PG-L SAME-BUDGET SCRATCH REPLAY SEMANTICS DIVERGED '+id);
 assert(statsN.nativeWorkDisplaced===0
   &&statsN.trueHits+statsN.falseHits===statsN.chronologicalHits
   &&!statsN.storageCensored,'neutral complete source replay/counters invalid '+id);
 const statsS=freshStats(),saving=await solver.solveLevel(level,{
  ...BUDGET,experimentalConnectivityReplay:{mode:'saving',stats:statsS}});
 assert(!statsS.storageCensored
  &&statsS.nativeWorkDisplaced===12*statsS.chronologicalHits,
  'saving replay source/meter identity invalid '+id);
 let refereeValid=null,refereeReason=null;
 if(saving.ok){
  const verdict=solver.validateCandidatePath(level,saving.solution);
  refereeValid=verdict.ok===true;refereeReason=verdict.reason??null;
  assert(refereeValid,'PG-L saving mode proposed invalid path '+id);
 }
 rows.push({id,sourceGate:level.gateKeys[0],independentSourceFrozen:true,
  control:baseSig,neutral:neutralSig,saving:signature(saving),
  neutralCache:statsN,savingCache:statsS,
  exactNeutralParity:true,refereeValidIfSolved:refereeValid,refereeReason});
 console.log('PG-L INDEPENDENT REPLAY '+JSON.stringify({
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
 independentlyNewWithinPaired250k:rows.filter(x=>!x.control.ok&&x.saving.ok).length,
 independentlyLostWithinPaired250k:rows.filter(x=>x.control.ok&&!x.saving.ok).length,
 anyStorageCensoring:rows.some(x=>x.neutralCache.storageCensored||x.savingCache.storageCensored),
 allSavingResultsRefereeValid:rows.every(x=>!x.saving.ok||x.refereeValidIfSolved===true)};
const output={schema:'pathfinder.pg-l-prospective-independent-flood-replay-24-matched-ab/v1',
 evidenceRole:'prospectively-source-frozen-24-independent-matched-total-work-experimental-consumer',
 executionSha:process.env.GITHUB_SHA??null,
 source:{corpusSha256:digest,sourceOnlyManifest:FREEZE,selectedIds:ordered,
   selection:'precommitted source-only affine index permutation, 24 independent parents; no status, hint or winner selection'}, 
 protocol:{budget:BUDGET,attemptsPerParent:['control','neutral-replay','saving-replay'],
  neutralCharges12PerHit:true,savingChargesZeroOnExactHit:true,
  storesFullSnapshotRowsAndConservativeMechanicPathConfigKey:true,
  forbiddenProductionDefault:true,sourceHintsUsed:false},
 summary,rows};
mkdirSync(path.dirname(path.resolve(arg)),{recursive:true});
writeFileSync(path.resolve(arg),JSON.stringify(output,null,2)+'\n');
console.log('PG-L INDEPENDENT REPLAY VERDICT '+JSON.stringify(summary));
assert(summary.neutralParityPasses===24&&!summary.anyStorageCensoring
 &&summary.allSavingResultsRefereeValid,'ablation source invariant violation');
