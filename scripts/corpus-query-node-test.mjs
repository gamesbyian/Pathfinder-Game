#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CORPUS_ALIASES, describeLevel, deterministicSample, filterLevelDescriptors, loadCorpus, summarizeDescriptors } from './corpus-query-lib.mjs';

assert.equal(CORPUS_ALIASES.corpus1, CORPUS_ALIASES.stress1,
    'live corpus1 vocabulary must resolve through the same canonical loader path as stress1');
assert.equal(CORPUS_ALIASES.corpus2, CORPUS_ALIASES.stress2,
    'live corpus2 vocabulary must resolve through the same canonical loader path as stress2');
assert.equal(CORPUS_ALIASES.envelope, 'data/stress/stress-levels-envelope.json',
    'envelope must remain a first-class corpus alias');

const levels = [
    { id: 'A', grid: { w: 5, h: 5 }, reqLen: 12, reqInt: 1, gates: [{ x: 1, y: 1 }], portals: [], mustCross: [], stressMeta: { featureTags: ['small'], generationBatch: 'A' }, provenance: { origin: 'procedural', history: [{ action: 'generated', method: 'stress-corpus-generator', detail: { generatorVersion: '1.0.0', corpusName: 'batch-driven-v1' } }] } },
    { id: 'B', grid: { w: 10, h: 10 }, reqLen: 80, reqInt: 8, gates: [{ x: 1, y: 1 }], portals: [{ x1: 1, y1: 2, x2: 9, y2: 9 }], mustCross: [{ x: 5, y: 5 }], stressMeta: { featureTags: ['portals', 'crossing-rich'], archetype: 'hard-crossing' }, provenance: { origin: 'procedural', history: [{ action: 'generated', method: 'stress-corpus-random-generator', detail: { generatorVersion: '1.1.0', corpusName: 'random-uniform-v1' } }] } },
    { id: 'C', grid: { w: 8, h: 8 }, reqLen: 60, reqInt: 6, gates: [{ x: 1, y: 1 }], portals: [], mustCross: [{ x: 4, y: 4 }], stressMeta: { featureTags: ['crossing-rich'] }, provenance: { origin: 'human', history: [{ action: 'authored', method: 'editor' }] } },
];
const items = levels.map(describeLevel);
assert.deepEqual(items[1].grid, [10, 10]);
assert.equal(items[1].counts.portals, 1);
assert.equal(items[1].provenance.origin, 'procedural');
assert.deepEqual(items[1].provenance.generatorVersions, ['1.1.0']);
assert.deepEqual(items[1].provenance.corpusNames, ['random-uniform-v1']);
assert.deepEqual(filterLevelDescriptors(items, { minReqInt: 7 }).map(item => item.id), ['B']);
assert.deepEqual(filterLevelDescriptors(items, { mechanic: 'portal' }).map(item => item.id), ['B']);
assert.deepEqual(filterLevelDescriptors(items, { batch: 'A' }).map(item => item.id), ['A']);
assert.deepEqual(filterLevelDescriptors(items, { origin: 'human' }).map(item => item.id), ['C']);
assert.deepEqual(filterLevelDescriptors(items, { method: 'random-generator' }).map(item => item.id), ['B']);
assert.deepEqual(filterLevelDescriptors(items, { action: 'generated' }).map(item => item.id), ['A', 'B']);
assert.deepEqual(filterLevelDescriptors(items, { generatorVersion: '1.1' }).map(item => item.id), ['B']);
assert.deepEqual(filterLevelDescriptors(items, { corpusName: 'random-uniform' }).map(item => item.id), ['B']);
assert.equal(deterministicSample(items, 2, 'x').length, 2);
assert.deepEqual(deterministicSample(items, 2, 'x').map(x => x.id), deterministicSample(items, 2, 'x').map(x => x.id));
const summary = summarizeDescriptors(items);
assert.equal(summary.levels, 3);
assert.equal(summary.mechanics.gates, 3);
assert.equal(summary.mechanics.mustCross, 2);
assert.equal(summary.evidenceAncestry.origins.procedural, 2);
assert.equal(summary.evidenceAncestry.origins.human, 1);
assert.equal(summary.evidenceAncestry.generatorVersions['1.1.0'], 1);
assert.equal(summary.evidenceAncestry.generatorVersions['(missing)'], 1);

// loadCorpus is the shared shape boundary for research tools. Both historical top-level arrays and
// current wrapper objects must resolve to the same levels collection when a direct path is supplied;
// wrapper generation metadata is preserved separately from row-level ancestry.
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'pathfinder-corpus-query-'));
try {
    writeFileSync(path.join(tempRoot, 'array.json'), JSON.stringify(levels));
    writeFileSync(path.join(tempRoot, 'wrapped.json'), JSON.stringify({ schemaVersion: 1, generatorVersion: 'header-v', levels }));
    assert.deepEqual(loadCorpus(tempRoot, 'array.json').levels.map(level => level.id), ['A', 'B', 'C']);
    assert.equal(loadCorpus(tempRoot, 'array.json').metadata, null);
    assert.deepEqual(loadCorpus(tempRoot, 'wrapped.json').levels.map(level => level.id), ['A', 'B', 'C']);
    assert.equal(loadCorpus(tempRoot, 'wrapped.json').metadata.generatorVersion, 'header-v');
} finally {
    rmSync(tempRoot, { recursive: true, force: true });
}

// Corpora written before the routing-regime rename carry stressMeta.archetype/navDensity;
// current generate.mjs output carries stressMeta.routingRegime/requiredPathCoverageRatio.
// describeLevel() must dual-read both directions and normalize a recognized legacy regime value.
const legacyItem = describeLevel({ id: 'L', grid: { w: 4, h: 4 }, reqLen: 4, reqInt: 0, gates: [], portals: [], mustCross: [],
    stressMeta: { archetype: 'near-closure', navDensity: 0.5 } });
assert.equal(legacyItem.routingRegime, 'sparse-low-intersection', 'a legacy archetype value must normalize to its canonical routing regime');
assert.equal(legacyItem.requiredPathCoverageRatio, 0.5);
assert.equal(legacyItem.provenance.origin, null);
assert.equal(legacyItem.provenance.historyEvents, 0);

const canonicalItem = describeLevel({ id: 'M', grid: { w: 4, h: 4 }, reqLen: 4, reqInt: 0, gates: [], portals: [], mustCross: [],
    stressMeta: { routingRegime: 'multi-portal', requiredPathCoverageRatio: 0.75 } });
assert.equal(canonicalItem.routingRegime, 'multi-portal');
assert.equal(canonicalItem.requiredPathCoverageRatio, 0.75);

console.log('corpus query check passed');
