import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const hash = ids => createHash('sha256').update(ids.join('\n')).digest('hex');
// Runs the analyzer directly under plain `node` (no run-bundled.mjs/tsx step): its only
// modules/solver/ import (normalizeSolverStageId) resolves a plain-JS sibling, so this is its
// real, documented invocation contract (docs/tooling-catalog.md, docs/testing.md) and must stay
// runnable that way, including under the repo's supported Node 20 baseline.
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

// A mixed legacy/canonical stage-ID population (one attempt tagged with the historical
// `main-loop` stageId, one with the current `main-search`) must collapse onto one canonical
// technique row, not appear as two separate rows in the same arm summary.
{
    const legacyDir = mkdtempSync(path.join(tmpdir(), 'technique-campaign-legacy-'));
    const legacySummary = { levelBlind:true, levelsRequested:1, levelsRun:1, corpus:'fixture.json', commit:'a'.repeat(40), nodeBudget:10, workBudget:20, workers:1 };
    const legacyLevels = [
        { id:'A', ok:true, nodesExpanded:8, workSpent:12, totalMs:3, attempts:[
            { stageId:'main-loop', ok:false, nodesExpanded:3, elapsedMs:1 },
            { stageId:'main-search', ok:true, nodesExpanded:5, elapsedMs:2 },
        ] },
    ];
    writeFileSync(path.join(legacyDir,'only.json'),JSON.stringify({summary:legacySummary,levels:legacyLevels}));
    writeFileSync(path.join(legacyDir,'manifest.json'),JSON.stringify({experiments:[{id:'T-2',class:'targeted-diagnostic',question:'q',artifacts:['only.json']}]}));
    const legacyOut = path.join(legacyDir,'aggregate.json');
    const legacyRun = spawnSync(process.execPath,
        ['scripts/analyze-technique-campaign.mjs', legacyDir, legacyOut], { encoding:'utf8' });
    assert.equal(legacyRun.status, 0, legacyRun.stderr);
    const legacyResult = JSON.parse(readFileSync(legacyOut));
    const arm = legacyResult.arms.find(a => a.file === 'only.json');
    assert.equal(arm.techniques['main-search'].attempts, 2, 'legacy main-loop and canonical main-search attempts must count under one technique row');
    assert.equal(arm.techniques['main-search'].wins, 1);
    assert.equal('main-loop' in arm.techniques, false, 'the historical stage id must not appear as a separate technique row');
}

// Historical campaign reports are immutable research evidence, not compatibility fixtures for the
// current analyzer. Requiring today's code to reproduce one dated campaign forever couples software
// CI to frozen evidence and makes legitimate analyzer evolution look like a correctness regression.
console.log('technique campaign analyzer tests: all passed');
