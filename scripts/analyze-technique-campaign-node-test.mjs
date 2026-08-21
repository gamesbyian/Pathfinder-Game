import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const hash = ids => createHash('sha256').update(ids.join('\n')).digest('hex');
const runAnalyzer = (directory, output) => spawnSync(process.execPath,
    ['scripts/analyze-technique-campaign.mjs', directory, output], { encoding:'utf8' });
const dir = mkdtempSync(path.join(tmpdir(), 'technique-campaign-'));
const summary = { levelBlind:true, levelsRequested:2, levelsRun:2, corpus:'fixture.json', commit:'a'.repeat(40), nodeBudget:10, workBudget:20, workers:1 };
const levels = [
    { id:'A', ok:true, nodesExpanded:8, workSpent:12, totalMs:3, attempts:[{ repairProbe:true, repair:true, ok:false, nodesExpanded:3, elapsedMs:1 },{ admissibleOrder:true, ok:true, nodesExpanded:5, elapsedMs:2 }] },
    { id:'B', ok:false, nodesExpanded:10, workSpent:25, totalMs:4, status:'work-budget-reached', attempts:[] },
];
writeFileSync(path.join(dir,'left.json'),JSON.stringify({summary:{...summary,treatment:1},levels}));
writeFileSync(path.join(dir,'right.json'),JSON.stringify({summary:{...summary,treatment:0},levels:levels.map(level=>({...level,ok:false}))}));
writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({experiments:[{id:'T-1',class:'targeted-diagnostic',question:'q',artifacts:['left.json','right.json'],controlArtifact:'right.json',treatmentArtifact:'left.json'}]}));
writeFileSync(path.join(dir,'t-1-protocol.json'),JSON.stringify({experimentId:'T-1',evidenceClass:'targeted-diagnostic',sampleSelection:{levelIds:['A','B'],levelSelectionHash:hash(['A','B'])},common:{nodeBudget:10,workBudget:20,workers:1},treatmentVariables:['treatment'],protocolVerification:{status:'unverifiable'}}));
const out=path.join(dir,'aggregate.json');
let run=runAnalyzer(dir,out); assert.equal(run.status,0,run.stderr);
let result=JSON.parse(readFileSync(out));
assert.equal(result.validity.valid,true); assert.equal(result.counts.uniqueLevels,2); assert.equal(result.counts.levelInvocations,4); assert.equal(result.counts.armRuns,2);
assert.equal(result.arms.find(arm=>arm.file==='left.json').workOverBudget,1);
assert.deepEqual(result.comparisons[0].gained,['A']); assert.deepEqual(result.comparisons[0].lost,[]);
assert.equal(result.comparisons[0].control,'right.json'); assert.equal(result.comparisons[0].treatment,'left.json');
assert.equal(result.comparisons[0].deltas[0].workDelta,0);

// A one-sided role declaration is invalid rather than falling back to list order.
const fixtureManifest=JSON.parse(readFileSync(path.join(dir,'manifest.json')));
delete fixtureManifest.experiments[0].treatmentArtifact;
writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(fixtureManifest));
run=runAnalyzer(dir,out); assert.notEqual(run.status,0); assert.match(run.stderr,/do not identify both paired arms/);
fixtureManifest.experiments[0].treatmentArtifact='left.json';
writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(fixtureManifest));

// A pair with reordered IDs is invalid, not silently aggregated as comparable.
const bad=JSON.parse(readFileSync(path.join(dir,'right.json'))); bad.levels.reverse(); writeFileSync(path.join(dir,'right.json'),JSON.stringify(bad));
run=runAnalyzer(dir,out); assert.notEqual(run.status,0); assert.match(run.stderr,/paired level IDs\/order differ/);

const campaign='reports/experiments/2026-08-13-technique-tuning';
const manifest=JSON.parse(readFileSync(path.join(campaign,'manifest.json')));
assert.equal(manifest.protocolAudit.disposition,'post-merge audit: unverifiable');
for(const id of ['ETT-010','ETT-011','ETT-012','ETT-013']) assert.equal(manifest.experiments.find(e=>e.id===id).protocolVerification.status,'unverifiable');
const e11=manifest.experiments.find(e=>e.id==='ETT-011'); assert.match(e11.budgetValidity,/node-budget matched/);
for(const file of ['ett-011-015.json','ett-011-prod.json']) {
    const arm=JSON.parse(readFileSync(path.join(campaign,file)));
    assert.equal(arm.levels.filter(level=>level.workSpent>arm.summary.workBudget).length,19);
}
const regenerated=path.join(dir,'campaign.json'); run=runAnalyzer(campaign,regenerated); assert.equal(run.status,0,run.stderr);
assert.deepEqual(JSON.parse(readFileSync(regenerated)),JSON.parse(readFileSync(path.join(campaign,'aggregate.json'))));
const lineageMechanics = JSON.parse(readFileSync(path.join(campaign,'ett-017-lineage-mechanics.json')));
assert.equal(lineageMechanics.denominators.forensicRows, 19);
assert.equal(lineageMechanics.denominators.uniqueLevelIds, 19);
assert.equal(lineageMechanics.denominators.parentFamilyIdentityAvailable, false);
assert.equal(lineageMechanics.groups['clearly-mis-ranked'].levels, 14);
assert.equal(lineageMechanics.groups['other-score-width'].levels, 5);
assert.deepEqual(lineageMechanics.nominatedTags,
    ['crossing-rich','high-intersection-burden','large-grid','portals']);
