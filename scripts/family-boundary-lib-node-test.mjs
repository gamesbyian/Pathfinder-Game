import assert from 'node:assert/strict';
import { buildBoundaryReport, coalesceAttemptRecords, renderBoundaryMarkdown, workOf } from './family-boundary-lib.mjs';
const manifests=[
 {familyId:'sA',parentLevelId:'A',familyMode:'symmetry',variants:[1,2,3].map((n,i)=>({variantId:`AS${n}`,mutationManifest:{operation:'transform',variant:i+1}}))},
 {familyId:'sB',parentLevelId:'B',familyMode:'symmetry',variants:[{variantId:'BS1'},{variantId:'BS2'}]},
 {familyId:'nC',parentLevelId:'C',familyMode:'local-mutant',variants:[1,2,3,4].map(n=>({variantId:`CN${n}`,mutationManifest:{operation:'move',objectType:'blocks'}}))},
 {familyId:'nD',parentLevelId:'D',familyMode:'swap',variants:[{variantId:'DN1'},{variantId:'DN2'}]},
 {familyId:'nE',parentLevelId:'E',familyMode:'swap',variants:[{variantId:'EN1',mutationManifest:{operation:'swap'}}]},
];
manifests[0].variants.push({variantId:'AS1-duplicate',mutationManifest:{operation:'transform',variant:1}});
const canonicalResults=[{id:'A',ok:false,attempts:[{config:'beam:x',workSpent:50,status:'timeout'}]},{id:'B',ok:true,workSpent:100,winningConfig:'dfs:x'},{id:'C',ok:false,attempts:[{config:'repair:z',workSpent:40,status:'timeout'}]},{id:'D',ok:false},{id:'E',ok:true,workSpent:1000,winningConfig:'dfs:x'}];
const variantResults=[
 {id:'AS1',ok:true,workSpent:10,winningConfig:'beam:x'},{id:'AS2',ok:false},{id:'AS3',ok:true,workSpent:1000,winningConfig:'beam:x'},
 {id:'AS1-duplicate',ok:true,workSpent:5,winningConfig:'beam:x'},
 {id:'BS1',ok:true,workSpent:1000,winningConfig:'dfs:x'},{id:'BS2',ok:true,winningConfig:'dfs:x'},
 {id:'CN1',ok:true,workSpent:2,winningConfig:'repair:z'},{id:'CN2',ok:true,workSpent:3,winningConfig:'repair:z'},{id:'CN3',ok:false},{id:'CN4',ok:false},
 {id:'DN1',ok:false},{id:'DN2',ok:false},{id:'AS1',ok:true,workSpent:5,winningConfig:'beam:x'},
 {id:'EN1',ok:true,workSpent:10,winningConfig:'dfs:x'},
];
const report=buildBoundaryReport({manifests,canonicalResults,variantResults,solutionProfileJoins:[
 {parentId:'B',variantId:'BS1',classification:'small-solution-space-change',distance:.01},
 {parentId:'C',variantId:'CN1',classification:'small-solution-space-change',distance:.02},
],thresholds:{severeWorkRatio:10}});
assert.equal(workOf({ nodesExpanded: 123 }), null, 'node counts are not mislabeled as machine-independent work');
assert.equal(workOf({ workSpent: null }), null, 'explicitly missing work remains missing rather than becoming zero');
assert.deepEqual(coalesceAttemptRecords([
 { variantId:'flat', ok:false, config:'dfs:a', workSpent:4 },
 { variantId:'flat', ok:true, config:'beam:b', workSpent:8 },
]).map(row=>({id:row.id,ok:row.ok,winningConfig:row.winningConfig,workSpent:row.workSpent,attempts:row.attempts.length})),[
 { id:'flat',ok:true,winningConfig:'beam:b',workSpent:8,attempts:2 },
]);
assert.equal(report.families[0].regretKind,'solve-status-cliff');
assert.equal(report.families[0].solvedWorkSpreadRatio,200);
assert.equal(report.families[0].solveStatusDisagreement,true);assert.equal(report.families[0].severeCostSpread,true);
assert.equal(report.families[0].orientationsRepresented,4,'duplicate transform rows do not inflate orientation coverage');
assert.equal(report.families[1].solveStatusConsistent,true);
assert.equal(report.families[1].maxSolvedOrientationWork,1000); // missing work is ignored
assert.ok(report.costCliffs.some(x=>x.parentId==='B' && x.direction==='variant-more-work' && x.ratio===10));
assert.ok(report.costCliffs.some(x=>x.parentId==='E'&&x.direction==='variant-less-work'&&x.ratio===100));
assert.equal(report.costCliffs.find(x=>x.parentId==='B').solutionProfile.distance,.01);
assert.equal(report.families[2].evidence.fragilitySolveRate,.5);
assert.equal(report.families[2].winningConfigs.concentration,1);
assert.equal(report.families[2].configConcentrationEvidence.dominantConfig,'repair:z');
assert.equal(report.families[2].configConcentrationEvidence.canonicalAttempted,true);assert.equal(report.families[2].configConcentrationEvidence.canonicalAllocationWork,40);assert.deepEqual(report.families[2].configConcentrationEvidence.canonicalTermination,['timeout']);

