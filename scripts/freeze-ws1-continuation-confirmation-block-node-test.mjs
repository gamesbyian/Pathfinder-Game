import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectWs1ConfirmationCandidates, freezeWs1ConfirmationBlocks } from './freeze-ws1-continuation-confirmation-block.mjs';

const root=mkdtempSync(path.join(os.tmpdir(),'ws1-confirmation-freeze-'));
const families=path.join(root,'data','families');
mkdirSync(families,{recursive:true});

function addFamily(parentId,parentCorpus,mode,variants){
  const stem=`family-${parentId}-${mode}`;
  const manifest={
    familyId:stem,parentLevelId:parentId,parentCorpus,
    parentContentHash:`v2:parent-${parentId}`,familyMode:mode,
    variants:variants.map(([id,hash])=>({variantId:id,variantContentHash:hash})),
  };
  writeFileSync(path.join(families,`${stem}-manifest.json`),JSON.stringify(manifest));
  writeFileSync(path.join(families,`${stem}.json`),JSON.stringify(
    variants.map(([id])=>({id,grid:{w:3,h:3},gates:[{x:0,y:0}],goal:{x:2,y:2},reqLen:5,reqInt:0}))
  ));
}
for(let i=1;i<=8;i++){
  const id=`P${String(i).padStart(5,'0')}`;
  addFamily(id,'data/levels.json','symmetry',[[`${id}-s1`,`v2:a-${i}`],[`${id}-s2`,`v2:b-${i}`]]);
  if(i===1) addFamily(id,'data/levels.json','local-mutant',[[`${id}-l1`,'v2:c-1']]);
}
addFamily('R00001','data/stress/stress-levels.json','symmetry',[['R00001-s1','v2:r']]);
// Conflicting parent content revisions must not be sampled.
addFamily('P99999','data/levels.json','symmetry',[['P99999-s1','v2:x']]);
const conflictPath=path.join(families,'family-P99999-local-mutant-manifest.json');
writeFileSync(conflictPath,JSON.stringify({
  familyId:'family-P99999-local-mutant',parentLevelId:'P99999',parentCorpus:'data/levels.json',
  parentContentHash:'v2:different-parent-revision',familyMode:'local-mutant',
  variants:[{variantId:'P99999-l1',variantContentHash:'v2:y'}],
}));
writeFileSync(path.join(families,'family-P99999-local-mutant.json'),JSON.stringify([
  {id:'P99999-l1',grid:{w:3,h:3},gates:[{x:0,y:0}],goal:{x:2,y:2},reqLen:5,reqInt:0},
]));

const collected=collectWs1ConfirmationCandidates(root);
assert.equal(collected.candidates.length,8);
assert.ok(collected.diagnostics.skippedExcludedParentCorpus>=1);
assert.equal(collected.diagnostics.skippedParentIdentityConflict,1);
assert.equal(new Set(collected.candidates.map(r=>r.parentId)).size,8);
assert.ok(collected.candidates.every(r=>r.variantId && r.variantContentIdentity));

const frozen=freezeWs1ConfirmationBlocks(root,{
  stageAParents:3,totalParents:6,sourceRevision:'fixture-rev',datasetRootLabel:'fixture',
  manifestRefPrefix:'data/stress/fixture-ws1',
});
assert.equal(frozen.stageA.rows.length,3);
assert.equal(frozen.full.rows.length,6);
assert.equal(frozen.stageA.corpus.length,3);
assert.equal(frozen.full.corpus.length,6);
assert.equal(new Set(frozen.full.rows.map(r=>r.parentId)).size,6);
assert.ok(frozen.stageA.rows.every(a=>frozen.full.rows.some(b=>b.parentId===a.parentId)));
assert.equal(frozen.stageA.researchBlock.questionId,'WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE');
assert.equal(frozen.stageA.researchBlock.evidenceRole,'confirmation');
assert.equal(frozen.stageA.researchBlock.independentUnit,'parent-family');
assert.equal(frozen.stageA.researchBlock.createdBy.manifestRef,'data/stress/fixture-ws1-stage-a-001.json');
assert.match(frozen.stageA.populationIdentity,/^sha256:[0-9a-f]{64}$/);
assert.match(frozen.full.populationIdentity,/^sha256:[0-9a-f]{64}$/);

const again=freezeWs1ConfirmationBlocks(root,{
  stageAParents:3,totalParents:6,sourceRevision:'fixture-rev',datasetRootLabel:'fixture',
  manifestRefPrefix:'data/stress/fixture-ws1',
});
assert.deepEqual(again.stageA.rows,frozen.stageA.rows);
assert.deepEqual(again.full.rows,frozen.full.rows);
console.log('freeze-ws1-continuation-confirmation-block: ok');
