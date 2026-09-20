import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reserve-starvation-probe-'));
try {
    const sample = path.join(temp, 'sample.json');
    fs.writeFileSync(sample, JSON.stringify({
        questionId: 'Q',
        probeDesign: {
            reserveNodes: 75_000_000,
            totalNodes: 300_000_000,
            expectedAction: 'admissible-order|tieBreak=default|lds=off',
        },
        sourceBoundary: { residual: 10 },
        selection: { eligibleCount: 9, sampleCount: 3 },
        independenceDesign: {
            reference: 'relative-to-discovery-lineage',
            sampleData: 'independent fresh sample',
            parentFamily: 'independent parent rows',
            sourceConstruction: 'shared generator family',
            decisionSeam: 'isolated recurrence seam',
            instrumentImplementation: 'shared method-probe implementation',
            analysisMethod: 'prespecified reducer',
            analystModel: 'not claimed',
            taskFramingPrompt: 'shared framing',
            authorityContextExposure: 'shared authority context',
            ontologyVocabulary: 'shared reserve-starvation vocabulary',
            criticalLibraryCode: 'shared solver/research code',
        },
        resolutionDesign: {
            liveRivals: ['reserve-starvation', 'too-rare'],
            discriminatingObservable: 'isolated find-cost recurrence inside the fixed total-node envelope',
            requiredAxes: ['eligibility', 'opportunity', 'participation', 'measurementSupport', 'fidelity', 'coverage', 'censoring'],
            negativeInterpretationPolicy: 'zero is negative only under the full required envelope',
            outcomeInterpretation: {
                zero: 'close screen',
                one: 'expand once',
                twoOrMore: 'design matched-work A/B',
                blocked: 'repair observability',
            },
        },
        ids: ['A', 'B', 'C'],
    }));

    const writeDoc = (name, records, protocolHash = 'p1') => {
        const file = path.join(temp, name);
        fs.writeFileSync(file, JSON.stringify({
            schemaVersion: 1,
            kind: 'pathfinder-compact-failure-response',
            protocolHash,
            solverRef: 'solver-1',
            records,
            summary: { observed: records.length },
            populationIntegrity: null,
            sourceFiles: [],
            missingSourceFiles: [],
            invalidSourceFiles: [],
        }));
        return file;
    };
    const row = (id, outcome, nodesExpanded, extra = {}) => ({
        identity: id,
        parentId: id,
        levelId: id,
        outcome,
        nodesExpanded,
        attempts: [{ outcome: outcome === 'solved' ? 'solved' : outcome === 'nodeLimited' ? 'node-limited' : 'exhausted', actionKey: 'admissible-order|tieBreak=default|lds=off' }],
        ...extra,
    });
    const analyze = (file, samplePath = sample) => JSON.parse(execFileSync('node', [
        'scripts/analyze-reserve-starvation-probe.mjs',
        '--in=' + file,
        '--sample=' + samplePath,
    ], { cwd: root, encoding: 'utf8' }));

    const analyzeArgs = (file, extraArgs = [], samplePath = sample) => execFileSync('node', [
        'scripts/analyze-reserve-starvation-probe.mjs',
        '--in=' + file,
        '--sample=' + samplePath,
        ...extraArgs,
    ], { cwd: root, encoding: 'utf8' });

    const negativeFile = writeDoc('negative.json', [
        row('A', 'solved', 70_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]);
    const negative = analyze(negativeFile);
    assert.equal(negative.decisionReady, true);
    assert.equal(negative.opportunities, 0);
    assert.equal(negative.decision, 'close-first-recurrence-screen-negative');
    assert.equal(negative.resolution.kind, 'pathfinder-research-resolution-envelope');
    assert.equal(negative.resolution.resolutionStatus, 'resolution-ready');
    assert.deepEqual(negative.resolution.requiredAxes, [
        'eligibility', 'opportunity', 'participation', 'measurementSupport', 'fidelity', 'coverage', 'censoring',
    ]);
    assert.equal(negative.resolution.axes.reach.status, 'not-required');
    assert.equal(negative.independenceVector.sourceConstruction, 'shared generator family');
    assert.equal(negative.independenceVector.sampleData, 'independent fresh sample');
    assert.equal(
        negative.resolution.negativeInterpretationPolicy,
        JSON.parse(fs.readFileSync(sample, 'utf8')).resolutionDesign.negativeInterpretationPolicy,
    );
    assert.deepEqual(negative.thresholds, {
        reserveNodes: 75_000_000,
        totalNodes: 300_000_000,
        expectedAction: 'admissible-order|tieBreak=default|lds=off',
    });
    assert.doesNotThrow(() => analyzeArgs(negativeFile, [
        '--reserve-nodes=75000000',
        '--total-nodes=300000000',
        '--action=admissible-order|tieBreak=default|lds=off',
    ]));
    assert.throws(() => analyzeArgs(negativeFile, ['--reserve-nodes=76000000']), /disagrees with frozen sample probeDesign/u);
    assert.throws(() => analyzeArgs(negativeFile, ['--action=admissible-order|tieBreak=other|lds=off']), /disagrees with frozen sample probeDesign/u);

    const one = analyze(writeDoc('one.json', [
        row('A', 'solved', 100_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(one.decisionReady, true);
    assert.equal(one.opportunities, 1);
    assert.equal(one.decision, 'freeze-additional-disjoint-40');

    const two = analyze(writeDoc('two.json', [
        row('A', 'solved', 100_000_000),
        row('B', 'solved', 220_000_000),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(two.decisionReady, true);
    assert.equal(two.opportunities, 2);
    assert.equal(two.decision, 'design-smallest-matched-total-work-reserve-ab');

    const censored = analyze(writeDoc('censored.json', [
        row('A', 'solved', 100_000_000),
        row('B', 'deadlineTruncated', 120_000_000, { deadlineTruncated: true }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(censored.decisionReady, false);
    assert.deepEqual(censored.population.abstentionIds, ['B']);
    assert.equal(censored.decision, 'recover-incomplete-or-censored');
    assert.equal(censored.resolution.resolutionStatus, 'observability-blocked');
    assert.deepEqual(censored.resolution.blockers.map(row => row.axis), ['censoring']);
    assert.ok(censored.resolution.blockers.some(row =>
        row.axis === 'censoring' && row.remediation === 'work-envelope-or-recovery'));

    const unknownProtocol = analyze(writeDoc('unknown-protocol.json', [
        row('A', 'solved', 70_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ], null));
    assert.equal(unknownProtocol.decisionReady, false);
    assert.ok(unknownProtocol.resolution.blockers.some(row => row.axis === 'eligibility'));

    const missingAction = analyze(writeDoc('missing-action.json', [
        { ...row('A', 'solved', 70_000_000), attempts: [] },
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(missingAction.decisionReady, false);
    assert.deepEqual(missingAction.population.abstentionIds, ['A']);
    assert.equal(missingAction.bucketCounts['abstain-action-unknown'], 1);
    assert.deepEqual(missingAction.resolution.blockers.map(row => row.axis), ['fidelity']);

    const unknownSolverFile = path.join(temp, 'unknown-solver.json');
    fs.writeFileSync(unknownSolverFile, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-compact-failure-response',
        protocolHash: 'p1',
        solverRef: null,
        records: [
            row('A', 'solved', 70_000_000),
            row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
            row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
        ],
        summary: { observed: 3 },
        populationIntegrity: null,
        sourceFiles: [],
        missingSourceFiles: [],
        invalidSourceFiles: [],
    }));
    const unknownSolver = analyze(unknownSolverFile);
    assert.equal(unknownSolver.decisionReady, false);
    assert.ok(unknownSolver.resolution.blockers.some(row => row.axis === 'eligibility'));

    const zeroParticipation = analyze(writeDoc('zero-participation.json', [
        row('A', 'exhaustedNegative', 0, { exhausted: true }),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(zeroParticipation.decisionReady, false);
    assert.deepEqual(zeroParticipation.resolution.blockers.map(row => row.axis), ['participation']);

    const noOpportunitySample = path.join(temp, 'sample-no-opportunity.json');
    const baseSample = JSON.parse(fs.readFileSync(sample, 'utf8'));
    delete baseSample.sourceBoundary;
    fs.writeFileSync(noOpportunitySample, JSON.stringify(baseSample));
    const noOpportunityBoundary = analyze(writeDoc('no-opportunity-boundary.json', [
        row('A', 'solved', 70_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]), noOpportunitySample);
    assert.equal(noOpportunityBoundary.resolution.resolutionStatus, 'observability-blocked');
    assert.deepEqual(noOpportunityBoundary.resolution.blockers.map(row => row.axis), ['opportunity']);
    assert.equal(noOpportunityBoundary.decisionReady, false);
    assert.equal(noOpportunityBoundary.decision, 'recover-incomplete-or-censored');

    console.log('reserve starvation probe reducer tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
