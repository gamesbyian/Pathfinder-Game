#!/usr/bin/env node
/**
 * PG-K: research-only, hint-assisted DEAD-prefix segment-revision falsifier.
 * Accepted hints are used only to NOMINATE bounded same-endpoint segment
 * substitutions and already-available solution suffixes; never runtime policy.
 * An exactly labelled DEAD input is not relabelled by an unverified prefix.
 * Only native PLAY-referee accepted complete patched paths prove restoration.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {readLevelCorpusDocumentWithHints} from '../level-data-io.mjs';
import {installBrowserStubs} from '../test-lib/browser-stubs.mjs';

const inputFile='reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json';
const corpusFile='data/stress/stress-levels-random.json';
const maxHintPaths=20,maxSpan=12,maxCandidatesPerCase=256;
const checksum=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const key=p=>p[0]+','+p[1];
const packed=p=>(p[0]-1)|((p[1]-1)<<16);
const unpacked=p=>[(p&65535)+1,(p>>>16)+1];
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const assert=(a,s)=>{if(!a)throw Error(s);};
function generateRevisions(dead,hint,span=maxSpan){
 const changes=[],positions=new Map();
 for(let i=0;i<hint.length;i++){const k=key(hint[i]);const a=positions.get(k)||[];a.push(i);positions.set(k,a);}
 for(let a=4;a+5<dead.length;a++){
  const anchors=positions.get(key(dead[a]))||[];
  for(let b=a+3;b<dead.length-4&&b<=a+span;b++){
   const n=b-a;
   for(const i of anchors){
    const j=i+n;if(j>=hint.length||key(hint[j])!==key(dead[b]))continue;
    const replacement=hint.slice(i+1,j);
    if(replacement.every((p,k)=>key(p)===key(dead[a+1+k])))continue;
    const revised=dead.slice(0,a+1).concat(replacement,dead.slice(b));
    assert(revised.length===dead.length,'segment changed raw length');
    assert(key(revised[0])===key(dead[0])&&key(revised.at(-1))===key(dead.at(-1)),'interface changed');
    changes.push({a,b,hintStart:i,hintEnd:j,prefix:revised});
   }
  }
 }
 return changes;
}
function runSelfTest(){
 const dead=[[0,3],[1,3],[2,3],[3,3],[4,3],[4,4],[5,4],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3]];
 const hint=[[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[5,2],[6,2],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3]];
 const out=generateRevisions(dead,hint);
 assert(out.some(x=>x.a===4&&x.b===8),'must discover true same-interface interior change');
 assert(out.every(x=>x.prefix.length===dead.length),'preserve length');
 assert(generateRevisions(dead,dead).length===0,'no-op must abstain');
 console.log('PG-K segment revision pure geometry tests passed');
}
if(process.argv.includes('--self-test')){runSelfTest();process.exit(0)}
const outputArg=process.argv.find(x=>x.startsWith('--out='));
assert(outputArg,'--out path required');
installBrowserStubs();
const {createSolver,SOLVER_TESTING_API:api}=await import('../../modules/solver.js');
const {validateCandidatePath}=await import('../../modules/domain/path-validator.ts');
const Solver=createSolver();
const doc=JSON.parse(readFileSync(inputFile,'utf8'));
assert(doc.summary?.cases===75&&doc.summary?.independentParents===25,'frozen exact cohort changed');
assert(doc.summary?.live===0&&doc.summary?.dead===75&&doc.summary?.abstain===0,'changed exact labels');
assert(doc.summary?.correctnessAlarms===0&&doc.summary?.inputAlarms===0,'source correctness alarms');
assert(doc.rows.length===75&&doc.rows.every(x=>x.referenceLabel==='dead'&&x.cpSatStatus==='INFEASIBLE'),
 'invalid EXACT-DEAD population');
const {levels:fromCorpus}=readLevelCorpusDocumentWithHints(path.resolve(corpusFile));
const byLevel=new Map(fromCorpus.map(x=>[x.id,x]));
const group=new Map();
for(const r of doc.rows){let g=group.get(r.levelId)||[];g.push(r);group.set(r.levelId,g)}
assert(group.size===25,'changed parent population');
const reportRows=[];let testedFullPaths=0,rawRevisions=0;
for(const [levelId,deadCases] of group){
 const source=byLevel.get(levelId);assert(source,'missing corpus parent '+levelId);
 const {id:_id,stressMeta:_sm,hintRecords:_hr,hints:_h,...raw}=source;
 const level=Solver.prepareLevelForSolver(raw,{source:'raw'});
 const available=(source.hintRecords||[]).map(h=>h.path).filter(p=>Array.isArray(p)&&p.length>1).slice(0,maxHintPaths);
 const usable=available.filter(p=>validateCandidatePath(level,p).ok);
 const rawHints=usable.map(p=>p.map(unpacked));
 const prep=api.prepLevel(level);prep._cfg=null;
 const isMoveLegalPrefix=(p)=>{
  const state=api.createState(p[0],level,prep);
  for(let i=1;i<p.length;i++){
   const before=p[i-1],next=p[i];
   if(!api.getNeighbors(before,state,level,prep).includes(next))return false;
   const port=level.portalMap.get(before);
   const jump=!!(port&&!state.lastWasPortalJump&&port.dest===next);
   api.applyMove(next,state,level,prep,jump);
  }
  return true;
 };
 let parentAccepted=0;
 for(const deadCase of deadCases){
  const original=deadCase.prefix;const originalPacked=original.map(packed);
  let proposed=[];
  for(let h=0;h<rawHints.length;h++)for(const rev of generateRevisions(original,rawHints[h]))proposed.push({...rev,proposalHint:h});
  const uniq=new Map();
  for(const p of proposed){const fingerprint=hash(p.prefix);if(!uniq.has(fingerprint))uniq.set(fingerprint,{...p,fingerprint})}
  rawRevisions+=uniq.size;
  const ranked=[...uniq.values()].sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint)).slice(0,maxCandidatesPerCase);
  const baselineHintHash=new Set(usable.map(h=>hash(h)));
  let candidateAnchors=0,attempts=0,accepted=[],distinctCandidatePaths=new Set();
  let moveLegalRevisedPrefixes=0,moveIllegalRevisedPrefixes=0;
  assert(isMoveLegalPrefix(originalPacked),'original CP-SAT-DEAD prefix is not move-legal under current solver '+deadCase.caseId);
  for(const rev of ranked){
   const revisedPacked=rev.prefix.map(packed);
   const moveLegal=isMoveLegalPrefix(revisedPacked);
   if(moveLegal)moveLegalRevisedPrefixes++;
   else{moveIllegalRevisedPrefixes++;continue;}
   const endpoint=rev.prefix.at(-1);
   for(let h=0;h<rawHints.length;h++){
    const hint=rawHints[h],hintPacked=usable[h];
    for(let k=0;k<hint.length-1;k++){
     if(key(hint[k])!==key(endpoint))continue;
     candidateAnchors++;
     const full=revisedPacked.concat(hintPacked.slice(k+1));
     const fullHash=hash(full);
     if(distinctCandidatePaths.has(fullHash))continue;
     distinctCandidatePaths.add(fullHash);
     attempts++;testedFullPaths++;
     const check=validateCandidatePath(level,full);
     if(!check.ok)continue;
     assert(!baselineHintHash.has(fullHash),'new full path must not simply replay a stored hint');
     assert(!full.slice(0,originalPacked.length).every((p,i)=>p===originalPacked[i]),'revision missing');
     accepted.push({revision:{a:rev.a,b:rev.b,proposalHint:rev.proposalHint,hintStart:rev.hintStart,hintEnd:rev.hintEnd},
      suffixHint:h,suffixAt:k,solutionPath:full,solutionHash:fullHash});
    }
   }
  }
  parentAccepted+=accepted.length;
  reportRows.push({levelId,caseId:deadCase.caseId,deadPrefixRawDepth:original.length-1,
   sourceReferenceLabel:deadCase.referenceLabel,
   usableHistoricHints:usable.length,totalDistinctRevisionProposals:uniq.size,
   proposalsExamined:ranked.length,moveLegalRevisedPrefixes,moveIllegalRevisedPrefixes,
   suffixAnchorOccurrences:candidateAnchors,
   distinctFullPathChecks:attempts,acceptedNovelRevisions:accepted.length,
   accepted:accepted.slice(0,4)});
 }
 console.log('PG-K PARENT '+JSON.stringify({levelId,exactDeadCases:deadCases.length,
  usableHints:usable.length,acceptedRevisions:parentAccepted}));
}
const parentsWithAccepted=[...new Set(reportRows.filter(r=>r.acceptedNovelRevisions).map(r=>r.levelId))];
const verdict={schema:'pathfinder.pg-k-dead-prefix-commuting-revision-opportunity/v1',
 source:{exactLabels:inputFile,sha256:checksum(inputFile),corpus:corpusFile,corpusSha256:checksum(corpusFile)},
 design:{selectedParents:25,exactDeadPrefixes:75,selection:'all exact-DEAD frozen class-5 multi-parent cases, no fate-conditioned subset',
  hintPolicy:'historical accepted hints nominate both segment revisions and completing suffix; offline evidence ONLY, strictly forbidden as runtime inputs',
  segment:'same endpoint pair, same RAW path transitions (including portal edges), edited interior, unchanged >=4 raw moves at prefix and suffix',
  caps:{maxHintPaths,maxSpan,maxCandidatesPerCase},ranking:'sha256 of complete patched-prefix geometry, outcome-blind',
  outcome:'only native PLAY-referee accepted COMPLETE patched paths count as restored, not syntactic prefix or CP-SAT UNKNOWN'},
 summary:{parents:group.size,cases:reportRows.length,casesWithHint:reportRows.filter(r=>r.usableHistoricHints>0).length,
  casesWithRevisionProposals:reportRows.filter(r=>r.totalDistinctRevisionProposals>0).length,
  distinctRevisionProposals:rawRevisions,examinedProposals:reportRows.reduce((n,r)=>n+r.proposalsExamined,0),
  fullPathChecks:testedFullPaths,
  moveLegalRevisedPrefixes:reportRows.reduce((n,r)=>n+r.moveLegalRevisedPrefixes,0),
  moveIllegalRevisedPrefixes:reportRows.reduce((n,r)=>n+r.moveIllegalRevisedPrefixes,0),
  casesWithMoveLegalRevision:reportRows.filter(r=>r.moveLegalRevisedPrefixes>0).length,
  acceptedNovelRevisions:reportRows.reduce((n,r)=>n+r.acceptedNovelRevisions,0),
  casesWithAccepted:reportRows.filter(r=>r.acceptedNovelRevisions>0).length,
  parentsWithAccepted:parentsWithAccepted.length,acceptedParents:parentsWithAccepted},
 rows:reportRows,
 caveats:['Historically guided repair is NOT a new cold solve; it only measures reference-guided segment-revision capability.',
  'Move-legal revised prefixes are NOT oracle LIVE: they can still be provably DEAD under coupled obligations or exact length/intersection requirements.',
  'A failed native complete path may still be a legitimate, completable revised prefix; no DEAD claim is made for a patch.',
  'Raw-length-preserving substitutions do not guarantee game-counted length on portal boards; native referee decides.',
  'First 256 unique geometry candidates per DEAD case, ranked outcome-blind; zero result would only close this bounded constructor.']};
assert(verdict.summary.cases===75,'incomplete case coverage');
const filename=path.resolve(outputArg.slice('--out='.length));
mkdirSync(path.dirname(filename),{recursive:true});
writeFileSync(filename,JSON.stringify(verdict,null,2)+'\n');
console.log('PG-K VERDICT '+JSON.stringify(verdict.summary));