const campaignAggregate = JSON.parse(readFileSync(path.join(campaign,'aggregate.json')));
const campaignReport = readFileSync('reports/2026-08-13-existing-technique-tuning-experimental-campaign.md','utf8');
assert.match(campaignReport, new RegExp(`${manifest.experiments.length} experiment IDs`));
assert.match(campaignReport, new RegExp(`${campaignAggregate.counts.armRuns} arm-runs`));
assert.match(campaignReport, new RegExp(`${campaignAggregate.counts.levelInvocations} level invocations`));
assert.match(campaignReport, new RegExp(`${campaignAggregate.arms.reduce((sum, arm) => sum + arm.attemptCount, 0).toLocaleString('en-US')} recorded internal attempts`));
assert.match(campaignReport, new RegExp(`${campaignAggregate.counts.uniqueLevels} unique levels`));
assert.match(campaignReport, new RegExp(`${campaignAggregate.counts.independentHypothesisFamilies} independent hypothesis families`));
const strictArm = campaignAggregate.arms.find(arm => arm.file === 'ett-019-strict.json');
assert.equal(strictArm.strictWorkMaxOvershoot, 1072);
assert.equal(strictArm.strictWorkOvershootTolerance, 4096);
for (const id of ['ETT-018','ETT-019','ETT-020']) {
    const comparison = campaignAggregate.comparisons.find(row => row.experimentId === id);
    assert.match(comparison.control, /legacy\.json$/);
    assert.match(comparison.treatment, /strict\.json$/);
}
const familyInputAudit = JSON.parse(readFileSync(path.join(campaign,'ett-023-family-input-audit.json')));
assert.equal(familyInputAudit.counts.familyManifestFiles, 161);
assert.equal(familyInputAudit.counts.schemaDetectedFamilyResultDocuments, 63);
assert.equal(familyInputAudit.counts.schemaDetectedFamilyRows, 911);
assert.equal(familyInputAudit.counts.fullyNamespacedFamilyRows, 0);
assert.equal(familyInputAudit.counts.documentsWithMissingDeclaredCorpus, 1);
assert.match(familyInputAudit.disposition, /^blocked on identity\/provenance:/);
const familyIdentityAudit = JSON.parse(readFileSync(path.join(campaign,'ett-024-family-identity-audit.json')));
assert.equal(familyIdentityAudit.manifestFiles, 161);
assert.equal(familyIdentityAudit.distinctVariantIds, 1237);
assert.deepEqual(familyIdentityAudit.totals, { rows:911, unique:911, ambiguous:0, unmatched:0 });
const familyMigration = JSON.parse(readFileSync(path.join(campaign,'ett-025-family-result-migration.json')));
assert.deepEqual(familyMigration.summary, { rows:911, uniqueEdges:886, parentFamilies:51,
    repeatedEdges:25, repeatedRows:50, maxObservationsPerEdge:2,
    solveStatusConflictEdges:1, winningConfigConflictEdges:0 });
// Map.groupBy (ES2024) requires Node 21+; CI pins Node 20 per package.json's engines floor.
const conflictGroups = new Map();
for (const row of familyMigration.rows) {
    const key = `${row.parentCorpus}\0${row.parentId}\0${row.variantId}`;
    const group = conflictGroups.get(key);
    if (group) group.push(row); else conflictGroups.set(key, [row]);
}
const conflicts = [...conflictGroups.values()].filter(rows => new Set(rows.map(row => row.ok)).size > 1);
assert.equal(conflicts.length, 1);
assert.equal(conflicts[0][0].variantId, 'F02248-sym-02');
const phaseBoundary = JSON.parse(readFileSync(path.join(campaign,'ett-027-family-boundary.json')));
assert.equal(phaseBoundary.diagnostics.missingFamilyRows.length, 0);
assert.equal(phaseBoundary.families.filter(row => row.canonicalSolved !== null).length, 0);
assert.equal(phaseBoundary.families.filter(row => row.kind === 'symmetry' && row.solveStatusDisagreement).length, 8);
assert.equal(phaseBoundary.actionableQueue.filter(row => row.findingType === 'symmetry-pathology').length, 8);
assert.equal(phaseBoundary.actionableQueue.some(row => row.findingType === 'variant-fragile' || row.findingType === 'variant-robust'), false);
assert.equal(phaseBoundary.mutationSummaries.some(row => row.rescueRate !== null), false);
console.log('technique campaign validity analysis: all tests passed');
