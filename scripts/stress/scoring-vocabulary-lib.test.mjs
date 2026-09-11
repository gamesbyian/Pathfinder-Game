import { describe, expect, it } from 'vitest';

import {
    SCORING_WEIGHT_FIELDS,
    analyzeVocabularyDecision,
    basisScoringProfiles,
    reconstructScore,
    scoreVectorFromBasisScores,
    summarizeVocabularyByAtlasClass,
    vectorsEqual,
    zeroScoringProfile,
} from './scoring-vocabulary-lib.mjs';

describe('scoring vocabulary helpers', () => {
    it('builds a true zero profile and one basis profile per weight', () => {
        const zero = zeroScoringProfile();
        expect(SCORING_WEIGHT_FIELDS).toHaveLength(12);
        for (const field of SCORING_WEIGHT_FIELDS) expect(zero[field]).toBe(0);

        const basis = basisScoringProfiles();
        expect(basis).toHaveLength(SCORING_WEIGHT_FIELDS.length);
        for (const row of basis) {
            for (const field of SCORING_WEIGHT_FIELDS) {
                expect(row.scoringProfile[field]).toBe(field === row.field ? 1 : 0);
            }
            expect(row.orderingBias).toBeNull();
        }
    });

    it('recovers components from basis scores and reconstructs arbitrary profiles', () => {
        const basisScores = Object.fromEntries(SCORING_WEIGHT_FIELDS.map((field, i) => [field, 10 + i]));
        const vector = scoreVectorFromBasisScores(10, basisScores);
        const profile = Object.fromEntries(SCORING_WEIGHT_FIELDS.map((field, i) => [field, i / 3]));
        const expected = 10 + SCORING_WEIGHT_FIELDS.reduce((sum, field, i) => sum + (i / 3) * i, 0);
        expect(reconstructScore(vector, profile)).toBeCloseTo(expected, 12);
    });

    it('treats omitted profile weights with scoreMove default weight 1', () => {
        const basisScores = Object.fromEntries(SCORING_WEIGHT_FIELDS.map((field, i) => [field, i + 1]));
        const vector = scoreVectorFromBasisScores(0, basisScores);
        const expected = SCORING_WEIGHT_FIELDS.reduce((sum, _field, i) => sum + i + 1, 0);
        expect(reconstructScore(vector, {})).toBe(expected);
    });

    it('distinguishes exact vocabulary collisions from merely close alternatives', () => {
        const zeroComponents = Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [field, 0]));
        const live = { intercept: 2, components: { ...zeroComponents, goalAttractionWeight: 3 } };
        const identical = { intercept: 2, components: { ...zeroComponents, goalAttractionWeight: 3 } };
        const distinct = { intercept: 2, components: { ...zeroComponents, goalAttractionWeight: 3.01 } };
        expect(vectorsEqual(live, identical)).toBe(true);
        expect(vectorsEqual(live, distinct)).toBe(false);

        const result = analyzeVocabularyDecision(new Map([
            [11, live],
            [22, identical],
            [33, distinct],
        ]), [11]);
        expect(result.exactVocabularyCollision).toBe(true);
        expect(result.collisions).toEqual([{ knownKey: 11, alternativeKey: 22, maxComponentDelta: 0 }]);
        expect(result.weightInvariantPairs).toEqual([{
            knownKey: 11,
            alternativeKey: 22,
            maxWeightedComponentDelta: 0,
            interceptMargin: 0,
            relation: 'tie',
        }]);
        expect(result.minKnownAlternativeVectorDelta).toBe(0);
        expect(result.minKnownAlternativeWeightedComponentDelta).toBe(0);
    });

    it('identifies a fixed alternative preference that no weight retuning can reverse', () => {
        const components = Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [field, 0]));
        const result = analyzeVocabularyDecision(new Map([
            [1, { intercept: 4, components }],
            [2, { intercept: 7, components: { ...components } }],
            [3, { intercept: 4, components: { ...components, goalAttractionWeight: 1 } }],
        ]), [1]);

        expect(result.exactVocabularyCollision).toBe(false);
        expect(result.weightInvariant).toBe(true);
        expect(result.weightInvariantAlternativePreferred).toBe(true);
        expect(result.weightInvariantAlternativePreferredPairs).toEqual([{
            knownKey: 1,
            alternativeKey: 2,
            maxWeightedComponentDelta: 0,
            interceptMargin: -3,
            relation: 'alternative-preferred',
        }]);
        expect(result.weightInvariantPairs).toHaveLength(1);
        expect(result.minKnownAlternativeWeightedComponentDelta).toBe(0);
    });

    it('does not pretend unlabelled alternatives are dead', () => {
        const components = Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [field, 0]));
        const result = analyzeVocabularyDecision(new Map([
            [1, { intercept: 0, components }],
            [2, { intercept: 0, components: { ...components, revisitPenaltyWeight: 1 } }],
        ]), [1]);
        expect(result).toMatchObject({
            knownContinuationCount: 1,
            alternativeCount: 1,
            exactVocabularyCollision: false,
            weightInvariant: false,
            weightInvariantAlternativePreferred: false,
        });
    });

    it('joins diagnostic levels to residual classes with explicit coverage denominators', () => {
        const atlasRows = [
            { id: 'C4-a', primaryClass: 4 },
            { id: 'C4-b', primaryClass: 4 },
            { id: 'C5-a', primaryClass: 5 },
            { id: 'C5-b', primaryClass: 5 },
            { id: 'C5-c', primaryClass: 5 },
        ];
        const levelRows = [
            {
                id: 'C4-a', decisionsVisited: 10, branchingDecisions: 4,
                exactVocabularyCollisionDecisions: 1, exactVocabularyCollisionPairs: 1,
                weightInvariantDecisions: 1, weightInvariantPairs: 1,
                weightInvariantAlternativePreferredDecisions: 0, weightInvariantAlternativePreferredPairs: 0,
                absentKnownContinuation: 0,
            },
            {
                id: 'C5-a', decisionsVisited: 12, branchingDecisions: 5,
                exactVocabularyCollisionDecisions: 2, exactVocabularyCollisionPairs: 3,
                weightInvariantDecisions: 3, weightInvariantPairs: 5,
                weightInvariantAlternativePreferredDecisions: 2, weightInvariantAlternativePreferredPairs: 2,
                absentKnownContinuation: 1,
            },
            {
                id: 'C5-b', decisionsVisited: 8, branchingDecisions: 5,
                exactVocabularyCollisionDecisions: 0, exactVocabularyCollisionPairs: 0,
                weightInvariantDecisions: 0, weightInvariantPairs: 0,
                weightInvariantAlternativePreferredDecisions: 0, weightInvariantAlternativePreferredPairs: 0,
                absentKnownContinuation: 0,
            },
        ];
        const summary = summarizeVocabularyByAtlasClass(levelRows, atlasRows);
        expect(summary.classes[4]).toMatchObject({
            atlasLevels: 2, scoredLevels: 1, levelsWithCollision: 1,
            branchingDecisions: 4, collisionDecisions: 1,
            levelsWithWeightInvariantAlternativePreferred: 0,
            weightInvariantAlternativePreferredDecisions: 0,
        });
        expect(summary.classes[5]).toMatchObject({
            atlasLevels: 3, scoredLevels: 2, levelsWithCollision: 1,
            branchingDecisions: 10, collisionDecisions: 2,
            levelsWithWeightInvariantAlternativePreferred: 1,
            weightInvariantAlternativePreferredDecisions: 2,
            weightInvariantAlternativePreferredPairs: 2,
        });
        expect(summary.classes[4].levelCoverage).toBe(0.5);
        expect(summary.classes[5].decisionCollisionRate).toBe(0.2);
        expect(summary.classes[5].levelWeightInvariantAlternativePreferredRate).toBe(0.5);
        expect(summary.classes[5].decisionWeightInvariantAlternativePreferredRate).toBe(0.2);
        expect(summary.class5MinusClass4.levelCollisionRateDifference).toBe(-0.5);
        expect(summary.class5MinusClass4.decisionCollisionRateDifference).toBeCloseTo(-0.05, 12);
        expect(summary.class5MinusClass4.levelWeightInvariantAlternativePreferredRateDifference).toBe(0.5);
        expect(summary.class5MinusClass4.decisionWeightInvariantAlternativePreferredRateDifference).toBe(0.2);
    });
});
