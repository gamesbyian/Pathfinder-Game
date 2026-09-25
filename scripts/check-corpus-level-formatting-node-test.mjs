#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  canonicalFormattingIssue,
  corpusFormattingKind,
} from './check-corpus-level-formatting.mjs';
import { stringifyCorpusJson } from './level-json-format.mjs';

for (const [file, kind] of [
  ['data/levels.json', 'corpus'],
  ['data/stress/stress-levels.json', 'corpus'],
  ['data/stress/stress-levels-random.json', 'corpus'],
  ['data/stress/stress-levels-envelope.json', 'corpus'],
  ['data/hints/1.json', 'hint'],
  ['data/stress/hints/R00001.json', 'hint'],
  ['data/stress/hints-random/R00001.json', 'hint'],
  ['data/stress/hints-envelope/R00001.json', 'hint'],
  ['data/families/hints/F00001.json', 'hint'],
  ['data/families/phaseB/hints/F00002.json', 'hint'],
]) {
  assert.equal(corpusFormattingKind(file)?.kind, kind, file);
}

for (const file of [
  'data/themes.json',
  'data/stress/other.json',
  'reports/example.json',
  'scripts/example.mjs',
]) {
  assert.equal(corpusFormattingKind(file), null, file);
}

const corpus = [{ id: 'L1', gates: [[0, 0]], goal: [1, 0] }];
const canonicalCorpus = stringifyCorpusJson(corpus);
assert.equal(canonicalFormattingIssue('data/levels.json', canonicalCorpus), null);
assert.match(
  canonicalFormattingIssue('data/levels.json', JSON.stringify(corpus, null, 2) + '\n'),
  /one-line-per-level/u,
);

const hints = { schemaVersion: 1, hints: [{ path: [0, 1, 2], provenance: [] }] };
const canonicalHints = stringifyCorpusJson(hints, 'hints');
assert.equal(canonicalFormattingIssue('data/hints/1.json', canonicalHints), null);
assert.match(
  canonicalFormattingIssue('data/hints/1.json', JSON.stringify(hints, null, 2) + '\n'),
  /one-line-per-hint/u,
);

console.log('corpus-level formatting classification: all tests passed');