const mixedIdentityReport = buildBoundaryReport({
 manifests:[{familyId:'mixed',parentLevelId:'M',familyMode:'swap',variants:[{variantId:'M1',mutationManifest:{operation:'swap'}}]}],
 canonicalResults:[{id:'M',ok:false,attempts:[{config:'beam:intersectionHarvest@beam5000(diverse)',workSpent:25,status:'timeout'}]}],
 variantResults:[{id:'M1',ok:true,workSpent:10,winningConfig:'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'}],
});
assert.deepEqual(mixedIdentityReport.families[0].winningConfigs.counts,
 {'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets':1});
assert.equal(mixedIdentityReport.families[0].configConcentrationEvidence.canonicalAttempted,true,
 'historical compact parent attempts and canonical sibling winners must compare as one identity');
assert.equal(report.families[3].evidence.robustFailureRate,1);
assert.match(report.metadata.schedulerCensoringWarning,/scheduler-censored/);
assert.ok(report.mutationSummaries.some(x=>x.relation==='local-mutant'&&x.rescueRate===.5&&x.solveStatusFlipRate===.5));
assert.equal(report.metadata.solvesExecuted,false);
assert.ok(report.actionableQueue.some(x=>x.findingType==='symmetry-pathology'));
assert.equal(report.actionableQueue.find(x=>x.priority===1&&x.parentId==='A').variantId,'AS1','queue preserves an actionable solved sibling id');
assert.equal(report.families[0].variants.length,4);assert.equal(report.families[0].variants[0].mutation.variant,1);
assert.ok(report.actionableQueue.some(x=>x.findingType==='variant-robust'));
assert.equal(report.actionableQueue.find(x=>x.findingType==='solution-space-stable-search-failure'&&x.parentId==='C').variantId,'CN1');
assert.equal(report.diagnostics.missingFamilyRows.length,0);
const again=buildBoundaryReport({manifests:[...manifests].reverse(),canonicalResults,variantResults,thresholds:{severeWorkRatio:10}});
assert.deepEqual(report.families.map(x=>x.parentId),again.families.map(x=>x.parentId));
assert.match(renderBoundaryMarkdown(report),/Actionable queue/);
const missing=buildBoundaryReport({manifests:[{familyId:'x',parentLevelId:'X',familyMode:'swap',variants:[{variantId:'missing'}]}]});
assert.deepEqual(missing.diagnostics.missingFamilyRows,[{parentId:'X',variantId:'missing'}]);
const missingCanonical=buildBoundaryReport({
 manifests:[{familyId:'x',parentLevelId:'X',familyMode:'swap',variants:[{variantId:'child'}]}],
 variantResults:[{id:'child',ok:true}],
});
assert.equal(missingCanonical.families[0].canonicalSolved,null);
assert.equal(missingCanonical.families[0].evidence,null);
assert.equal(missingCanonical.mutationSummaries[0].rescueRate,null);
assert.equal(missingCanonical.actionableQueue.some(row => row.findingType==='variant-fragile' || row.findingType==='variant-robust'),false,
    'missing canonical evidence is not treated as a canonical failure');
