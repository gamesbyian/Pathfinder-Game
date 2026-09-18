#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const SNAPSHOT_V1 = 'docs/solver-premise-map-snapshot-v1.json';
const SNAPSHOT_V2 = 'docs/solver-premise-map-snapshot-v2.json';
const ADMISSIONS = 'docs/solver-premise-map-v2-admissions.json';
const NEW_PREMISE_FILE = 'docs/solver-premise-space-extension-2026-09-17d.csv';
const NEW_RELATION_FILE = 'docs/solver-premise-space-relations-v4.json';
const EXPECTED_NEW_IDS = ['P201', 'P202', 'P203', 'P204', 'P205', 'P206'];

const failures = [];
const warnings = [];

for (const path of [SNAPSHOT_V1, SNAPSHOT_V2, ADMISSIONS, NEW_PREMISE_FILE, NEW_RELATION_FILE]) {
  if (!existsSync(path)) failures.push(`missing v2 premise-map input: ${path}`);
}
if (failures.length) finish();

const v1 = JSON.parse(readFileSync(SNAPSHOT_V1, 'utf8'));
const v2 = JSON.parse(readFileSync(SNAPSHOT_V2, 'utf8'));
const admissions = JSON.parse(readFileSync(ADMISSIONS, 'utf8'));

if (v1.snapshotId !== 'solver-premise-map-v1-2026-09-17') failures.push(`unexpected v1 snapshot id: ${v1.snapshotId}`);
if (v1.snapshotCommit !== 'e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e') failures.push(`frozen v1 snapshot commit changed: ${v1.snapshotCommit}`);
if (v1.propositionCount !== 142 || v1.relationCount !== 166) failures.push(`frozen v1 counts changed: ${v1.propositionCount} propositions / ${v1.relationCount} relations`);

if (v2.snapshotId !== 'solver-premise-map-v2-2026-09-17') failures.push(`unexpected v2 snapshot id: ${v2.snapshotId}`);
if (v2.parentSnapshotId !== v1.snapshotId) failures.push(`v2 parentSnapshotId must be ${v1.snapshotId}`);
if (v2.parentSnapshotCommit !== v1.snapshotCommit) failures.push(`v2 parentSnapshotCommit must preserve v1 snapshot commit`);
if (!Array.isArray(v2.canonicalPremiseFiles) || !v2.canonicalPremiseFiles.includes(NEW_PREMISE_FILE)) failures.push(`v2 canonicalPremiseFiles must include ${NEW_PREMISE_FILE}`);
if (!Array.isArray(v2.relationFiles) || !v2.relationFiles.includes(NEW_RELATION_FILE)) failures.push(`v2 relationFiles must include ${NEW_RELATION_FILE}`);
for (const path of v1.canonicalPremiseFiles ?? []) {
  if (!v2.canonicalPremiseFiles?.includes(path)) failures.push(`v2 dropped v1 premise file ${path}`);
}
for (const path of v1.relationFiles ?? []) {
  if (!v2.relationFiles?.includes(path)) failures.push(`v2 dropped v1 relation file ${path}`);
}

for (const path of [...(v2.canonicalPremiseFiles ?? []), ...(v2.relationFiles ?? [])]) {
  if (!existsSync(path)) failures.push(`v2 snapshot references missing file: ${path}`);
}
if (failures.length) finish();

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
      } else if (ch === '"') quoted = false;
      else field += ch;
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

function normalizedRelations(data) {
  if (Array.isArray(data.edges)) return data.edges.map(([from, to]) => ({ from, to, type: 'UNTYPED_ANCESTRY' }));
  if (Array.isArray(data.typedEdges)) return data.typedEdges.map(edge => ({ from: edge.source, to: edge.target, type: edge.relation }));
  if (Array.isArray(data.relations)) return data.relations;
  return null;
}

const premises = v2.canonicalPremiseFiles.flatMap(records);
const byId = new Map();
for (const premise of premises) {
  if (!/^P\d{3}$/.test(premise.id)) failures.push(`${premise.__path}:${premise.__row} invalid premise id ${premise.id}`);
  if (byId.has(premise.id)) failures.push(`duplicate premise id ${premise.id}`);
  byId.set(premise.id, premise);
  if (!premise.proposition?.trim()) failures.push(`${premise.id} has empty proposition`);
  if (!premise.status?.trim()) failures.push(`${premise.id} has empty status`);
  if (!premise.source_paths?.trim()) warnings.push(`${premise.id} has no source_paths provenance`);
}

if (premises.length !== v2.propositionCount) failures.push(`v2 propositionCount=${v2.propositionCount}, actual=${premises.length}`);

const newRows = records(NEW_PREMISE_FILE);
const newIds = newRows.map(row => row.id);
if (JSON.stringify(newIds) !== JSON.stringify(EXPECTED_NEW_IDS)) failures.push(`post-v1 extension ids must be ${EXPECTED_NEW_IDS.join(', ')}, got ${newIds.join(', ')}`);
for (const id of EXPECTED_NEW_IDS) {
  if (!byId.has(id)) failures.push(`admitted premise missing from v2 inventory: ${id}`);
}

