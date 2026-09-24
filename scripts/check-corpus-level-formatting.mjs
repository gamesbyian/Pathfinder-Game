#!/usr/bin/env node
/**
 * Enforces one-record-per-line canonical formatting for first-class level corpora and hint files.
 *
 * Full/local/manual runs scan every current corpus + hint artifact.
 * PR CI sets PATHFINDER_PR_INCREMENTAL=1; formatting is a file-local invariant, so only added or
 * modified corpus/hint files can newly violate it. Unchanged files remain covered by the periodic
 * full repository oracle.
 */
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

import { stringifyCorpusJson } from './level-json-format.mjs';
import { listHintFiles, hintFilePathFor } from './level-data-io.mjs';
import { expectedHintArtifactFileNames } from '../modules/hint-artifact-layout.mjs';
import { prChangedFiles, readRepositoryText } from './repository-file-view.mjs';

const ROOT = process.cwd();

const CORPORA = [
  { relative: 'data/levels.json', label: 'published' },
  { relative: 'data/stress/stress-levels.json', label: 'stress-corpus-1' },
  { relative: 'data/stress/stress-levels-random.json', label: 'stress-corpus-2' },
  { relative: 'data/stress/stress-levels-envelope.json', label: 'stress-envelope' },
];

const CORPUS_BY_PATH = new Map(CORPORA.map(row => [row.relative, row]));
const HINT_PREFIXES = [
  'data/hints/',
  'data/stress/hints/',
  'data/stress/hints-random/',
  'data/stress/hints-envelope/',
];

export function corpusFormattingKind(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  const corpus = CORPUS_BY_PATH.get(normalized);
  if (corpus) return { kind: 'corpus', recordsField: 'levels', label: corpus.label };
  if (normalized.endsWith('.json') && HINT_PREFIXES.some(prefix => normalized.startsWith(prefix))) {
    return { kind: 'hint', recordsField: 'hints', label: 'hints' };
  }
  return null;
}

// Orphan detection needs the complete current corpus level set to know which hint filenames are
// legitimately unowned, so unlike per-path formatting it cannot run against a single PR-changed
// file -- only meaningful on a full scan (checkOrphanHintFiles() below, gated on !incremental).
function checkOrphanHintFiles() {
  const failures = [];
  let missingHintFiles = 0;
  for (const corpus of CORPORA) {
    const absolute = path.join(ROOT, corpus.relative);
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    const expectedHintFiles = new Set(expectedHintArtifactFileNames(levels));
    const actualHintFiles = listHintFiles(absolute);
    const actualHintFileSet = new Set(actualHintFiles);
    const orphanHintFiles = actualHintFiles.filter((name) => !expectedHintFiles.has(name));
    const missingForCorpus = [...expectedHintFiles].filter((name) => !actualHintFileSet.has(name));
    // Missing files are valid: levels with no stored hints intentionally have no artifact. Orphans
    // are not valid because no current level identity can own them.
    missingHintFiles += missingForCorpus.length;
    for (const orphan of orphanHintFiles) {
      failures.push(`${corpus.label} hints: orphan artifact ${orphan} has no matching corpus level identity`);
    }
  }
  return { failures, missingHintFiles };
}

export function canonicalFormattingIssue(relativePath, raw) {
  const classification = corpusFormattingKind(relativePath);
  if (!classification) return null;
  const parsed = JSON.parse(raw);
  const expected = stringifyCorpusJson(parsed, classification.recordsField);
  if (raw === expected) return null;
  return `${relativePath}: not in canonical one-line-per-${classification.kind === 'corpus' ? 'level' : 'hint'} format`;
}

function fullScanPaths() {
  const rows = [];
  for (const corpus of CORPORA) {
    const absolute = path.join(ROOT, corpus.relative);
    if (!fs.existsSync(absolute)) {
      throw new Error(`${corpus.label}: expected corpus file not found at ${absolute}`);
    }
    rows.push(corpus.relative);

    for (const hintFileName of listHintFiles(absolute)) {
      const key = hintFileName.replace(/\.json$/u, '');
      const hintFile = hintFilePathFor(absolute, key);
      rows.push(path.relative(ROOT, hintFile).split(path.sep).join('/'));
    }
  }
  return rows;
}

export function selectedFormattingPaths(root = ROOT) {
  const incremental = prChangedFiles(root);
  if (!incremental) return { incremental: false, paths: fullScanPaths() };

  const paths = incremental
    .map(file => file.split(path.sep).join('/'))
    .filter(file => corpusFormattingKind(file) !== null);
  return { incremental: true, paths };
}

function main() {
  let selection;
  try {
    selection = selectedFormattingPaths(ROOT);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const failures = [];
  let corporaChecked = 0;
  let hintFilesChecked = 0;

  for (const relativePath of selection.paths) {
    const kind = corpusFormattingKind(relativePath);
    if (!kind) continue;
    let raw;
    try {
      raw = readRepositoryText(ROOT, relativePath);
    } catch (error) {
      failures.push(`${relativePath}: unable to read tested repository blob (${error.message})`);
      continue;
    }

    try {
      const issue = canonicalFormattingIssue(relativePath, raw);
      if (issue) failures.push(issue);
    } catch (error) {
      failures.push(`${relativePath}: invalid JSON (${error.message})`);
    }

    if (kind.kind === 'corpus') corporaChecked += 1;
    else hintFilesChecked += 1;
  }

  // Orphan-hint-file detection requires the complete current corpus level set, so it only runs on
  // a full scan -- a single PR-changed hint file can't tell you whether it's orphaned.
  let missingHintFiles = 0;
  if (!selection.incremental) {
    const orphanResult = checkOrphanHintFiles();
    failures.push(...orphanResult.failures);
    missingHintFiles = orphanResult.missingHintFiles;
  }

  if (failures.length > 0) {
    console.error(`${failures.length} file(s) are misformatted:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      'Re-run the writer that produced this file (writeLevelsWithHints / the stress generators / '
      + 'backfill-level-provenance.mjs), or re-serialize with stringifyCorpusJson from '
      + 'scripts/level-json-format.mjs.',
    );
    process.exit(1);
  }

  if (selection.incremental && selection.paths.length === 0) {
    console.log('Corpus/hint formatting: no relevant PR changes; base commit already owns this file-local invariant.');
    return;
  }

  console.log(
    `${selection.incremental ? 'Changed-file' : 'Full'} corpus/hint formatting valid: `
    + `${corporaChecked} corpus file(s), ${hintFilesChecked} hint file(s) checked`
    + `${selection.incremental ? '' : `; ${missingHintFiles} level(s) intentionally have no hint artifact`}.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
