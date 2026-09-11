import { describe, expect, it } from 'vitest';
import {
    canonicalAction,
    compareTechniqueNichePair,
    compareTechniqueNicheSummaries,
} from './technique-niche-stability-lib.mjs';

describe('technique niche stability', () => {
    it('normalizes pre-cleanup action identities', () => {
        expect(canonicalAction('ida:default')).toBe('admissible-order|tieBreak=default|lds=off');
        expect(canonicalAction('beam:objectiveFirst@beam5000(diverse)'))
            .toBe('beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets');
    });

    it('marks same-direction material effects as persistent', () => {
        const oldPair = {
            leftAction: 'beam:objectiveFirst@beam5000',
            rightAction: 'beam:objectiveFirst@beam5000(diverse)',
            leftOnly: 10,
            rightOnly: 20,
            topEffects: [
                { feature: 'portals', standardizedDifference: -0.8 },
                { feature: 'requiredIntersections', standardizedDifference: 0.4 },
            ],
        };
        const freshPair = {
            leftAction: 'beam|score=objectiveFirst|bias=none|width=5000|retention=plain',
            rightAction: 'beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets',
            leftOnly: 12,
            rightOnly: 22,
            topEffects: [
                { feature: 'portals', standardizedDifference: -0.6 },
                { feature: 'requiredIntersections', standardizedDifference: -0.2 },
            ],
        };
        const out = compareTechniqueNichePair(oldPair, freshPair);
        expect(out.persistentFeatures.map((row) => row.feature)).toEqual(['portals']);
        expect(out.sameLeadingFeature).toBe(true);
        expect(out.interpretation).toBe('persistent-structural-niche');
    });

    it('matches equivalent old and current pair identities', () => {
        const oldSummary = {
            pairs: [{
                leftAction: 'ida:default',
                rightAction: 'ida:mustCrossFirst',
                leftOnly: 3,
                rightOnly: 2,
                topEffects: [{ feature: 'mustPass', standardizedDifference: 0.5 }],
            }],
        };
        const freshSummary = {
            pairs: [{
                leftAction: 'admissible-order|tieBreak=default|lds=off',
                rightAction: 'admissible-order|tieBreak=mustCrossFirst|lds=off',
                leftOnly: 4,
                rightOnly: 3,
                topEffects: [{ feature: 'mustPass', standardizedDifference: 0.6 }],
            }],
        };
        const out = compareTechniqueNicheSummaries(oldSummary, freshSummary);
        expect(out.comparedPairCount).toBe(1);
        expect(out.unmatchedOldPairs).toEqual([]);
        expect(out.unmatchedFreshPairs).toEqual([]);
        expect(out.persistentPairCount).toBe(1);
    });
});
