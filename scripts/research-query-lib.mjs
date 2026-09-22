import { buildResearchRelations } from './research-relations-lib.mjs';
import { researchQuestionLifecycleClass } from './research-question-relations-lib.mjs';

const IDENTITY = {
  questions: 'id', assets: 'id', assetRelationships: 'id', measurementOpportunities: 'id',
  evidenceIntegrity: 'evidenceId', evidence: 'topicId', queue: 'topicId',
  experiments: 'experimentId', promotions: 'promotionId', premiseSnapshots: 'snapshotId',
  premiseAdmissions: 'premiseId', premises: 'premiseId', durableEvidence: 'bundlePath',
  researchBlocks: 'blockId', capabilityDemands: 'id',
};

const QUESTION_EDGE_FIELDS = [
  'implies','triggeredBy','negativeControlFor','calibratedBy','calibrates','supersedes','duplicateOf'
];

const pathLike = value => typeof value === 'string' && /^(?:\.github|docs|reports|scripts|data|logs|modules|tests)\//u.test(value);
const arr = value => value == null ? [] : Array.isArray(value) ? value : [value];

function ref(type, id) { return { type, id: String(id) }; }
function key(value) { return value.type + ':' + value.id; }

function edge(fromType, fromId, relation, toType, toId, source, strength = 'authored') {
  return { from: ref(fromType, fromId), relation, to: ref(toType, toId), source, strength };
}

function sourceFor(row, fallback) {
  return row?._researchSource ?? { relation: fallback, source: null };
}

function rowNodes(model) {
  const nodes = [];
  for (const [relation, idField] of Object.entries(IDENTITY)) {
    for (const row of model.relations[relation] ?? []) {
      const id = row?.[idField];
      if (id == null) continue;
      nodes.push({ type: relation, id: String(id), row, source: sourceFor(row, relation) });
    }
  }
  return nodes;
}

