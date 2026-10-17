#!/usr/bin/env node
/** Read-only frozen PG-H exact-DEAD child descendant-work audit. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {createSolver,SOLVER_TESTING_API as api} from '../../modules/solver.js';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';
const args=new Map(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const i=x.indexOf('=');return i<0?[x,null]:[x.slice(0,i),x.slice(i+1)];}));
function check(x,s){if(!x)throw Error(s);}
function hasPrefix(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length<b.length)return false;for(let i=0;i<b.length;i++)if(a[i]!==b[i])return false;return true;}
if(args.has('--self-test')){check(hasPrefix([1,2,3],[1,2])&&!hasPrefix([1,2,3],[1,4]),'prefix');check(!hasPrefix([1],[1,2])&&hasPrefix([1,2],[1,2]),'boundary');console.log('PG-H DESCENDANT SELF TEST PASS');process.exit(0);}
const output=args.get('--out'),captureFile=args.get('--capture'),casesFile=args.get('--cases'),corpusFile=args.get('--corpus')||'data/stress/stress-levels-random.json';
if(!output||!captureFile||!casesFile)throw Error('--out, --capture, --cases required');
installBrowserStubs();
const Solver=createSolver();
const frozen=JSON.parse(readFileSync(captureFile,'utf8'));
const questions=JSON.parse(readFileSync(casesFile,'utf8'));
const corpus=JSON.parse(readFileSync(corpusFile,'utf8'));
const levels=Array.isArray(corpus)?corpus:corpus.levels;
const byId=new Map(levels.map(x=>[x.id,x]));
check(frozen.summary.parents===8&&frozen.summary.selectedStates===16&&frozen.summary.childCases===35,'changed frozen capture');
check(questions.cases.length===35&&new Set(questions.cases.map(x=>x.id)).size===35,'changed frozen cases');
const selected=new Map();
for(const c of questions.cases){
 const list=selected.get(c.levelId)||[];
 list.push({id:c.id,levelId:c.levelId,prefix:c.prefix,source:c.source,
  expandedParents:0,descendantExpansionWork:0,deepestExpandedRawDepth:null});
 selected.set(c.levelId,list);
}
check(selected.size===8,'wrong independent parents');
const profile=api.SCORING_PROFILES.objectiveFirst;
if(!profile)throw Error('missing objectiveFirst');
const cases=[],parents=[];
for(const parent of frozen.parents){
 const source=byId.get(parent.levelId);check(source,'missing '+parent.levelId);
 const {id:_id,stressMeta:_stressMeta,provenance:_prov,...wire}=source;
 const level=Solver.prepareLevelForSolver(wire,{source:'raw'});
 const targets=selected.get(parent.levelId);
 const gates=[];
 for(const frozenGate of parent.gates){
  const gateKey=frozenGate.gateKey;
  const relevant=targets.filter(t=>t.id.includes(':g'+gateKey+':'));
  const prep=api.prepLevel(level);
  prep._cfg=null;prep._metrics={nodesExpanded:0};
  const startWork=prep._workMeter.units;
  prep._workCap=startWork+500000;
  let expansionEvents=0,matchingParentEvents=0,uniqueMatchedWork=0;
  prep._beamResearchObserver={includeParentExpansionWork:true,observe(record){
    if(record.stage!=='generated'||!Array.isArray(record.details?.parentExpansions))return;
    for(const ev of record.details.parentExpansions){
     if(!Array.isArray(ev.path))continue;
     expansionEvents++;
     const matched=relevant.filter(t=>hasPrefix(ev.path,t.prefix));
     if(!matched.length)continue;
     matchingParentEvents++;
     const cost=Number(ev.workSpent)||0;
     uniqueMatchedWork+=cost;
     for(const t of matched){
      t.expandedParents++;
      t.descendantExpansionWork+=cost;
      const depth=ev.path.length-1;
      t.deepestExpandedRawDepth=Math.max(depth,t.deepestExpandedRawDepth??depth);
     }
    }
  }};
  const out={},started=Date.now();
  const found=await api.beamSearchFromGate(gateKey,level,prep,profile,600000,started,null,500,null,false,out,Infinity,undefined,undefined,true);
  prep._beamResearchObserver=null;
  const workSpent=prep._workMeter.units-startWork;
  check(workSpent===frozenGate.workSpent,parent.levelId+': changed canonical work '+workSpent+' vs '+frozenGate.workSpent);
  const result={gateKey,workSpent,sourceWorkSpent:frozenGate.workSpent,
    status:found?'solved':out.pausedContinuation?'work-budget-phase-boundary':out.timedOut?'timed-out':'exhausted',
    selectedCases:relevant.length,expansionEvents,matchingParentEvents,uniqueMatchedWork};
  gates.push(result);
  console.log('PG-H DESCENDANT GATE '+JSON.stringify({levelId:parent.levelId,...result}));
 }
 parents.push({levelId:parent.levelId,gates});
 cases.push(...targets);
}
check(cases.length===35&&new Set(cases.map(x=>x.id)).size===35,'coverage changed');
const expanded=cases.filter(x=>x.expandedParents>0);
const attemptWork=parents.reduce((s,p)=>s+p.gates.reduce((n,g)=>n+g.workSpent,0),0);
const matchedWork=parents.reduce((s,p)=>s+p.gates.reduce((n,g)=>n+g.uniqueMatchedWork,0),0);
const report={
 schema:'pathfinder.pg-h-dead-descendant-work/v1',
 sourceCases:casesFile,sourceCapture:captureFile,
 selection:'unchanged 35 frozen deep child cases; only passive beam observation',
 protocol:{profile:'objectiveFirst',width:500,perGateCanonicalWorkBudget:500000,sourceWorkEqualityAsserted:true},
 summary:{parents:parents.length,groups:frozen.summary.selectedStates,cases:cases.length,
  childCasesWithLaterParentExpansion:expanded.length,
  childCasesWithoutLaterParentExpansion:cases.length-expanded.length,
  uniqueParentsWithLaterExpansion:new Set(expanded.map(x=>x.levelId)).size,
  totalAttemptWork:attemptWork,uniqueDescendantExpansionWork:matchedWork,
  descendantWorkShare:attemptWork?matchedWork/attemptWork:null,
  caseSummedWorkMayDoubleCount:cases.reduce((n,x)=>n+x.descendantExpansionWork,0)},
 parents,cases
};
mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log('PG-H DESCENDANT VERDICT '+JSON.stringify({...report,parents:undefined,cases:undefined}));
