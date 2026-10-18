#!/usr/bin/env node
/**
 * PG-J exact-prefix mechanic microscope. Replays all four previously labelled
 * P00137 topology forks through the canonical normalized solver state/prune
 * primitives, never using the exact labels for routing, moves or policy.
 *
 * Run with supported esbuild boundary:
 * node scripts/run-bundled.mjs scripts/stress/pg-j-exact-prefix-mechanic-replay.mjs -- \
 *   --out=tmp/pg-j-exact-prefix-mechanic-replay.json
 */
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const sources=[
  'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
  'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
  'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',
];
const corpusPath='data/levels.json';
const expect=(condition,message)=>{if(!condition)throw Error(message);};
const arg=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const reference=[];
const sourceIds=[];
for(const file of sources){
 const buf=readFileSync(file),doc=JSON.parse(buf.toString('utf8'));
 expect(doc.summary?.correctnessAlarms===0&&doc.summary?.inputAlarms===0,'source exact oracle alarms: '+file);
 sourceIds.push({path:file,sha256:createHash('sha256').update(buf).digest('hex')});
 for(const r of doc.rows??[])if(r.levelId==='P00137')reference.push({...r,sourceFile:file});
}
const unique=new Map();
for(const r of reference){
 const key=JSON.stringify([r.levelId,r.prefix]);
 const prev=unique.get(key);
 if(prev)expect(prev.referenceLabel===r.referenceLabel,'contradictory source label');
 else unique.set(key,r);
}
const cases=[...unique.values()].sort((a,b)=>a.caseId.localeCompare(b.caseId));
expect(cases.length===4,'expected four exact P00137 prefix identities');
expect(cases.filter(x=>x.referenceLabel==='live').length===2
 &&cases.filter(x=>x.referenceLabel==='dead').length===2,'expected exact mixed-fate source pairs');
const levelBuf=readFileSync(corpusPath);
const levels=JSON.parse(levelBuf.toString('utf8'));
const raw=levels.find(l=>l.id==='P00137');
expect(raw,'source parent puzzle missing');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const Solver=createSolver();
const level=Solver.prepareLevelForSolver(raw,{source:'raw'});
const records=[];
for(const r of cases){
 const prep=api.prepLevel(level);prep._cfg=null;
 const keys=r.prefix.map(([x,y])=>api.PACK(x-1,y-1));
 const state=api.createState(keys[0],level,prep);
 let firstPrune=null,firstMissingNeighbor=null,portalMoves=0;
 const steps=[];
 for(let i=1;i<keys.length;i++){
   const from=state.path.at(-1),next=keys[i];
   const legal=api.getNeighbors(from,state,level,prep).includes(next);
   if(!legal&&firstMissingNeighbor===null)firstMissingNeighbor=i;
   const portal=level.portalMap.get(from);
   const portalJump=!!(portal&&portal.dest===next);
   if(portalJump)portalMoves++;
   api.applyMove(next,state,level,prep,portalJump);
   const length=api.getRealLengthFromState(state);
   const diagnostics={reached:{},rejected:{}};
   const verdict=api.evaluatePrunedMove(next,length,state,level,prep,null,true,{diagnostics});
   const verdictReasons=Object.keys(diagnostics.rejected);
   if(firstPrune===null&&verdict==='reject')
     firstPrune={index:i,reasonIds:verdictReasons,stepLength:length};
   steps.push({index:i,legal,realLength:length,position:next,
      ints:state.ints,mpVisitedMask:state.mpVisitedMask,
      mustCrossMask:state.mustCrossMask,flipperUsedMask:state.flipperUsedMask,
      portalJumps:state.portalJumps,verdict,rejectIds:verdictReasons,
      mustPassLB:api.mustPassLowerBound(next,state,level,prep),
      mustCrossLB:api.mustCrossLowerBound(next,state,level,prep),
      workSpent:prep._workMeter.units});
 }
 const end=state.path.at(-1),length=api.getRealLengthFromState(state);
 records.push({
  caseId:r.caseId,sourceFile:r.sourceFile,referenceLabel:r.referenceLabel,
  referenceProof:r.referenceReason,depth:r.depth,prefix:r.prefix,
  final:{position:end,length,remainingLength:level.requiredLength-length,
    ints:state.ints,requiredIntersections:level.requiredIntersections,
    mpVisitedMask:state.mpVisitedMask,mustCrossMask:state.mustCrossMask,
    flipperUsedMask:state.flipperUsedMask,portalJumps:state.portalJumps,
    mustPassLB:api.mustPassLowerBound(end,state,level,prep),
    mustCrossLB:api.mustCrossLowerBound(end,state,level,prep)},
  replay:{allPrefixMovesAccepted:firstMissingNeighbor===null,
    firstMissingNeighbor,firstPrune,portalMoves,workSpent:prep._workMeter.units},
  steps
 });
}
const summary={
 independentParents:1,cases:records.length,exactLive:2,exactDead:2,
 replayLegal:records.filter(r=>r.replay.allPrefixMovesAccepted).length,
 livePruned:records.filter(r=>r.referenceLabel==='live'&&r.replay.firstPrune).length,
 deadPruned:records.filter(r=>r.referenceLabel==='dead'&&r.replay.firstPrune).length,
 firstPruneByCase:Object.fromEntries(records.map(r=>[r.caseId,r.replay.firstPrune])),
};
const report={
 schema:'pathfinder.pg-j-exact-prefix-mechanic-microscope/v1',
 evidenceRole:'selected-retrospective-mechanic-microscope',sourceHead:process.env.GITHUB_SHA??null,
 sourceFiles:sourceIds,levelFile:corpusPath,
 levelSha256:createHash('sha256').update(levelBuf).digest('hex'),
 selection:'all four P00137 exact-labelled source prefixes, selected as previous geometry-interface counterexample; labels never steer replay',
 protocol:'canonical createState/getNeighbors/applyMove, per-move diagnostic evaluatePrunedMove with runConnectivity=true; diagnostic repeated stage checks are not a production search schedule',
 summary,rows:records,
 limitations:'Single historical human level, selected by opposite-fate labels; no production search execution, no matched-work economics or new cold solve. Reasons are evaluated retrospectively, not guaranteed identical to any beam scheduling decision.'
};
expect(records.every(r=>r.replay.allPrefixMovesAccepted),
  'canonical search move enumerator disagrees with exact-labelled legal source prefix');
const target=path.resolve(arg??'');
expect(arg,'--out=<path> required');
mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log('PG-J MECHANIC MICRO '+JSON.stringify(summary));