function authoredEdges(model) {
  const out = [];
  const add = (...args) => out.push(edge(...args));
  const questions = model.relations.questions ?? [];
  const questionIds = new Set(questions.map(row => String(row.id)));

  for (const q of questions) {
    for (const field of QUESTION_EDGE_FIELDS) {
      for (const id of arr(q[field])) add('questions', q.id, field, 'questions', id, sourceFor(q, 'questions'));
    }
    for (const value of arr(q.constrainedBy)) {
      add('questions', q.id, 'constrainedBy', questionIds.has(String(value)) ? 'questions' : 'repositoryRefs',
        value, sourceFor(q, 'questions'));
    }
    for (const value of arr(q.answeredBy)) add('questions', q.id, 'answeredBy', 'repositoryRefs', value, sourceFor(q, 'questions'));
    for (const value of arr(q.decisionSupport?.refs)) add('questions', q.id, 'decisionSupport', 'repositoryRefs', value, sourceFor(q, 'questions'));
    for (const value of arr(q.premiseRefs ?? q.premiseIds ?? q.mappedPremises)) {
      add('questions', q.id, 'premise', 'premises', value, sourceFor(q, 'questions'));
    }
    for (const value of arr(q.measurementOpportunity ?? q.measurementOpportunities ?? q.measurementOpportunityIds)) {
      add('questions', q.id, 'measurementOpportunity', 'measurementOpportunities', value, sourceFor(q, 'questions'));
    }
  }

  for (const row of model.relations.queue ?? []) {
    if (row.questionRef) add('queue', row.topicId, 'question', 'questions', row.questionRef, sourceFor(row, 'queue'));
  }

  for (const row of model.relations.evidence ?? []) {
    if (row.latestEvidence?.report) add('evidence', row.topicId, 'report', 'repositoryRefs', row.latestEvidence.report, sourceFor(row, 'evidence'));
    if (row.researchQuestion) add('evidence', row.topicId, 'question', 'questions', row.researchQuestion, sourceFor(row, 'evidence'));
    for (const id of arr(row.premiseRefs)) add('evidence', row.topicId, 'premise', 'premises', id, sourceFor(row, 'evidence'));
    for (const id of arr(row.measurementOpportunities)) add('evidence', row.topicId, 'measurementOpportunity', 'measurementOpportunities', id, sourceFor(row, 'evidence'));
    for (const value of arr(row.sourceArtifacts)) add('evidence', row.topicId, 'sourceArtifact', 'repositoryRefs', value, sourceFor(row, 'evidence'));
    for (const value of arr(row.successorArtifacts)) add('evidence', row.topicId, 'successorArtifact', 'repositoryRefs', value, sourceFor(row, 'evidence'));
    for (const id of arr(row.successorQuestions)) add('evidence', row.topicId, 'successorQuestion', 'questions', id, sourceFor(row, 'evidence'));
  }

  for (const row of model.relations.experiments ?? []) {
    if (row.questionRef) add('experiments', row.experimentId, 'question', 'questions', row.questionRef, sourceFor(row, 'experiments'));
  }

  for (const row of model.relations.promotions ?? []) {
    if (row.decisionEvidenceRef) add('promotions', row.promotionId, 'decisionEvidence', 'repositoryRefs', row.decisionEvidenceRef, sourceFor(row, 'promotions'));
  }

  for (const row of model.relations.assetRelationships ?? []) {
    for (const id of arr(row.assets)) add('assetRelationships', row.id, 'asset', 'assets', id, sourceFor(row, 'assetRelationships'));
  }
  for (const row of model.relations.assets ?? []) {
    for (const id of arr(row.relatedAssets)) add('assets', row.id, 'relatedAsset', 'assets', id, sourceFor(row, 'assets'));
    for (const location of arr(row.locations)) if (pathLike(location?.path)) {
      add('assets', row.id, 'location', 'repositoryRefs', location.path, sourceFor(row, 'assets'));
    }
    for (const authority of arr(row.authorities)) if (pathLike(authority)) {
      add('assets', row.id, 'authority', 'repositoryRefs', authority, sourceFor(row, 'assets'));
    }
    for (const record of arr(row.evidenceIntegrityRecords)) if (record?.evidenceId) {
      add('assets', row.id, 'evidenceIntegrity', 'evidenceIntegrity', record.evidenceId, sourceFor(row, 'assets'));
    }
  }

  for (const row of model.relations.evidenceIntegrity ?? []) {
    for (const sourcePath of arr(row.sourcePaths)) if (pathLike(sourcePath)) {
      add('evidenceIntegrity', row.evidenceId, 'sourcePath', 'repositoryRefs', sourcePath, sourceFor(row, 'evidenceIntegrity'));
    }
    if (row.producer?.workflow) {
      add('evidenceIntegrity', row.evidenceId, 'producerWorkflow', 'repositoryRefs',
        '.github/workflows/' + row.producer.workflow, sourceFor(row, 'evidenceIntegrity'));
    }
    if (pathLike(row.producer?.entrypoint)) {
      add('evidenceIntegrity', row.evidenceId, 'producerEntrypoint', 'repositoryRefs',
        row.producer.entrypoint, sourceFor(row, 'evidenceIntegrity'));
    }
  }

  for (const row of model.relations.measurementOpportunities ?? []) {
    for (const id of arr(row.mappedPremises ?? row.premiseRefs ?? row.premiseIds)) {
      add('measurementOpportunities', row.id, 'premise', 'premises', id, sourceFor(row, 'measurementOpportunities'));
    }
  }

  for (const row of model.relations.premiseSnapshots ?? []) {
    if (row.parentSnapshotId) {
      add('premiseSnapshots', row.snapshotId, 'parentSnapshot', 'premiseSnapshots', row.parentSnapshotId, sourceFor(row, 'premiseSnapshots'));
    }
    for (const file of arr(row.canonicalPremiseFiles)) if (pathLike(file)) {
      add('premiseSnapshots', row.snapshotId, 'canonicalPremiseFile', 'repositoryRefs', file, sourceFor(row, 'premiseSnapshots'));
    }
    for (const file of arr(row.relationFiles)) if (pathLike(file)) {
      add('premiseSnapshots', row.snapshotId, 'relationFile', 'repositoryRefs', file, sourceFor(row, 'premiseSnapshots'));
    }
    for (const file of arr(row.hardeningInputs)) if (pathLike(file)) {
      add('premiseSnapshots', row.snapshotId, 'hardeningInput', 'repositoryRefs', file, sourceFor(row, 'premiseSnapshots'));
    }
    for (const value of Object.values(row.admissionProvenance ?? {})) {
      if (pathLike(value)) add('premiseSnapshots', row.snapshotId, 'admissionProvenance', 'repositoryRefs', value, sourceFor(row, 'premiseSnapshots'));
    }
    for (const premiseId of arr(row.admissionProvenance?.admitted)) {
      add('premiseSnapshots', row.snapshotId, 'admittedPremise', 'premises', premiseId, sourceFor(row, 'premiseSnapshots'));
    }
  }

  const premiseIds = new Set((model.relations.premises ?? []).map(row => String(row.premiseId)));
  const premiseRefType = value => {
    const id = String(value);
    if (premiseIds.has(id) || /^P\d+$/u.test(id)) return 'premises';
    return 'premiseConcepts';
  };
  for (const row of model.relations.premiseEdges ?? []) {
    add(
      premiseRefType(row.from),
      row.from,
      row.type ?? 'premiseRelation',
      premiseRefType(row.to),
      row.to,
      sourceFor(row, 'premiseEdges'),
    );
  }
  for (const row of model.relations.premiseAdmissions ?? []) {
    add('premiseAdmissions', row.premiseId, 'premise', 'premises', row.premiseId, sourceFor(row, 'premiseAdmissions'));
  }

  for (const row of model.relations.durableEvidence ?? []) {
    if (row.questionId) add('durableEvidence', row.bundlePath, 'question', 'questions', row.questionId, sourceFor(row, 'durableEvidence'));
    if (row.measurementOpportunity) add('durableEvidence', row.bundlePath, 'measurementOpportunity', 'measurementOpportunities', row.measurementOpportunity, sourceFor(row, 'durableEvidence'));
    if (row.blockId) add('durableEvidence', row.bundlePath, 'block', 'researchBlocks', row.blockId, sourceFor(row, 'durableEvidence'));
    if (row.manifestPath) add('durableEvidence', row.bundlePath, 'manifest', 'repositoryRefs', row.manifestPath, sourceFor(row, 'durableEvidence'));
  }

  for (const row of model.relations.researchBlocks ?? []) {
    if (row.questionId) add('researchBlocks', row.blockId, 'question', 'questions', row.questionId, sourceFor(row, 'researchBlocks'));
    for (const artifactRef of arr(row.artifactRefs)) if (pathLike(artifactRef)) {
      add('researchBlocks', row.blockId, 'artifact', 'repositoryRefs', artifactRef, sourceFor(row, 'researchBlocks'));
    }
    for (const [kind, refs] of Object.entries(row.enrichments ?? {})) {
      for (const artifactRef of arr(refs)) if (pathLike(artifactRef)) {
        add('researchBlocks', row.blockId, 'enrichment:' + kind, 'repositoryRefs', artifactRef, sourceFor(row, 'researchBlocks'));
      }
    }
    for (const event of arr(row.researchBlock?.consumptionEvents)) {
      if (event?.questionId) add('researchBlocks', row.blockId, 'consumedByQuestion', 'questions', event.questionId, sourceFor(row, 'researchBlocks'));
      if (event?.decisionRef && pathLike(event.decisionRef)) add('researchBlocks', row.blockId, 'consumedByDecision', 'repositoryRefs', event.decisionRef, sourceFor(row, 'researchBlocks'));
    }
  }

  for (const row of model.relations.capabilityDemands ?? []) {
    if (row.questionId) add('capabilityDemands', row.id, 'question', 'questions', row.questionId, sourceFor(row, 'capabilityDemands'));
    for (const value of arr(row.evidenceRefs)) add('capabilityDemands', row.id, 'evidenceRef', 'repositoryRefs', value, sourceFor(row, 'capabilityDemands'));
  }

  return out;
}

