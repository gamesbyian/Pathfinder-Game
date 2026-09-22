import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { buildResearchQueryGraph, queryResearchGraph, resolveResearchEntity } from './research-query-lib.mjs';

const graph = buildResearchQueryGraph(process.cwd(), { discoverArtifacts: false });
assert.equal(graph.authority.kind, 'derived-read-only');
assert.ok(graph.nodes.length > 0);
assert.ok(graph.edges.length > 0);
assert.equal(graph.diagnostics.unresolvedEdgeCount, 0, JSON.stringify(graph.diagnostics.unresolvedEdges.slice(0, 8)));
assert.deepEqual(graph.diagnostics.shapeDebt.openExperimentsOnTerminalQuestions, [],
  'stable experiment/question ownership must not leave an open promotion gate on a terminal question');
assert.ok(graph.diagnostics.shapeDebt.acquisitionNeedLexicalFallbackQuestions.includes('WS2-CUT-BALANCE-PROJECTION'),
  'query diagnostics should expose active questions whose acquisition route would use lexical fallback');
assert.ok(!graph.diagnostics.shapeDebt.acquisitionNeedLexicalFallbackQuestions.includes('WS2-REPAIR-DEADLINE-ALLOCATION'),
  'questions with explicit acquisitionNeed must not be reported as lexical fallback');

const question = resolveResearchEntity(graph, 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION');
assert.ok(question.some(node => node.type === 'questions'));

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

const cli = spawnSync(process.execPath, [
  'scripts/research-query.mjs',
  '--entity=questions:WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
  '--depth=1',
], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(cli.status, 0, cli.stderr);
assert.equal(JSON.parse(cli.stdout).mode, 'traverse');

console.log('research-query-node-test: ok');
