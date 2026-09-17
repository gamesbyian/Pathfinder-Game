#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import process from 'node:process';

const PREMISE_FILES = [
  'docs/solver-premise-space-register.csv',
  'docs/solver-premise-space-extension-2026-09-17.csv',
  'docs/solver-premise-space-extension-2026-09-17b.csv',
  'docs/solver-premise-space-extension-2026-09-17c.csv',
];
const LEDGERS = [
  'docs/solver-premise-map-source-coverage.json',
  'docs/solver-premise-map-source-coverage-addendum-2026-09-17.json',
];
const CANDIDATES = 'docs/solver-premise-space-post-v1-candidates-2026-09-17.csv';

const explicitExtraSources = [
  'docs/mechanic-state-contracts.md',
  'docs/variant-level-research.md',
  'docs/human-parent-contrast-research.md',
  'docs/technique-census-analysis.md',
  'data/stress/README.md',
  'modules/solver/README.md',
  'modules/solver/stage-plan.ts',
  'modules/solver/search-state.ts',
  'modules/solver/diversification.ts',
  '.github/workflows/README.md',
  'reports/2026-09-13-stress-corpus-population-validity-audit.md',
  'reports/2026-09-10-solver-system-audit.md',
];

const premiseMapSelfFiles = new Set([
  'docs/solver-premise-map-hardening.md',
  'docs/solver-premise-map-mining-preregistration.md',
  'docs/solver-premise-map-source-coverage.md',
  'docs/solver-premise-space-atlas.md',
]);

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
  return rows.map(values => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])));
}

function sourceList(value) {
  return String(value ?? '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.replace(/^\.\//, ''));
}

function currentSolverDocs() {
  return readdirSync('docs', { withFileTypes: true })
    .filter(entry => entry.isFile() && /^solver-.*\.md$/.test(entry.name))
    .map(entry => `docs/${entry.name}`)
    .filter(path => !premiseMapSelfFiles.has(path))
    .filter(path => !/^docs\/solver-premise-(space|map)-/.test(path));
}

const failures = [];
for (const path of [...PREMISE_FILES, ...LEDGERS, CANDIDATES]) {
  if (!existsSync(path)) failures.push(`missing premise-source audit input: ${path}`);
}
if (failures.length) finish();

const premises = PREMISE_FILES.flatMap(records);
const citedBy = new Map();
for (const premise of premises) {
  for (const source of sourceList(premise.source_paths)) {
    if (!citedBy.has(source)) citedBy.set(source, []);
    citedBy.get(source).push(premise.id);
  }
}

const ledgerDocs = LEDGERS.map(path => ({ path, data: JSON.parse(readFileSync(path, 'utf8')) }));
const allowed = new Set(ledgerDocs[0].data.dispositions ?? []);
const reviewed = new Map();
for (const { path: ledgerPath, data: ledger } of ledgerDocs) {
  for (const batch of ledger.batches ?? []) {
    for (const source of batch.sources ?? []) {
      if (!source.path || reviewed.has(source.path)) {
        failures.push(`duplicate or missing source path in coverage ledgers: ${source.path ?? '<empty>'}`);
        continue;
      }
      if (!allowed.has(source.disposition)) failures.push(`unknown disposition ${source.disposition} for ${source.path}`);
      if (!existsSync(source.path)) failures.push(`${ledgerPath} references missing source ${source.path}`);
      reviewed.set(source.path, { ...source, batchId: batch.id, ledgerPath });
    }
  }
}

const candidateRows = records(CANDIDATES);
const candidateIds = new Set(candidateRows.map(row => row.candidate_id));
for (const { path, candidateIds: ids = [] } of reviewed.values()) {
  for (const id of ids) {
    if (!candidateIds.has(id)) failures.push(`coverage ledger source ${path} references missing candidate ${id}`);
  }
}

const universe = [...new Set([...currentSolverDocs(), ...explicitExtraSources])]
  .filter(path => existsSync(path) && statSync(path).isFile())
  .sort();

const rows = universe.map(path => ({
  path,
  premiseRefs: [...new Set(citedBy.get(path) ?? [])],
  reviewed: reviewed.get(path) ?? null,
}));
const directlyCited = rows.filter(row => row.premiseRefs.length > 0);
const manuallyReviewed = rows.filter(row => row.reviewed);
const uncitedUnreviewed = rows.filter(row => row.premiseRefs.length === 0 && !row.reviewed);
const citedButUnreviewed = rows.filter(row => row.premiseRefs.length > 0 && !row.reviewed);

console.log(`Reciprocal source universe: ${rows.length} current candidate sources.`);
console.log(`Directly cited by v1: ${directlyCited.length}/${rows.length}.`);
console.log(`Explicitly source-audited: ${manuallyReviewed.length}/${rows.length}.`);
console.log(`Cited but not semantically source-audited: ${citedButUnreviewed.length}.`);
console.log(`Uncited and unreviewed: ${uncitedUnreviewed.length}.`);

if (uncitedUnreviewed.length) {
  console.log('\nUncited + unreviewed source candidates:');
  for (const row of uncitedUnreviewed) console.log(`  - ${row.path}`);
}

if (citedButUnreviewed.length) {
  console.log('\nCited but not yet reciprocal-semantic-audited:');
  for (const row of citedButUnreviewed) console.log(`  - ${row.path} <- ${row.premiseRefs.join(', ')}`);
}

const strict = process.argv.includes('--strict');
if (strict && uncitedUnreviewed.length) {
  failures.push(`${uncitedUnreviewed.length} current candidate sources are neither cited nor explicitly reviewed`);
}

finish();

function finish() {
  if (failures.length) {
    console.error(`\nPremise source-coverage audit failures (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('\nPremise reciprocal source-coverage audit completed.');
}