function repositoryRefNodes(edges) {
  const ids = new Set();
  for (const e of edges) {
    if (e.from.type === 'repositoryRefs') ids.add(e.from.id);
    if (e.to.type === 'repositoryRefs') ids.add(e.to.id);
  }
  return [...ids].sort().map(id => ({
    type: 'repositoryRefs',
    id,
    row: { path: id },
    source: { relation: 'derived-reference', source: id },
  }));
}

export function buildResearchQueryGraph(root = process.cwd(), options = {}) {
  const model = buildResearchRelations(root, {
    discoverArtifacts: options.discoverArtifacts ?? true,
    allowHistoricalWorkstreamTable: options.allowHistoricalWorkstreamTable ?? false,
  });
  const edges = authoredEdges(model);
  const premiseConceptIds = new Set();
  for (const e of edges) {
    if (e.from.type === 'premiseConcepts') premiseConceptIds.add(e.from.id);
    if (e.to.type === 'premiseConcepts') premiseConceptIds.add(e.to.id);
  }
  const premiseConceptNodes = [...premiseConceptIds].sort().map(id => ({
    type: 'premiseConcepts',
    id,
    row: { label: id },
    source: { relation: 'authored-premise-concept', source: null },
  }));
  const nodes = [...rowNodes(model), ...premiseConceptNodes, ...repositoryRefNodes(edges)];
  const nodeMap = new Map(nodes.map(node => [key(node), node]));
  const unresolvedEdges = edges.filter(e => !nodeMap.has(key(e.from)) || !nodeMap.has(key(e.to)));
  const degree = new Map(nodes.map(node => [key(node), 0]));
  for (const e of edges) {
    degree.set(key(e.from), (degree.get(key(e.from)) ?? 0) + 1);
    degree.set(key(e.to), (degree.get(key(e.to)) ?? 0) + 1);
  }
  const orphanCounts = Object.fromEntries([...new Set(nodes.map(node => node.type))].sort().map(type => [
    type,
    nodes.filter(node => node.type === type && (degree.get(key(node)) ?? 0) === 0).length,
  ]));
  const questionById = new Map((model.relations.questions ?? []).map(row => [String(row.id), row]));
  const shapeDebt = {
    queueWithoutQuestionRef: (model.relations.queue ?? []).filter(row => !row.questionRef).map(row => row.topicId),
    evidenceWithoutQuestionRef: (model.relations.evidence ?? []).filter(row => !row.researchQuestion).map(row => row.topicId),
    experimentsWithoutStableQuestionRef: (model.relations.experiments ?? []).filter(row => !row.questionRef).map(row => row.experimentId),
    acquisitionNeedLexicalFallbackQuestions: (model.relations.questions ?? []).filter(row => {
      const lifecycle = researchQuestionLifecycleClass(String(row.state ?? '').toLowerCase());
      return ['active', 'mixed'].includes(lifecycle) && !row.acquisitionNeed;
    }).map(row => row.id),
    decisionSupportUnknownQuestions: (model.relations.questions ?? [])
      .filter(row => (row.answeredBy ?? []).length > 0 && !row.decisionSupport)
      .map(row => row.id),
    openExperimentsOnTerminalQuestions: (model.relations.experiments ?? []).filter(row => {
      if (row.promotionState !== 'open' || !row.questionRef) return false;
      const question = questionById.get(String(row.questionRef));
      const lifecycle = researchQuestionLifecycleClass(String(question?.state ?? '').toLowerCase());
      return lifecycle === 'closed' || lifecycle === 'concluded';
    }).map(row => ({ experimentId: row.experimentId, questionRef: row.questionRef })),
  };
  return {
    schemaVersion: 1,
    authority: {
      kind: 'derived-read-only',
      note: 'Edges normalize authored relationships from existing owners. They do not create scientific truth or replace source authorities.',
    },
    nodes,
    edges,
    diagnostics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      unresolvedEdgeCount: unresolvedEdges.length,
      unresolvedEdges,
      orphanCounts,
      shapeDebt,
    },
  };
}