const collisionManifests = [
 { familyId:'r', parentCorpus:'corpus-1', parentLevelId:'R00064', familyMode:'symmetry', variants:[{variantId:'F00064-sym-01'}] },
 { familyId:'s', parentCorpus:'corpus-1', parentLevelId:'S00064', familyMode:'symmetry', variants:[{variantId:'F00064-sym-01'}] },
];
const collisionReport = buildBoundaryReport({ manifests:collisionManifests, variantResults:[
 { parentCorpus:'corpus-1', parentId:'R00064', variantId:'F00064-sym-01', ok:true, workSpent:10 },
 { parentCorpus:'corpus-1', parentId:'S00064', variantId:'F00064-sym-01', ok:false, workSpent:20 },
] });
assert.equal(collisionReport.families.find(f=>f.parentId==='R00064').solvedCount,1);
assert.equal(collisionReport.families.find(f=>f.parentId==='S00064').solvedCount,0);
assert.throws(() => buildBoundaryReport({ manifests:collisionManifests, variantResults:[
 // Even one legacy row is ambiguous when two manifest edges request its bare id.
 { id:'F00064-sym-01', ok:true },
] }), /ambiguous bare variant id/);
const noCrossParentFallback = buildBoundaryReport({
 manifests:[{familyId:'r',parentCorpus:'corpus-1',parentLevelId:'R00064',familyMode:'symmetry',variants:[{variantId:'only-s'}]}],
 variantResults:[{parentCorpus:'corpus-1',parentId:'S00064',variantId:'only-s',ok:true}],
});
assert.equal(noCrossParentFallback.families[0].observedVariantCount,0,
    'a uniquely named but namespaced row must never fall back across parents');
assert.throws(() => buildBoundaryReport({
 manifests:[
  {familyId:'c1',parentCorpus:'corpus-1',parentLevelId:'shared',variants:[]},
  {familyId:'c2',parentCorpus:'corpus-2',parentLevelId:'shared',variants:[]},
 ],
 canonicalResults:[{id:'shared',ok:true}],
}), /ambiguous bare parent id/);
// A canonical (schemaVersion 2) family-generate.mjs manifest single-writes
// parentRequiredPathCoverageRatio only, never the legacy parentNavDensity -- the default features
// fallback must read the canonical field, not just the legacy one, or a manifest passed to
// buildBoundaryReport() without --parent-levels enrichment silently loses its coverage value.
const canonicalManifest = buildBoundaryReport({
    manifests: [{ familyId: 'cov', parentLevelId: 'COV1', familyMode: 'swap',
        parentRequiredPathCoverageRatio: 0.42, selectedWitnessIntersectionCount: 3, variants: [] }],
});
assert.equal(canonicalManifest.families[0].features.requiredPathCoverageRatio, 0.42,
    'a canonical manifest\'s parentRequiredPathCoverageRatio must survive into features.requiredPathCoverageRatio without --parent-levels enrichment');
const legacyManifest = buildBoundaryReport({
    manifests: [{ familyId: 'cov2', parentLevelId: 'COV2', familyMode: 'swap',
        parentNavDensity: 0.24, variants: [] }],
});
assert.equal(legacyManifest.families[0].features.requiredPathCoverageRatio, 0.24,
    'a historical manifest\'s legacy parentNavDensity must still be read as a fallback');

console.log('family-boundary-lib: all tests passed');
