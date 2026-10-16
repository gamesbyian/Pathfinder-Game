#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    analyzeConfirmation,
    buildStageBPlan,
    deriveStageAOpportunities,
} from './pg-g-symmetry-confirmation-stage-lib.mjs';

const dir=mkdtempSync(path.join(os.tmpdir(),'pg-g-stage-'));
const parentCorpus=path.join(dir,'parents.json');
writeFileSync(parentCorpus,JSON.stringify([
    {id:'P1',grid:{w:4,h:3}},
    {id:'P2',grid:{w:5,h:4}},
    {id:'P3',grid:{w:6,h:5}},
    {id:'P4',grid:{w:7,h:6}},
]));
const technique='dfs|score=default|bias=none';
const spec={
    workBudget:10_000_000,
    budgetMs:600_000,
    stageA:{expectedRows:10},
    decisionRule:{minimumEligibleParents:4,minimumDiscordantRows:6},
};
const cells=[];
const results=[];
function parent(familyId,parentId,pos,ok,workSpent=10_000_000){
    const cellId=`${familyId}::parent`;
    const familyContext={familyId,parentId,variantId:null,role:'parent',relation:'symmetry',mutation:null};
    cells.push({cellId,tier:'FTR1',corpus:'family-parent',corpusFile:parentCorpus,levelPos:pos,levelId:parentId,
        techniqueKeys:[technique],workBudget:10_000_000,budgetMs:600_000,familyContext});
    results.push({cellId,techniqueKeys:[technique],ok,status:ok?'success':'work-budget-reached',workSpent,familyContext});
}
function variant(familyId,parentId,variantId,orientation,ok,workSpent=10_000_000){
    const cellId=`${familyId}::${variantId}`;
    const familyContext={familyId,parentId,variantId,role:'variant',relation:'symmetry',
        mutation:{variant:orientation,kind:orientation<4?'rotation':'reflection'}};
    cells.push({cellId,tier:'FTR1',corpus:'family-variant',corpusFile:'fixture-variants.json',levelPos:orientation,levelId:variantId,
        techniqueKeys:[technique],workBudget:10_000_000,budgetMs:600_000,familyContext});
    results.push({cellId,techniqueKeys:[technique],ok,status:ok?'success':'work-budget-reached',workSpent,familyContext});
}

parent('f1','P1',1,false); variant('f1','P1','V11',1,true,1000); variant('f1','P1','V12',2,true,2000);
parent('f2','P2',2,true,5000); variant('f2','P2','V21',1,false); variant('f2','P2','V22',2,false);
parent('f3','P3',3,false); variant('f3','P3','V31',3,true,3000);
parent('f4','P4',4,true,4000); variant('f4','P4','V41',4,false);
const plan={kind:'fixture-stage-a',cells,sourceSpec:'fixture',solverRef:'fixture'};
const combined={results};

const opportunity=deriveStageAOpportunities(spec,plan,combined);
assert.equal(opportunity.discordantRows,6);
assert.equal(opportunity.eligibleParentCount,4);
assert.equal(opportunity.treatmentEligible,true);

const stageBPlan=buildStageBPlan(spec,plan,combined);
assert.equal(stageBPlan.expectedCells,6);
assert.equal(stageBPlan.opportunity.treatmentEligible,true);
assert.ok(stageBPlan.cells.every(cell=>cell.workBudget===10_000_000));
assert.ok(stageBPlan.cells.every(cell=>cell.budgetMs===600_000));
assert.ok(stageBPlan.cells.every(cell=>cell.candidateOrderResearch?.kind==='symmetry-parent-frame'));
assert.ok(stageBPlan.cells.every(cell=>!Object.hasOwn(cell,'repairSeedNormalization')));
const f1=stageBPlan.cells.find(cell=>cell.familyContext.parentId==='P1');
assert.deepEqual(
    {w:f1.candidateOrderResearch.parentWidth,h:f1.candidateOrderResearch.parentHeight},
    {w:4,h:3},
);

function treatmentResults(restoredCount){
    return {
        results:stageBPlan.cells.map((cell,index)=>{
            const op=opportunity.opportunities.find(row=>
                row.familyId===cell.familyContext.familyId &&
                row.variantId===cell.familyContext.variantId &&
                row.technique===cell.techniqueKeys[0]);
            const restored=index<restoredCount;
            const ok=restored ? op.parent.ok : !op.parent.ok;
            return {
                ...cell,
                ok,
                status:ok?'success':'work-budget-reached',
                workSpent:ok?Math.max(1,op.parent.workSpent??1000):10_000_000,
            };
        }),
    };
}

const positive=analyzeConfirmation(spec,plan,combined,treatmentResults(5));
assert.equal(positive.verdict,'positive');
assert.equal(positive.stageB.restoredRows,5);
assert.equal(positive.stageB.restoredParentCount,4);
assert.ok(positive.stageB.restorationRate>0.8);

const negative=analyzeConfirmation(spec,plan,combined,treatmentResults(2));
assert.equal(negative.verdict,'negative');
assert.equal(negative.stageB.restoredRows,2);

const middle=analyzeConfirmation(spec,plan,combined,treatmentResults(3));
assert.equal(middle.verdict,'inconclusive-middle-band');

const lowSpec={...spec,decisionRule:{minimumEligibleParents:5,minimumDiscordantRows:7}};
const low=analyzeConfirmation(lowSpec,plan,combined,null);
assert.equal(low.verdict,'inconclusive-low-opportunity');
assert.equal(low.stageB,null);

const extra=treatmentResults(5);
extra.results.push({...extra.results[0],cellId:'extra'});
assert.throws(()=>analyzeConfirmation(spec,plan,combined,extra),/coverage mismatch/);

const invalidStageA=structuredClone(combined);
invalidStageA.results[0].status='deadline-truncated';
invalidStageA.results[0].deadlineTruncated=true;
assert.throws(()=>deriveStageAOpportunities(spec,plan,invalidStageA),/invalid Stage-A row/);

console.log('PG-G two-stage confirmation tests passed');
