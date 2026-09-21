import assert from 'node:assert/strict';

import {
    createForcedWorkCollector,
    summarizeForcedWork,
    summarizeForcedWorkAcrossRuns,
} from './forced-work-prevalence-lib.mjs';

const collector = createForcedWorkCollector();
collector.observe({
    stage: 'incoming-frontier',
    paths: [[1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [9]],
});
collector.observe({
    stage: 'generated',
    paths: [[1, 2], [1, 8]],
    details: { parentExpansions: [{ path: [1], workSpent: 10, generatedCandidates: 1 }] },
});
collector.observe({ stage: 'post-hard-prune', paths: [[1, 2]] });
collector.observe({
    stage: 'generated',
    paths: [[1, 2, 3], [1, 2, 7]],
    details: { parentExpansions: [{ path: [1, 2], workSpent: 20, generatedCandidates: 1 }] },
});
collector.observe({ stage: 'post-hard-prune', paths: [[1, 2, 3]] });
collector.observe({
    stage: 'generated',
    paths: [[1, 2, 3, 4], [1, 2, 3, 5], [1, 2, 3, 6]],
    details: { parentExpansions: [{ path: [1, 2, 3], workSpent: 30, generatedCandidates: 2 }] },
});
collector.observe({ stage: 'post-hard-prune', paths: [[1, 2, 3, 4], [1, 2, 3, 5]] });
collector.observe({
    stage: 'generated',
    paths: [],
    details: { parentExpansions: [{ path: [9], workSpent: 40, generatedCandidates: 0 }] },
});

const summary = summarizeForcedWork(collector.snapshot());
assert.equal(summary.expandedParents, 4);
assert.equal(summary.oneSuccessorParents, 2);
assert.equal(summary.branchingParents, 1);
assert.equal(summary.zeroSuccessorParents, 1);
assert.equal(summary.totalExpansionWork, 100);
assert.equal(summary.forcedExpansionWork, 30);
assert.equal(summary.forcedExpansionWorkShare, 0.3);
assert.equal(summary.chains.count, 1);
assert.equal(summary.chains.maxLength, 2);
assert.equal(summary.chains.terminations.branch, 1);
assert.equal(summary.grossForcedWorkReservoir.expansionWorkAtOneSuccessorParents, 30);

const aggregate = summarizeForcedWorkAcrossRuns([
    { summary },
    { summary: { ...summary, totalExpansionWork: 50, forcedExpansionWork: 5, expandedParents: 2, oneSuccessorParents: 1 } },
]);
assert.equal(aggregate.runs, 2);
assert.equal(aggregate.totalExpansionWork, 150);
assert.equal(aggregate.forcedExpansionWork, 35);
assert.equal(aggregate.expandedParents, 6);
assert.equal(aggregate.oneSuccessorParents, 3);
assert.equal(aggregate.oneSuccessorParentRate, 0.5);

const phaseCollector = createForcedWorkCollector();
phaseCollector.observe({ stage: 'incoming-frontier', paths: [[1]] });
phaseCollector.observe({
    stage: 'generated',
    paths: [[1, 2]],
    details: { parentExpansions: [{ path: [1], workSpent: 7, generatedCandidates: 1 }] },
});
phaseCollector.observe({ stage: 'post-hard-prune', paths: [[1, 2]] });
phaseCollector.observe({ stage: 'incoming-frontier', paths: [[1, 2]] });
phaseCollector.observe({
    stage: 'generated',
    paths: [[1, 2, 3], [1, 2, 4]],
    details: { parentExpansions: [{ path: [1, 2], workSpent: 11, generatedCandidates: 2 }] },
});
phaseCollector.observe({ stage: 'post-hard-prune', paths: [[1, 2, 3], [1, 2, 4]] });
const phaseSummary = summarizeForcedWork(phaseCollector.snapshot());
assert.equal(phaseSummary.phaseEconomics.resolvedPhases, 2);
assert.equal(phaseSummary.phaseEconomics.singletonOutcomePhases, 1);
assert.equal(phaseSummary.phaseEconomics.singletonToSingletonPhases, 1);
assert.equal(phaseSummary.phaseEconomics.allParentsForcedPhases, 1);
assert.equal(phaseSummary.phaseEconomics.singletonOutcomeDiscoveryWork, 7);

console.log('forced-work-prevalence-lib: ok');