let relationCount = 0;
for (const path of v2.relationFiles) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const relations = normalizedRelations(data);
  if (!relations) {
    failures.push(`${path} has no recognized relation collection`);
    continue;
  }
  relationCount += relations.length;
  for (const relation of relations) {
    for (const endpoint of ['from', 'to']) {
      const value = relation[endpoint];
      if (/^P\d{3}$/.test(value) && !byId.has(value)) failures.push(`${path} relation references unknown premise ${value}`);
    }
  }
}
if (relationCount !== v2.relationCount) failures.push(`v2 relationCount=${v2.relationCount}, actual=${relationCount}`);

const v4 = JSON.parse(readFileSync(NEW_RELATION_FILE, 'utf8'));
if (v4.version !== 4) failures.push(`${NEW_RELATION_FILE} version must be 4`);
const v4Relations = normalizedRelations(v4) ?? [];
for (const id of EXPECTED_NEW_IDS) {
  if (!v4Relations.some(relation => relation.from === id || relation.to === id)) failures.push(`${id} has no v4 relation`);
}

const admitted = v2.admissionProvenance?.admitted ?? [];
if (JSON.stringify(admitted) !== JSON.stringify(EXPECTED_NEW_IDS)) failures.push(`snapshot admission provenance must list exactly ${EXPECTED_NEW_IDS.join(', ')}`);
if (v2.admissionProvenance?.deferredCandidate !== 'PV1-007') failures.push(`v2 must preserve PV1-007 as deferred`);
if (v2.admissionProvenance?.scopeOnlyCandidate !== 'PV1-002') failures.push(`v2 must preserve PV1-002 as scope-only`);

if (admissions.schemaVersion !== 1 || admissions.mapVersion !== v2.snapshotId) failures.push(`${ADMISSIONS} must target ${v2.snapshotId} with schemaVersion 1`);
const admissionRows = admissions.admissions ?? [];
const admissionIds = admissionRows.map(item => item.premiseId);
if (JSON.stringify(admissionIds) !== JSON.stringify(EXPECTED_NEW_IDS)) failures.push(`${ADMISSIONS} must record exactly ${EXPECTED_NEW_IDS.join(', ')}`);
for (const item of admissionRows) {
  for (const field of ['candidateId', 'semanticNoveltyClass', 'proposition', 'systemLocus', 'claimType', 'evidenceState', 'maturityStage', 'increaseConfidenceObservation', 'decreaseConfidenceObservation', 'productionUseAllowed']) {
    if (item[field] === undefined || item[field] === null || String(item[field]).trim() === '') failures.push(`${ADMISSIONS} ${item.premiseId ?? '<unknown>'} missing ${field}`);
  }
  if (!Array.isArray(item.sourcePaths) || item.sourcePaths.length === 0) failures.push(`${ADMISSIONS} ${item.premiseId} missing sourcePaths`);
  if (!Array.isArray(item.discoveryLineages) || item.discoveryLineages.length === 0) failures.push(`${ADMISSIONS} ${item.premiseId} missing discoveryLineages`);
  if (!['NEW_PARENT', 'SPECIALIZATION', 'SCOPE_SPLIT', 'EVIDENCE_STATE_CHANGE', 'IMPLEMENTATION_FORM', 'RELATION_ONLY', 'REWORDING_ONLY'].includes(item.semanticNoveltyClass)) failures.push(`${ADMISSIONS} ${item.premiseId} invalid semanticNoveltyClass ${item.semanticNoveltyClass}`);
  if (item.productionUseAllowed !== 'no') warnings.push(`${item.premiseId} productionUseAllowed=${item.productionUseAllowed}; Phase 3 admissions are expected to be non-production`);
  if (byId.get(item.premiseId)?.proposition !== item.proposition) failures.push(`${item.premiseId} proposition differs between ${ADMISSIONS} and ${NEW_PREMISE_FILE}`);
}
const nonAdmissions = admissions.nonAdmissions ?? [];
if (!nonAdmissions.some(item => item.candidateId === 'PV1-007' && /deferred/i.test(item.disposition ?? ''))) failures.push(`${ADMISSIONS} must preserve PV1-007 deferred disposition`);
if (!nonAdmissions.some(item => item.candidateId === 'PV1-002' && /no premise id/i.test(item.disposition ?? ''))) failures.push(`${ADMISSIONS} must preserve PV1-002 no-ID disposition`);

console.log(`Premise map v2: ${premises.length} propositions across ${v2.canonicalPremiseFiles.length} files.`);
console.log(`Relation graph v2: ${relationCount} relations across ${v2.relationFiles.length} graph layers.`);
console.log(`Post-v1 admissions: ${EXPECTED_NEW_IDS.join(', ')}.`);
console.log(`Frozen parent preserved: ${v1.snapshotId} @ ${v1.snapshotCommit}.`);
finish();

function finish() {
  if (warnings.length) {
    console.warn(`\nPremise-map v2 warnings (${warnings.length}):`);
    for (const warning of warnings) console.warn(`  - ${warning}`);
  }
  if (failures.length) {
    console.error(`\nPremise-map v2 failures (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('\nPremise-map v2 structural audit passed.');
}
