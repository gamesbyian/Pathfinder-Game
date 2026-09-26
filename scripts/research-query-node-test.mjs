/* global structuredClone */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { runResearchQueryCommand } from './research-query-cli-lib.mjs';
import { buildResearchQueryGraph, queryResearchGraph, resolveResearchEntity } from './research-query-lib.mjs';
import { buildResearchQueryView } from './research-query-views-lib.mjs';
import { buildResearchQuerySnapshot, buildResearchQuerySnapshotFromGitRef, diffResearchQuerySnapshots } from './research-query-snapshot-lib.mjs';
import { buildResearchSystemFindingIndex, buildResearchSystemFindingSnapshot } from './research-system-query-lib.mjs';

const CLI_OPTIONS = { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };

const graph = buildResearchQueryGraph(process.cwd(), { discoverArtifacts: false });
assert.equal(graph.authority.kind, 'derived-read-only');
assert.ok(graph.nodes.length > 0);
assert.ok(graph.edges.length > 0);
assert.equal(graph.diagnostics.unresolvedEdgeCount, 0, JSON.stringify(graph.diagnostics.unresolvedEdges.slice(0, 8)));
assert.ok(graph.nodes.some(node =>
  node.type === 'premiseConcepts' && node.id === 'production promotion claims'),
  'authored free-text premise relation targets must be represented as concepts rather than dangling premise IDs');
assert.deepEqual(graph.diagnostics.shapeDebt.openExperimentsOnTerminalQuestions, [],
  'stable experiment/question ownership must not leave an open promotion gate on a terminal question');
assert.ok(graph.diagnostics.shapeDebt.acquisitionNeedLexicalFallbackQuestions.includes('WS2-CUT-BALANCE-PROJECTION'),
  'query diagnostics should expose active questions whose acquisition route would use lexical fallback');
assert.ok(!graph.diagnostics.shapeDebt.acquisitionNeedLexicalFallbackQuestions.includes('WS2-REPAIR-DEADLINE-ALLOCATION'),
  'questions with explicit acquisitionNeed must not be reported as lexical fallback');

