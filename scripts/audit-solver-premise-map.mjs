#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import process from 'node:process';

const PREMISE_FILES = [
  'docs/solver-premise-space-register.csv',
  'docs/solver-premise-space-extension-2026-09-17.csv',
  'docs/solver-premise-space-extension-2026-09-17b.csv',
  'docs/solver-premise-space-extension-2026-09-17c.csv',
];
const RELATION_FILES = [
  'docs/solver-premise-space-graph.json',
  'docs/solver-premise-space-relations-v2.json',
  'docs/solver-premise-space-relations-v3.json',
];
const OVERLAY = 'docs/solver-premise-map-hardening-overlay.json';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some(value => value !== '')) rows.push(row);
  }
  return rows;
}

function records(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const header = rows.shift();
  return rows.map((values, index) => ({
    ...Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])),
    __path: path,
    __row: index + 2,
  }));
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[`*_"'.,:;!?()[\]{}\/\\-]/g, ' ')
    .replace(/\b(the|a|an|is|are|be|can|could|should|would|may|might|current|solver)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedRelations(data) {
  if (Array.isArray(data.edges)) {
    return data.edges.map(([from, to]) => ({ from, to, type: 'UNTYPED_ANCESTRY' }));
  }
  if (Array.isArray(data.typedEdges)) {
    return data.typedEdges.map(edge => ({ from: edge.source, to: edge.target, type: edge.relation }));
  }
  if (Array.isArray(data.relations)) return data.relations;
  return null;
}

const failures = [];
const warnings = [];
for (const path of [...PREMISE_FILES, ...RELATION_FILES, OVERLAY]) {
  if (!existsSync(path)) failures.push(`missing canonical hardening input: ${path}`);
}
if (failures.length) finish();

const premises = PREMISE_FILES.flatMap(records);
const byId = new Map();
for (const premise of premises) {
  if (!/^P\d{3}$/.test(premise.id)) failures.push(`${premise.__path}:${premise.__row} invalid premise id ${premise.id}`);
  if (byId.has(premise.id)) failures.push(`duplicate premise id ${premise.id}: ${byId.get(premise.id).__path} and ${premise.__path}`);
  byId.set(premise.id, premise);
  if (!premise.proposition?.trim()) failures.push(`${premise.id} has empty proposition text`);
  if (!premise.status?.trim()) failures.push(`${premise.id} has empty status`);
  if (!premise.source_paths?.trim()) warnings.push(`${premise.id} has no source_paths provenance`);
}

const normalized = new Map();
for (const premise of premises) {
  const key = normalizeText(premise.proposition);
  const prior = normalized.get(key);
  if (key && prior) warnings.push(`possible rewording duplicate: ${prior.id} and ${premise.id}`);
  else normalized.set(key, premise);
}

const relationObjects = RELATION_FILES.map(path => ({ path, data: JSON.parse(readFileSync(path, 'utf8')) }));
const degree = new Map([...byId.keys()].map(id => [id, { in: 0, out: 0 }]));
let relationCount = 0;
for (const { path, data } of relationObjects) {
  const relations = normalizedRelations(data);
  if (!relations) {
    failures.push(`${path} has no recognized relation collection (edges, typedEdges, or relations)`);
    continue;
  }
  relationCount += relations.length;
  for (const relation of relations) {
    for (const endpoint of ['from', 'to']) {
      const value = relation[endpoint];
      if (/^P\d{3}$/.test(value) && !byId.has(value)) failures.push(`${path} relation references missing ${value}`);
    }
    if (/^P\d{3}$/.test(relation.from)) degree.get(relation.from).out += 1;
    if (/^P\d{3}$/.test(relation.to)) degree.get(relation.to).in += 1;
  }
}

const overlay = JSON.parse(readFileSync(OVERLAY, 'utf8'));
if (overlay.schemaVersion !== 1) failures.push(`${OVERLAY} schemaVersion must be 1`);
for (const field of ['semanticNoveltyClasses','discoveryLineages','authorityClasses','maturityStages','temporalConditioningDimensions','contradictionCandidates','semanticSiblingFamilies','implicitDefaults','asymmetryFamilies','ontologyStressTests','miningLenses']) {
  if (!Array.isArray(overlay[field]) || overlay[field].length === 0) failures.push(`${OVERLAY}.${field} must be a non-empty array`);
}
if (JSON.stringify(overlay.canonicalPremiseFiles) !== JSON.stringify(PREMISE_FILES)) failures.push(`${OVERLAY}.canonicalPremiseFiles must match auditor canonical inputs`);
if (JSON.stringify(overlay.canonicalRelationFiles) !== JSON.stringify(RELATION_FILES)) failures.push(`${OVERLAY}.canonicalRelationFiles must match auditor canonical inputs`);

const lineageSet = new Set(overlay.discoveryLineages ?? []);
for (const path of PREMISE_FILES) {
  const lineages = overlay.fileDiscoveryLineages?.[path];
  if (!Array.isArray(lineages) || lineages.length === 0) {
    failures.push(`${OVERLAY}.fileDiscoveryLineages has no lineage for ${path}`);
    continue;
  }
  for (const lineage of lineages) {
    if (!lineageSet.has(lineage)) failures.push(`${OVERLAY}.fileDiscoveryLineages uses unknown lineage ${lineage} for ${path}`);
  }
}
for (const premise of premises) {
  if (!(overlay.fileDiscoveryLineages?.[premise.__path]?.length > 0)) failures.push(`${premise.id} inherits no discovery lineage from ${premise.__path}`);
}

function checkPremiseRef(value, where) {
  if (/^P\d{3}$/.test(value) && !byId.has(value)) failures.push(`${where} references unknown premise ${value}`);
}
for (const item of overlay.contradictionCandidates ?? []) {
  checkPremiseRef(item.left, `contradiction ${item.id}.left`);
  checkPremiseRef(item.right, `contradiction ${item.id}.right`);
  if (!['hard-contradiction','conditional-tension','strategy-tension'].includes(item.kind)) failures.push(`contradiction ${item.id} has invalid kind ${item.kind}`);
  if (!item.question?.trim()) failures.push(`contradiction ${item.id} has no discriminating question`);
}
for (const family of overlay.semanticSiblingFamilies ?? []) {
  checkPremiseRef(family.parent, `sibling family ${family.id}.parent`);
  for (const child of family.knownTestedForms ?? []) checkPremiseRef(child, `sibling family ${family.id}.knownTestedForms`);
  if (!Array.isArray(family.openSiblingClasses) || family.openSiblingClasses.length === 0) failures.push(`sibling family ${family.id} has no open siblings`);
}
for (const item of overlay.implicitDefaults ?? []) {
  for (const id of item.related ?? []) checkPremiseRef(id, `default ${item.id}.related`);
}

const closedLike = premises.filter(p => /closed|negative|reduced|saturated/i.test(p.status));
for (const premise of closedLike) {
  const hasScope = Boolean(premise.population?.trim() || premise.scope?.trim());
  const hasEvidence = Boolean(premise.evidence_summary?.trim());
  if (!hasScope) warnings.push(`${premise.id} has closure-like status without population/scope`);
  if (!hasEvidence) failures.push(`${premise.id} has closure-like status without evidence_summary`);
  if (!premise.architecture_epoch?.trim() && premise.__path.endsWith('register.csv')) warnings.push(`${premise.id} has closure-like status without architecture_epoch`);
}

const isolated = [...degree.entries()].filter(([, d]) => d.in + d.out === 0).map(([id]) => id);
const central = [...degree.entries()]
  .sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out))
  .slice(0, 15);
const weakCentral = central.filter(([id]) => /open|implicit|under|thin|untested|deferred/i.test(byId.get(id).status));

console.log(`Premise map: ${premises.length} propositions across ${PREMISE_FILES.length} files.`);
console.log(`Relation graph: ${relationCount} relations across ${RELATION_FILES.length} graph layers.`);
console.log(`Discovery lineage coverage: ${premises.length}/${premises.length} premises inherit at least one lineage.`);
console.log(`Isolated propositions: ${isolated.length}.`);
console.log(`High-centrality premises with weak/open status: ${weakCentral.map(([id,d]) => `${id}(${d.in + d.out})`).join(', ') || 'none'}.`);
console.log(`Hardening overlay: ${overlay.contradictionCandidates.length} tensions, ${overlay.semanticSiblingFamilies.length} sibling families, ${overlay.implicitDefaults.length} implicit defaults, ${overlay.asymmetryFamilies.length} asymmetries, ${overlay.ontologyStressTests.length} ontology stress tests.`);

finish();

function finish() {
  if (warnings.length) {
    console.warn(`\nPremise-map hardening warnings (${warnings.length}):`);
    for (const warning of warnings) console.warn(`  - ${warning}`);
  }
  if (failures.length) {
    console.error(`\nPremise-map hardening failures (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('\nPremise-map hardening structural audit passed.');
}
