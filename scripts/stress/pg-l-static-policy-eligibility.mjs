#!/usr/bin/env node
/** PG-L: zero-solver-work, current-policy eligibility census of the frozen 8-parent overlap cohort.
 * Static configuration inclusion DOES NOT prove run-time dispatch or double-work headroom.
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createSolver} from '../../modules/solver.js';
import {getConfiguredAttemptConfigs} from '../../modules/solver/attempts.ts';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const assert=(x,s)=>{if(!x)throw Error(s)};
function summarize(configs){
 const a=configs.map((config,i)=>({index:i,profile:config.scoringProfileId,
  beamWidth:config.beamWidth??null,
  technique:config.admissibleOrder?'admissible-order':config.repair?'repair':config.beamWidth?'beam':'dfs',
  bias:config.orderingBias?.id??null,mechanicBucket:!!config.mechanicBucketRetention}));
 const beamConfigs=a.filter(x=>x.technique==='beam'&&!x.bias);
 const targets={};
 for(const profile of ['objectiveFirst','intersectionHarvest']){
  const rows=beamConfigs.filter(x=>x.profile===profile);
  targets[profile]={eligible:rows.length>0,configs:rows,
   exactResearchWidth500:rows.some(x=>x.beamWidth===500)};
 }
 return {total:configs.length,beamConfigCount:beamConfigs.length,targets};
}
if(process.argv.includes('--self-test')){
 const r=summarize([{scoringProfileId:'objectiveFirst',beamWidth:500},
  {scoringProfileId:'intersectionHarvest',beamWidth:500,mechanicBucketRetention:true},
  {scoringProfileId:'objectiveFirst'},{scoringProfileId:'intersectionHarvest',beamWidth:2000,orderingBias:{id:'cw'}}]);
 assert(r.targets.objectiveFirst.exactResearchWidth500,'exact research width');
 assert(r.targets.intersectionHarvest.configs.length===1&&r.targets.intersectionHarvest.configs[0].mechanicBucket,
  'bucket identity must not be lost');
 assert(r.beamConfigCount===2,'exclude DFS/bias');
 console.log('PG-L static policy-slot identity self-test passes');process.exit(0);
}
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);assert(out,'--out required');
installBrowserStubs();
const source=readFileSync('data/stress/stress-levels-random.json');
const checksum=createHash('sha256').update(source).digest('hex');
assert(checksum==='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb',
 'frozen original Corpus-2 changed');
const doc=JSON.parse(source);const all=Array.isArray(doc)?doc:doc.levels;
const ledger=JSON.parse(readFileSync('reports/stress/pg-l-canonical-action-overlap-20261017-001.json','utf8'));
assert(ledger.selection.selected.length===8&&ledger.summary.observerParityAlarms===0,'wrong upstream cohort');
const rawById=new Map(all.map(row=>[row.id,row]));
const solver=createSolver();
let rows=[];
for(const sel of ledger.selection.selected){
 const raw=rawById.get(sel.id);assert(raw,'missing parent '+sel.id);
 const {id:_id,stressMeta:_stressMeta,...levelWire}=raw;
 const level=solver.prepareLevelForSolver(levelWire,{source:'raw'});
 const compiled=getConfiguredAttemptConfigs(level);
 const features=summarize(compiled);
 const original=ledger.parents.find(p=>p.levelId===sel.id);
 assert(original&&level.gateKeys[0]===original.gateKey,'gate no longer matches source');
 rows.push({levelId:sel.id,gateKey:level.gateKeys[0],...features,
  bothEligible:features.targets.objectiveFirst.eligible&&features.targets.intersectionHarvest.eligible,
  bothResearchWidth500:features.targets.objectiveFirst.exactResearchWidth500&&features.targets.intersectionHarvest.exactResearchWidth500,
  bothUnbucketed:features.targets.objectiveFirst.configs.some(c=>!c.mechanicBucket)
    &&features.targets.intersectionHarvest.configs.some(c=>!c.mechanicBucket)});
}
const stats={parents:rows.length,bothScoringActionsEligible:rows.filter(x=>x.bothEligible).length,
 bothResearchWidth500:rows.filter(x=>x.bothResearchWidth500).length,
 bothUnbucketed:rows.filter(x=>x.bothUnbucketed).length,
 noObjective:rows.filter(x=>!x.targets.objectiveFirst.eligible).length,
 noIntersection:rows.filter(x=>!x.targets.intersectionHarvest.eligible).length};
assert(stats.parents===8,'cohort drift');
const verdict={schema:'pathfinder.pg-l-static-policy-eligibility/v1',
 upstreamRunId:39091213935,upstreamSourceCommit:ledger.source.code,
 corpusSha256:checksum,
 source:'current-main getConfiguredAttemptConfigs level-feature policy, no solver run',
 inferenceScope:'eligible ordered config inclusion only; unknown actual attempt dispatch, per-config work allocation, runtime policy participation or work savings',
 summary:stats,rows};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(path.resolve(out),JSON.stringify(verdict,null,2)+'\n');
console.log('PG-L STATIC POLICY VERDICT '+JSON.stringify(stats));
for(const row of rows)console.log('PG-L PARENT '+JSON.stringify({levelId:row.levelId,
  targetWidths:Object.fromEntries(Object.entries(row.targets).map(([k,v])=>[k,v.configs.map(c=>c.beamWidth)]))}));
