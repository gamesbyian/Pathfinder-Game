import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const dir = mkdtempSync(path.join(tmpdir(), 'technique-campaign-'));
writeFileSync(path.join(dir, 'arm.json'), JSON.stringify({ summary:{ levelBlind:true }, levels:[
    { id:'A', ok:true, nodesExpanded:12, workSpent:20, attempts:[
        { repairProbe:true, repair:true, ok:false, nodesExpanded:5, elapsedMs:2 },
        { admissibleOrder:true, ok:true, nodesExpanded:7, elapsedMs:3 },
    ] },
] }));
const out = path.join(dir, 'aggregate.json');
const run = spawnSync(process.execPath, ['scripts/analyze-technique-campaign.mjs', dir, out], { encoding:'utf8' });
assert.equal(run.status, 0, run.stderr);
const result = JSON.parse(readFileSync(out, 'utf8'));
assert.equal(result.armCount, 1);
assert.deepEqual(result.arms[0], {
    file:'arm.json', levels:1, solved:1, nodes:12, work:20, attemptCount:2,
    techniques:{
        'admissible-order':{attempts:1,levelsReached:1,wins:1,nodes:7,elapsedMs:3,winRateGivenReach:1},
        'repair-probe':{attempts:1,levelsReached:1,wins:0,nodes:5,elapsedMs:2,winRateGivenReach:0},
    },
});
const campaignDirectory = 'reports/experiments/2026-08-13-technique-tuning';
const campaignManifest = JSON.parse(readFileSync(path.join(campaignDirectory, 'manifest.json'), 'utf8'));
assert.equal(campaignManifest.protocolAudit.recordedBeforeExecution, false);
assert.match(campaignManifest.protocolAudit.consequence, /not decision-bearing/);
assert.ok(campaignManifest.experiments.filter(experiment => !['ETT-010', 'ETT-011', 'ETT-012'].includes(experiment.id)).every(experiment =>
    experiment.protocolTiming === 'retrospectively reconstructed after execution'));
assert.equal(campaignManifest.experiments.find(experiment => experiment.id === 'ETT-010').protocolTiming,
    'committed before execution at 4923802b');
assert.equal(campaignManifest.experiments.find(experiment => experiment.id === 'ETT-011').protocolTiming,
    'committed before execution at 7dd35d9f');
assert.equal(campaignManifest.experiments.find(experiment => experiment.id === 'ETT-012').protocolTiming,
    'committed before execution at 51a606ca');
for (const { id, protocolFile, arms } of [
    { id:'ETT-010', protocolFile:'ett-010-protocol.json', arms:['ett-010-015.json', 'ett-010-prod.json'] },
    { id:'ETT-011', protocolFile:'ett-011-protocol.json', arms:['ett-011-015.json', 'ett-011-prod.json'] },
]) {
    const protocol = JSON.parse(readFileSync(path.join(campaignDirectory, protocolFile), 'utf8'));
    assert.equal(protocol.experimentId, id);
    assert.equal(protocol.protocolStatus, 'frozen-before-execution');
    assert.equal(createHash('sha256').update(protocol.sampleSelection.levelIds.join('\n')).digest('hex'),
        protocol.sampleSelection.levelSelectionHash, `${id} sample hash must match its frozen ids`);
    for (const armFile of arms) {
        const arm = JSON.parse(readFileSync(path.join(campaignDirectory, armFile), 'utf8'));
        assert.equal(arm.summary.levelBlind, true);
        assert.equal(arm.summary.nodeBudget, protocol.common.nodeBudget);
        assert.equal(arm.summary.workBudget, protocol.common.workBudget);
        assert.equal(arm.summary.workers, protocol.common.workers);
        const expectedFraction = armFile.includes('-015.') ? 0.15 : null;
        assert.equal(arm.summary.admissibleOrderNodeReserveFraction, expectedFraction,
            `${armFile} reserve override must match its frozen arm`);
        assert.deepEqual(arm.levels.map(level => level.id), protocol.sampleSelection.levelIds,
            `${armFile} must contain the frozen sample in frozen order`);
    }
}
const familyProtocol = JSON.parse(readFileSync(path.join(campaignDirectory, 'ett-012-protocol.json'), 'utf8'));
const familyArm = JSON.parse(readFileSync(path.join(campaignDirectory, 'ett-012-current-main.json'), 'utf8'));
assert.equal(createHash('sha256').update(familyProtocol.sampleSelection.levelIds.join('\n')).digest('hex'),
    familyProtocol.sampleSelection.levelSelectionHash);
assert.deepEqual([...familyArm.levels.map(level => level.id)].sort(),
    [...familyProtocol.sampleSelection.levelIds].sort());
assert.equal(familyArm.summary.levelBlind, true);
assert.equal(familyArm.summary.nodeBudget, familyProtocol.common.nodeBudget);
assert.equal(familyArm.summary.workBudget, familyProtocol.common.workBudget);
const transfer = JSON.parse(readFileSync(path.join(campaignDirectory, 'ett-011-transfer.json'), 'utf8'));
const lowReserve = JSON.parse(readFileSync(path.join(campaignDirectory, 'ett-011-015.json'), 'utf8'));
const production = new Map(JSON.parse(readFileSync(path.join(campaignDirectory, 'ett-011-prod.json'), 'utf8'))
    .levels.map(level => [level.id, level]));
const attemptNodes = (level, predicate) => (level.attempts ?? []).filter(predicate)
    .reduce((sum, attempt) => sum + Number(attempt.nodesExpanded ?? 0), 0);
const expectedTransfer = lowReserve.levels.map(level => {
    const control = production.get(level.id);
    return {
        id:level.id,
        workDelta:level.workSpent - control.workSpent,
        repairProbeNodeDelta:attemptNodes(level, attempt => attempt.repairProbe) -
            attemptNodes(control, attempt => attempt.repairProbe),
        repairFallbackNodeDelta:attemptNodes(level, attempt => attempt.repair && !attempt.repairProbe) -
            attemptNodes(control, attempt => attempt.repair && !attempt.repairProbe),
        admissibleOrderNodeDelta:attemptNodes(level, attempt => attempt.admissibleOrder) -
            attemptNodes(control, attempt => attempt.admissibleOrder),
    };
});
assert.deepEqual(transfer.levels, expectedTransfer, 'ETT-011 paired transfer rows must be reproducible');
assert.equal(transfer.summary.workWorseLevels, expectedTransfer.filter(level => level.workDelta > 0).length);
assert.equal(transfer.summary.totalWorkDelta, expectedTransfer.reduce((sum, level) => sum + level.workDelta, 0));
const regenerated = path.join(dir, 'campaign-aggregate.json');
const regenerate = spawnSync(process.execPath,
    ['scripts/analyze-technique-campaign.mjs', campaignDirectory, regenerated], { encoding:'utf8' });
assert.equal(regenerate.status, 0, regenerate.stderr);
assert.deepEqual(JSON.parse(readFileSync(regenerated, 'utf8')),
    JSON.parse(readFileSync(path.join(campaignDirectory, 'aggregate.json'), 'utf8')),
    'committed aggregate must be reproducible from committed raw arms');
console.log('technique campaign analysis: all tests passed');