export function resolveResearchEntity(graph, selector) {
  const raw = String(selector ?? '').trim();
  if (!raw) return [];
  const colon = raw.indexOf(':');
  if (colon > 0) {
    const type = raw.slice(0, colon);
    const id = raw.slice(colon + 1);
    return graph.nodes.filter(node => node.type === type && node.id === id);
  }
  return graph.nodes.filter(node => node.id === raw);
}

export function queryResearchGraph(graph, {
  entity, query = '', relation = '', direction = 'both', depth = 1, limit = 100,
  type = '', status = '', edgeRelation = '', minDegree = 0,
} = {}) {
  const roots = entity ? resolveResearchEntity(graph, entity) : [];
  if (entity && roots.length === 0) throw new Error('unknown research entity: ' + entity);
  if (!['in','out','both'].includes(direction)) throw new Error('--direction must be in, out, or both');
  if (!Number.isInteger(depth) || depth < 0 || depth > 8) throw new Error('--depth must be an integer from 0 to 8');
  const wantedRelation = String(relation ?? '').trim();
  const terms = String(query ?? '').trim().toLowerCase().split(/\s+/u).filter(Boolean);

  if (!entity) {
    const wantedType = String(type ?? '').trim();
    const wantedStatus = String(status ?? '').trim().toLowerCase();
    const wantedEdgeRelation = String(edgeRelation ?? '').trim();
    const threshold = Number(minDegree ?? 0);
    if (!Number.isInteger(threshold) || threshold < 0) throw new Error('--min-degree must be a non-negative integer');
    const matches = graph.nodes.filter(node => {
      if (wantedType && node.type !== wantedType) return false;
      if (wantedStatus) {
        const rowStatus = String(node.row?.state ?? node.row?.status ?? node.row?.executionState ?? '').toLowerCase();
        if (!rowStatus.includes(wantedStatus)) return false;
      }
      if (threshold > 0) {
        const nodeKey = key(node);
        const degree = graph.edges.filter(e => {
          if (wantedEdgeRelation && e.relation !== wantedEdgeRelation) return false;
          if (direction === 'in') return key(e.to) === nodeKey;
          if (direction === 'out') return key(e.from) === nodeKey;
          return key(e.from) === nodeKey || key(e.to) === nodeKey;
        }).length;
        if (degree < threshold) return false;
      }
      if (!terms.length) return true;
      const haystack = JSON.stringify({ type: node.type, id: node.id, row: node.row }).toLowerCase();
      return terms.every(term => haystack.includes(term));
    }).slice(0, limit);
    return { mode: 'search', matched: matches.length, nodes: matches, diagnostics: graph.diagnostics };
  }

  const seen = new Set(roots.map(key));
  let frontier = roots.map(node => ref(node.type, node.id));
  const traversed = [];
  for (let step = 0; step < depth && frontier.length; step += 1) {
    const frontierKeys = new Set(frontier.map(key));
    const next = [];
    for (const e of graph.edges) {
      if (wantedRelation && e.relation !== wantedRelation) continue;
      let neighbor = null;
      if ((direction === 'out' || direction === 'both') && frontierKeys.has(key(e.from))) neighbor = e.to;
      if ((direction === 'in' || direction === 'both') && frontierKeys.has(key(e.to))) neighbor = e.from;
      if (!neighbor) continue;
      traversed.push({ ...e, depth: step + 1 });
      const neighborKey = key(neighbor);
      if (!seen.has(neighborKey)) {
        seen.add(neighborKey);
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  const nodes = [...seen].map(k => graph.nodes.find(node => key(node) === k)).filter(Boolean).slice(0, limit);
  return {
    mode: 'traverse',
    roots: roots.map(node => ref(node.type, node.id)),
    depth,
    direction,
    relation: wantedRelation || null,
    nodes,
    edges: traversed.slice(0, limit),
    diagnostics: graph.diagnostics,
  };
}