const question = resolveResearchEntity(graph, 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION');
assert.ok(question.some(node => node.type === 'questions'));

const ambiguousGraph = {
  ...graph,
  nodes: [
    ...graph.nodes,
    { type: 'fixtureA', id: 'AMBIGUOUS-ID', row: {}, source: {} },
    { type: 'fixtureB', id: 'AMBIGUOUS-ID', row: {}, source: {} },
  ],
};
assert.throws(
  () => buildResearchQueryView(ambiguousGraph, { view: 'impact', entity: 'AMBIGUOUS-ID' }),
  /ambiguous research entity/,
  'semantic views must reject ambiguous bare IDs instead of relying on node order',
);

const outgoing = queryResearchGraph(graph, {
  entity: 'questions:WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
  direction: 'out',
  depth: 1,
});
assert.ok(outgoing.edges.some(edge => edge.relation === 'triggeredBy'));
assert.ok(outgoing.edges.some(edge => edge.relation === 'answeredBy'));

const reportPath = 'reports/2026-09-16-class4-113-allocation-promotion-001.md';
const reportReverse = queryResearchGraph(graph, {
  entity: 'repositoryRefs:' + reportPath,
  direction: 'in',
  depth: 1,
});
assert.ok(reportReverse.edges.some(edge =>
  edge.relation === 'answeredBy'
  && edge.from.id === 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION'));
assert.ok(reportReverse.edges.some(edge => edge.relation === 'report'),
  'canonical report paths should reverse-resolve to their evidence row');

const reverse = queryResearchGraph(graph, {
  entity: 'questions:WS2-PORTAL-COARSE-GLOBAL-MERGE',
  direction: 'in',
  relation: 'constrainedBy',
  depth: 1,
});
assert.ok(reverse.nodes.some(node =>
  node.type === 'questions' && node.id === 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION'));

const premise = queryResearchGraph(graph, { entity: 'premises:P204', direction: 'both', depth: 1 });
assert.ok(premise.edges.length > 0);
assert.ok(premise.nodes.some(node =>
  node.type === 'premiseSnapshots' && node.id === 'solver-premise-map-v2-2026-09-17'),
  'admitted premises should reverse-resolve to the snapshot that admitted them');

const corpusPathReverse = queryResearchGraph(graph, {
  entity: 'repositoryRefs:data/stress/stress-levels.json',
  direction: 'in',
  depth: 1,
});
assert.ok(corpusPathReverse.nodes.some(node =>
  node.type === 'evidenceIntegrity' && node.id === 'canonical-stress-refresh-corpus-1'),
  'canonical corpus paths should reverse-resolve to evidence-integrity records');
assert.ok(corpusPathReverse.nodes.some(node =>
  node.type === 'assets' && node.id === 'stress-corpora'),
  'canonical corpus paths should reverse-resolve to research assets');

const experimentReverse = queryResearchGraph(graph, {
  entity: 'questions:WS2-MUST-TURN-LATE-ADDITIVE',
  direction: 'in',
  relation: 'question',
  depth: 1,
});
assert.ok(experimentReverse.nodes.some(node =>
  node.type === 'experiments' && node.id === 'STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY'));

const premiseImpact = buildResearchQueryView(graph, { view: 'impact', entity: 'premises:P204' });
assert.ok(premiseImpact.impactedQuestions.some(row => row.questionId === 'WS2-D1-PRODUCTION-INERT-OBSERVATION'),
  'premise impact must compose through measurement opportunities when no direct question-premise edge exists');

const reportImpact = buildResearchQueryView(graph, {
  view: 'impact',
  entity: 'repositoryRefs:reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md',
});
assert.ok(reportImpact.impactedQuestions.some(row =>
  row.questionId === 'WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE'));

const supportImpact = buildResearchQueryView(graph, {
  view: 'support-impact',
  entity: 'repositoryRefs:reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md',
});
assert.ok(supportImpact.rows.some(row =>
  row.questionId === 'WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE'
  && row.disposition === 'necessary'),
  'authored decisionSupport should distinguish necessary support from answeredBy-only evidence');

const answerability = buildResearchQueryView(graph, { view: 'answerability' });
assert.ok(answerability.noFreshSolverExecution.some(row => row.workstreamId === 1),
  'design gate should be visible as no-fresh-solver-execution work');
assert.ok(answerability.boundedCompute.some(row => row.workstreamId === '2X'),
  'small exact projections BC1 consumer gate should be explicitly classified as bounded compute');
assert.ok(answerability.dormantOrConditional.some(row => row.workstreamId === '2R'),
  'reopen-only parity lane should not appear as an active execution gate');
assert.equal(answerability.unclassified.length, 0,
  'canonical workstream table should classify every immediate gate');

const sharedMeasurements = buildResearchQueryView(graph, { view: 'shared-measurements', minimum: 2 });
assert.ok(sharedMeasurements.rows.some(row =>
  row.measurementOpportunityId === 'MO-004' && row.consumerCount >= 2));

assert.throws(
  () => buildResearchQueryView(graph, { view: 'shared-measurements', minimum: 0 }),
  /minimum must be a positive integer/,
);

const ownershipGaps = buildResearchQueryView(graph, { view: 'ownership-gaps' });
assert.ok(Array.isArray(ownershipGaps.capabilityDemandsWithoutQuestion));
assert.ok(ownershipGaps.decisionSupportUnknownQuestions.includes('WS2-MUST-TURN-LATE-ADDITIVE'),
  'questions with evidence trails but no authored sufficiency semantics should remain measurable as unknown');

const coverage = buildResearchQueryView(graph, { view: 'coverage' });
assert.equal(coverage.structuredGateCoverage.unclassified, 0);
assert.equal(coverage.unresolvedEdges.length, 0);

const snapshot = buildResearchQuerySnapshot(graph);
const headSnapshot = buildResearchQuerySnapshotFromGitRef(process.cwd(), 'HEAD');
assert.deepEqual(headSnapshot.gates, snapshot.gates,
  'Git-ref reconstruction of HEAD should preserve current workstream gate state');
const earlier = structuredClone(snapshot);
const ws2 = earlier.gates.find(row => row.workstreamId === 2);
assert.ok(ws2);
ws2.gateClass = 'bounded-compute';
const temporal = diffResearchQuerySnapshots(earlier, snapshot);
assert.equal(temporal.gateClassComparison.comparable, true);
assert.ok(temporal.newlyNoFreshSolverExecution.some(row => row.workstreamId === 2),
  'snapshot diff should identify workstreams whose gate moved from bounded compute into implementation');

const preGateClass = structuredClone(snapshot);
preGateClass.gates[0].gateClass = null;
preGateClass.gateClassCoverage.classified -= 1;
preGateClass.gateClassCoverage.complete = false;
const preGateDiff = diffResearchQuerySnapshots(preGateClass, snapshot);
assert.equal(preGateDiff.gateClassComparison.comparable, false);
assert.deepEqual(preGateDiff.newlyNoFreshSolverExecution, [],
  'historical refs without complete gate classification must not manufacture answerability transitions');
assert.deepEqual(preGateDiff.newlyBoundedCompute, []);

const searched = queryResearchGraph(graph, { query: 'portal coarse', limit: 20 });
assert.ok(searched.nodes.some(node => node.type === 'questions'));

const activeQuestions = queryResearchGraph(graph, { type: 'questions', status: 'active', limit: 100 });
assert.ok(activeQuestions.nodes.length > 0);
assert.ok(activeQuestions.nodes.every(node => String(node.row.state).includes('active')));

const multiEvidenceQuestions = queryResearchGraph(graph, {
  query: 'portal coarse',
  type: 'questions',
  edgeRelation: 'answeredBy',
  minDegree: 2,
  direction: 'out',
  limit: 20,
});
assert.ok(multiEvidenceQuestions.nodes.some(node => node.id === 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION'));

const cliDispatch = runResearchQueryCommand([
  '--entity=questions:WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
  '--depth=1',
], { root: process.cwd(), graph });
assert.equal(cliDispatch.payload.mode, 'traverse');

const viewDispatch = runResearchQueryCommand(['--view=answerability'], {
  root: process.cwd(),
  graph,
});
assert.equal(viewDispatch.payload.view, 'answerability');

const systemIndex = buildResearchSystemFindingIndex(process.cwd());
const systemLineageDispatch = runResearchQueryCommand(['--view=system-lineage'], {
  root: process.cwd(),
  graph,
  systemIndex,
});
assert.equal(systemLineageDispatch.payload.view, 'system-lineage');
assert.ok(systemLineageDispatch.payload.findingsWithoutPerFindingLineage.length > 0);
assert.ok(systemLineageDispatch.payload.reportLineageRows.some(row =>
  row.report === 'reports/2026-09-21-research-queryability-audit-001.md'));

const snapshotDispatch = runResearchQueryCommand(['--snapshot'], {
  root: process.cwd(),
  graph,
});
assert.equal(snapshotDispatch.payload.schemaVersion, 1);
assert.equal(snapshotDispatch.compact, true);

const compareRefDispatch = runResearchQueryCommand(['--compare-ref=HEAD'], {
  root: process.cwd(),
  graph,
  buildQuerySnapshotFromRef: () => snapshot,
});
assert.equal(compareRefDispatch.payload.addedNodes.length, 0);
assert.equal(compareRefDispatch.payload.removedNodes.length, 0);

const systemSnapshot = buildResearchSystemFindingSnapshot(systemIndex);
const compareSystemRefDispatch = runResearchQueryCommand(['--compare-system-ref=HEAD'], {
  root: process.cwd(),
  systemIndex,
  buildSystemSnapshotFromRef: () => systemSnapshot,
});
assert.equal(compareSystemRefDispatch.payload.added.length, 0);
assert.equal(compareSystemRefDispatch.payload.removed.length, 0);
assert.equal(compareSystemRefDispatch.payload.changed.length, 0);

const systemFindingsWithoutGraph = runResearchQueryCommand(['--view=system-findings'], {
  root: process.cwd(),
  systemIndex,
  buildGraph: () => {
    throw new Error('system-findings must not build the research graph');
  },
});
assert.equal(systemFindingsWithoutGraph.payload.view, 'system-findings');
assert.equal(systemFindingsWithoutGraph.payload.count, systemIndex.count);

// One real subprocess is enough to prove the executable wrapper, argv parsing, JSON stdout,
// and exit status. The in-process dispatcher assertions above cover the remaining CLI modes
// without rebuilding repository state six more times.
const cli = spawnSync(process.execPath, [
  'scripts/research-query.mjs',
  '--entity=questions:WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
  '--depth=1',
  '--no-discover',
], CLI_OPTIONS);
assert.equal(cli.status, 0, cli.stderr);
assert.equal(JSON.parse(cli.stdout).mode, 'traverse');

console.log('research-query-node-test: ok');
