#!/usr/bin/env node
/**
 * Unit tests for scripts/level-corpus-provenance.mjs's pure classification helpers. See
 * docs/level-corpus-provenance.md for the provenance facts these encode and why they matter.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    classifyPublishedLevelProvenance, classifyStressLevelProvenance,
    PUBLISHED_HUMAN_THRESHOLD_LEVEL, STRESS_BATCH_PROVENANCE, STRESS_CORPUS_COVERAGE_GAPS,
    RANDOM_CORPUS_COVERAGE_GAPS, RANDOM_CORPUS_NAME,
} from './level-corpus-provenance.mjs';

// ─── classifyPublishedLevelProvenance ───────────────────────────────────────

test('a level above the threshold with no tags is certain-human', () => {
    const result = classifyPublishedLevelProvenance(PUBLISHED_HUMAN_THRESHOLD_LEVEL + 1, []);
    assert.equal(result.tier, 'certain-human');
    assert.equal(result.confidence, 1);
});

test('a level at exactly the threshold is NOT above it, so falls to the default tier', () => {
    const result = classifyPublishedLevelProvenance(PUBLISHED_HUMAN_THRESHOLD_LEVEL, []);
    assert.equal(result.tier, 'uncertain-likely-ai');
});

test('a level below the threshold with no tags is uncertain, ~80% confidence AI', () => {
    const result = classifyPublishedLevelProvenance(1, []);
    assert.equal(result.tier, 'uncertain-likely-ai');
    assert.equal(result.confidence, 0.8);
});

test('a garbage-tagged level above the threshold is an exception: unknown, not certain-human', () => {
    const result = classifyPublishedLevelProvenance(140, ['garbage']);
    assert.equal(result.tier, 'unknown');
    assert.equal(result.confidence, null);
});

test('a garbage-tagged level below the threshold still gets the default uncertain tier (the exception is threshold-specific)', () => {
    const result = classifyPublishedLevelProvenance(50, ['garbage']);
    assert.equal(result.tier, 'uncertain-likely-ai');
});

test("a 'great'-tagged level is certain-human regardless of level number", () => {
    assert.equal(classifyPublishedLevelProvenance(5, ['great']).tier, 'certain-human');
    assert.equal(classifyPublishedLevelProvenance(200, ['great']).tier, 'certain-human');
});

test("a 'common'-tagged level is certain-ai regardless of level number", () => {
    assert.equal(classifyPublishedLevelProvenance(5, ['common']).tier, 'certain-ai');
    assert.equal(classifyPublishedLevelProvenance(200, ['common']).tier, 'certain-ai');
});

test("'great' takes precedence over 'garbage' if a level somehow carries both", () => {
    const result = classifyPublishedLevelProvenance(140, ['garbage', 'great']);
    assert.equal(result.tier, 'certain-human');
});

test('tags are matched case-insensitively', () => {
    assert.equal(classifyPublishedLevelProvenance(5, ['GREAT']).tier, 'certain-human');
    assert.equal(classifyPublishedLevelProvenance(5, ['Common']).tier, 'certain-ai');
});

test('missing tags argument defaults to no tags, not a crash', () => {
    assert.equal(classifyPublishedLevelProvenance(200).tier, 'certain-human');
    assert.equal(classifyPublishedLevelProvenance(5).tier, 'uncertain-likely-ai');
});

// ─── classifyStressLevelProvenance ──────────────────────────────────────────

test('every documented batch letter classifies with a real theory and risk tier', () => {
    for (const batch of ['A', 'B', 'C', 'D', 'E', 'F']) {
        const result = classifyStressLevelProvenance({ generationBatch: batch });
        assert.equal(result.source, 'stress-corpus-1-hypothesis');
        assert.equal(result.batch, batch);
        assert.equal(result.theory, STRESS_BATCH_PROVENANCE[batch].theory);
        assert.equal(result.adversarialIntent, STRESS_BATCH_PROVENANCE[batch].adversarialIntent);
        assert.equal(result.overfitRisk, STRESS_BATCH_PROVENANCE[batch].overfitRisk);
        assert.deepEqual(result.coverageGaps, STRESS_CORPUS_COVERAGE_GAPS);
    }
});

test('batches A and E are flagged high overfit risk (solver-aware); B/C/D/F are not', () => {
    assert.equal(classifyStressLevelProvenance({ generationBatch: 'A' }).overfitRisk, 'high');
    assert.equal(classifyStressLevelProvenance({ generationBatch: 'E' }).overfitRisk, 'high');
    for (const batch of ['B', 'C', 'D', 'F']) {
        assert.notEqual(classifyStressLevelProvenance({ generationBatch: batch }).overfitRisk, 'high');
    }
});

test('a level with corpusName random-uniform-v1 and no batch is stress-corpus-random, solver-blind', () => {
    const result = classifyStressLevelProvenance({ corpusName: RANDOM_CORPUS_NAME });
    assert.equal(result.source, 'stress-corpus-random');
    assert.equal(result.batch, null);
    assert.equal(result.adversarialIntent, 'solver-blind');
    assert.deepEqual(result.coverageGaps, RANDOM_CORPUS_COVERAGE_GAPS);
});

test('the random corpus coverage gaps are a strict superset of the shared stress-corpus gaps', () => {
    for (const gap of STRESS_CORPUS_COVERAGE_GAPS) assert.ok(RANDOM_CORPUS_COVERAGE_GAPS.includes(gap));
    assert.ok(RANDOM_CORPUS_COVERAGE_GAPS.length > STRESS_CORPUS_COVERAGE_GAPS.length);
});

test('missing/null/unrecognized stressMeta classifies as unknown rather than throwing', () => {
    for (const input of [null, undefined, {}, { generationBatch: 'Z' }, { corpusName: 'something-else' }]) {
        const result = classifyStressLevelProvenance(input);
        assert.equal(result.source, 'unknown');
        assert.equal(result.adversarialIntent, 'unknown');
        assert.deepEqual(result.coverageGaps, []);
    }
});
